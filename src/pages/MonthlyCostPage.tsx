import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getMonthlyCostsByMonth,
  createMonthlyCost,
  updateMonthlyCost,
  deleteMonthlyCost,
  copyFromPreviousMonth,
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES,
} from '@/lib/monthlyCostsApi'
import { monthlyCostSchema, type MonthlyCostFormData } from '@/schemas/monthlyCostSchema'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { MonthlyCost, CostType, Page } from '@/lib/types'

interface MonthlyCostPageProps {
  onNavigate: (page: Page) => void
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function MonthlyCostPage({ onNavigate }: MonthlyCostPageProps) {
  // 現在の年月を取得
  const getCurrentYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [costs, setCosts] = useState<MonthlyCost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォーム関連
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<MonthlyCost | null>(null)
  const [selectedCostType, setSelectedCostType] = useState<CostType>('fixed')
  const [categoryInputMode, setCategoryInputMode] = useState<'select' | 'custom'>('select')
  const [submitting, setSubmitting] = useState(false)

  // 削除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [costToDelete, setCostToDelete] = useState<MonthlyCost | null>(null)
  const [deleting, setDeleting] = useState(false)

  // コピー確認
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copying, setCopying] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MonthlyCostFormData>({
    resolver: zodResolver(monthlyCostSchema) as never,
    defaultValues: {
      year_month: yearMonth,
      cost_type: 'fixed',
      category: '',
      amount: 0,
      notes: null,
    },
  })

  const watchCategory = watch('category')

  const loadCosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await getMonthlyCostsByMonth(yearMonth)

