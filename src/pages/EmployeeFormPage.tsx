import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { translateSupabaseError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  createEmployee,
  updateEmployee,
  getEmployeeByCode,
  type EmployeeInput,
} from '@/lib/employeesApi'
import { employeeSchema, type EmployeeFormData } from '@/schemas/employeeSchema'
import type { Page, SalaryType } from '@/lib/types'

interface EmployeeFormPageProps {
  onNavigate: (page: Page) => void
  employeeCode?: string
}

export function EmployeeFormPage({ onNavigate, employeeCode }: EmployeeFormPageProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!employeeCode

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as never,
    defaultValues: {
      employee_code: '',
      name: '',
      salary_type: 'hourly',
      hourly_rate: null,
      daily_rate: null,
      is_active: true,
    },
  })

  const salaryType = watch('salary_type')

  useEffect(() => {
    if (isEditMode && employeeCode) {
      loadEmployee()
    }
  }, [employeeCode])

  const loadEmployee = async () => {
    if (!employeeCode) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getEmployeeByCode(employeeCode)

    if (err) {
      setError(err)
      toast.error(`従業員情報の取得に失敗しました: ${err}`)
    } else if (data) {
      setValue('employee_code', data.employee_code)
      setValue('name', data.name)
      setValue('salary_type', data.salary_type)
      setValue('hourly_rate', data.hourly_rate)
      setValue('daily_rate', data.daily_rate)
      setValue('is_active', data.is_active)
    }

    setLoading(false)
  }

  const onSubmit = async (data: EmployeeFormData) => {
    setSubmitting(true)
    setError(null)

    const employeeInput: EmployeeInput = {
      employee_code: data.employee_code,
      name: data.name,
      salary_type: data.salary_type as SalaryType,
      hourly_rate: data.salary_type === 'hourly' ? (data.hourly_rate ?? null) : null,
      daily_rate: data.salary_type !== 'hourly' ? (data.daily_rate ?? null) : null,
      is_active: data.is_active,
    }

    if (isEditMode && employeeCode) {
      const { employee_code: _, ...updateData } = employeeInput
      const { error: err } = await updateEmployee(employeeCode, updateData)
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('従業員情報を更新しました')
        onNavigate('employee-list')
      }
    } else {
      const { error: err } = await createEmployee(employeeInput)
      if (err) {
        setError(err)
        toast.error(`登録に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
      } else {
        toast.success('従業員を登録しました')
        onNavigate('employee-list')
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
      <div className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('employee-list')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? '従業員編集' : '従業員登録'}
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
              <div className="space-y-2">
                <Label htmlFor="employee_code">
                  従業員コード <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="employee_code"
                  {...register('employee_code')}
                  placeholder="例: f001"
                  disabled={isEditMode}
                />
                <p className="text-xs text-muted-foreground">
                  半角英数字とハイフン、アンダースコアのみ使用可能
                </p>
                {errors.employee_code && (
                  <p className="text-sm text-destructive">
                    {errors.employee_code.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  氏名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="例: 山田太郎"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 給与情報 */}
          <Card>
            <CardHeader>
              <CardTitle>給与情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  給与タイプ <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={salaryType}
                  onValueChange={(value: string) =>
                    setValue('salary_type', value as SalaryType)
                  }
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hourly" id="hourly" />
                    <Label htmlFor="hourly" className="font-normal cursor-pointer">
                      時給
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="font-normal cursor-pointer">
                      日給月給
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="font-normal cursor-pointer">
                      月給
                    </Label>
                  </div>
                </RadioGroup>
                {errors.salary_type && (
                  <p className="text-sm text-destructive">
                    {errors.salary_type.message}
                  </p>
                )}
              </div>

              {salaryType === 'hourly' && (
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">
                    時給（円） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    {...register('hourly_rate')}
                    placeholder="例: 1500"
                    min={0}
                  />
                  {errors.hourly_rate && (
                    <p className="text-sm text-destructive">
                      {errors.hourly_rate.message}
                    </p>
                  )}
                </div>
              )}

              {(salaryType === 'daily' || salaryType === 'monthly') && (
                <div className="space-y-2">
                  <Label htmlFor="daily_rate">
                    日給（円） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    {...register('daily_rate')}
                    placeholder="例: 15000"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    同じ日に複数案件に従事した場合、稼働時間の割合で按分されます
                  </p>
                  {errors.daily_rate && (
                    <p className="text-sm text-destructive">
                      {errors.daily_rate.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate('employee-list')}
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
