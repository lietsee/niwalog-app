import { supabase } from './supabaseClient'
import type { ApiResponse, Project, ProjectWithField } from './types'

export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'expense_total'>

/**
 * 現場ごとの案件一覧取得
 */
export async function listProjectsByField(fieldId: string): Promise<ApiResponse<Project[]>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('field_id', fieldId)
      .order('implementation_date', { ascending: false })

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
 * ID指定で案件取得
 */
export async function getProjectById(id: string): Promise<ApiResponse<Project>> {
  try {
    const { data, error } = await supabase
      .from('projects')
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
 * 現場情報付きで案件取得
 */
export async function getProjectWithField(id: string): Promise<ApiResponse<ProjectWithField>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        fields (
          field_code,
          field_name,
          customer_name
        )
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
 * 次の案件番号を取得（自動採番用）
 */
export async function getNextProjectNumber(fieldId: string): Promise<ApiResponse<number>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('project_number')
      .eq('field_id', fieldId)
      .order('project_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const nextNumber = data && data.length > 0 ? data[0].project_number + 1 : 1
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
 * 案件作成
 */
export async function createProject(
  project: ProjectInput
): Promise<ApiResponse<Project>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
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
 * 案件更新
 */
export async function updateProject(
  id: string,
  project: Partial<ProjectInput>
): Promise<ApiResponse<Project>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
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
 * 案件削除（履歴テーブルに自動退避）
 */
export async function deleteProject(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id)

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
