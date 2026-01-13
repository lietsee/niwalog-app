import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Save, Trash2, CalendarDays } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import {
  getAllBusinessDays,
  upsertBusinessDays,
  deleteBusinessDaysByYear,
} from '@/lib/businessDaysApi'
import { translateSupabaseError } from '@/lib/errorMessages'
import {
  addYearSchema,
  type AddYearFormData,
  MONTH_KEYS,
  MONTH_NAMES,
  getMaxDaysInMonth,
  type MonthKey,
} from '@/schemas/businessDaySchema'
import type { Page, BusinessDay, DayType } from '@/lib/types'

interface BusinessDaysPageProps {
  onNavigate: (page: Page) => void
}

// 月別データの型
type MonthValues = {
  [K in MonthKey]: number
} & {
  notes: string | null
}

// 年度データの型
type YearData = {
  year: number
  workingDays: BusinessDay | null
  temporaryClosure: BusinessDay | null
  editWorkingDays: MonthValues
  editTemporaryClosure: MonthValues
  isNew: boolean
  isDirty: boolean
}

// 空の月別データを作成
function createEmptyMonthValues(): MonthValues {
  return {
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
    notes: null,
  }
}

// BusinessDayからMonthValuesを作成
function businessDayToMonthValues(bd: BusinessDay | null): MonthValues {
  if (!bd) return createEmptyMonthValues()
  return {
    jan: bd.jan,
    feb: bd.feb,
    mar: bd.mar,
    apr: bd.apr,
    may: bd.may,
    jun: bd.jun,
    jul: bd.jul,
    aug: bd.aug,
    sep: bd.sep,
    oct: bd.oct,
    nov: bd.nov,
    dec: bd.dec,
    notes: bd.notes,
  }
}

// 月別データの合計を計算
function sumMonthValues(values: MonthValues): number {
  return MONTH_KEYS.reduce((sum, key) => sum + values[key], 0)
}

