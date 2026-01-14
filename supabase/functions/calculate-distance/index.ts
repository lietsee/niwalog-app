// supabase/functions/calculate-distance/index.ts
// 距離計算 Edge Function
// OpenRouteService API を使用して住所から距離・時間を計算

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Nominatim for geocoding (supports Japanese addresses)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
// ORS for routing
const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car'

// CORS headers - Allow-Methods追加
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CalculateDistanceRequest {
  destinationAddress: string
  baseLat: number
  baseLng: number
}

interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
}

interface DistanceResult {
  distanceKm: number
  durationMinutes: number
  geocodedAddress: string
}

// ORS APIエラーの種類
type OrsErrorType = 'rate_limit' | 'unauthorized' | 'not_found' | 'unknown'

function classifyOrsError(status: number): OrsErrorType {
  if (status === 429) return 'rate_limit'
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not_found'
  return 'unknown'
}

function getOrsErrorMessage(errorType: OrsErrorType): string {
  switch (errorType) {
    case 'rate_limit':
      return 'API利用制限に達しました。しばらく待ってから再試行してください。'
    case 'unauthorized':
      return 'APIキーが無効です。管理者に連絡してください。'
    case 'not_found':
      return '住所が見つかりませんでした。正しい住所を入力してください。'
    default:
      return '外部サービスとの通信に失敗しました。'
  }
}

/**
 * 住所を正規化（郵便番号削除、全角→半角変換）
 */
function normalizeAddress(address: string): string {
  return address
    // 郵便番号を削除（〒xxx-xxxx形式）
    .replace(/〒?\d{3}[-−]\d{4}\s*/g, '')
    .replace(/〒?\d{7}\s*/g, '')
    // 全角数字・記号を半角に変換
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[−ー]/g, '-')
    .replace(/　/g, ' ')
    .trim()
}

/**
 * 住所を段階的に簡略化（町名→市区町村→都道府県）
 */
function simplifyAddress(address: string): string[] {
  const variations = [address]

  // 番地を削除（数字-数字や数字番地などのパターン）
  const noNumber = address.replace(/\d+[-−]?\d*番?地?.*$/, '').trim()
  if (noNumber && noNumber !== address) {
    variations.push(noNumber)
  }

  // 都道府県+市区町村のみ抽出
  const cityMatch = address.match(/^(.+?[都道府県])(.+?[市区町村])/)
  if (cityMatch) {
    variations.push(cityMatch[1] + cityMatch[2])
  }

  return [...new Set(variations)] // 重複削除
}

/**
 * 住所から緯度経度を取得（Nominatimジオコーディング - 日本語対応）
 */
async function geocodeAddress(
  address: string
): Promise<{ result: GeocodingResult | null; errorType?: OrsErrorType }> {
  // 住所を正規化
  const normalizedAddress = normalizeAddress(address)
  console.log('Normalized address:', normalizedAddress)

  // 段階的に検索（詳細→簡略化）
  const addressVariations = simplifyAddress(normalizedAddress)
  console.log('Address variations:', addressVariations)

  for (const addr of addressVariations) {
    const params = new URLSearchParams({
      q: addr,
      format: 'json',
      limit: '1',
      countrycodes: 'jp',
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'niwalog-app/1.0', // Nominatim requires User-Agent
      },
    })

    if (!response.ok) {
      console.error('Geocoding failed:', response.status, await response.text())
      continue
    }

    const data = await response.json()

    if (data && data.length > 0) {
      const result = data[0]
      console.log('Geocoding success with:', addr)
      return {
        result: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name || address,
        },
      }
    }

    console.log('No results for:', addr)
  }

  return { result: null, errorType: 'not_found' }
}

/**
 * 2点間の距離と所要時間を計算
 */
async function calculateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string
): Promise<{ result: { distanceKm: number; durationMinutes: number } | null; errorType?: OrsErrorType }> {
  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [
        [fromLng, fromLat], // 出発地（経度, 緯度の順）
        [toLng, toLat], // 到着地
      ],
    }),
  })

  if (!response.ok) {
    const errorType = classifyOrsError(response.status)
    console.error('Directions failed:', response.status, await response.text())
    return { result: null, errorType }
  }

  const data = await response.json()

  if (!data.routes || data.routes.length === 0) {
    return { result: null, errorType: 'not_found' }
  }

  const route = data.routes[0]
  const distanceMeters = route.summary.distance
  const durationSeconds = route.summary.duration

  return {
    result: {
      distanceKm: Math.round(distanceMeters / 100) / 10, // 0.1km単位で丸め
      durationMinutes: Math.round(durationSeconds / 60), // 分単位で丸め
    },
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // デバッグログ
    console.log('=== calculate-distance called ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // 認証チェック: Authorizationヘッダーの存在確認のみ
    // JWT検証はSupabase Functions Gateway（--no-verify-jwt無効時）またはフロント側で実施
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header:', authHeader ? 'present' : 'missing')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証が必要です。ログインしてください。' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get API key from secrets
    const apiKey = Deno.env.get('ORS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'APIキーが設定されていません。管理者に連絡してください。',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body: CalculateDistanceRequest = await req.json()
    console.log('Request body:', JSON.stringify(body))
    const { destinationAddress, baseLat, baseLng } = body

    // Validate input - 型チェック強化
    if (!destinationAddress || typeof destinationAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: '目的地住所が指定されていません。' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (typeof baseLat !== 'number' || typeof baseLng !== 'number' || isNaN(baseLat) || isNaN(baseLng)) {
      return new Response(
        JSON.stringify({
          error: '基準住所が設定されていません。設定画面から登録してください。',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Step 1: Geocode destination address using Nominatim
    const geocodeResponse = await geocodeAddress(destinationAddress)
    if (!geocodeResponse.result) {
      return new Response(
        JSON.stringify({
          error: getOrsErrorMessage(geocodeResponse.errorType || 'not_found'),
        }),
        {
          status: geocodeResponse.errorType === 'rate_limit' ? 429 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Step 2: Calculate route
    const routeResponse = await calculateRoute(
      baseLat,
      baseLng,
      geocodeResponse.result.lat,
      geocodeResponse.result.lng,
      apiKey
    )
    if (!routeResponse.result) {
      return new Response(
        JSON.stringify({
          error: routeResponse.errorType === 'rate_limit'
            ? getOrsErrorMessage('rate_limit')
            : 'ルートが見つかりませんでした。住所を確認してください。',
        }),
        {
          status: routeResponse.errorType === 'rate_limit' ? 429 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return result
    const result: DistanceResult = {
      distanceKm: routeResponse.result.distanceKm,
      durationMinutes: routeResponse.result.durationMinutes,
      geocodedAddress: geocodeResponse.result.formattedAddress,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: '距離計算中にエラーが発生しました。' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
