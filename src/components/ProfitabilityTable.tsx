import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FieldProfitabilityReport } from '@/lib/types'
import { exportToCSV, formatCurrencyForExport } from '@/lib/exportUtils'

interface ProfitabilityTableProps {
  data: FieldProfitabilityReport[]
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function ProfitabilityTable({ data }: ProfitabilityTableProps) {
  const totals = data.reduce(
    (acc, row) => ({
      totalInvoice: acc.totalInvoice + row.totalInvoice,
      totalLaborCost: acc.totalLaborCost + row.totalLaborCost,
      totalExpense: acc.totalExpense + row.totalExpense,
      profit: acc.profit + row.profit,
      projectCount: acc.projectCount + row.projectCount,
    }),
    {
      totalInvoice: 0,
      totalLaborCost: 0,
      totalExpense: 0,
      profit: 0,
      projectCount: 0,
    }
  )

  const totalMargin =
    totals.totalInvoice > 0
      ? Math.round((totals.profit / totals.totalInvoice) * 100 * 10) / 10
      : 0

  const handleExport = () => {
    const filename = `収益性レポート_${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(
      data,
      [
        { key: 'fieldCode', label: '現場コード' },
        { key: 'fieldName', label: '現場名' },
        { key: 'customerName', label: '顧客名' },
        {
          key: 'totalInvoice',
          label: '売上',
          formatter: (v) => formatCurrencyForExport(v as number),
        },
        {
          key: 'totalLaborCost',
          label: '人件費',
          formatter: (v) => formatCurrencyForExport(v as number),
        },
        {
          key: 'totalExpense',
          label: '経費',
          formatter: (v) => formatCurrencyForExport(v as number),
        },
        {
          key: 'profit',
          label: '粗利益',
          formatter: (v) => formatCurrencyForExport(v as number),
        },
        {
          key: 'profitMargin',
          label: '粗利益率(%)',
          formatter: (v) => (v as number).toFixed(1),
        },
        {
          key: 'projectCount',
          label: '案件数',
          formatter: (v) => String(v),
        },
      ],
      filename
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>現場別収益性レポート</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          CSVエクスポート
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">現場</th>
                  <th className="text-right py-3 px-2">売上</th>
                  <th className="text-right py-3 px-2">人件費</th>
                  <th className="text-right py-3 px-2">経費</th>
                  <th className="text-right py-3 px-2">粗利益</th>
                  <th className="text-right py-3 px-2">粗利率</th>
                  <th className="text-right py-3 px-2">案件数</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.fieldId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="font-medium">{row.fieldName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.fieldCode}
                        {row.customerName && ` / ${row.customerName}`}
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(row.totalInvoice)}
                    </td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(row.totalLaborCost)}
                    </td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(row.totalExpense)}
                    </td>
                    <td
                      className={`text-right py-3 px-2 font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                    <td
                      className={`text-right py-3 px-2 ${row.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatPercent(row.profitMargin)}
                    </td>
                    <td className="text-right py-3 px-2">{row.projectCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="py-3 px-2">合計</td>
                  <td className="text-right py-3 px-2">
                    {formatCurrency(totals.totalInvoice)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {formatCurrency(totals.totalLaborCost)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {formatCurrency(totals.totalExpense)}
                  </td>
                  <td
                    className={`text-right py-3 px-2 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(totals.profit)}
                  </td>
                  <td
                    className={`text-right py-3 px-2 ${totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatPercent(totalMargin)}
                  </td>
                  <td className="text-right py-3 px-2">{totals.projectCount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
