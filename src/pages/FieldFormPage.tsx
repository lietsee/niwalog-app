import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { translateSupabaseError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createField,
  updateField,
  getFieldById,
  type FieldInput,
} from '@/lib/fieldsApi'
import { fieldSchema, type FieldFormData } from '@/schemas/fieldSchema'
import type { Page } from '@/lib/types'

interface FieldFormPageProps {
  onNavigate: (page: Page) => void
  fieldId?: string
}

export function FieldFormPage({ onNavigate, fieldId }: FieldFormPageProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!fieldId

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_code: '',
      field_name: '',
      customer_name: null,
      address: null,
      has_electricity: false,
      has_water: false,
      has_toilet: false,
      toilet_distance: null,
      travel_distance_km: null,
      travel_time_minutes: null,
      travel_cost: null,
      notes: null,
      warnings: null,
    },
  })

  const hasElectricity = watch('has_electricity')
  const hasWater = watch('has_water')
  const hasToilet = watch('has_toilet')

  useEffect(() => {
    if (isEditMode && fieldId) {
      loadField()
    }
  }, [fieldId])

  const loadField = async () => {
    if (!fieldId) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getFieldById(fieldId)

    if (err) {
      setError(err)
      toast.error(`現場情報の取得に失敗しました: ${err}`)
    } else if (data) {
      // フォームにデータをセット
      setValue('field_code', data.field_code)
      setValue('field_name', data.field_name)
      setValue('customer_name', data.customer_name)
      setValue('address', data.address)
      setValue('has_electricity', data.has_electricity)
      setValue('has_water', data.has_water)
      setValue('has_toilet', data.has_toilet)
      setValue('toilet_distance', data.toilet_distance)
      setValue('travel_distance_km', data.travel_distance_km)
      setValue('travel_time_minutes', data.travel_time_minutes)
      setValue('travel_cost', data.travel_cost)
      setValue('notes', data.notes)
      setValue('warnings', data.warnings)
    }

    setLoading(false)
  }

  const onSubmit = async (data: FieldFormData) => {
    setSubmitting(true)
    setError(null)

    const fieldInput: FieldInput = {
      field_code: data.field_code,
      field_name: data.field_name,
      customer_name: data.customer_name || null,
      address: data.address || null,
      has_electricity: data.has_electricity,
      has_water: data.has_water,
      has_toilet: data.has_toilet,
      toilet_distance: data.toilet_distance || null,
      travel_distance_km: data.travel_distance_km || null,
      travel_time_minutes: data.travel_time_minutes || null,
      travel_cost: data.travel_cost || null,
      notes: data.notes || null,
      warnings: data.warnings || null,
    }

    if (isEditMode && fieldId) {
      const { error: err } = await updateField(fieldId, fieldInput)
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${err}`)
        setSubmitting(false)
      } else {
        toast.success('現場情報を更新しました')
        onNavigate('field-list')
      }
    } else {
      const { error: err } = await createField(fieldInput)
      if (err) {
        setError(err)
        toast.error(`登録に失敗しました: ${err}`)
        setSubmitting(false)
      } else {
        toast.success('現場を登録しました')
        onNavigate('field-list')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('field-list')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? '現場編集' : '現場登録'}
          </h1>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">
                エラー: {translateSupabaseError(error)}
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_code">
                    現場コード <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="field_code"
                    {...register('field_code')}
                    placeholder="例: KT-0001"
                  />
                  {errors.field_code && (
                    <p className="text-sm text-destructive">
                      {errors.field_code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_name">
                    現場名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="field_name"
                    {...register('field_name')}
                    placeholder="例: ○○公園"
                  />
                  {errors.field_name && (
                    <p className="text-sm text-destructive">
                      {errors.field_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_name">顧客名</Label>
                <Input
                  id="customer_name"
                  {...register('customer_name')}
                  placeholder="例: 山田様"
                />
                {errors.customer_name && (
                  <p className="text-sm text-destructive">
                    {errors.customer_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="例: 愛知県名古屋市○○区..."
                />
              </div>
            </CardContent>
          </Card>

          {/* 現場環境 */}
          <Card>
            <CardHeader>
              <CardTitle>現場環境</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_electricity"
                    checked={hasElectricity}
                    onCheckedChange={(checked) =>
                      setValue('has_electricity', !!checked)
                    }
                  />
                  <Label htmlFor="has_electricity" className="cursor-pointer">
                    電気使用可能
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_water"
                    checked={hasWater}
                    onCheckedChange={(checked) =>
                      setValue('has_water', !!checked)
                    }
                  />
                  <Label htmlFor="has_water" className="cursor-pointer">
                    水道利用可能
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_toilet"
                    checked={hasToilet}
                    onCheckedChange={(checked) =>
                      setValue('has_toilet', !!checked)
                    }
                  />
                  <Label htmlFor="has_toilet" className="cursor-pointer">
                    トイレ使用可能
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toilet_distance">
                  トイレまでの距離（例: 徒歩5分、車で10分）
                </Label>
                <Input
                  id="toilet_distance"
                  {...register('toilet_distance')}
                  placeholder="例: 徒歩5分"
                />
              </div>
            </CardContent>
          </Card>

          {/* 移動費情報 */}
          <Card>
            <CardHeader>
              <CardTitle>移動費情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="travel_distance_km">往復移動距離（km）</Label>
                  <Input
                    id="travel_distance_km"
                    type="number"
                    step="0.1"
                    {...register('travel_distance_km', { valueAsNumber: true })}
                    placeholder="例: 10.5"
                  />
                  {errors.travel_distance_km && (
                    <p className="text-sm text-destructive">
                      {errors.travel_distance_km.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travel_time_minutes">往復移動時間（分）</Label>
                  <Input
                    id="travel_time_minutes"
                    type="number"
                    {...register('travel_time_minutes', { valueAsNumber: true })}
                    placeholder="例: 20"
                  />
                  {errors.travel_time_minutes && (
                    <p className="text-sm text-destructive">
                      {errors.travel_time_minutes.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travel_cost">往復移動費（円）</Label>
                  <Input
                    id="travel_cost"
                    type="number"
                    {...register('travel_cost', { valueAsNumber: true })}
                    placeholder="例: 800"
                  />
                  {errors.travel_cost && (
                    <p className="text-sm text-destructive">
                      {errors.travel_cost.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 備考・注意事項 */}
          <Card>
            <CardHeader>
              <CardTitle>備考・注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">現場備考</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="現場に関する補足情報を入力..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warnings">注意事項</Label>
                <Textarea
                  id="warnings"
                  {...register('warnings')}
                  placeholder="作業時の注意事項を入力..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate('field-list')}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              {submitting
                ? '保存中...'
                : isEditMode
                ? '更新'
                : '登録'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
