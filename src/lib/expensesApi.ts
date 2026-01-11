import { supabase } from './supabaseClient'
import type { ApiResponse, Expense } from './types'

export type ExpenseInput = {
  project_id: string
  expense_item: string
  amount: number
  notes?: string | null
  expense_date?: string | null
}

/**
 * 案件ごとの経費一覧取得
 */
export async function listExpensesByProject(projectId: string): Promise<ApiResponse<Expense[]>> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('project_id', projectId)
      .order('expense_date', { ascending: true, nullsFirst: false })

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
 * ID指定で経費取得
 */
export async function getExpenseById(id: string): Promise<ApiResponse<Expense>> {
  try {
    const { data, error } = await supabase
      .from('expenses')
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
 * 経費作成
 */
export async function createExpense(expense: ExpenseInput): Promise<ApiResponse<Expense>> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
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
 * 経費更新
 */
export async function updateExpense(
  id: string,
  expense: Partial<Omit<ExpenseInput, 'project_id'>>
): Promise<ApiResponse<Expense>> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .update(expense)
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
 * 経費削除（履歴テーブルに自動退避）
 */
export async function deleteExpense(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id)

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
 * 案件の経費合計を取得
 */
export async function getExpenseTotal(projectId: string): Promise<ApiResponse<number>> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', projectId)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const total = (data || []).reduce((sum, item) => sum + item.amount, 0)
    return { data: total, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
