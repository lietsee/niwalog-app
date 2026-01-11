import { supabase } from './supabaseClient'
import type { ApiResponse, WorkRecord } from './types'

// 4時刻対応の入力型
export type WorkRecordInput = {
  work_day_id: string
  employee_code: string
  clock_in?: string | null       // 出勤時間（途中合流の場合は省略/null）
  site_arrival: string           // 現場到着時間（必須）
  site_departure: string         // 現場撤収時間（必須）
  clock_out?: string | null      // 退勤時間（途中離脱の場合は省略/null）
  break_minutes?: number
}

/**
 * 作業日ごとの従事者稼働記録一覧取得
 */
export async function listWorkRecordsByWorkDay(workDayId: string): Promise<ApiResponse<WorkRecord[]>> {
  try {
    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('work_day_id', workDayId)
      .order('site_arrival', { ascending: true })

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
 * ID指定で従事者稼働記録取得
 */
export async function getWorkRecordById(id: string): Promise<ApiResponse<WorkRecord>> {
  try {
    const { data, error } = await supabase
      .from('work_records')
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
 * 従事者稼働記録作成
 */
export async function createWorkRecord(record: WorkRecordInput): Promise<ApiResponse<WorkRecord>> {
  try {
    const { data, error } = await supabase
      .from('work_records')
      .insert(record)
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
 * 従事者稼働記録一括作成
 */
export async function createWorkRecords(records: WorkRecordInput[]): Promise<ApiResponse<WorkRecord[]>> {
  try {
    if (records.length === 0) {
      return { data: [], error: null, status: 200 }
    }

    const { data, error } = await supabase
      .from('work_records')
      .insert(records)
      .select('*')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 201 }
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
 * 従事者稼働記録更新
 */
export async function updateWorkRecord(
  id: string,
  record: Partial<Omit<WorkRecordInput, 'work_day_id'>>
): Promise<ApiResponse<WorkRecord>> {
  try {
    const { data, error } = await supabase
      .from('work_records')
      .update(record)
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
 * 従事者稼働記録削除（履歴テーブルに自動退避）
 */
export async function deleteWorkRecord(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('work_records').delete().eq('id', id)

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

/**
 * 作業日の全従事者稼働記録を削除
 */
export async function deleteWorkRecordsByWorkDay(workDayId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('work_records').delete().eq('work_day_id', workDayId)

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
