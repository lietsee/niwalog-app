import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FieldHistoryTable,
  ProjectHistoryTable,
} from '@/components/HistoryTable'
import { getFieldHistory, getProjectHistory } from '@/lib/historyApi'
import type { FieldHistoryRecord, ProjectHistoryRecord } from '@/lib/types'

interface HistoryPageProps {
  onNavigate: (page: 'dashboard') => void
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fieldHistory, setFieldHistory] = useState<FieldHistoryRecord[]>([])
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryRecord[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fields')

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    loadData()
  }, [debouncedSearch])

  const loadData = async () => {
    setLoading(true)

    const [fieldResult, projectResult] = await Promise.all([
      getFieldHistory(debouncedSearch),
      getProjectHistory(debouncedSearch),
    ])

    if (fieldResult.error) {
      toast.error(`現場履歴取得エラー: ${fieldResult.error}`)
    } else {
      setFieldHistory(fieldResult.data || [])
    }

    if (projectResult.error) {
      toast.error(`案件履歴取得エラー: ${projectResult.error}`)
    } else {
      setProjectHistory(projectResult.data || [])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">変更履歴</h1>
              <p className="text-muted-foreground">
                現場・案件の変更履歴を確認
              </p>
            </div>
          </div>
        </div>

        {/* 検索 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="現場コードまたは名前で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="fields">現場履歴</TabsTrigger>
            <TabsTrigger value="projects">案件履歴</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : (
            <>
              <TabsContent value="fields">
                <FieldHistoryTable data={fieldHistory} />
              </TabsContent>
              <TabsContent value="projects">
                <ProjectHistoryTable data={projectHistory} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
