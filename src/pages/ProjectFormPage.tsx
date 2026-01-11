import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import { translateSupabaseError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createProject,
  updateProject,
  getProjectById,
  getNextProjectNumber,
  type ProjectInput,
} from '@/lib/projectsApi'
import { getFieldById, type Field } from '@/lib/fieldsApi'
import { calculateLaborCost, type LaborCostResult } from '@/lib/laborCostApi'
import { projectSchema, type ProjectFormData } from '@/schemas/projectSchema'

interface ProjectFormPageProps {
  fieldId: string
  projectId?: string
  onBack: () => void
  onSuccess: () => void
}

export function ProjectFormPage({
  fieldId,
  projectId,
  onBack,
  onSuccess,
}: ProjectFormPageProps) {
  const [field, setField] = useState<Field | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [laborCostDialogOpen, setLaborCostDialogOpen] = useState(false)
  const [laborCostResult, setLaborCostResult] = useState<LaborCostResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const isEditMode = !!projectId

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as never,
    defaultValues: {
      field_id: fieldId,
      project_number: 1,
      implementation_date: '',
      work_type_pruning: false,
      work_type_weeding: false,
      work_type_cleaning: false,
      work_type_other: null,
      estimate_amount: null,
      invoice_amount: null,
      labor_cost: null,
      review_good_points: null,
      review_improvements: null,
      review_next_actions: null,
    },
  })

  const workTypePruning = watch('work_type_pruning')
  const workTypeWeeding = watch('work_type_weeding')
  const workTypeCleaning = watch('work_type_cleaning')

  useEffect(() => {
    loadInitialData()
  }, [fieldId, projectId])

  const loadInitialData = async () => {
    setLoading(true)
    setError(null)

    // 現場情報を取得
    const fieldResult = await getFieldById(fieldId)
    if (fieldResult.error) {
      setError(fieldResult.error)
      toast.error(`現場情報の取得に失敗しました: ${fieldResult.error}`)
      setLoading(false)
      return
    }
    setField(fieldResult.data)

    if (isEditMode && projectId) {
      // 編集モード: 案件情報を取得
      const projectResult = await getProjectById(projectId)
      if (projectResult.error) {
        setError(projectResult.error)
        toast.error(`案件情報の取得に失敗しました: ${projectResult.error}`)
      } else if (projectResult.data) {
        const data = projectResult.data
        setValue('field_id', data.field_id)
        setValue('project_number', data.project_number)
        setValue('implementation_date', data.implementation_date)
        setValue('work_type_pruning', data.work_type_pruning)
        setValue('work_type_weeding', data.work_type_weeding)
        setValue('work_type_cleaning', data.work_type_cleaning)
        setValue('work_type_other', data.work_type_other)
        setValue('estimate_amount', data.estimate_amount)
        setValue('invoice_amount', data.invoice_amount)
        setValue('labor_cost', data.labor_cost)
        setValue('review_good_points', data.review_good_points)
        setValue('review_improvements', data.review_improvements)
        setValue('review_next_actions', data.review_next_actions)
      }
    } else {
      // 新規作成モード: 次の案件番号を取得
      const nextNumberResult = await getNextProjectNumber(fieldId)
      if (nextNumberResult.data) {
        setValue('project_number', nextNumberResult.data)
      }
      // 実施日を今日に設定
      const today = new Date().toISOString().split('T')[0]
      setValue('implementation_date', today)
    }

    setLoading(false)
  }

  const onSubmit = async (data: ProjectFormData) => {
    setSubmitting(true)
    setError(null)

    const projectInput: ProjectInput = {
      field_id: data.field_id,
      project_number: data.project_number,
      implementation_date: data.implementation_date,
      work_type_pruning: data.work_type_pruning,
      work_type_weeding: data.work_type_weeding,
      work_type_cleaning: data.work_type_cleaning,
      work_type_other: data.work_type_other || null,
      estimate_amount: data.estimate_amount || null,
      invoice_amount: data.invoice_amount || null,
      labor_cost: data.labor_cost || null,
      review_good_points: data.review_good_points || null,
      review_improvements: data.review_improvements || null,
      review_next_actions: data.review_next_actions || null,
    }

    if (isEditMode && projectId) {
      const { error: err } = await updateProject(projectId, projectInput)
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('案件情報を更新しました')
        onSuccess()
      }
    } else {
      const { error: err } = await createProject(projectInput)
      if (err) {
        setError(err)
        toast.error(`登録に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('案件を登録しました')
        onSuccess()
      }
    }
  }

  const handleCalculateLaborCost = async () => {
    if (!projectId) {
      toast.error('人件費計算は案件保存後に利用できます')
      return
    }

    setCalculating(true)
    const { data, error: err } = await calculateLaborCost(projectId)

    if (err) {
      toast.error(`人件費計算に失敗しました: ${translateSupabaseError(err)}`)
      setCalculating(false)
      return
    }

    setLaborCostResult(data)
    setLaborCostDialogOpen(true)
    setCalculating(false)
  }

  const handleApplyLaborCost = () => {
    if (laborCostResult) {
      setValue('labor_cost', laborCostResult.total)
      setLaborCostDialogOpen(false)
      toast.success('人件費を反映しました')
    }
  }

  const salaryTypeLabels: Record<string, string> = {
    hourly: '時給',
    daily: '日給月給',
    monthly: '月給',
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
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? '案件編集' : '案件登録'}
            </h1>
            {field && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{field.field_code}</Badge>
                <span className="text-sm text-muted-foreground">
                  {field.field_name}
                </span>
              </div>
            )}
          </div>
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
                  <Label htmlFor="project_number">
                    案件番号 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="project_number"
                    type="number"
                    {...register('project_number')}
                    placeholder="例: 1"
                  />
                  <p className="text-xs text-muted-foreground">
                    自動採番されますが、変更可能です
                  </p>
                  {errors.project_number && (
                    <p className="text-sm text-destructive">
                      {errors.project_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="implementation_date">
                    実施日 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="implementation_date"
                    type="date"
                    {...register('implementation_date')}
                  />
                  {errors.implementation_date && (
                    <p className="text-sm text-destructive">
                      {errors.implementation_date.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 作業内容 */}
          <Card>
            <CardHeader>
              <CardTitle>作業内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="work_type_pruning"
                    checked={workTypePruning}
                    onCheckedChange={(checked) =>
                      setValue('work_type_pruning', !!checked)
                    }
                  />
                  <Label htmlFor="work_type_pruning" className="cursor-pointer">
                    剪定
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="work_type_weeding"
                    checked={workTypeWeeding}
                    onCheckedChange={(checked) =>
                      setValue('work_type_weeding', !!checked)
                    }
                  />
                  <Label htmlFor="work_type_weeding" className="cursor-pointer">
                    除草
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="work_type_cleaning"
                    checked={workTypeCleaning}
                    onCheckedChange={(checked) =>
                      setValue('work_type_cleaning', !!checked)
                    }
                  />
                  <Label htmlFor="work_type_cleaning" className="cursor-pointer">
                    清掃
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_type_other">その他作業内容</Label>
                <Input
                  id="work_type_other"
                  {...register('work_type_other')}
                  placeholder="例: 植栽、施肥など"
                />
                {errors.work_type_other && (
                  <p className="text-sm text-destructive">
                    {errors.work_type_other.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 金額情報 */}
          <Card>
            <CardHeader>
              <CardTitle>金額情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimate_amount">見積金額（円）</Label>
                  <Input
                    id="estimate_amount"
                    type="number"
                    {...register('estimate_amount')}
                    placeholder="例: 50000"
                  />
                  {errors.estimate_amount && (
                    <p className="text-sm text-destructive">
                      {errors.estimate_amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_amount">請求金額（円）</Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    {...register('invoice_amount')}
                    placeholder="例: 55000"
                  />
                  {errors.invoice_amount && (
                    <p className="text-sm text-destructive">
                      {errors.invoice_amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labor_cost">人件費（円）</Label>
                  <Input
                    id="labor_cost"
                    type="number"
                    {...register('labor_cost')}
                    placeholder="例: 20000"
                  />
                  {errors.labor_cost && (
                    <p className="text-sm text-destructive">
                      {errors.labor_cost.message}
                    </p>
                  )}
                </div>
              </div>

              {isEditMode && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCalculateLaborCost}
                    disabled={calculating}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {calculating ? '計算中...' : '人件費を自動計算'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    従事者稼働記録と従業員マスタから人件費を計算します
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 振り返り */}
          <Card>
            <CardHeader>
              <CardTitle>振り返り</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review_good_points">良かった点</Label>
                <Textarea
                  id="review_good_points"
                  {...register('review_good_points')}
                  placeholder="うまくいったことを入力..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_improvements">改善点</Label>
                <Textarea
                  id="review_improvements"
                  {...register('review_improvements')}
                  placeholder="改善すべきことを入力..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_next_actions">次回への申し送り</Label>
                <Textarea
                  id="review_next_actions"
                  {...register('review_next_actions')}
                  placeholder="次回作業時の注意点などを入力..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
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

      {/* 人件費計算結果ダイアログ */}
      <Dialog open={laborCostDialogOpen} onOpenChange={setLaborCostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>人件費計算結果</DialogTitle>
            <DialogDescription>
              従事者稼働記録から計算した人件費です
            </DialogDescription>
          </DialogHeader>

          {laborCostResult && (
            <div className="space-y-4">
              <div className="text-center py-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">合計人件費</p>
                <p className="text-3xl font-bold">
                  {laborCostResult.total.toLocaleString()}円
                </p>
              </div>

              {laborCostResult.details.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">内訳</p>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {laborCostResult.details.map((detail) => (
                      <div
                        key={detail.employee_code}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{detail.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({salaryTypeLabels[detail.salary_type]})
                          </span>
                        </div>
                        <div className="text-right">
                          <p>{detail.cost.toLocaleString()}円</p>
                          <p className="text-xs text-muted-foreground">
                            {detail.hours.toFixed(1)}時間
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span>時給計</span>
                    <span>{laborCostResult.breakdown.hourly.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>日給月給計</span>
                    <span>{laborCostResult.breakdown.daily.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>月給計</span>
                    <span>{laborCostResult.breakdown.monthly.toLocaleString()}円</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  従事者稼働記録がないか、従業員マスタに登録されていません
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLaborCostDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleApplyLaborCost}>
              反映する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
