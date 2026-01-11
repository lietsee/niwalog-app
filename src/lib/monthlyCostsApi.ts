import { supabase } from './supabaseClient'
import type { ApiResponse, CostType, MonthlyCost } from './types'

// 定型カテゴリ
export const FIXED_COST_CATEGORIES = [
  '地代家賃',
  '水道光熱費',
  '通信費',
  '保険料',
  'リース料',
  'その他',
] as const

export const VARIABLE_COST_CATEGORIES = [
  'カード決済手数料',
  '消耗品費',
  '車両燃料費',
  'その他',
] as const

export type MonthlyCostInput = {
  year_month: string
  cost_type: CostType
  category: string
  amount: number
  notes?: string | null
}

/**
 * 指定年月の月次経費一覧を取得
 */
export async function getMonthlyCostsByMonth(
  yearMonth: string
): Promise<ApiResponse<MonthlyCost[]>> {
  try {
    const { data, error } = await supabase
      .from('monthly_costs')
      .select('*')
      .eq('year_month', yearMonth)
      .order('cost_type', { ascending: true })
      .order('category', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as MonthlyCost[], error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 指定期間の月次経費を取得（年月の範囲指定）
 */
export async function getMonthlyCostsByRange(
  startYearMonth: string,
  endYearMonth: string
): Promise<ApiResponse<MonthlyCost[]>> {
  try {
    const { data, error } = await supabase
      .from('monthly_costs')
      .select('*')
      .gte('year_month', startYearMonth)
      .lte('year_month', endYearMonth)
      .order('year_month', { ascending: true })
      .order('cost_type', { ascending: true })
      .order('category', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as MonthlyCost[], error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 月次経費を作成
 */
export async function createMonthlyCost(
  input: MonthlyCostInput
): Promise<ApiResponse<MonthlyCost>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('monthly_costs')
      .insert({
        year_month: input.year_month,
        cost_type: input.cost_type,
        category: input.category,
        amount: input.amount,
        notes: input.notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as MonthlyCost, error: null, status: 201 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 月次経費を更新
 */
export async function updateMonthlyCost(
  id: string,
  input: Partial<MonthlyCostInput>
): Promise<ApiResponse<MonthlyCost>> {
  try {
    const { data, error } = await supabase
      .from('monthly_costs')
      .update({
        ...(input.year_month !== undefined && { year_month: input.year_month }),
        ...(input.cost_type !== undefined && { cost_type: input.cost_type }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.notes !== undefined && { notes: input.notes }),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as MonthlyCost, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 月次経費を削除（物理削除、履歴テーブルに自動退避）
 */
export async function deleteMonthlyCost(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('monthly_costs').delete().eq('id', id)

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
 * 前月からコピー
 * 指定年月の月次経費を前月からコピーして作成
 */
export async function copyFromPreviousMonth(
  targetYearMonth: string
): Promise<ApiResponse<MonthlyCost[]>> {
  try {
    // 前月を計算
    const [year, month] = targetYearMonth.split('-').map(Number)
    let prevYear = year
    let prevMonth = month - 1
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear -= 1
    }
    const previousYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

    // 前月のデータを取得
    const previousData = await getMonthlyCostsByMonth(previousYearMonth)
    if (previousData.error || !previousData.data) {
      return {
        data: null,
        error: previousData.error || '前月のデータ取得に失敗しました',
        status: 400,
      }
    }

    if (previousData.data.length === 0) {
      return {
        data: null,
        error: '前月のデータがありません',
        status: 400,
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 前月のデータをコピー
    const insertData = previousData.data.map((item) => ({
      year_month: targetYearMonth,
      cost_type: item.cost_type,
      category: item.category,
      amount: item.amount,
      notes: item.notes,
      created_by: user?.id || null,
    }))

    const { data, error } = await supabase
      .from('monthly_costs')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data as MonthlyCost[], error: null, status: 201 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}

/**
 * 指定年月の固定費・変動費合計を取得
 */
export async function getMonthlyCostTotals(yearMonth: string): Promise<
  ApiResponse<{
    fixedTotal: number
    variableTotal: number
    total: number
  }>
> {
  try {
    const { data, error } = await supabase
      .from('monthly_costs')
      .select('cost_type, amount')
      .eq('year_month', yearMonth)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    let fixedTotal = 0
    let variableTotal = 0

    for (const item of data || []) {
      if (item.cost_type === 'fixed') {
        fixedTotal += item.amount
      } else {
        variableTotal += item.amount
      }
    }

    return {
      data: {
        fixedTotal,
        variableTotal,
        total: fixedTotal + variableTotal,
      },
      error: null,
      status: 200,
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'システムエラーが発生しました', status: 500 }
  }
}
