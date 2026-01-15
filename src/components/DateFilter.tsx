import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Calendar } from 'lucide-react'

interface DateFilterProps {
  year: number | undefined
  month: number | undefined
  day: number | undefined
  onYearChange: (year: number | undefined) => void
  onMonthChange: (month: number | undefined) => void
  onDayChange: (day: number | undefined) => void
  onClear: () => void
}

export function DateFilter({
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
  onClear,
}: DateFilterProps) {
  const currentYear = new Date().getFullYear()

  // 年の選択肢（現在年から10年前まで）
  const years = useMemo(() => {
    const result: number[] = []
    for (let y = currentYear; y >= currentYear - 10; y--) {
      result.push(y)
    }
    return result
  }, [currentYear])

  // 月の選択肢
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // 日の選択肢（選択された年月に応じて変化）
  const days = useMemo(() => {
    if (!year || !month) return []
    const lastDay = new Date(year, month, 0).getDate()
    return Array.from({ length: lastDay }, (_, i) => i + 1)
  }, [year, month])

  const hasFilter = year !== undefined

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">実施日:</span>

      {/* 年 */}
      <Select
        value={year?.toString() || ''}
        onValueChange={(v) => {
          if (v === '' || v === '__all__') {
            onYearChange(undefined)
            onMonthChange(undefined)
            onDayChange(undefined)
          } else {
            onYearChange(parseInt(v, 10))
          }
        }}
      >
        <SelectTrigger className="w-24">
          <SelectValue placeholder="年" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全て</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 月（年が選択されている場合のみ有効） */}
      <Select
        value={month?.toString() || ''}
        onValueChange={(v) => {
          if (v === '' || v === '__all__') {
            onMonthChange(undefined)
            onDayChange(undefined)
          } else {
            onMonthChange(parseInt(v, 10))
          }
        }}
        disabled={!year}
      >
        <SelectTrigger className="w-20">
          <SelectValue placeholder="月" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全て</SelectItem>
          {months.map((m) => (
            <SelectItem key={m} value={m.toString()}>
              {m}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 日（年月が選択されている場合のみ有効） */}
      <Select
        value={day?.toString() || ''}
        onValueChange={(v) => {
          if (v === '' || v === '__all__') {
            onDayChange(undefined)
          } else {
            onDayChange(parseInt(v, 10))
          }
        }}
        disabled={!year || !month}
      >
        <SelectTrigger className="w-20">
          <SelectValue placeholder="日" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全て</SelectItem>
          {days.map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {d}日
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* クリアボタン */}
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          クリア
        </Button>
      )}
    </div>
  )
}
