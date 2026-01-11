import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MonthlyStats } from '@/lib/types'

interface MonthlyChartProps {
  data: MonthlyStats[]
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万`
  }
  return value.toLocaleString()
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return `${year.slice(2)}/${m}`
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    month: formatMonth(d.month),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>月別売上・経費推移</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            データがありません
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value) => `¥${(value as number).toLocaleString()}`}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Bar dataKey="invoice" name="売上" fill="#22c55e" />
              <Bar dataKey="expense" name="経費" fill="#ef4444" />
              <Bar dataKey="laborCost" name="人件費" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
