import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Calendar,
  CircleDollarSign,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getAnnualContractProgress,
  recalculateFromMonth,
  settleAnnualContract,
} from '@/lib/annualContractsApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { Page, AnnualContractProgress } from '@/lib/types'
import { format, startOfMonth, parseISO } from 'date-fns'

interface AnnualContractDetailPageProps {
  contractId: string
  onNavigate: (page: Page, id?: string) => void
}

export function AnnualContractDetailPage({
  contractId,
  onNavigate,
}: AnnualContractDetailPageProps) {
  const [progress, setProgress] = useState<AnnualContractProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [settling, setSettling] = useState(false)
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [contractId])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await getAnnualContractProgress(contractId)
    if (error) {
      toast.error(`データの取得に失敗しました: ${error}`)
    } else {
      setProgress(data)
    }
    setLoading(false)
  }

  const handleRecalculate = async () => {
    if (!progress) return

    setRecalculating(true)
    const fromMonth = format(startOfMonth(parseISO(progress.contract.contract_start_date)), 'yyyy-MM-dd')
    const { error } = await recalculateFromMonth(contractId, fromMonth)
    if (error) {
      toast.error(`再計算に失敗しました: ${translateSupabaseError(error)}`)
    } else {
      toast.success('月次収益を再計算しました')
      await loadData()
    }
    setRecalculating(false)
  }

  const handleSettle = async () => {
    setSettling(true)
    const { error } = await settleAnnualContract(contractId)
    if (error) {
      toast.error(`精算に失敗しました: ${translateSupabaseError(error)}`)
    } else {
      toast.success('年間契約を精算しました')
      await loadData()
    }
    setSettling(false)
    setSettleDialogOpen(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
  }

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">データが見つかりません</p>
      </div>
    )
  }

  const { contract, allocations, totalActualHours, totalAllocatedRevenue, progressRate, remainingBudgetHours } =
    progress

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('annual-contract-list')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{contract.contract_name}</h1>
                <p className="text-muted-foreground">
                  {contract.fields.field_name}
                  {contract.fields.customer_name && ` / ${contract.fields.customer_name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={contract.is_settled ? 'secondary' : 'default'} className="text-sm">
                {contract.is_settled ? '精算済' : `${contract.fiscal_year}年度`}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onNavigate('annual-contract-form', contractId)}
            >
              編集
            </Button>
            {!contract.is_settled && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRecalculate}
                  disabled={recalculating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? '再計算中...' : '月次収益を再計算'}
                </Button>
                <Button
                  variant="default"
                  onClick={() => setSettleDialogOpen(true)}
                  disabled={settling || allocations.length === 0}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  年度末精算
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 契約概要 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">契約期間</span>
              </div>
              <p className="text-lg font-medium">
                {formatDate(contract.contract_start_date)} 〜
              </p>
              <p className="text-lg font-medium">
                {formatDate(contract.contract_end_date)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">契約金額</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(contract.contract_amount)}</p>
              <p className="text-sm text-muted-foreground">
                認識済: {formatCurrency(totalAllocatedRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">予算時間</span>
              </div>
              <p className="text-2xl font-bold">{formatHours(Number(contract.budget_hours))}</p>
              <p className="text-sm text-muted-foreground">
                実績: {formatHours(totalActualHours)} / 残: {formatHours(remainingBudgetHours)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">進捗率</span>
              </div>
              <p className="text-2xl font-bold">{formatPercent(progressRate)}</p>
              <Progress value={Math.min(progressRate * 100, 100)} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* 月次配分テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>月次収益配分</CardTitle>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>月次配分データがありません。</p>
                <p className="text-sm mt-2">
                  「月次収益を再計算」ボタンをクリックして計算してください。
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>月</TableHead>
                      <TableHead className="text-right">実稼働時間</TableHead>
                      <TableHead className="text-right">累計時間</TableHead>
                      <TableHead className="text-right">配分率</TableHead>
                      <TableHead className="text-right">月次収益</TableHead>
                      <TableHead className="text-right">累計収益</TableHead>
                      <TableHead className="text-right">調整額</TableHead>
                      <TableHead className="text-center">ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          {formatMonth(allocation.allocation_month)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(Number(allocation.actual_hours))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(Number(allocation.cumulative_hours))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(Number(allocation.allocation_rate))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(allocation.allocated_revenue))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(allocation.cumulative_revenue))}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(allocation.adjustment_amount) !== 0 && (
                            <span className={Number(allocation.adjustment_amount) > 0 ? 'text-green-600' : 'text-red-600'}>
                              {Number(allocation.adjustment_amount) > 0 ? '+' : ''}
                              {formatCurrency(Number(allocation.adjustment_amount))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              allocation.status === 'adjusted'
                                ? 'default'
                                : allocation.status === 'confirmed'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {allocation.status === 'adjusted'
                              ? '調整済'
                              : allocation.status === 'confirmed'
                              ? '確定'
                              : '暫定'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 備考 */}
        {contract.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>備考</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{contract.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 精算確認ダイアログ */}
      <AlertDialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>年度末精算を実行しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  「{contract.contract_name}」の年度末精算を実行します。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-blue-800">
                  <p className="font-medium mb-2">精算の内容:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>累計認識収益と契約金額の差額を最終月に調整</li>
                    <li>契約を精算済みにマーク</li>
                    <li>精算後は月次配分の再計算ができなくなります</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                  <p>契約金額: {formatCurrency(contract.contract_amount)}</p>
                  <p>累計認識収益: {formatCurrency(totalAllocatedRevenue)}</p>
                  <p className="font-medium">
                    調整額: {formatCurrency(contract.contract_amount - totalAllocatedRevenue)}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settling}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettle} disabled={settling}>
              {settling ? '処理中...' : '精算を実行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
