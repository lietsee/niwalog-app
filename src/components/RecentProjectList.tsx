import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RecentProject } from '@/lib/types'

interface RecentProjectListProps {
  projects: RecentProject[]
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-'
  return `¥${value.toLocaleString()}`
}

export function RecentProjectList({ projects }: RecentProjectListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>直近の案件</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">
            案件がありません
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{project.fieldName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(project.implementationDate), 'yyyy年M月d日', { locale: ja })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    {formatCurrency(project.invoiceAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
