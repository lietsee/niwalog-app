import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectCard } from '@/components/ProjectCard'
import { listProjectsByField, deleteProject } from '@/lib/projectsApi'
import { getFieldById, type Field } from '@/lib/fieldsApi'
import type { Project } from '@/lib/types'

interface ProjectListPageProps {
  fieldId: string
  onBack: () => void
  onCreateProject: () => void
  onEditProject: (projectId: string) => void
  onClickProject: (projectId: string) => void
}

export function ProjectListPage({
  fieldId,
  onBack,
  onCreateProject,
  onEditProject,
  onClickProject,
}: ProjectListPageProps) {
  const [field, setField] = useState<Field | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    // 現場情報と案件一覧を並列で取得
    const [fieldResult, projectsResult] = await Promise.all([
      getFieldById(fieldId),
      listProjectsByField(fieldId),
    ])

    if (fieldResult.error) {
      setError(fieldResult.error)
      toast.error(`現場情報の読み込みに失敗しました: ${fieldResult.error}`)
    } else {
      setField(fieldResult.data)
    }

    if (projectsResult.error) {
      setError(projectsResult.error)
      toast.error(`案件一覧の読み込みに失敗しました: ${projectsResult.error}`)
    } else {
      setProjects(projectsResult.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [fieldId])

  const handleEdit = (project: Project) => {
    onEditProject(project.id)
  }

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return

    setDeleting(true)
    const { error: err } = await deleteProject(projectToDelete.id)

    if (err) {
      setError(err)
      toast.error(`削除に失敗しました: ${err}`)
      setDeleting(false)
    } else {
      setProjects(projects.filter((p) => p.id !== projectToDelete.id))
      toast.success('案件を削除しました')
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      setDeleting(false)
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
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{field?.field_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{field?.field_code}</Badge>
                {field?.customer_name && (
                  <span className="text-sm text-muted-foreground">
                    {field.customer_name}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              新規案件
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

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              案件が登録されていません。「新規案件」ボタンから登録してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onClick={(p) => onClickProject(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>案件を削除しますか？</DialogTitle>
            <DialogDescription>
              案件 #{projectToDelete?.project_number} を削除します。この操作は取り消せません。
              <br />
              削除された案件は履歴テーブルに保存されます。
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
