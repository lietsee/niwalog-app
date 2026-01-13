import { supabase } from './supabaseClient'
import type { ApiResponse, FieldFinancialSummary } from './types'

export type Field = {
  id: string
  field_code: string
  field_name: string
  customer_name: string | null
  address: string | null
  has_electricity: boolean
  has_water: boolean
  has_toilet: boolean
  toilet_distance: string | null
  travel_distance_km: number | null
  travel_time_minutes: number | null
  travel_cost: number | null
  notes: string | null
  warnings: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type FieldInput = Omit<Field, 'id' | 'created_at' | 'updated_at' | 'created_by'>

/**
 * 全現場取得
 */
export async function listAllFields(): Promise<ApiResponse<Field[]>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .order('field_code')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * ID指定で現場取得
 */
export async function getFieldById(id: string): Promise<ApiResponse<Field>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 200 }
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
 * 現場コードで検索
 */
export async function searchFieldsByCode(
  searchTerm: string
): Promise<ApiResponse<Field[]>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .ilike('field_code', `%${searchTerm}%`)
      .order('field_code')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 現場名で検索
 */
export async function searchFieldsByName(
  searchTerm: string
): Promise<ApiResponse<Field[]>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .ilike('field_name', `%${searchTerm}%`)
      .order('field_code')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 統合検索（現場コード、現場名、住所、顧客名を対象）
 */
export async function searchFields(
  searchTerm: string
): Promise<ApiResponse<Field[]>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .or(
        `field_code.ilike.%${searchTerm}%,field_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`
      )
      .order('field_code')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 現場作成
 */
