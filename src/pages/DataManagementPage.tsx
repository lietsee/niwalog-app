import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Download, Upload, LayoutDashboard, FileText, AlertCircle, CheckCircle2, Info, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  exportAllToNDJSON,
  importFromNDJSON,
  downloadNDJSON,
  getRecordCounts,
  type ImportResult,
  type ImportMode,
  type ErrorHandling,
} from '@/lib/ndjsonApi'
import type { Page } from '@/lib/types'

interface DataManagementPageProps {
  onNavigate: (page: Page) => void
}

// Table name translations
const TABLE_NAMES: Record<string, string> = {
  app_settings: 'アプリ設定',
  employees: '従業員',
  business_days: '営業日数',
  monthly_costs: '月次経費',
  fields: '現場',
  annual_contracts: '年間契約',
  projects: '案件',
  work_days: '作業日',
  work_records: '従事者記録',
  expenses: '経費',
  monthly_revenue_allocations: '月次収益配分',
}

export function DataManagementPage({ onNavigate }: DataManagementPageProps) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewCounts, setPreviewCounts] = useState<Record<string, number> | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('restore')
  const [errorHandling, setErrorHandling] = useState<ErrorHandling>('partial')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    setImportResult(null)

    const { data, error } = await exportAllToNDJSON()

    if (error) {
      toast.error(error)
    } else if (data) {
      downloadNDJSON(data)
      toast.success('データをエクスポートしました')
    }

    setExporting(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setImportResult(null)

    // Read file and preview counts
    const content = await file.text()
    const counts = getRecordCounts(content)
    setPreviewCounts(counts)
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('ファイルを選択してください')
      return
    }

    setImporting(true)
    setImportResult(null)

    const content = await selectedFile.text()
    const { data, error } = await importFromNDJSON(content, {
      mode: importMode,
      errorHandling: errorHandling,
    })

    if (error) {
      toast.error(error)
    } else if (data) {
      setImportResult(data)
      const totalImported = Object.values(data.imported).reduce((a, b) => a + b, 0)
      const totalSkipped = Object.values(data.skipped).reduce((a, b) => a + b, 0)

      if (data.rolledBack) {
        toast.error(`インポート失敗: ロールバックしました`)
      } else if (data.success) {
        toast.success(`インポート完了: ${totalImported}件追加, ${totalSkipped}件スキップ`)
      } else {
        toast.warning(`インポート完了（警告あり）: ${totalImported}件追加, ${totalSkipped}件スキップ`)
      }
    }

    setImporting(false)
  }

  const clearFileSelection = () => {
    setSelectedFile(null)
    setPreviewCounts(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const totalPreviewCount = previewCounts
    ? Object.values(previewCounts).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">データ管理</h1>
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            ダッシュボード
          </Button>
        </div>

        <div className="space-y-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Download className="h-5 w-5" />
                エクスポート
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                全データをJSON Lines形式（NDJSON）でダウンロードします。
                バックアップや別環境への移行に使用できます。
              </p>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? 'エクスポート中...' : 'エクスポート実行'}
              </Button>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Upload className="h-5 w-5" />
                インポート
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                JSON Linesファイル（.ndjson）からデータを取り込みます。
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File selection */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ndjson,.jsonl,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="ndjson-file"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  ファイルを選択
                </Button>
                {selectedFile && (
                  <>
                    <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={clearFileSelection}>
                      クリア
                    </Button>
                  </>
                )}
              </div>

              {/* Preview counts */}
              {previewCounts && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">ファイル内容（{totalPreviewCount}件）</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {Object.entries(previewCounts).map(([table, count]) => (
                      <div key={table} className="flex justify-between">
                        <span className="text-muted-foreground">{TABLE_NAMES[table]}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Mode Selection */}
              <div className="space-y-3">
                <h4 className="font-medium">インポートモード</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      importMode === 'restore'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="restore"
                        checked={importMode === 'restore'}
                        onChange={() => setImportMode('restore')}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">復元モード</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">推奨</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-6">
                      同じIDのデータを復元します。既存データはスキップされます。
                    </p>
                  </label>
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      importMode === 'add'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="add"
                        checked={importMode === 'add'}
                        onChange={() => setImportMode('add')}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">追加モード</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-6">
                      新しいIDを生成して追加します。別環境からの移行に使用します。
                    </p>
                  </label>
                </div>
              </div>

              {/* Error Handling Selection */}
              <div className="space-y-3">
                <h4 className="font-medium">エラー時の動作</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      errorHandling === 'partial'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="errorHandling"
                        value="partial"
                        checked={errorHandling === 'partial'}
                        onChange={() => setErrorHandling('partial')}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">部分インポート</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-6">
                      エラーをスキップして継続します。成功分は残ります。
                    </p>
                  </label>
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                      errorHandling === 'rollback'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="errorHandling"
                        value="rollback"
                        checked={errorHandling === 'rollback'}
                        onChange={() => setErrorHandling('rollback')}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">ロールバック</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-6">
                      エラー時は全て取り消します。データ整合性を保証します。
                    </p>
                  </label>
                </div>
              </div>

              <Button onClick={handleImport} disabled={importing || !selectedFile}>
                {importing ? 'インポート中...' : 'インポート実行'}
              </Button>
            </CardContent>
          </Card>

          {/* Import Result */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {importResult.rolledBack ? (
                    <RotateCcw className="h-5 w-5 text-red-600" />
                  ) : importResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  インポート結果
                  {importResult.rolledBack && (
                    <span className="text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded ml-2">
                      ロールバック済み
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Imported */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">追加されたレコード</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(importResult.imported).map(([table, count]) =>
                        count > 0 ? (
                          <div key={table} className="flex justify-between text-green-700">
                            <span>{TABLE_NAMES[table]}:</span>
                            <span className="font-medium">{count}件</span>
                          </div>
                        ) : null
                      )}
                      {Object.values(importResult.imported).every((c) => c === 0) && (
                        <span className="text-green-600">なし</span>
                      )}
                    </div>
                  </div>

                  {/* Skipped */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">スキップされたレコード</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(importResult.skipped).map(([table, count]) =>
                        count > 0 ? (
                          <div key={table} className="flex justify-between text-gray-700">
                            <span>{TABLE_NAMES[table]}:</span>
                            <span className="font-medium">{count}件</span>
                          </div>
                        ) : null
                      )}
                      {Object.values(importResult.skipped).every((c) => c === 0) && (
                        <span className="text-gray-600">なし</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <AlertCircle className="h-4 w-4" />
                      エラー ({importResult.errors.length}件)
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {importResult.errors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>...他 {importResult.errors.length - 10}件</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <Info className="h-4 w-4" />
              注意事項
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              <li>エクスポートファイルには全テーブルのデータが含まれます</li>
              <li>復元モード: 同じIDのデータを復元します（既存データはスキップ）</li>
              <li>追加モード: 新しいIDを生成して追加します（別環境からの移行用）</li>
              <li>従事者記録の作業時間は自動計算されるため、インポート後に再計算されます</li>
              <li>作成者情報は現在ログイン中のユーザーに置き換えられます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
