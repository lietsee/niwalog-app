import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/DateRangePicker'
import { ProfitabilityTable } from '@/components/ProfitabilityTable'
import { ReviewTable } from '@/components/ReviewTable'
import {
  getFieldProfitabilityReport,
  getProjectReviewList,
} from '@/lib/analysisApi'
import type { FieldProfitabilityReport, ProjectReview } from '@/lib/types'

interface AnalysisPageProps {
  onNavigate: (page: 'dashboard') => void
}

export function AnalysisPage({ onNavigate }: AnalysisPageProps) {
  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [profitabilityData, setProfitabilityData] = useState<
    FieldProfitabilityReport[]
  >([])
  const [reviewData, setReviewData] = useState<ProjectReview[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profitability')

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)

    const [profitResult, reviewResult] = await Promise.all([
      getFieldProfitabilityReport(startDate, endDate),
      getProjectReviewList(startDate, endDate),
    ])

    if (profitResult.error) {
      toast.error(`収益性レポート取得エラー: ${profitResult.error}`)
    } else {
      setProfitabilityData(profitResult.data || [])
    }

    if (reviewResult.error) {
      toast.error(`レビュー取得エラー: ${reviewResult.error}`)
    } else {
      setReviewData(reviewResult.data || [])
    }

    setLoading(false)
  }

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart)
    setEndDate(newEnd)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">分析・レポート</h1>
              <p className="text-muted-foreground">
                現場別収益性と案件レビューの分析
              </p>
            </div>
          </div>
        </div>

        {/* 期間選択 */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">期間:</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onApply={handleDateRangeChange}
            />
          </div>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="profitability">収益性レポート</TabsTrigger>
            <TabsTrigger value="reviews">レビュー一覧</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : (
            <>
              <TabsContent value="profitability">
                <ProfitabilityTable data={profitabilityData} />
              </TabsContent>
              <TabsContent value="reviews">
                <ReviewTable data={reviewData} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
