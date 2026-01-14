import { supabase } from './supabaseClient'
import type { ApiResponse } from './types'

export type DistanceResult = {
  distanceKm: number
  durationMinutes: number
  geocodedAddress: string
}

/**
 * 基準住所から目的地までの距離・時間を計算
 * Supabase Edge Function経由でOpenRouteService APIを呼び出す
 */
export async function calculateDistanceFromBase(
  destinationAddress: string,
  baseLat: number,
  baseLng: number
): Promise<ApiResponse<DistanceResult>> {
  try {
    // Edge Function を呼び出し（Supabaseクライアントが自動で認証ヘッダーを付与）
    const { data, error } = await supabase.functions.invoke('calculate-distance', {
      body: {
        destinationAddress,
        baseLat,
        baseLng,
      },
    })

    if (error) {
      console.error('Edge Function error:', error)
      return { data: null, error: error.message || '距離計算に失敗しました', status: 400 }
    }

    // Edge Function からのエラーレスポンスをチェック
    if (data?.error) {
      return { data: null, error: data.error, status: 400 }
    }

    return {
      data: {
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        geocodedAddress: data.geocodedAddress,
      },
      error: null,
      status: 200,
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: '距離計算中にエラーが発生しました',
      status: 500,
    }
  }
}
