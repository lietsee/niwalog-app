import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EmployeeWorkSummary } from '@/lib/types'

interface EmployeeHoursTableProps {
  data: EmployeeWorkSummary[]
}

export function EmployeeHoursTable({ data }: EmployeeHoursTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>今月の従業員稼働</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-muted-foreground text-center py-4">
            稼働データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    従業員コード
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    稼働時間
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((employee) => (
                  <tr key={employee.employeeCode} className="border-b last:border-0">
                    <td className="py-2 px-3">{employee.employeeCode}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {employee.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
