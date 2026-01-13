import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { MapPin, Briefcase, TrendingUp, Receipt, Users, BarChart3, History, ChevronLeft, ChevronRight, UserCog, Building, CreditCard, Wallet, CalendarDays, Database } from 'lucide-react'
import { format, subMonths, addMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
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

type PeriodMode = 'single' | 'range'

interface DashboardPageProps {
  onNavigate: (page: 'field-list' | 'analysis' | 'history' | 'employee-list' | 'monthly-cost' | 'business-days' | 'data-management') => void
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

  // 期間選択の状態
  const [periodMode, setPeriodMode] = useState<PeriodMode>('single')
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [startMonth, setStartMonth] = useState<Date>(subMonths(new Date(), 2))
  const [endMonth, setEndMonth] = useState<Date>(new Date())

  // 現在の期間を計算
  const currentStartDate = periodMode === 'single' ? selectedMonth : startMonth
  const currentEndDate = periodMode === 'single' ? selectedMonth : endMonth

  const loadDashboardData = useCallback(async () => {
    setLoading(true)

    // 並列でデータ取得
    const [summaryResult, statsResult, projectsResult, employeeResult] = await Promise.all([
      getDashboardSummary(currentStartDate, currentEndDate),
      getMonthlyStats(currentStartDate, currentEndDate),
      getRecentProjects(5, currentStartDate, currentEndDate),
      getEmployeeWorkSummary(currentStartDate, currentEndDate),
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
  }, [currentStartDate, currentEndDate])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // 期間ラベルを生成
  const getPeriodLabel = () => {
    if (periodMode === 'single') {
      return format(selectedMonth, 'yyyy年M月', { locale: ja })
    } else {
      const start = format(startMonth, 'yyyy/MM', { locale: ja })
      const end = format(endMonth, 'yyyy/MM', { locale: ja })
      return `${start} 〜 ${end}`
    }
  }

  // 月を移動
  const handlePrevMonth = () => {
    if (periodMode === 'single') {
      setSelectedMonth(subMonths(selectedMonth, 1))
    }
  }

  const handleNextMonth = () => {
    if (periodMode === 'single') {
      setSelectedMonth(addMonths(selectedMonth, 1))
    }
  }

  // 月選択のハンドラ
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'single' | 'start' | 'end') => {
    const value = e.target.value
    if (!value) return
    const date = new Date(value + '-01')
    if (type === 'single') {
      setSelectedMonth(date)
    } else if (type === 'start') {
      setStartMonth(date)
      // 開始月が終了月より後の場合、終了月を開始月に合わせる
      if (date > endMonth) {
        setEndMonth(date)
      }
    } else {
      setEndMonth(date)
      // 終了月が開始月より前の場合、開始月を終了月に合わせる
      if (date < startMonth) {
        setStartMonth(date)
      }
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
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">ダッシュボード</h1>
            <p className="text-muted-foreground">NiwaLog - 現場記録管理システム</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate('analysis')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              分析
            </Button>
            <Button variant="outline" onClick={() => onNavigate('history')}>
              <History className="h-4 w-4 mr-2" />
              履歴
            </Button>
            <Button variant="outline" onClick={() => onNavigate('employee-list')}>
              <UserCog className="h-4 w-4 mr-2" />
              従業員
            </Button>
            <Button variant="outline" onClick={() => onNavigate('monthly-cost')}>
              <Wallet className="h-4 w-4 mr-2" />
              月次経費
            </Button>
            <Button variant="outline" onClick={() => onNavigate('business-days')}>
              <CalendarDays className="h-4 w-4 mr-2" />
              営業日数
            </Button>
            <Button variant="outline" onClick={() => onNavigate('data-management')}>
              <Database className="h-4 w-4 mr-2" />
              データ管理
            </Button>
            <Button onClick={() => onNavigate('field-list')}>
              <MapPin className="h-4 w-4 mr-2" />
              現場一覧
            </Button>
          </div>
        </div>

        {/* 期間選択 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">表示期間:</span>
            <div className="flex gap-1">
              <Button
                variant={periodMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodMode('single')}
              >
                単月
              </Button>
              <Button
                variant={periodMode === 'range' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodMode('range')}
              >
                期間
              </Button>
            </div>

            {periodMode === 'single' ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => handleMonthChange(e, 'single')}
                  className="px-3 py-1.5 border rounded-md text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMonth(new Date())}
                  className="text-muted-foreground"
                >
                  今月
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={format(startMonth, 'yyyy-MM')}
                  onChange={(e) => handleMonthChange(e, 'start')}
                  className="px-3 py-1.5 border rounded-md text-sm"
                />
                <span className="text-muted-foreground">〜</span>
                <input
                  type="month"
                  value={format(endMonth, 'yyyy-MM')}
                  onChange={(e) => handleMonthChange(e, 'end')}
                  className="px-3 py-1.5 border rounded-md text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-4">
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
            title={`売上`}
            value={formatCurrency(summary?.monthlyInvoice || 0)}
            icon={TrendingUp}
          />
          <StatCard
            title={`経費`}
            value={formatCurrency(summary?.monthlyExpense || 0)}
            icon={Receipt}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={`人件費`}
            value={formatCurrency(summary?.monthlyLaborCost || 0)}
            icon={Users}
          />
          <StatCard
            title={`固定費`}
            value={formatCurrency(summary?.monthlyFixedCost || 0)}
            icon={Building}
          />
          <StatCard
            title={`変動費`}
            value={formatCurrency(summary?.monthlyVariableCost || 0)}
            icon={CreditCard}
          />
          <StatCard
            title={`粗利`}
            value={formatCurrency(summary?.grossProfit || 0)}
            icon={Wallet}
            variant={(summary?.grossProfit || 0) >= 0 ? 'success' : 'destructive'}
          />
        </div>

        {/* グラフと直近案件 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MonthlyChart data={monthlyStats} />
          <RecentProjectList projects={recentProjects} />
        </div>

        {/* 従業員稼働 */}
        <EmployeeHoursTable data={employeeHours} title={`${getPeriodLabel()}の従業員稼働`} />
      </div>
    </div>
  )
}
