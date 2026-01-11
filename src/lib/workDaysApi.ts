import { supabase } from './supabaseClient'
import type { ApiResponse, WorkDay, WorkDayWithRecords, WeatherEntry } from './types'

export type WorkDayInput = {
  project_id: string
  day_number: number
  work_date: string
  weather?: WeatherEntry[] | null
  work_description?: string | null
  troubles?: string | null
}

/**
 * 案件ごとの作業日一覧取得
 */
export async function listWorkDaysByProject(projectId: string): Promise<ApiResponse<WorkDay[]>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('project_id', projectId)
      .order('day_number', { ascending: true })

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
 * 作業日一覧（従事者稼働記録付き）
 */
export async function listWorkDaysWithRecords(projectId: string): Promise<ApiResponse<WorkDayWithRecords[]>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .select(`
        *,
        work_records (*)
      `)
      .eq('project_id', projectId)
      .order('day_number', { ascending: true })

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
 * ID指定で作業日取得
 */
export async function getWorkDayById(id: string): Promise<ApiResponse<WorkDay>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
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
 * 作業日取得（従事者稼働記録付き）
 */
export async function getWorkDayWithRecords(id: string): Promise<ApiResponse<WorkDayWithRecords>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .select(`
        *,
        work_records (*)
      `)
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
 * 次の日番号を取得（自動採番用）
 */
export async function getNextDayNumber(projectId: string): Promise<ApiResponse<number>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .select('day_number')
      .eq('project_id', projectId)
      .order('day_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const nextNumber = data && data.length > 0 ? data[0].day_number + 1 : 1
    return { data: nextNumber, error: null, status: 200 }
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
 * 作業日作成
 */
export async function createWorkDay(workDay: WorkDayInput): Promise<ApiResponse<WorkDay>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .insert(workDay)
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
 * 作業日更新
 */
export async function updateWorkDay(
  id: string,
  workDay: Partial<WorkDayInput>
): Promise<ApiResponse<WorkDay>> {
  try {
    const { data, error } = await supabase
      .from('work_days')
      .update(workDay)
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
 * 作業日削除（履歴テーブルに自動退避）
 */
export async function deleteWorkDay(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('work_days').delete().eq('id', id)

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
