import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listAllFields, type Field } from '@/lib/fieldsApi'
import {
  createAnnualContract,
  updateAnnualContract,
  getAnnualContractById,
} from '@/lib/annualContractsApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { Page, AnnualContractInput, RevenueRecognitionMethod } from '@/lib/types'

interface AnnualContractFormPageProps {
  onNavigate: (page: Page) => void
  contractId?: string
}

export function AnnualContractFormPage({ onNavigate, contractId }: AnnualContractFormPageProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const isEditMode = !!contractId

  // フォームの状態
  const [formData, setFormData] = useState<{
    field_id: string
    contract_name: string
    fiscal_year: number
    contract_start_date: string
    contract_end_date: string
    contract_amount: string
    budget_hours: string
    revenue_recognition_method: RevenueRecognitionMethod
    notes: string
  }>({
    field_id: '',
    contract_name: '',
    fiscal_year: new Date().getFullYear(),
    contract_start_date: '',
    contract_end_date: '',
    contract_amount: '',
    budget_hours: '',
    revenue_recognition_method: 'hours_based',
    notes: '',
  })

  // 年度リスト（今年から3年前まで + 来年）
  const currentYear = new Date().getFullYear()
  const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i)

  useEffect(() => {
    loadFields()
    if (isEditMode && contractId) {
      loadContract()
    }
  }, [contractId])

  const loadFields = async () => {
    const { data, error: err } = await listAllFields()
    if (err) {
      toast.error(`現場一覧の取得に失敗しました: ${err}`)
    } else {
      setFields(data || [])
    }
  }

  const loadContract = async () => {
    if (!contractId) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getAnnualContractById(contractId)

    if (err) {
      setError(err)
      toast.error(`年間契約の取得に失敗しました: ${err}`)
    } else if (data) {
      setFormData({
        field_id: data.field_id,
        contract_name: data.contract_name,
        fiscal_year: data.fiscal_year,
        contract_start_date: data.contract_start_date,
        contract_end_date: data.contract_end_date,
        contract_amount: data.contract_amount.toString(),
        budget_hours: data.budget_hours.toString(),
        revenue_recognition_method: data.revenue_recognition_method,
        notes: data.notes || '',
      })
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (!formData.field_id) {
      toast.error('現場を選択してください')
      return
    }
    if (!formData.contract_name.trim()) {
      toast.error('契約名を入力してください')
      return
    }
    if (!formData.contract_start_date || !formData.contract_end_date) {
      toast.error('契約期間を入力してください')
      return
    }
    if (formData.contract_start_date > formData.contract_end_date) {
      toast.error('契約開始日は終了日より前である必要があります')
      return
    }
    if (!formData.contract_amount || parseFloat(formData.contract_amount) <= 0) {
      toast.error('契約金額は0より大きい値を入力してください')
      return
    }
    if (!formData.budget_hours || parseFloat(formData.budget_hours) <= 0) {
      toast.error('予算時間は0より大きい値を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    const input: AnnualContractInput = {
      field_id: formData.field_id,
      contract_name: formData.contract_name.trim(),
      fiscal_year: formData.fiscal_year,
      contract_start_date: formData.contract_start_date,
      contract_end_date: formData.contract_end_date,
      contract_amount: parseInt(formData.contract_amount),
      budget_hours: parseFloat(formData.budget_hours),
      revenue_recognition_method: formData.revenue_recognition_method,
      notes: formData.notes.trim() || null,
    }

    if (isEditMode && contractId) {
      const { error: err } = await updateAnnualContract(contractId, input)
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('年間契約を更新しました')
        onNavigate('annual-contract-list')
      }
    } else {
      const { error: err } = await createAnnualContract(input)
      if (err) {
        setError(err)
        toast.error(`登録に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('年間契約を登録しました')
        onNavigate('annual-contract-list')
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
            onClick={() => onNavigate('annual-contract-list')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? '年間契約編集' : '年間契約登録'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field_id">
                  現場 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.field_id}
                  onValueChange={(value) => setFormData({ ...formData, field_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="現場を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.field_code} - {field.field_name}
                        {field.customer_name && ` (${field.customer_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_name">
                    契約名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract_name"
                    value={formData.contract_name}
                    onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                    placeholder="例: 年間管理契約"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscal_year">
                    年度 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.fiscal_year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, fiscal_year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="年度を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscalYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年度
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 契約期間 */}
          <Card>
            <CardHeader>
              <CardTitle>契約期間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_start_date">
                    契約開始日 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_end_date">
                    契約終了日 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract_end_date"
                    type="date"
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 金額・予算 */}
          <Card>
            <CardHeader>
              <CardTitle>金額・予算</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_amount">
                    契約金額（円） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract_amount"
                    type="number"
                    min="1"
                    value={formData.contract_amount}
                    onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
                    placeholder="例: 20000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_hours">
                    予算時間 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="budget_hours"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.budget_hours}
                    onChange={(e) => setFormData({ ...formData, budget_hours: e.target.value })}
                    placeholder="例: 1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue_recognition_method">収益認識方式</Label>
                <Select
                  value={formData.revenue_recognition_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, revenue_recognition_method: value as RevenueRecognitionMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours_based">時間ベース（推奨）</SelectItem>
                    <SelectItem value="days_based">日数ベース</SelectItem>
                    <SelectItem value="equal_monthly">均等月割</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  時間ベース: 月の実稼働時間 / 年間予算時間 × 契約金額
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 備考 */}
          <Card>
            <CardHeader>
              <CardTitle>備考</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">メモ</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="契約に関する補足情報を入力..."
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
              onClick={() => onNavigate('annual-contract-list')}
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
