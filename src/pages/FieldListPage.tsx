import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, LayoutDashboard } from 'lucide-react'
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
import { FieldCard } from '@/components/FieldCard'
import { DateFilter } from '@/components/DateFilter'
import {
  searchFieldsWithDateFilter,
  deleteFieldWithCascade,
  getFieldRelatedCounts,
  getFieldFinancialSummaries,
  type Field,
  type FieldRelatedCounts,
} from '@/lib/fieldsApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { Page, FieldFinancialSummary } from '@/lib/types'

interface FieldListPageProps {
  onNavigate: (page: Page, fieldId?: string) => void
}

export function FieldListPage({ onNavigate }: FieldListPageProps) {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [relatedCounts, setRelatedCounts] = useState<FieldRelatedCounts | null>(
    null
  )
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [financialSummaries, setFinancialSummaries] = useState<Map<string, FieldFinancialSummary>>(
    new Map()
  )

  // 日付フィルター用のstate
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined)
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined)
  const [filterDay, setFilterDay] = useState<number | undefined>(undefined)

  const loadFields = useCallback(async (term?: string) => {
    setLoading(true)
    setError(null)

    // テキスト検索と日付フィルタの両方を適用
    const { data, error: err } = await searchFieldsWithDateFilter(
      term?.trim() || undefined,
      filterYear,
      filterMonth,
      filterDay
    )

    if (err) {
      setError(err)
      toast.error(`読み込みに失敗しました: ${err}`)
    } else {
      setFields(data || [])
      // 財務サマリーを取得
      if (data && data.length > 0) {
        const { data: summaries } = await getFieldFinancialSummaries(data)
        if (summaries) {
          setFinancialSummaries(summaries)
        }
      } else {
        setFinancialSummaries(new Map())
      }
    }
    setLoading(false)
  }, [filterYear, filterMonth, filterDay])

  // 初回ロードと日付フィルター変更時に再読み込み
  useEffect(() => {
    loadFields(searchTerm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterMonth, filterDay])

  const handleSearch = async () => {
    loadFields(searchTerm)
  }

  // 日付フィルタークリア
  const handleClearDateFilter = () => {
    setFilterYear(undefined)
    setFilterMonth(undefined)
    setFilterDay(undefined)
  }

  // すべてクリア（テキスト検索 + 日付フィルター）
  const handleClearAll = () => {
    setSearchTerm('')
    handleClearDateFilter()
    // 日付フィルターがクリアされるとuseEffectで再読み込みされるが、
    // searchTermも同時にクリアするので手動で呼ぶ
    loadFields()
  }

  const handleEdit = (field: Field) => {
    onNavigate('field-form', field.id)
  }

  const handleCardClick = (field: Field) => {
    onNavigate('project-list', field.id)
  }

  const handleDeleteClick = async (field: Field) => {
    setFieldToDelete(field)
    setRelatedCounts(null)
    setLoadingCounts(true)
    setDeleteDialogOpen(true)

    // 関連データ件数を取得
    const { data } = await getFieldRelatedCounts(field.id)
    setRelatedCounts(data)
    setLoadingCounts(false)
  }

  const confirmDelete = async () => {
    if (!fieldToDelete) return

    setDeleting(true)
    const { error: err } = await deleteFieldWithCascade(fieldToDelete.id)

    if (err) {
      const translatedError = translateSupabaseError(err)
      setError(translatedError)
      toast.error(translatedError)
      setDeleting(false)
    } else {
      // 削除成功したらリストから除外
      setFields(fields.filter((f) => f.id !== fieldToDelete.id))
      const hasRelated =
        relatedCounts &&
        (relatedCounts.projects > 0 ||
          relatedCounts.workDays > 0 ||
          relatedCounts.workRecords > 0 ||
          relatedCounts.expenses > 0)
      toast.success(
        hasRelated ? '現場と関連データを削除しました' : '現場を削除しました'
      )
      setDeleteDialogOpen(false)
      setFieldToDelete(null)
      setRelatedCounts(null)
      setDeleting(false)
    }
  }

  const hasRelatedData =
    relatedCounts &&
    (relatedCounts.projects > 0 ||
      relatedCounts.workDays > 0 ||
      relatedCounts.workRecords > 0 ||
      relatedCounts.expenses > 0)

  if (loading && fields.length === 0) {
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
            <h1 className="text-3xl font-bold">現場一覧</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                ダッシュボード
              </Button>
              <Button onClick={() => onNavigate('field-form')}>
                <Plus className="h-4 w-4 mr-2" />
                新規登録
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="現場コード、現場名、住所、顧客名で検索..."
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
            {(searchTerm || filterYear) && (
              <Button onClick={handleClearAll} variant="outline">
                すべてクリア
              </Button>
            )}
          </div>

          {/* 日付フィルター */}
          <div className="bg-white rounded-lg border p-3">
            <DateFilter
              year={filterYear}
              month={filterMonth}
              day={filterDay}
              onYearChange={setFilterYear}
              onMonthChange={setFilterMonth}
              onDayChange={setFilterDay}
              onClear={handleClearDateFilter}
            />
          </div>
        </div>

        {/* フィルター適用中の表示 */}
        {(searchTerm || filterYear) && (
          <div className="mb-4 text-sm text-muted-foreground">
            絞り込み条件:
            {searchTerm && <span className="ml-2">「{searchTerm}」</span>}
            {filterYear && (
              <span className="ml-2">
                {filterYear}年
                {filterMonth && `${filterMonth}月`}
                {filterDay && `${filterDay}日`}
              </span>
            )}
            に該当する現場 ({fields.length}件)
          </div>
        )}

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">エラー: {error}</p>
            </CardContent>
          </Card>
        )}

        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm || filterYear
                ? '検索結果がありません'
                : '現場が登録されていません。「新規登録」ボタンから登録してください。'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                financialSummary={financialSummaries.get(field.id)}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onClick={handleCardClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>現場を削除しますか？</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  「{fieldToDelete?.field_name}」（{fieldToDelete?.field_code}
                  ）を削除します。
                </p>

                {loadingCounts && (
                  <p className="text-muted-foreground">
                    関連データを確認中...
                  </p>
                )}

                {hasRelatedData && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                    <p className="font-medium mb-2">
                      以下の関連データも一緒に削除されます:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {relatedCounts!.projects > 0 && (
                        <li>案件: {relatedCounts!.projects}件</li>
                      )}
                      {relatedCounts!.workDays > 0 && (
                        <li>作業日: {relatedCounts!.workDays}件</li>
                      )}
                      {relatedCounts!.workRecords > 0 && (
                        <li>従事者記録: {relatedCounts!.workRecords}件</li>
                      )}
                      {relatedCounts!.expenses > 0 && (
                        <li>経費: {relatedCounts!.expenses}件</li>
                      )}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  この操作は取り消せません。
                  <br />
                  削除されたデータは履歴テーブルに保存されます。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting || loadingCounts}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting || loadingCounts}
            >
              {deleting ? '削除中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
