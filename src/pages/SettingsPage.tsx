import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { baseAddressSchema, type BaseAddressFormData } from '@/schemas/settingsSchema'
import {
  getBaseAddressSettings,
  saveBaseAddressSettings,
} from '@/lib/settingsApi'

type Props = {
  onBack: () => void
}

export function SettingsPage({ onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BaseAddressFormData>({
    resolver: zodResolver(baseAddressSchema),
    defaultValues: {
      address: '',
      lat: 0,
      lng: 0,
    },
  })

  const lat = watch('lat')
  const lng = watch('lng')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const result = await getBaseAddressSettings()
      if (result.error) {
        toast.error(`設定取得エラー: ${result.error}`)
        return
      }
      if (result.data) {
        setValue('address', result.data.address)
        setValue('lat', result.data.lat)
        setValue('lng', result.data.lng)
      }
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: BaseAddressFormData) {
    setSaving(true)
    try {
      const result = await saveBaseAddressSettings(data.address, data.lat, data.lng)
      if (result.error) {
        toast.error(`保存エラー: ${result.error}`)
        return
      }
      toast.success('基準住所を保存しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">設定</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 基準住所設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              基準住所
            </CardTitle>
            <CardDescription>
              距離自動計算の起点となる住所を設定します（会社・事務所など）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                placeholder="例: 東京都千代田区丸の内1-1-1"
                {...register('address')}
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                緯度・経度はGoogle Mapsなどで確認してください
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">緯度</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  placeholder="例: 35.6812"
                  {...register('lat', { valueAsNumber: true })}
                  className={errors.lat ? 'border-destructive' : ''}
                />
                {errors.lat && (
                  <p className="text-sm text-destructive">{errors.lat.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lng">経度</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.000001"
                  placeholder="例: 139.7671"
                  {...register('lng', { valueAsNumber: true })}
                  className={errors.lng ? 'border-destructive' : ''}
                />
                {errors.lng && (
                  <p className="text-sm text-destructive">{errors.lng.message}</p>
                )}
              </div>
            </div>

            {lat !== 0 && lng !== 0 && (
              <p className="text-sm text-muted-foreground">
                現在の座標: {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 帰属表示 */}
        <Card>
          <CardHeader>
            <CardTitle>距離計算について</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              距離計算には{' '}
              <a
                href="https://openrouteservice.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                OpenRouteService
              </a>{' '}
              を使用しています。地図データは{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                OpenStreetMap
              </a>{' '}
              の提供です。
            </p>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
