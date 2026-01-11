import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmployeeCard } from '@/components/EmployeeCard'
import {
  listAllEmployees,
  listActiveEmployees,
  searchEmployees,
  deleteEmployee,
  reactivateEmployee,
} from '@/lib/employeesApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { Employee, Page } from '@/lib/types'

interface EmployeeListPageProps {
  onNavigate: (page: Page, employeeCode?: string) => void
}

export function EmployeeListPage({ onNavigate }: EmployeeListPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadEmployees = async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = showInactive
      ? await listAllEmployees()
      : await listActiveEmployees()

    if (err) {
      setError(err)
      toast.error(`読み込みに失敗しました: ${err}`)
    } else {
      setEmployees(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [showInactive])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadEmployees()
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await searchEmployees(searchTerm)

    if (err) {
      setError(err)
      toast.error(`検索に失敗しました: ${err}`)
    } else {
      // 無効な従業員の表示フィルタを適用
      const filtered = showInactive
        ? data || []
        : (data || []).filter((e) => e.is_active)
      setEmployees(filtered)
    }

    setLoading(false)
  }

  const handleEdit = (employee: Employee) => {
    onNavigate('employee-form', employee.employee_code)
  }

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleReactivate = async (employee: Employee) => {
    const { error: err } = await reactivateEmployee(employee.employee_code)
    if (err) {
      toast.error(`再有効化に失敗しました: ${translateSupabaseError(err)}`)
    } else {
      toast.success(`${employee.name}を再有効化しました`)
      loadEmployees()
    }
  }

  const confirmDelete = async () => {
    if (!employeeToDelete) return

    setDeleting(true)
    const { error: err } = await deleteEmployee(employeeToDelete.employee_code)

    if (err) {
      const translatedError = translateSupabaseError(err)
      setError(translatedError)
      toast.error(translatedError)
      setDeleting(false)
    } else {
      if (showInactive) {
        // 無効化されたので、リストを更新
        setEmployees(
          employees.map((e) =>
            e.employee_code === employeeToDelete.employee_code
              ? { ...e, is_active: false }
              : e
          )
        )
      } else {
        // 有効な従業員のみ表示中なので、リストから除外
        setEmployees(
          employees.filter(
            (e) => e.employee_code !== employeeToDelete.employee_code
          )
        )
      }
      toast.success('従業員を無効化しました')
      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)
      setDeleting(false)
    }
  }

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
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
              <h1 className="text-3xl font-bold">従業員一覧</h1>
            </div>
            <Button onClick={() => onNavigate('employee-form')}>
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="従業員コードまたは氏名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              検索
            </Button>
            {searchTerm && (
              <Button
                onClick={() => {
                  setSearchTerm('')
                  loadEmployees()
                }}
                variant="outline"
              >
                クリア
              </Button>
            )}
            <Button
              onClick={() => setShowInactive(!showInactive)}
              variant={showInactive ? 'default' : 'outline'}
              title={showInactive ? '有効な従業員のみ表示' : '無効な従業員も表示'}
            >
              {showInactive ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  全て表示中
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  有効のみ
                </>
              )}
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

        {employees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm
                ? '検索結果がありません'
                : '従業員が登録されていません。「新規登録」ボタンから登録してください。'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.employee_code}
                employee={employee}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onReactivate={showInactive ? handleReactivate : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>従業員を無効化しますか？</DialogTitle>
            <DialogDescription>
              「{employeeToDelete?.name}」（{employeeToDelete?.employee_code}
              ）を無効化します。
              <br />
              無効化された従業員は後から再有効化できます。
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
              {deleting ? '処理中...' : '無効化'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
