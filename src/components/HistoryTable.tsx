import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  FieldHistoryRecord,
  ProjectHistoryRecord,
  EmployeeHistoryRecord,
  MonthlyCostHistoryRecord,
} from '@/lib/types'

interface FieldHistoryTableProps {
  data: FieldHistoryRecord[]
}

interface ProjectHistoryTableProps {
  data: ProjectHistoryRecord[]
}

interface EmployeeHistoryTableProps {
  data: EmployeeHistoryRecord[]
}

interface MonthlyCostHistoryTableProps {
  data: MonthlyCostHistoryRecord[]
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CURRENT':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          現行
        </Badge>
      )
    case 'UPDATE':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          更新
        </Badge>
      )
    case 'DELETE':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">削除</Badge>
      )
    case 'INSERT':
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          新規
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function FieldHistoryTable({ data }: FieldHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>現場変更履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            履歴データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">日時</th>
                  <th className="text-left py-3 px-2">操作</th>
                  <th className="text-left py-3 px-2">現場</th>
                  <th className="text-left py-3 px-2">顧客</th>
                  <th className="text-left py-3 px-2">操作者</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 whitespace-nowrap">
                      {formatDateTime(row.operationAt)}
                    </td>
                    <td className="py-3 px-2">{getStatusBadge(row.status)}</td>
                    <td className="py-3 px-2">
                      <div className="font-medium">{row.fieldName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.fieldCode}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.customerName || '-'}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.operationBy || '-'}
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

export function ProjectHistoryTable({ data }: ProjectHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>案件変更履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            履歴データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">日時</th>
                  <th className="text-left py-3 px-2">操作</th>
                  <th className="text-left py-3 px-2">現場</th>
                  <th className="text-left py-3 px-2">案件</th>
                  <th className="text-left py-3 px-2">実施日</th>
                  <th className="text-left py-3 px-2">操作者</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 whitespace-nowrap">
                      {formatDateTime(row.operationAt)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(row.operationType)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium">{row.fieldName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.fieldCode}
                      </div>
                    </td>
                    <td className="py-3 px-2">第{row.projectNumber}回</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.implementationDate}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.operationBy || '-'}
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

function formatSalaryType(salaryType: string): string {
  switch (salaryType) {
    case 'hourly':
      return '時給'
    case 'daily':
      return '日給月給'
    case 'monthly':
      return '月給'
    default:
      return salaryType
  }
}

function formatCostType(costType: string): string {
  return costType === 'fixed' ? '固定費' : '変動費'
}

export function EmployeeHistoryTable({ data }: EmployeeHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>従業員変更履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            履歴データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">日時</th>
                  <th className="text-left py-3 px-2">操作</th>
                  <th className="text-left py-3 px-2">従業員コード</th>
                  <th className="text-left py-3 px-2">氏名</th>
                  <th className="text-left py-3 px-2">給与タイプ</th>
                  <th className="text-right py-3 px-2">時給/日給</th>
                  <th className="text-left py-3 px-2">操作者</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={`${row.historyId}-${index}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-2 whitespace-nowrap">
                      {formatDateTime(row.operationAt)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(row.operationType)}
                    </td>
                    <td className="py-3 px-2 font-mono">{row.employeeCode}</td>
                    <td className="py-3 px-2 font-medium">{row.name}</td>
                    <td className="py-3 px-2">
                      {formatSalaryType(row.salaryType)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {row.salaryType === 'hourly'
                        ? row.hourlyRate
                          ? `¥${row.hourlyRate.toLocaleString()}/時`
                          : '-'
                        : row.dailyRate
                          ? `¥${row.dailyRate.toLocaleString()}/日`
                          : '-'}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.operationBy || '-'}
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

export function MonthlyCostHistoryTable({ data }: MonthlyCostHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>月次経費変更履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            履歴データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">日時</th>
                  <th className="text-left py-3 px-2">操作</th>
                  <th className="text-left py-3 px-2">対象月</th>
                  <th className="text-left py-3 px-2">種別</th>
                  <th className="text-left py-3 px-2">カテゴリ</th>
                  <th className="text-right py-3 px-2">金額</th>
                  <th className="text-left py-3 px-2">操作者</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={`${row.historyId}-${index}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-2 whitespace-nowrap">
                      {formatDateTime(row.operationAt)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(row.operationType)}
                    </td>
                    <td className="py-3 px-2">{row.yearMonth}</td>
                    <td className="py-3 px-2">
                      <Badge
                        variant="outline"
                        className={
                          row.costType === 'fixed'
                            ? 'border-purple-300 text-purple-700'
                            : 'border-orange-300 text-orange-700'
                        }
                      >
                        {formatCostType(row.costType)}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-medium">{row.category}</td>
                    <td className="py-3 px-2 text-right">
                      ¥{row.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {row.operationBy || '-'}
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
