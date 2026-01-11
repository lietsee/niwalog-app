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
import { WeatherInput } from '@/components/WeatherInput'
import { WorkRecordInput } from '@/components/WorkRecordInput'
import {
  getWorkDayWithRecords,
  getNextDayNumber,
  createWorkDay,
  updateWorkDay,
} from '@/lib/workDaysApi'
import {
  createWorkRecords,
  updateWorkRecord,
  deleteWorkRecord,
} from '@/lib/workRecordsApi'
import { getProjectWithField } from '@/lib/projectsApi'
import { workDaySchema, type WorkDayFormData, type WorkRecordInput as WorkRecordInputType } from '@/schemas/workDaySchema'
import type { ProjectWithField, WeatherEntry, WorkRecord } from '@/lib/types'

interface WorkDayFormPageProps {
  projectId: string
  workDayId?: string
  onBack: () => void
  onSuccess: () => void
}

export function WorkDayFormPage({
  projectId,
  workDayId,
  onBack,
  onSuccess,
}: WorkDayFormPageProps) {
  const [project, setProject] = useState<ProjectWithField | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherEntry[]>([])
  const [workRecords, setWorkRecords] = useState<WorkRecordInputType[]>([])
  const [existingRecordIds, setExistingRecordIds] = useState<string[]>([])
  const isEditMode = !!workDayId

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<WorkDayFormData>({
    resolver: zodResolver(workDaySchema) as never,
    defaultValues: {
      project_id: projectId,
      day_number: 1,
      work_date: '',
      weather: null,
      work_description: null,
      troubles: null,
    },
  })

  useEffect(() => {
    loadInitialData()
  }, [projectId, workDayId])

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

    if (isEditMode && workDayId) {
      // 編集モード: 作業日情報を取得
      const workDayResult = await getWorkDayWithRecords(workDayId)
      if (workDayResult.error) {
        setError(workDayResult.error)
        toast.error(`作業日情報の取得に失敗しました: ${workDayResult.error}`)
      } else if (workDayResult.data) {
        const data = workDayResult.data
        setValue('project_id', data.project_id)
        setValue('day_number', data.day_number)
        setValue('work_date', data.work_date)
        setValue('work_description', data.work_description)
        setValue('troubles', data.troubles)
        setWeather(data.weather || [])

        // 従事者稼働記録（4時刻対応）
        const records: WorkRecordInputType[] = data.work_records.map((r: WorkRecord) => ({
          id: r.id,
          employee_code: r.employee_code,
          clock_in: r.clock_in || null,
          site_arrival: r.site_arrival,
          site_departure: r.site_departure,
          clock_out: r.clock_out || null,
          break_minutes: r.break_minutes ?? 60,
        }))
        setWorkRecords(records)
        setExistingRecordIds(data.work_records.map((r: WorkRecord) => r.id))
      }
    } else {
      // 新規作成モード: 次の日番号を取得
      const nextNumberResult = await getNextDayNumber(projectId)
      if (nextNumberResult.data) {
        setValue('day_number', nextNumberResult.data)
      }
      // 作業日を今日に設定
      const today = new Date().toISOString().split('T')[0]
      setValue('work_date', today)
    }

    setLoading(false)
  }

  const onSubmit = async (data: WorkDayFormData) => {
    setSubmitting(true)
    setError(null)

    const workDayInput = {
      project_id: data.project_id,
      day_number: data.day_number,
      work_date: data.work_date,
      weather: weather.length > 0 ? weather : null,
      work_description: data.work_description || null,
      troubles: data.troubles || null,
    }

    if (isEditMode && workDayId) {
      // 作業日を更新
      const { error: err } = await updateWorkDay(workDayId, workDayInput)
      if (err) {
        setError(err)
        toast.error(`更新に失敗しました: ${translateSupabaseError(err)}`)
        setSubmitting(false)
        return
      }

      // 従事者稼働記録の更新
      await syncWorkRecords(workDayId)

      toast.success('作業日を更新しました')
      onSuccess()
    } else {
      // 作業日を作成
      const { data: createdWorkDay, error: err } = await createWorkDay(workDayInput)
      if (err || !createdWorkDay) {
        setError(err || '作成に失敗しました')
        toast.error(`登録に失敗しました: ${translateSupabaseError(err || '')}`)
        setSubmitting(false)
        return
      }

      // 従事者稼働記録を作成（4時刻対応）
      if (workRecords.length > 0) {
        const recordsToCreate = workRecords.map((r) => ({
          work_day_id: createdWorkDay.id,
          employee_code: r.employee_code,
          clock_in: r.clock_in || null,
          site_arrival: r.site_arrival,
          site_departure: r.site_departure,
          clock_out: r.clock_out || null,
          break_minutes: r.break_minutes ?? 60,
        }))
        const { error: recordErr } = await createWorkRecords(recordsToCreate)
        if (recordErr) {
          toast.error(`従事者記録の登録に失敗しました: ${translateSupabaseError(recordErr)}`)
        }
      }

      toast.success('作業日を登録しました')
      onSuccess()
    }
  }

  const syncWorkRecords = async (workDayId: string) => {
    // 削除されたレコードを削除
    const currentIds = workRecords.filter((r) => r.id).map((r) => r.id as string)
    const toDelete = existingRecordIds.filter((id) => !currentIds.includes(id))
    for (const id of toDelete) {
      await deleteWorkRecord(id)
    }

    // 既存レコードを更新、新規レコードを作成（4時刻対応）
    const newRecords: {
      work_day_id: string
      employee_code: string
      clock_in?: string | null
      site_arrival: string
      site_departure: string
      clock_out?: string | null
      break_minutes: number
    }[] = []
    for (const record of workRecords) {
      if (record.id) {
        await updateWorkRecord(record.id, {
          employee_code: record.employee_code,
          clock_in: record.clock_in || null,
          site_arrival: record.site_arrival,
          site_departure: record.site_departure,
          clock_out: record.clock_out || null,
          break_minutes: record.break_minutes ?? 60,
        })
      } else {
        newRecords.push({
          work_day_id: workDayId,
          employee_code: record.employee_code,
          clock_in: record.clock_in || null,
          site_arrival: record.site_arrival,
          site_departure: record.site_departure,
          clock_out: record.clock_out || null,
          break_minutes: record.break_minutes ?? 60,
        })
      }
    }

    if (newRecords.length > 0) {
      await createWorkRecords(newRecords)
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
              {isEditMode ? '作業日編集' : '作業日登録'}
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
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day_number">
                    日番号 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="day_number"
                    type="number"
                    {...register('day_number')}
                    placeholder="例: 1"
                  />
                  <p className="text-xs text-muted-foreground">
                    自動採番されますが、変更可能です
                  </p>
                  {errors.day_number && (
                    <p className="text-sm text-destructive">
                      {errors.day_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_date">
                    作業日 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="work_date"
                    type="date"
                    {...register('work_date')}
                  />
                  {errors.work_date && (
                    <p className="text-sm text-destructive">
                      {errors.work_date.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 天候情報 */}
          <Card>
            <CardHeader>
              <CardTitle>天候情報</CardTitle>
            </CardHeader>
            <CardContent>
              <WeatherInput value={weather} onChange={setWeather} />
            </CardContent>
          </Card>

          {/* 作業内容 */}
          <Card>
            <CardHeader>
              <CardTitle>作業内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="work_description">作業内容詳細</Label>
                <Textarea
                  id="work_description"
                  {...register('work_description')}
                  placeholder="この日に行った作業の詳細を入力..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="troubles">トラブル・特記事項</Label>
                <Textarea
                  id="troubles"
                  {...register('troubles')}
                  placeholder="問題が発生した場合はここに記録..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 従事者稼働 */}
          <Card>
            <CardHeader>
              <CardTitle>従事者稼働</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkRecordInput value={workRecords} onChange={setWorkRecords} />
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
