import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Calendar, CircleDollarSign } from 'lucide-react'
import { translateSupabaseError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getProjectWithField } from '@/lib/projectsApi'
import { listWorkDaysWithRecords, deleteWorkDay, createWorkDay, getNextDayNumber } from '@/lib/workDaysApi'
import { createWorkRecords } from '@/lib/workRecordsApi'
import { listExpensesByProject, deleteExpense } from '@/lib/expensesApi'
import { WorkDayCard } from '@/components/WorkDayCard'
import { ExpenseCard } from '@/components/ExpenseCard'
import type { ProjectWithField, WorkDayWithRecords, Expense } from '@/lib/types'

interface ProjectDetailPageProps {
  projectId: string
  onBack: () => void
  onCreateWorkDay: () => void
  onEditWorkDay: (workDayId: string) => void
  onCreateExpense: () => void
  onEditExpense: (expenseId: string) => void
}

export function ProjectDetailPage({
  projectId,
  onBack,
  onCreateWorkDay,
  onEditWorkDay,
  onCreateExpense,
  onEditExpense,
}: ProjectDetailPageProps) {
  const [project, setProject] = useState<ProjectWithField | null>(null)
  const [workDays, setWorkDays] = useState<WorkDayWithRecords[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'workDay' | 'expense'
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoading(true)

    const [projectResult, workDaysResult, expensesResult] = await Promise.all([
      getProjectWithField(projectId),
      listWorkDaysWithRecords(projectId),
      listExpensesByProject(projectId),
    ])

    if (projectResult.error) {
      toast.error(`案件情報の取得に失敗しました: ${projectResult.error}`)
    } else {
      setProject(projectResult.data)
    }

    if (workDaysResult.error) {
      toast.error(`作業日情報の取得に失敗しました: ${workDaysResult.error}`)
    } else {
      setWorkDays(workDaysResult.data || [])
    }

    if (expensesResult.error) {
      toast.error(`経費情報の取得に失敗しました: ${expensesResult.error}`)
    } else {
      setExpenses(expensesResult.data || [])
    }

    setLoading(false)
  }

  const handleDeleteWorkDay = async () => {
    if (!deleteTarget || deleteTarget.type !== 'workDay') return

    const { error } = await deleteWorkDay(deleteTarget.id)
    if (error) {
      toast.error(`削除に失敗しました: ${translateSupabaseError(error)}`)
    } else {
      toast.success('作業日を削除しました')
      loadData()
    }
    setDeleteTarget(null)
  }

  const handleDeleteExpense = async () => {
    if (!deleteTarget || deleteTarget.type !== 'expense') return

    const { error } = await deleteExpense(deleteTarget.id)
    if (error) {
      toast.error(`削除に失敗しました: ${translateSupabaseError(error)}`)
    } else {
      toast.success('経費を削除しました')
      loadData()
    }
    setDeleteTarget(null)
  }

  const handleDuplicateWorkDay = async (workDay: WorkDayWithRecords) => {
    // 次の日番号を取得
    const nextNumberResult = await getNextDayNumber(projectId)
    if (nextNumberResult.error) {
      toast.error(`日番号の取得に失敗しました: ${translateSupabaseError(nextNumberResult.error)}`)
      return
    }

    // 作業日を複製
    const { data: createdWorkDay, error: createError } = await createWorkDay({
      project_id: projectId,
      day_number: nextNumberResult.data!,
      work_date: workDay.work_date,
      weather: workDay.weather,
      work_description: workDay.work_description,
      troubles: workDay.troubles,
    })

    if (createError || !createdWorkDay) {
      toast.error(`作業日の複製に失敗しました: ${translateSupabaseError(createError || '')}`)
      return
    }

    // 従事者稼働記録を複製（4時刻対応）
    if (workDay.work_records.length > 0) {
      const recordsToCreate = workDay.work_records.map((r) => ({
        work_day_id: createdWorkDay.id,
        employee_code: r.employee_code,
        clock_in: r.clock_in || null,
        site_arrival: r.site_arrival,
        site_departure: r.site_departure,
        clock_out: r.clock_out || null,
        break_minutes: r.break_minutes ?? 60,
      }))
      const { error: recordError } = await createWorkRecords(recordsToCreate)
      if (recordError) {
        toast.error(`従事者記録の複製に失敗しました: ${translateSupabaseError(recordError)}`)
      }
    }

    toast.success(`作業日を複製しました（${nextNumberResult.data}日目）`)
    loadData()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">案件が見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{project.fields.field_code}</Badge>
              <Badge variant="outline">#{project.project_number}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{project.fields.field_name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(project.implementation_date)}
              </span>
              {project.fields.customer_name && (
                <span>{project.fields.customer_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* タブ */}
        <Tabs defaultValue="workdays" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workdays">
              作業日 ({workDays.length})
            </TabsTrigger>
            <TabsTrigger value="expenses">
              経費 ({expenses.length})
            </TabsTrigger>
          </TabsList>

          {/* 作業日タブ */}
          <TabsContent value="workdays" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {workDays.length > 0
                  ? `${workDays.length}日間の作業記録`
                  : '作業記録はまだありません'}
              </p>
              <Button onClick={onCreateWorkDay}>
                <Plus className="h-4 w-4 mr-2" />
                作業日を追加
              </Button>
            </div>

            {workDays.length > 0 ? (
              <div className="space-y-3">
                {workDays.map((workDay) => (
                  <WorkDayCard
                    key={workDay.id}
                    workDay={workDay}
                    onEdit={(wd) => onEditWorkDay(wd.id)}
                    onDelete={(wd) =>
                      setDeleteTarget({
                        type: 'workDay',
                        id: wd.id,
                        name: `${wd.day_number}日目`,
                      })
                    }
                    onDuplicate={handleDuplicateWorkDay}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>作業日を追加して、日々の作業記録を残しましょう</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 経費タブ */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {expenses.length > 0
                  ? `合計: ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(expenseTotal)}`
                  : '経費はまだ登録されていません'}
              </p>
              <Button onClick={onCreateExpense}>
                <Plus className="h-4 w-4 mr-2" />
                経費を追加
              </Button>
            </div>

            {expenses.length > 0 ? (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={(e) => onEditExpense(e.id)}
                    onDelete={(e) =>
                      setDeleteTarget({
                        type: 'expense',
                        id: e.id,
                        name: e.expense_item,
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CircleDollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>経費を追加して、案件の収支を管理しましょう</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 削除確認ダイアログ */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.type === 'workDay' ? '作業日' : '経費'}を削除しますか？
              </AlertDialogTitle>
              <AlertDialogDescription>
                「{deleteTarget?.name}」を削除します。この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={
                  deleteTarget?.type === 'workDay'
                    ? handleDeleteWorkDay
                    : handleDeleteExpense
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
