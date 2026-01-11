import { supabase } from './supabaseClient'
import type { ApiResponse, Employee, SalaryType } from './types'

export type EmployeeInput = {
  employee_code: string
  name: string
  salary_type: SalaryType
  hourly_rate: number | null
  daily_rate: number | null
  is_active?: boolean
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
 * 有効な従業員のみ取得
 */
export async function listActiveEmployees(): Promise<ApiResponse<Employee[]>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employee,
        is_active: employee.is_active ?? true,
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
 * 従業員削除（論理削除: is_active = false）
 */
export async function deleteEmployee(
  employeeCode: string
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('employees')
      .update({ is_active: false })
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
 * 従業員を再有効化
 */
export async function reactivateEmployee(
  employeeCode: string
): Promise<ApiResponse<Employee>> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: true })
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
