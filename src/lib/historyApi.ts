import { supabase } from './supabaseClient'
import type { ApiResponse, FieldHistoryRecord, ProjectHistoryRecord } from './types'

/**
 * 現場履歴取得（fields_full_historyビュー利用）
 */
export async function getFieldHistory(
  searchTerm?: string
): Promise<ApiResponse<FieldHistoryRecord[]>> {
  try {
    let query = supabase
      .from('fields_full_history')
      .select('id, field_code, field_name, customer_name, address, status, valid_from, operation_by')
      .order('valid_from', { ascending: false })
      .limit(100)

    if (searchTerm && searchTerm.trim()) {
      query = query.or(
        `field_code.ilike.%${searchTerm}%,field_name.ilike.%${searchTerm}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Field history error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const records: FieldHistoryRecord[] = (data || []).map((r) => ({
      id: r.id,
      fieldCode: r.field_code,
      fieldName: r.field_name,
      customerName: r.customer_name,
      address: r.address,
      status: r.status as 'CURRENT' | 'UPDATE' | 'DELETE',
      operationAt: r.valid_from,
      operationBy: r.operation_by,
    }))

    return { data: records, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 案件履歴取得
 */
export async function getProjectHistory(
  searchTerm?: string
): Promise<ApiResponse<ProjectHistoryRecord[]>> {
  try {
    // 現在の案件を取得
    let currentQuery = supabase
      .from('projects')
      .select(`
        id,
        field_id,
        project_number,
        implementation_date,
        updated_at,
        fields (
          field_code,
          field_name
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(50)

    const { data: currentProjects, error: currentError } = await currentQuery

    if (currentError) {
      console.error('Current projects error:', currentError)
      return { data: null, error: currentError.message, status: 400 }
    }

    // 履歴の案件を取得
    const { data: historyProjects, error: historyError } = await supabase
      .from('projects_history')
      .select(`
        id,
        field_id,
        project_number,
        implementation_date,
        operation_type,
        operation_at,
        operation_by
      `)
      .order('operation_at', { ascending: false })
      .limit(50)

    if (historyError) {
      console.error('History projects error:', historyError)
      return { data: null, error: historyError.message, status: 400 }
    }

    // 履歴の案件に対応する現場情報を取得
    const historyFieldIds = [...new Set((historyProjects || []).map((p) => p.field_id))]
    let fieldsMap: Record<string, { field_code: string; field_name: string }> = {}

    if (historyFieldIds.length > 0) {
      const { data: fields } = await supabase
        .from('fields')
        .select('id, field_code, field_name')
        .in('id', historyFieldIds)

      for (const field of fields || []) {
        fieldsMap[field.id] = {
          field_code: field.field_code,
          field_name: field.field_name,
        }
      }
    }

    // 結果を統合
    const records: ProjectHistoryRecord[] = []

    // 現在の案件
    for (const p of currentProjects || []) {
      if (!p.fields) continue
      const fields = Array.isArray(p.fields) ? p.fields[0] : p.fields
      if (!fields) continue
      records.push({
        id: p.id,
        fieldId: p.field_id,
        fieldCode: fields.field_code,
        fieldName: fields.field_name,
        projectNumber: p.project_number,
        implementationDate: p.implementation_date,
        operationType: 'CURRENT',
        operationAt: p.updated_at,
        operationBy: null,
      })
    }

    // 履歴の案件
    for (const p of historyProjects || []) {
      const field = fieldsMap[p.field_id] || { field_code: '不明', field_name: '不明' }
      records.push({
        id: p.id,
        fieldId: p.field_id,
        fieldCode: field.field_code,
        fieldName: field.field_name,
        projectNumber: p.project_number,
        implementationDate: p.implementation_date,
        operationType: p.operation_type,
        operationAt: p.operation_at,
        operationBy: p.operation_by,
      })
    }

    // 日時降順でソート
    records.sort((a, b) => new Date(b.operationAt).getTime() - new Date(a.operationAt).getTime())

    // 検索フィルター適用
    let filtered = records
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = records.filter(
        (r) =>
          r.fieldCode.toLowerCase().includes(term) ||
          r.fieldName.toLowerCase().includes(term)
      )
    }

    return { data: filtered.slice(0, 100), error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
