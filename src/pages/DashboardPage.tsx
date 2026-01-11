import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Briefcase, TrendingUp, Receipt, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/StatCard'
import { MonthlyChart } from '@/components/MonthlyChart'
import { RecentProjectList } from '@/components/RecentProjectList'
import { EmployeeHoursTable } from '@/components/EmployeeHoursTable'
import {
  getDashboardSummary,
  getMonthlyStats,
  getRecentProjects,
  getEmployeeWorkSummary,
} from '@/lib/dashboardApi'
import type { DashboardSummary, MonthlyStats, RecentProject, EmployeeWorkSummary } from '@/lib/types'

interface DashboardPageProps {
  onNavigate: (page: 'field-list') => void
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `¥${Math.round(value / 10000)}万`
  }
  return `¥${value.toLocaleString()}`
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [employeeHours, setEmployeeHours] = useState<EmployeeWorkSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)

    // 並列でデータ取得
    const [summaryResult, statsResult, projectsResult, employeeResult] = await Promise.all([
      getDashboardSummary(),
      getMonthlyStats(6),
      getRecentProjects(5),
      getEmployeeWorkSummary(),
    ])

    if (summaryResult.error) {
      toast.error(`サマリー取得エラー: ${summaryResult.error}`)
    } else {
      setSummary(summaryResult.data)
    }

    if (statsResult.error) {
      toast.error(`月別統計取得エラー: ${statsResult.error}`)
    } else {
      setMonthlyStats(statsResult.data || [])
    }

    if (projectsResult.error) {
      toast.error(`案件取得エラー: ${projectsResult.error}`)
    } else {
      setRecentProjects(projectsResult.data || [])
    }

    if (employeeResult.error) {
      toast.error(`従業員稼働取得エラー: ${employeeResult.error}`)
    } else {
      setEmployeeHours(employeeResult.data || [])
    }

    setLoading(false)
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
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">ダッシュボード</h1>
            <p className="text-muted-foreground">NiwaLog - 現場記録管理システム</p>
          </div>
          <Button onClick={() => onNavigate('field-list')}>
            <MapPin className="h-4 w-4 mr-2" />
            現場一覧
          </Button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="現場数"
            value={summary?.totalFields || 0}
            icon={MapPin}
          />
          <StatCard
            title="案件数"
            value={summary?.totalProjects || 0}
            icon={Briefcase}
          />
          <StatCard
            title="今月売上"
            value={formatCurrency(summary?.monthlyInvoice || 0)}
            icon={TrendingUp}
          />
          <StatCard
            title="今月経費"
            value={formatCurrency(summary?.monthlyExpense || 0)}
            icon={Receipt}
          />
          <StatCard
            title="今月人件費"
            value={formatCurrency(summary?.monthlyLaborCost || 0)}
            icon={Users}
          />
        </div>

        {/* グラフと直近案件 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MonthlyChart data={monthlyStats} />
          <RecentProjectList projects={recentProjects} />
        </div>

        {/* 従業員稼働 */}
        <EmployeeHoursTable data={employeeHours} />
      </div>
    </div>
  )
}
