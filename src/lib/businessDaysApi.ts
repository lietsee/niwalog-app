import { supabase } from './supabaseClient'
import type { ApiResponse, BusinessDay, DayType } from './types'

export type BusinessDayInput = {
  year: number
  day_type: DayType
  jan: number
  feb: number
  mar: number
  apr: number
  may: number
  jun: number
  jul: number
  aug: number
  sep: number
  oct: number
  nov: number
  dec: number
  notes?: string | null
}

/**
 * 全ての営業日数データを取得（年降順）
 */
export async function getAllBusinessDays(): Promise<ApiResponse<BusinessDay[]>> {
  try {
    const { data, error } = await supabase
      .from('business_days')
      .select('*')
      .order('year', { ascending: false })
      .order('day_type', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as BusinessDay[], error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 指定年の営業日数データを取得
 */
export async function getBusinessDaysByYear(
  year: number
): Promise<ApiResponse<BusinessDay[]>> {
  try {
    const { data, error } = await supabase
      .from('business_days')
      .select('*')
      .eq('year', year)
      .order('day_type', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as BusinessDay[], error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 営業日数を作成
 */
export async function createBusinessDay(
  input: BusinessDayInput
): Promise<ApiResponse<BusinessDay>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('business_days')
      .insert({
        year: input.year,
        day_type: input.day_type,
        jan: input.jan,
        feb: input.feb,
        mar: input.mar,
        apr: input.apr,
        may: input.may,
        jun: input.jun,
        jul: input.jul,
        aug: input.aug,
        sep: input.sep,
        oct: input.oct,
        nov: input.nov,
        dec: input.dec,
        notes: input.notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as BusinessDay, error: null, status: 201 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 営業日数を更新
 */
export async function updateBusinessDay(
  id: string,
  input: Partial<BusinessDayInput>
): Promise<ApiResponse<BusinessDay>> {
  try {
    const updateData: Record<string, unknown> = {}
    if (input.jan !== undefined) updateData.jan = input.jan
    if (input.feb !== undefined) updateData.feb = input.feb
    if (input.mar !== undefined) updateData.mar = input.mar
    if (input.apr !== undefined) updateData.apr = input.apr
    if (input.may !== undefined) updateData.may = input.may
    if (input.jun !== undefined) updateData.jun = input.jun
    if (input.jul !== undefined) updateData.jul = input.jul
    if (input.aug !== undefined) updateData.aug = input.aug
    if (input.sep !== undefined) updateData.sep = input.sep
    if (input.oct !== undefined) updateData.oct = input.oct
    if (input.nov !== undefined) updateData.nov = input.nov
    if (input.dec !== undefined) updateData.dec = input.dec
    if (input.notes !== undefined) updateData.notes = input.notes

    const { data, error } = await supabase
      .from('business_days')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as BusinessDay, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 営業日数を削除
 */
export async function deleteBusinessDay(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('business_days').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: null, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 指定年の営業日数データを削除（年度単位で削除）
 */
export async function deleteBusinessDaysByYear(year: number): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('business_days')
      .delete()
      .eq('year', year)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: null, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 営業日数を一括保存（Upsert）
 * year + day_type の複合ユニーク制約を利用
 */
export async function upsertBusinessDays(
  inputs: BusinessDayInput[]
): Promise<ApiResponse<BusinessDay[]>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const insertData = inputs.map((input) => ({
      year: input.year,
      day_type: input.day_type,
      jan: input.jan,
      feb: input.feb,
      mar: input.mar,
      apr: input.apr,
      may: input.may,
      jun: input.jun,
      jul: input.jul,
      aug: input.aug,
      sep: input.sep,
      oct: input.oct,
      nov: input.nov,
      dec: input.dec,
      notes: input.notes || null,
      created_by: user?.id || null,
    }))

    const { data, error } = await supabase
      .from('business_days')
      .upsert(insertData, {
        onConflict: 'year,day_type',
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as BusinessDay[], error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 年度の一覧を取得（重複なし）
 */
export async function getDistinctYears(): Promise<ApiResponse<number[]>> {
  try {
    const { data, error } = await supabase
      .from('business_days')
      .select('year')
      .order('year', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    // 重複を除去
    const years = [...new Set(data.map((d) => d.year))]
    return { data: years, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}
