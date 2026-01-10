import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
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
import {
  listAllFields,
  searchFieldsByCode,
  searchFieldsByName,
  deleteField,
  type Field,
} from '@/lib/fieldsApi'
import type { Page } from '@/lib/types'

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

  const loadFields = async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await listAllFields()
    if (err) {
      setError(err)
      toast.error(`読み込みに失敗しました: ${err}`)
    } else {
      setFields(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFields()
  }, [])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadFields()
      return
    }

    setLoading(true)
    setError(null)

    // 現場コードと現場名の両方で検索
    const [codeResult, nameResult] = await Promise.all([
      searchFieldsByCode(searchTerm),
      searchFieldsByName(searchTerm),
    ])

    // 結果をマージ（重複を除く）
    const codeFields = codeResult.data || []
    const nameFields = nameResult.data || []
    const mergedFields = [
      ...codeFields,
      ...nameFields.filter(
        (nf) => !codeFields.some((cf) => cf.id === nf.id)
      ),
    ]

    setFields(mergedFields)
    setLoading(false)
  }

  const handleEdit = (field: Field) => {
    onNavigate('field-form', field.id)
  }

  const handleDeleteClick = (field: Field) => {
    setFieldToDelete(field)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!fieldToDelete) return

    setDeleting(true)
    const { error: err } = await deleteField(fieldToDelete.id)

    if (err) {
      setError(err)
      toast.error(`削除に失敗しました: ${err}`)
      setDeleting(false)
    } else {
      // 削除成功したらリストから除外
      setFields(fields.filter((f) => f.id !== fieldToDelete.id))
      toast.success('現場を削除しました')
      setDeleteDialogOpen(false)
      setFieldToDelete(null)
      setDeleting(false)
    }
  }

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
            <Button onClick={() => onNavigate('field-form')}>
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="現場コードまたは現場名で検索..."
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
                  loadFields()
                }}
                variant="outline"
              >
                クリア
              </Button>
            )}
          </div>
        </div>

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
              {searchTerm
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
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
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
            <DialogDescription>
              「{fieldToDelete?.field_name}」（{fieldToDelete?.field_code}
              ）を削除します。この操作は取り消せません。
              <br />
              削除された現場は履歴テーブルに保存されます。
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
              {deleting ? '削除中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
