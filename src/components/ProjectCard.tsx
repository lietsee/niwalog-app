import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Calendar, CircleDollarSign } from 'lucide-react'
import type { Project } from '@/lib/types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onClick?: (project: Project) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)
}

export function ProjectCard({ project, onEdit, onDelete, onClick }: ProjectCardProps) {
  const workTypes: string[] = []
  if (project.work_type_pruning) workTypes.push('剪定')
  if (project.work_type_weeding) workTypes.push('除草')
  if (project.work_type_cleaning) workTypes.push('清掃')
  if (project.work_type_other) workTypes.push(project.work_type_other)

  const handleCardClick = () => {
    if (onClick) {
      onClick(project)
    }
  }

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              案件 #{project.project_number}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(project.implementation_date)}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(project)
              }}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(project)
              }}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {workTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {workTypes.map((type, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t">
            <CircleDollarSign className="h-4 w-4" />
            <span>請求: {formatCurrency(project.invoice_amount)}</span>
          </div>
          {project.estimate_amount !== null && (
            <div className="text-xs text-muted-foreground">
              見積: {formatCurrency(project.estimate_amount)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
