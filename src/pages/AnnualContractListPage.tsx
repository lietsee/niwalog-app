import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, LayoutDashboard, Calendar, CircleDollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  listAllAnnualContracts,
  listAnnualContractsByYear,
  deleteAnnualContract,
} from '@/lib/annualContractsApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import type { Page, AnnualContractWithField } from '@/lib/types'

interface AnnualContractListPageProps {
  onNavigate: (page: Page, contractId?: string) => void
}

export function AnnualContractListPage({ onNavigate }: AnnualContractListPageProps) {
  const [contracts, setContracts] = useState<AnnualContractWithField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<AnnualContractWithField | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 年度リスト（今年から3年前まで + 来年）
  const currentYear = new Date().getFullYear()
  const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i)

  const loadContracts = async () => {
    setLoading(true)
    setError(null)

    let result
    if (selectedYear === 'all') {
      result = await listAllAnnualContracts()
    } else {
      result = await listAnnualContractsByYear(parseInt(selectedYear))
    }

    if (result.error) {
      setError(result.error)
      toast.error(`読み込みに失敗しました: ${result.error}`)
    } else {
      setContracts(result.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadContracts()
  }, [selectedYear])

  const handleDeleteClick = (contract: AnnualContractWithField) => {
    setContractToDelete(contract)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!contractToDelete) return

    setDeleting(true)
    const { error: err } = await deleteAnnualContract(contractToDelete.id)

    if (err) {
      const translatedError = translateSupabaseError(err)
      setError(translatedError)
      toast.error(translatedError)
    } else {
      setContracts(contracts.filter((c) => c.id !== contractToDelete.id))
      toast.success('年間契約を削除しました')
      setDeleteDialogOpen(false)
      setContractToDelete(null)
    }
    setDeleting(false)
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

  if (loading && contracts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">年間契約一覧</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                ダッシュボード
              </Button>
              <Button onClick={() => onNavigate('annual-contract-form')}>
                <Plus className="h-4 w-4 mr-2" />
                新規登録
              </Button>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">年度:</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="年度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {fiscalYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年度
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">エラー: {error}</p>
            </CardContent>
          </Card>
        )}

        {contracts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              年間契約が登録されていません。「新規登録」ボタンから登録してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <Card
                key={contract.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onNavigate('annual-contract-detail', contract.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{contract.contract_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {contract.fields.field_name}
                        {contract.fields.customer_name && ` / ${contract.fields.customer_name}`}
                      </p>
                    </div>
                    <Badge variant={contract.is_settled ? 'secondary' : 'default'}>
                      {contract.is_settled ? '精算済' : `${contract.fiscal_year}年度`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDate(contract.contract_start_date)} 〜 {formatDate(contract.contract_end_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatCurrency(contract.contract_amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>予算: {contract.budget_hours}時間</span>
                  </div>
                  <div className="flex justify-end gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate('annual-contract-form', contract.id)}
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(contract)}
                    >
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>年間契約を削除しますか？</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  「{contractToDelete?.contract_name}」を削除します。
                </p>
                {contractToDelete?.is_settled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                    <p className="font-medium">
                      この契約は精算済みです。削除すると月次配分データも削除されます。
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  この操作は取り消せません。
                  <br />
                  関連する月次配分データも削除されます。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? '削除中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
