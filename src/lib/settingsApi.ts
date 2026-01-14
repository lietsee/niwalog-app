import { supabase } from './supabaseClient'
import type { ApiResponse } from './types'

export type AppSetting = {
  id: string
  setting_key: string
  setting_value: string
  setting_type: 'string' | 'number' | 'boolean' | 'json'
  description: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type BaseAddressSettings = {
  address: string
  lat: number
  lng: number
}

/**
 * 設定値を取得
 */
export async function getSetting(key: string): Promise<ApiResponse<string | null>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 設定が存在しない場合
        return { data: null, error: null, status: 200 }
      }
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data.setting_value, error: null, status: 200 }
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
 * 複数の設定値を取得
 */
export async function getSettings(keys: string[]): Promise<ApiResponse<Map<string, string>>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', keys)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const settingsMap = new Map<string, string>()
    data?.forEach((item) => {
      settingsMap.set(item.setting_key, item.setting_value)
    })

    return { data: settingsMap, error: null, status: 200 }
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
 * 設定値を保存（upsert）
 */
export async function saveSetting(
  key: string,
  value: string,
  type: 'string' | 'number' | 'boolean' | 'json' = 'string',
  description?: string
): Promise<ApiResponse<AppSetting>> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          setting_key: key,
          setting_value: value,
          setting_type: type,
          description: description ?? null,
          updated_by: userId,
        },
        {
          onConflict: 'setting_key',
        }
      )
      .select()
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
 * 基準住所設定を取得
 */
export async function getBaseAddressSettings(): Promise<ApiResponse<BaseAddressSettings | null>> {
  try {
    const keys = ['base_address', 'base_lat', 'base_lng']
    const result = await getSettings(keys)

    if (result.error || !result.data) {
      return { data: null, error: result.error, status: result.status }
    }

    const address = result.data.get('base_address')
    const latStr = result.data.get('base_lat')
    const lngStr = result.data.get('base_lng')

    if (!address || !latStr || !lngStr) {
      return { data: null, error: null, status: 200 }
    }

    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    // 数値変換が正常かチェック
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error('Invalid lat/lng values:', latStr, lngStr)
      return { data: null, error: null, status: 200 }
    }

    return {
      data: {
        address,
        lat,
        lng,
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
 * 基準住所設定を保存（RPC経由でトランザクション保証）
 */
export async function saveBaseAddressSettings(
  address: string,
  lat: number,
  lng: number
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.rpc('save_base_address_settings', {
      p_address: address,
      p_lat: lat,
      p_lng: lng,
    })

    if (error) {
      console.error('Supabase RPC error:', error)
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