    if (err) {
      setError(err)
      toast.error(`読み込みに失敗しました: ${err}`)
    } else {
      setCosts(data || [])
    }
    setLoading(false)
  }, [yearMonth])

  useEffect(() => {
    loadCosts()
  }, [loadCosts])

  // 年月を変更
  const changeMonth = (delta: number) => {
    const [year, month] = yearMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month + delta
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    } else if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    setYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`)
  }

  // 年月の表示
  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split('-')
    return `${year}年${parseInt(month)}月`
  }

  // 固定費・変動費のグループ化と合計
  const fixedCosts = costs.filter((c) => c.cost_type === 'fixed')
  const variableCosts = costs.filter((c) => c.cost_type === 'variable')
  const fixedTotal = fixedCosts.reduce((sum, c) => sum + c.amount, 0)
  const variableTotal = variableCosts.reduce((sum, c) => sum + c.amount, 0)

  // フォームを開く（新規/編集）
  const openForm = (cost?: MonthlyCost) => {
    if (cost) {
      setEditingCost(cost)
      setSelectedCostType(cost.cost_type)
      // カテゴリが定型リストにあるかチェック
      const categories =
        cost.cost_type === 'fixed'
          ? FIXED_COST_CATEGORIES
          : VARIABLE_COST_CATEGORIES
      const isStandardCategory = (categories as readonly string[]).includes(
        cost.category
      )
      setCategoryInputMode(isStandardCategory ? 'select' : 'custom')
      reset({
        year_month: cost.year_month,
        cost_type: cost.cost_type,
        category: cost.category,
        amount: cost.amount,
        notes: cost.notes,
      })
    } else {
      setEditingCost(null)
      setSelectedCostType('fixed')
      setCategoryInputMode('select')
      reset({
        year_month: yearMonth,
        cost_type: 'fixed',
        category: '',
        amount: 0,
        notes: null,
      })
    }
    setFormDialogOpen(true)
  }

  // フォーム送信
  const onSubmit = async (data: MonthlyCostFormData) => {
    setSubmitting(true)

    if (editingCost) {
      const { error: err } = await updateMonthlyCost(editingCost.id, {
        cost_type: data.cost_type,
        category: data.category,
        amount: data.amount,
        notes: data.notes,
      })

      if (err) {
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
      } else {
        toast.success('月次経費を更新しました')
        setFormDialogOpen(false)
        loadCosts()
      }
    } else {
      const { error: err } = await createMonthlyCost({
        year_month: data.year_month,
        cost_type: data.cost_type,
        category: data.category,
        amount: data.amount,
        notes: data.notes,
      })

      if (err) {
        toast.error(`登録に失敗しました: ${translateSupabaseError(err)}`)
      } else {
        toast.success('月次経費を登録しました')
        setFormDialogOpen(false)
        loadCosts()
      }
    }

    setSubmitting(false)
  }

  // 削除
  const handleDeleteClick = (cost: MonthlyCost) => {
    setCostToDelete(cost)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!costToDelete) return

    setDeleting(true)
    const { error: err } = await deleteMonthlyCost(costToDelete.id)

    if (err) {
      toast.error(`削除に失敗しました: ${translateSupabaseError(err)}`)
    } else {
      toast.success('月次経費を削除しました')
      setCosts(costs.filter((c) => c.id !== costToDelete.id))
      setDeleteDialogOpen(false)
      setCostToDelete(null)
    }
    setDeleting(false)
  }

  // 前月からコピー
  const handleCopyFromPreviousMonth = async () => {
    setCopying(true)
    const { data, error: err } = await copyFromPreviousMonth(yearMonth)

    if (err) {
      toast.error(`コピーに失敗しました: ${translateSupabaseError(err)}`)
    } else {
      toast.success(`${data?.length || 0}件の経費をコピーしました`)
      loadCosts()
    }
    setCopying(false)
    setCopyDialogOpen(false)
  }

  // カテゴリ選択の変更
  const handleCategoryChange = (value: string) => {
    if (value === 'other') {
      setCategoryInputMode('custom')
      setValue('category', '')
    } else {
      setValue('category', value)
    }
  }

  // 経費種別の変更
  const handleCostTypeChange = (value: CostType) => {
    setSelectedCostType(value)
    setValue('cost_type', value)
    setValue('category', '')
    setCategoryInputMode('select')
  }

  const categories =
    selectedCostType === 'fixed' ? FIXED_COST_CATEGORIES : VARIABLE_COST_CATEGORIES

  // コストカードコンポーネント
  const CostItem = ({ cost }: { cost: MonthlyCost }) => (
    <div className="flex items-center justify-between py-2 px-3 bg-white rounded border">
      <div className="flex-1">
        <span className="font-medium">{cost.category}</span>
        {cost.notes && (
          <span className="text-sm text-muted-foreground ml-2">({cost.notes})</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{formatCurrency(cost.amount)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => openForm(cost)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => handleDeleteClick(cost)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  if (loading && costs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold">月次経費管理</h1>
            </div>
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </div>

          {/* 年月選択 */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-xl font-semibold min-w-[140px] text-center">
              {formatYearMonth(yearMonth)}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">エラー: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* 固定費セクション */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">固定費</CardTitle>
              <span className="text-lg font-bold">{formatCurrency(fixedTotal)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {fixedCosts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                固定費が登録されていません
              </p>
            ) : (
              <div className="space-y-2">
                {fixedCosts.map((cost) => (
                  <CostItem key={cost.id} cost={cost} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 変動費セクション */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">変動費</CardTitle>
              <span className="text-lg font-bold">{formatCurrency(variableTotal)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {variableCosts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                変動費が登録されていません
              </p>
            ) : (
              <div className="space-y-2">
                {variableCosts.map((cost) => (
                  <CostItem key={cost.id} cost={cost} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 合計 */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>合計</span>
              <span>{formatCurrency(fixedTotal + variableTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 前月からコピーボタン */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCopyDialogOpen(true)}
            disabled={copying}
          >
            <Copy className="h-4 w-4 mr-2" />
            前月からコピー
          </Button>
        </div>
      </div>

      {/* 登録・編集ダイアログ */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCost ? '月次経費を編集' : '月次経費を登録'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
            <input type="hidden" {...register('year_month')} value={yearMonth} />

            {/* 経費種別 */}
            <div className="space-y-2">
              <Label>経費種別</Label>
              <Select value={selectedCostType} onValueChange={handleCostTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">固定費</SelectItem>
                  <SelectItem value="variable">変動費</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* カテゴリ */}
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              {categoryInputMode === 'select' ? (
                <Select
                  value={watchCategory || ''}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">その他（自由入力）</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    {...register('category')}
                    placeholder="カテゴリを入力"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCategoryInputMode('select')
                      setValue('category', '')
                    }}
                  >
                    選択に戻る
                  </Button>
                </div>
              )}
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* 金額 */}
            <div className="space-y-2">
              <Label htmlFor="amount">金額（円）</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount')}
                placeholder="0"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* 備考 */}
            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="備考（任意）"
                rows={2}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormDialogOpen(false)}
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '処理中...' : editingCost ? '更新' : '登録'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>月次経費を削除しますか？</DialogTitle>
            <DialogDescription>
              「{costToDelete?.category}」（{formatCurrency(costToDelete?.amount || 0)}
              ）を削除します。
              <br />
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? '処理中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* コピー確認ダイアログ */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>前月からコピーしますか？</DialogTitle>
            <DialogDescription>
              前月（
              {formatYearMonth(
                (() => {
                  const [y, m] = yearMonth.split('-').map(Number)
                  let prevY = y,
                    prevM = m - 1
                  if (prevM === 0) {
                    prevM = 12
                    prevY -= 1
                  }
                  return `${prevY}-${String(prevM).padStart(2, '0')}`
                })()
              )}
              ）の経費を{formatYearMonth(yearMonth)}にコピーします。
              <br />
              既存のデータには影響しません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
              disabled={copying}
            >
              キャンセル
            </Button>
            <Button onClick={handleCopyFromPreviousMonth} disabled={copying}>
              {copying ? '処理中...' : 'コピー'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