export function BusinessDaysPage({ onNavigate }: BusinessDaysPageProps) {
  const [yearsData, setYearsData] = useState<YearData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addYearDialogOpen, setAddYearDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [yearToDelete, setYearToDelete] = useState<number | null>(null)

  const {
    register: registerAddYear,
    handleSubmit: handleSubmitAddYear,
    reset: resetAddYear,
    formState: { errors: addYearErrors },
  } = useForm<AddYearFormData>({
    resolver: zodResolver(addYearSchema) as never,
    defaultValues: {
      year: new Date().getFullYear(),
    },
  })

  // データ読み込み
  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getAllBusinessDays()
    if (error) {
      toast.error(`データの読み込みに失敗しました: ${translateSupabaseError(error)}`)
      setLoading(false)
      return
    }

    // 年ごとにグループ化
    const yearMap = new Map<number, { workingDays: BusinessDay | null; temporaryClosure: BusinessDay | null }>()

    for (const bd of data || []) {
      if (!yearMap.has(bd.year)) {
        yearMap.set(bd.year, { workingDays: null, temporaryClosure: null })
      }
      const entry = yearMap.get(bd.year)!
      if (bd.day_type === 'working_days') {
        entry.workingDays = bd
      } else {
        entry.temporaryClosure = bd
      }
    }

    // YearData配列に変換
    const yearsDataArray: YearData[] = Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0]) // 年降順
      .map(([year, { workingDays, temporaryClosure }]) => ({
        year,
        workingDays,
        temporaryClosure,
        editWorkingDays: businessDayToMonthValues(workingDays),
        editTemporaryClosure: businessDayToMonthValues(temporaryClosure),
        isNew: false,
        isDirty: false,
      }))

    setYearsData(yearsDataArray)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 年度追加
  const onAddYear = (data: AddYearFormData) => {
    const year = data.year

    // 既存年度チェック
    if (yearsData.some((yd) => yd.year === year)) {
      toast.error(`${year}年は既に存在します`)
      return
    }

    // 前年度データを探す
    const prevYearData = yearsData.find((yd) => yd.year === year - 1)

    // 新しい年度データを作成
    const newYearData: YearData = {
      year,
      workingDays: null,
      temporaryClosure: null,
      editWorkingDays: prevYearData
        ? { ...prevYearData.editWorkingDays }
        : createEmptyMonthValues(),
      editTemporaryClosure: createEmptyMonthValues(), // 臨時休業は常に0で初期化
      isNew: true,
      isDirty: true,
    }

    // 年降順でソートして追加
    const newYearsData = [...yearsData, newYearData].sort((a, b) => b.year - a.year)
    setYearsData(newYearsData)
    setAddYearDialogOpen(false)
    resetAddYear({ year: new Date().getFullYear() })

    if (prevYearData) {
      toast.success(`${year}年を追加しました（${year - 1}年の営業日数をコピー）`)
    } else {
      toast.success(`${year}年を追加しました`)
    }
  }

  // 値変更時
  const handleValueChange = (
    yearIndex: number,
    dayType: DayType,
    month: MonthKey,
    value: number
  ) => {
    setYearsData((prev) => {
      const newData = [...prev]
      const yearData = { ...newData[yearIndex] }

      if (dayType === 'working_days') {
        yearData.editWorkingDays = {
          ...yearData.editWorkingDays,
          [month]: value,
        }
      } else {
        yearData.editTemporaryClosure = {
          ...yearData.editTemporaryClosure,
          [month]: value,
        }
      }

      yearData.isDirty = true
      newData[yearIndex] = yearData
      return newData
    })
  }

  // 備考変更時
  const handleNotesChange = (
    yearIndex: number,
    dayType: DayType,
    value: string
  ) => {
    setYearsData((prev) => {
      const newData = [...prev]
      const yearData = { ...newData[yearIndex] }

      if (dayType === 'working_days') {
        yearData.editWorkingDays = {
          ...yearData.editWorkingDays,
          notes: value || null,
        }
      } else {
        yearData.editTemporaryClosure = {
          ...yearData.editTemporaryClosure,
          notes: value || null,
        }
      }

      yearData.isDirty = true
      newData[yearIndex] = yearData
      return newData
    })
  }

  // 保存
  const handleSave = async () => {
    const dirtyYears = yearsData.filter((yd) => yd.isDirty)
    if (dirtyYears.length === 0) {
      toast.info('変更がありません')
      return
    }

    setSaving(true)

    // 保存するデータを作成
    const inputs: {
      year: number
      day_type: DayType
      jan: number
      feb: number
      mar: number
      apr: number
      may: number
      jun: number
      jul: number
      aug: number
      sep: number
      oct: number
      nov: number
      dec: number
      notes: string | null
    }[] = []

    for (const yd of dirtyYears) {
      inputs.push({
        year: yd.year,
        day_type: 'working_days',
        ...yd.editWorkingDays,
      })
      inputs.push({
        year: yd.year,
        day_type: 'temporary_closure',
        ...yd.editTemporaryClosure,
      })
    }

    const { error } = await upsertBusinessDays(inputs)

    if (error) {
      toast.error(`保存に失敗しました: ${translateSupabaseError(error)}`)
      setSaving(false)
      return
    }

    toast.success('保存しました')
    await loadData()
    setSaving(false)
  }

  // 年度削除確認
  const confirmDeleteYear = (year: number) => {
    setYearToDelete(year)
    setDeleteDialogOpen(true)
  }

  // 年度削除実行
  const handleDeleteYear = async () => {
    if (yearToDelete === null) return

    const yearData = yearsData.find((yd) => yd.year === yearToDelete)
    if (!yearData) return

    if (yearData.isNew) {
      // 新規（未保存）の場合はローカルから削除
      setYearsData((prev) => prev.filter((yd) => yd.year !== yearToDelete))
      toast.success(`${yearToDelete}年を削除しました`)
    } else {
      // DBから削除
      const { error } = await deleteBusinessDaysByYear(yearToDelete)
      if (error) {
        toast.error(`削除に失敗しました: ${translateSupabaseError(error)}`)
      } else {
        toast.success(`${yearToDelete}年を削除しました`)
        await loadData()
      }
    }

    setDeleteDialogOpen(false)
    setYearToDelete(null)
  }

  // 変更があるかチェック
  const hasChanges = yearsData.some((yd) => yd.isDirty)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              <h1 className="text-2xl font-bold">営業日数管理</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddYearDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* メインコンテンツ */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : yearsData.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  営業日数データがありません
                </p>
                <Button onClick={() => setAddYearDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  年度を追加
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {yearsData.map((yearData, yearIndex) => (
              <Card key={yearData.year} className={yearData.isDirty ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {yearData.year}年
                      {yearData.isNew && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          新規
                        </span>
                      )}
                      {yearData.isDirty && !yearData.isNew && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          変更あり
                        </span>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDeleteYear(yearData.year)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 w-24">種別</th>
                          {MONTH_KEYS.map((key) => (
                            <th key={key} className="text-center py-2 px-1 w-16">
                              {MONTH_NAMES[key]}
                            </th>
                          ))}
                          <th className="text-center py-2 px-2 w-16">年計</th>
                          <th className="text-left py-2 px-2 w-32">備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 営業日数 */}
                        <tr className="border-b">
                          <td className="py-2 px-2 font-medium text-blue-700">営業日数</td>
                          {MONTH_KEYS.map((key) => (
                            <td key={key} className="py-1 px-1">
                              <Input
                                type="number"
                                min={0}
                                max={getMaxDaysInMonth(key)}
                                value={yearData.editWorkingDays[key]}
                                onChange={(e) =>
                                  handleValueChange(
                                    yearIndex,
                                    'working_days',
                                    key,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-14 h-8 text-center text-sm p-1"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center font-bold">
                            {sumMonthValues(yearData.editWorkingDays)}
                          </td>
                          <td className="py-1 px-2">
                            <Input
                              type="text"
                              value={yearData.editWorkingDays.notes || ''}
                              onChange={(e) =>
                                handleNotesChange(yearIndex, 'working_days', e.target.value)
                              }
                              className="w-full h-8 text-sm"
                              placeholder="備考"
                            />
                          </td>
                        </tr>
                        {/* 臨時休業 */}
                        <tr className="border-b">
                          <td className="py-2 px-2 font-medium text-orange-700">臨時休業</td>
                          {MONTH_KEYS.map((key) => (
                            <td key={key} className="py-1 px-1">
                              <Input
                                type="number"
                                min={0}
                                max={getMaxDaysInMonth(key)}
                                value={yearData.editTemporaryClosure[key]}
                                onChange={(e) =>
                                  handleValueChange(
                                    yearIndex,
                                    'temporary_closure',
                                    key,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-14 h-8 text-center text-sm p-1"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center font-bold">
                            {sumMonthValues(yearData.editTemporaryClosure)}
                          </td>
                          <td className="py-1 px-2">
                            <Input
                              type="text"
                              value={yearData.editTemporaryClosure.notes || ''}
                              onChange={(e) =>
                                handleNotesChange(yearIndex, 'temporary_closure', e.target.value)
                              }
                              className="w-full h-8 text-sm"
                              placeholder="備考"
                            />
                          </td>
                        </tr>
                        {/* 実稼働日（計算値） */}
                        <tr className="bg-gray-50">
                          <td className="py-2 px-2 font-medium text-green-700">実稼働日</td>
                          {MONTH_KEYS.map((key) => {
                            const actual =
                              yearData.editWorkingDays[key] - yearData.editTemporaryClosure[key]
                            return (
                              <td
                                key={key}
                                className={`py-2 px-1 text-center font-medium ${
                                  actual < 0 ? 'text-red-600' : 'text-green-700'
                                }`}
                              >
                                {actual}
                              </td>
                            )
                          })}
                          <td className="py-2 px-2 text-center font-bold text-green-700">
                            {sumMonthValues(yearData.editWorkingDays) -
                              sumMonthValues(yearData.editTemporaryClosure)}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">
                            自動計算
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 年度追加ダイアログ */}
      <Dialog open={addYearDialogOpen} onOpenChange={setAddYearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>年度を追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAddYear(onAddYear as never)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="year">年度</Label>
                <Input
                  id="year"
                  type="number"
                  {...registerAddYear('year')}
                  min={2000}
                  max={2100}
                />
                {addYearErrors.year && (
                  <p className="text-sm text-red-600">{addYearErrors.year.message}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                前年度のデータがある場合、営業日数をコピーして初期値とします。
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddYearDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">追加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{yearToDelete}年を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作により、{yearToDelete}年の営業日数と臨時休業日数が削除されます。
              削除されたデータは履歴テーブルに保存されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteYear}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
