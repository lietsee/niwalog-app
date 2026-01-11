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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getExpenseById,
  createExpense,
  updateExpense,
} from '@/lib/expensesApi'
import { getProjectWithField } from '@/lib/projectsApi'
import { expenseSchema, type ExpenseFormData } from '@/schemas/expenseSchema'
import type { ProjectWithField } from '@/lib/types'

interface ExpenseFormPageProps {
  projectId: string
  expenseId?: string
  onBack: () => void
  onSuccess: () => void
}

export function ExpenseFormPage({
  projectId,
  expenseId,
  onBack,
  onSuccess,
}: ExpenseFormPageProps) {
  const [project, setProject] = useState<ProjectWithField | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!expenseId

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      project_id: projectId,
      expense_item: '',
      amount: 0,
      expense_date: null,
      notes: null,
    },
  })

  useEffect(() => {
    loadInitialData()
  }, [projectId, expenseId])

  const loadInitialData = async () => {
    setLoading(true)
    setError(null)

    // 案件情報を取得
    const projectResult = await getProjectWithField(projectId)
    if (projectResult.error) {
      setError(projectResult.error)
      toast.error(`案件情報の取得に失敗しました: ${projectResult.error}`)
      setLoading(false)
      return
    }
    setProject(projectResult.data)

    if (isEditMode && expenseId) {
      // 編集モード: 経費情報を取得
      const expenseResult = await getExpenseById(expenseId)
      if (expenseResult.error) {
        setError(expenseResult.error)
        toast.error(`経費情報の取得に失敗しました: ${expenseResult.error}`)
      } else if (expenseResult.data) {
        const data = expenseResult.data
        setValue('project_id', data.project_id)
        setValue('expense_item', data.expense_item)
        setValue('amount', data.amount)
        setValue('expense_date', data.expense_date)
        setValue('notes', data.notes)
      }
    }

    setLoading(false)
  }

  const onSubmit = async (data: ExpenseFormData) => {
    setSubmitting(true)
    setError(null)

    const expenseInput = {
      project_id: data.project_id,
      expense_item: data.expense_item,
      amount: data.amount,
      expense_date: data.expense_date || null,
      notes: data.notes || null,
    }

    if (isEditMode && expenseId) {
      const { error: err } = await updateExpense(expenseId, {
        expense_item: expenseInput.expense_item,
        amount: expenseInput.amount,
        expense_date: expenseInput.expense_date,
        notes: expenseInput.notes,
      })
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('経費を更新しました')
        onSuccess()
      }
    } else {
      const { error: err } = await createExpense(expenseInput)
      if (err) {
        setError(err)
        toast.error(`登録に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('経費を登録しました')
        onSuccess()
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
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? '経費編集' : '経費登録'}
            </h1>
            {project && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{project.fields.field_code}</Badge>
                <Badge variant="outline">#{project.project_number}</Badge>
                <span className="text-sm text-muted-foreground">
                  {project.fields.field_name}
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
          {/* 経費情報 */}
          <Card>
            <CardHeader>
              <CardTitle>経費情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense_item">
                  項目名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expense_item"
                  {...register('expense_item')}
                  placeholder="例: ラフタークレーン（1日）"
                />
                {errors.expense_item && (
                  <p className="text-sm text-destructive">
                    {errors.expense_item.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    金額（円） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    {...register('amount')}
                    placeholder="例: 50000"
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense_date">使用日</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    {...register('expense_date')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="経費に関するメモを入力..."
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
    </div>
  )
}