export async function createField(
  field: FieldInput
): Promise<ApiResponse<Field>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('fields')
      .insert({
        ...field,
        created_by: user?.id || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 201 }
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
 * 現場更新
 */
export async function updateField(
  id: string,
  field: Partial<FieldInput>
): Promise<ApiResponse<Field>> {
  try {
    const { data, error } = await supabase
      .from('fields')
      .update(field)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 200 }
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
 * 現場削除（履歴テーブルに自動退避）
 */
export async function deleteField(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('fields').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: null, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

export type FieldRelatedCounts = {
  projects: number
  workDays: number
  workRecords: number
  expenses: number
}

/**
 * 現場に紐づく関連データ件数を取得
 */
export async function getFieldRelatedCounts(
  fieldId: string
): Promise<ApiResponse<FieldRelatedCounts>> {
  try {
    // 1. 関連する案件を取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('field_id', fieldId)

    if (projectsError) {
      console.error('Supabase error:', projectsError)
      return { data: null, error: projectsError.message, status: 400 }
    }

    const projectCount = projects?.length || 0

    if (projectCount === 0) {
      return {
        data: { projects: 0, workDays: 0, workRecords: 0, expenses: 0 },
        error: null,
        status: 200,
      }
    }

    const projectIds = projects!.map((p) => p.id)

    // 2. 関連する作業日を取得
    const { data: workDays, error: workDaysError } = await supabase
      .from('work_days')
      .select('id')
      .in('project_id', projectIds)

    if (workDaysError) {
      console.error('Supabase error:', workDaysError)
      return { data: null, error: workDaysError.message, status: 400 }
    }

    const workDayCount = workDays?.length || 0
    let workRecordCount = 0

    if (workDayCount > 0) {
      const workDayIds = workDays!.map((wd) => wd.id)

      // 3. 関連する従事者記録をカウント
      const { count, error: workRecordsError } = await supabase
        .from('work_records')
        .select('*', { count: 'exact', head: true })
        .in('work_day_id', workDayIds)

      if (workRecordsError) {
        console.error('Supabase error:', workRecordsError)
        return { data: null, error: workRecordsError.message, status: 400 }
      }

      workRecordCount = count || 0
    }

    // 4. 関連する経費をカウント
    const { count: expenseCount, error: expensesError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)

    if (expensesError) {
      console.error('Supabase error:', expensesError)
      return { data: null, error: expensesError.message, status: 400 }
    }

    return {
      data: {
        projects: projectCount,
        workDays: workDayCount,
        workRecords: workRecordCount,
        expenses: expenseCount || 0,
      },
      error: null,
      status: 200,
    }
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
 * 現場とその関連データを一括削除（カスケード削除）
 * 削除順序: work_records → work_days → expenses → projects → fields
 * 各テーブルのトリガーにより履歴テーブルに自動退避される
 */
export async function deleteFieldWithCascade(
  fieldId: string
): Promise<ApiResponse<null>> {
  try {
    // 1. 関連する案件IDを取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('field_id', fieldId)

    if (projectsError) {
      console.error('Supabase error:', projectsError)
      return { data: null, error: projectsError.message, status: 400 }
    }

    if (projects && projects.length > 0) {
      const projectIds = projects.map((p) => p.id)

      // 2. 関連する作業日IDを取得
      const { data: workDays, error: workDaysError } = await supabase
        .from('work_days')
        .select('id')
        .in('project_id', projectIds)

      if (workDaysError) {
        console.error('Supabase error:', workDaysError)
        return { data: null, error: workDaysError.message, status: 400 }
      }

      if (workDays && workDays.length > 0) {
        const workDayIds = workDays.map((wd) => wd.id)

        // 3. 従事者記録を削除
        const { error: workRecordsDeleteError } = await supabase
          .from('work_records')
          .delete()
          .in('work_day_id', workDayIds)

        if (workRecordsDeleteError) {
          console.error('Supabase error:', workRecordsDeleteError)
          return {
            data: null,
            error: workRecordsDeleteError.message,
            status: 400,
          }
        }
      }

      // 4. 作業日を削除
      const { error: workDaysDeleteError } = await supabase
        .from('work_days')
        .delete()
        .in('project_id', projectIds)

      if (workDaysDeleteError) {
        console.error('Supabase error:', workDaysDeleteError)
        return { data: null, error: workDaysDeleteError.message, status: 400 }
      }

      // 5. 経費を削除
      const { error: expensesDeleteError } = await supabase
        .from('expenses')
        .delete()
        .in('project_id', projectIds)

      if (expensesDeleteError) {
        console.error('Supabase error:', expensesDeleteError)
        return { data: null, error: expensesDeleteError.message, status: 400 }
      }

      // 6. 案件を削除
      const { error: projectsDeleteError } = await supabase
        .from('projects')
        .delete()
        .eq('field_id', fieldId)

      if (projectsDeleteError) {
        console.error('Supabase error:', projectsDeleteError)
        return { data: null, error: projectsDeleteError.message, status: 400 }
      }
    }

    // 7. 現場を削除
    const { error: fieldDeleteError } = await supabase
      .from('fields')
      .delete()
      .eq('id', fieldId)

    if (fieldDeleteError) {
      console.error('Supabase error:', fieldDeleteError)
      return { data: null, error: fieldDeleteError.message, status: 400 }
    }

    return { data: null, error: null, status: 200 }
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
 * 現場の財務サマリーを一括取得
 * - 請求額合計
 * - 費用合計（人件費 + 経費 + 移動費*2*案件数）
 * - 人件費未設定フラグ
 */
export async function getFieldFinancialSummaries(
  fields: Field[]
): Promise<ApiResponse<Map<string, FieldFinancialSummary>>> {
  try {
    if (fields.length === 0) {
      return { data: new Map(), error: null, status: 200 }
    }

    const fieldIds = fields.map((f) => f.id)

    // 全現場の案件を一括取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, field_id, invoice_amount, labor_cost, expense_total')
      .in('field_id', fieldIds)

    if (projectsError) {
      console.error('Supabase error:', projectsError)
      return { data: null, error: projectsError.message, status: 400 }
    }

    // 現場ごとのtravel_costマップを作成
    const travelCostMap = new Map<string, number | null>()
    for (const field of fields) {
      travelCostMap.set(field.id, field.travel_cost)
    }

    // 現場ごとに集計
    const summaryMap = new Map<string, FieldFinancialSummary>()

    // 初期化（案件がない現場も含む）
    for (const field of fields) {
      summaryMap.set(field.id, {
        fieldId: field.id,
        totalInvoice: 0,
        totalCost: 0,
        hasUnsetLaborCost: false,
        projectCount: 0,
      })
    }

    // 案件データを集計
    if (projects) {
      for (const project of projects) {
        const summary = summaryMap.get(project.field_id)
        if (!summary) continue

        const travelCost = travelCostMap.get(project.field_id) ?? 0

        // 請求額合計
        summary.totalInvoice += project.invoice_amount ?? 0

        // 費用合計: labor_cost + expense_total + travel_cost*2
        const laborCost = project.labor_cost ?? 0
        const expenseTotal = project.expense_total ?? 0
        summary.totalCost += laborCost + expenseTotal + travelCost * 2

        // 人件費未設定チェック
        if (project.labor_cost === null) {
          summary.hasUnsetLaborCost = true
        }

        // 案件数
        summary.projectCount += 1
      }
    }

    return { data: summaryMap, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
