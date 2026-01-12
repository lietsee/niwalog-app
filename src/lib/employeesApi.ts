import { supabase } from './supabaseClient'
import type { ApiResponse, Employee, SalaryType } from './types'

export type EmployeeInput = {
  employee_code: string
  name: string
  salary_type: SalaryType
  hourly_rate: number | null
  daily_rate: number | null
}

/**
 * 従業員コード重複チェック（現行+履歴テーブル両方）
 */
export async function checkEmployeeCodeExists(
  employeeCode: string
): Promise<{ exists: boolean; inHistory: boolean }> {
  // 1. employeesテーブルをチェック
  const { data: current } = await supabase
    .from('employees')
    .select('employee_code')
    .eq('employee_code', employeeCode)
    .maybeSingle()

  if (current) {
    return { exists: true, inHistory: false }
  }

  // 2. employees_historyテーブルをチェック（DELETE操作のみ）
  const { data: history } = await supabase
    .from('employees_history')
    .select('employee_code')
    .eq('employee_code', employeeCode)
    .eq('operation_type', 'DELETE')
    .limit(1)

  if (history && history.length > 0) {
    return { exists: true, inHistory: true }
  }

  return { exists: false, inHistory: false }
}

/**
 * 全従業員取得
 */
export async function listAllEmployees(): Promise<ApiResponse<Employee[]>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('employee_code')

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
 * 全従業員取得（listAllEmployeesのエイリアス、互換性維持用）
 * @deprecated Use listAllEmployees instead
 */
export async function listActiveEmployees(): Promise<ApiResponse<Employee[]>> {
  return listAllEmployees()
}

/**
 * 従業員コードで取得
 */
export async function getEmployeeByCode(
  employeeCode: string
): Promise<ApiResponse<Employee>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', employeeCode)
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
 * 複数の従業員コードで取得
 */
export async function getEmployeesByCodes(
  employeeCodes: string[]
): Promise<ApiResponse<Employee[]>> {
  try {
    if (employeeCodes.length === 0) {
      return { data: [], error: null, status: 200 }
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .in('employee_code', employeeCodes)

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
 * 従業員検索（コードまたは名前）
 */
export async function searchEmployees(
  searchTerm: string
): Promise<ApiResponse<Employee[]>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .or(`employee_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .order('employee_code')

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
 * 従業員作成
 */
export async function createEmployee(
  employee: EmployeeInput
): Promise<ApiResponse<Employee>> {
  try {
    // 重複チェック
    const check = await checkEmployeeCodeExists(employee.employee_code)

    if (check.exists && !check.inHistory) {
      return {
        data: null,
        error: 'その従業員コードは既に存在します',
        status: 409,
      }
    }

    if (check.exists && check.inHistory) {
      return {
        data: null,
        error:
          'その従業員コードは削除済みです。同じ人なら履歴ページから復元してください',
        status: 409,
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employee,
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
 * 従業員更新
 */
export async function updateEmployee(
  employeeCode: string,
  employee: Partial<Omit<EmployeeInput, 'employee_code'>>
): Promise<ApiResponse<Employee>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('employee_code', employeeCode)
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
 * 従業員削除（物理削除、履歴テーブルに自動退避）
 */
export async function deleteEmployee(
  employeeCode: string
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('employee_code', employeeCode)

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
 * 従業員復元（履歴テーブルから現行テーブルへ）
 */
export async function restoreEmployee(
  historyId: string
): Promise<ApiResponse<Employee>> {
  try {
    // 1. 履歴レコードを取得
    const { data: historyRecord, error: historyError } = await supabase
      .from('employees_history')
      .select('*')
      .eq('history_id', historyId)
      .eq('operation_type', 'DELETE')
      .single()

    if (historyError || !historyRecord) {
      console.error('History record error:', historyError)
      return { data: null, error: '復元対象の履歴が見つかりません', status: 404 }
    }

    // 2. 現行テーブルに同じコードが存在しないか確認
    const { data: existing } = await supabase
      .from('employees')
      .select('employee_code')
      .eq('employee_code', historyRecord.employee_code)
      .maybeSingle()

    if (existing) {
      return {
        data: null,
        error: 'この従業員コードは既に使用されています',
        status: 409,
      }
    }

    // 現在のユーザーを取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 3. employeesテーブルにINSERT（トリガーで'INSERT'が記録される）
    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_code: historyRecord.employee_code,
        name: historyRecord.name,
        salary_type: historyRecord.salary_type,
        hourly_rate: historyRecord.hourly_rate,
        daily_rate: historyRecord.daily_rate,
        created_by: historyRecord.created_by,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    // 4. 履歴テーブルにRESTOREを記録（トリガーのINSERTとは別に明示的に記録）
    await supabase.from('employees_history').insert({
      employee_code: data.employee_code,
      name: data.name,
      salary_type: data.salary_type,
      hourly_rate: data.hourly_rate,
      daily_rate: data.daily_rate,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      operation_type: 'RESTORE',
      operation_by: user?.id || null,
    })

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
