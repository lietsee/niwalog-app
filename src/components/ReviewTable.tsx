import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ProjectReview } from '@/lib/types'
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils'

interface ReviewTableProps {
  data: ProjectReview[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function ReviewTable({ data }: ReviewTableProps) {
  const handleExport = () => {
    const filename = `案件レビュー_${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(
      data,
      [
        { key: 'fieldCode', label: '現場コード' },
        { key: 'fieldName', label: '現場名' },
        {
          key: 'projectNumber',
          label: '案件番号',
          formatter: (v) => String(v),
        },
        {
          key: 'implementationDate',
          label: '実施日',
          formatter: (v) => formatDateForExport(v as string),
        },
        { key: 'goodPoints', label: '良かった点' },
        { key: 'improvements', label: '改善点' },
        { key: 'nextActions', label: '次回申し送り' },
      ],
      filename
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>案件レビュー一覧</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          CSVエクスポート
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            レビューデータがありません
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((review) => (
              <div
                key={review.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{review.fieldName}</span>
                    <span className="text-muted-foreground ml-2">
                      ({review.fieldCode})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    第{review.projectNumber}回 /{' '}
                    {formatDate(review.implementationDate)}
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  {review.goodPoints && (
                    <div className="flex">
                      <span className="inline-block w-24 text-green-600 font-medium shrink-0">
                        良かった点:
                      </span>
                      <span className="whitespace-pre-wrap">
                        {review.goodPoints}
                      </span>
                    </div>
                  )}
                  {review.improvements && (
                    <div className="flex">
                      <span className="inline-block w-24 text-orange-600 font-medium shrink-0">
                        改善点:
                      </span>
                      <span className="whitespace-pre-wrap">
                        {review.improvements}
                      </span>
                    </div>
                  )}
                  {review.nextActions && (
                    <div className="flex">
                      <span className="inline-block w-24 text-blue-600 font-medium shrink-0">
                        次回申し送り:
                      </span>
                      <span className="whitespace-pre-wrap">
                        {review.nextActions}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
