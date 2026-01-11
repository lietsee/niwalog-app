import { Calendar, Cloud, Users, Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WorkDayWithRecords } from '@/lib/types'

interface WorkDayCardProps {
  workDay: WorkDayWithRecords
  onEdit: (workDay: WorkDayWithRecords) => void
  onDelete: (workDay: WorkDayWithRecords) => void
  onDuplicate?: (workDay: WorkDayWithRecords) => void
  onClick?: (workDay: WorkDayWithRecords) => void
}

export function WorkDayCard({ workDay, onEdit, onDelete, onDuplicate, onClick }: WorkDayCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const getWeatherSummary = () => {
    if (!workDay.weather || workDay.weather.length === 0) return null
    return workDay.weather.map((w) => w.condition).join(' → ')
  }

  const totalHours = workDay.work_records.reduce(
    (sum, record) => sum + (record.working_hours || 0),
    0
  )

  const handleCardClick = () => {
    if (onClick) {
      onClick(workDay)
    }
  }

  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">#{workDay.day_number}日目</Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(workDay.work_date)}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              {getWeatherSummary() && (
                <div className="flex items-center text-muted-foreground">
                  <Cloud className="h-4 w-4 mr-1" />
                  {getWeatherSummary()}
                </div>
              )}

              <div className="flex items-center text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {workDay.work_records.length}名
                {totalHours > 0 && (
                  <span className="ml-2">
                    （計 {totalHours.toFixed(1)} 時間）
                  </span>
                )}
              </div>

              {workDay.work_description && (
                <p className="text-muted-foreground line-clamp-2 mt-2">
                  {workDay.work_description}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-1 ml-2">
            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(workDay)
                }}
                title="この作業日を複製"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(workDay)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(workDay)
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
