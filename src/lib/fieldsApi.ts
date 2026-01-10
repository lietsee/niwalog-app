import { supabase } from './supabaseClient'
import type { ApiResponse } from './types'

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
