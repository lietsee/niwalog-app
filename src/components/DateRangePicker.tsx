import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import 'react-day-picker/style.css'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onApply: (startDate: string, endDate: string) => void
}

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  }))

  const handleApply = () => {
    if (range?.from && range?.to) {
      onApply(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'))
      setIsOpen(false)
    }
  }

  const handlePreset = (preset: 'thisMonth' | 'lastMonth' | 'last3Months') => {
    const now = new Date()
    let from: Date
    let to: Date

    switch (preset) {
      case 'thisMonth':
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1))
        to = endOfMonth(subMonths(now, 1))
        break
      case 'last3Months':
        from = startOfMonth(subMonths(now, 2))
        to = endOfMonth(now)
        break
    }

    setRange({ from, to })
    onApply(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'))
    setIsOpen(false)
  }

  const displayValue =
    range?.from && range?.to
      ? `${format(range.from, 'yyyy/MM/dd')} ～ ${format(range.to, 'yyyy/MM/dd')}`
      : '期間を選択'

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[240px] justify-start"
      >
        {displayValue}
      </Button>

      {isOpen && (
        <Card className="absolute z-50 mt-2 p-4 bg-white shadow-lg">
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('thisMonth')}
            >
              今月
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('lastMonth')}
            >
              先月
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset('last3Months')}
            >
              過去3ヶ月
            </Button>
          </div>

          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            locale={ja}
            numberOfMonths={2}
            showOutsideDays
            classNames={{
              months: 'flex gap-4',
              month_caption: 'flex justify-center pt-1 relative items-center mb-4',
              caption_label: 'text-sm font-medium',
              nav: 'flex items-center gap-1',
              button_previous: 'absolute left-1 p-1 hover:bg-gray-100 rounded',
              button_next: 'absolute right-1 p-1 hover:bg-gray-100 rounded',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-muted-foreground w-9 font-normal text-xs',
              week: 'flex w-full mt-2',
              day: 'h-9 w-9 text-center text-sm p-0 relative',
              day_button:
                'h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-md',
              selected: 'bg-primary text-primary-foreground rounded-md',
              range_start: 'bg-primary text-primary-foreground rounded-l-md',
              range_end: 'bg-primary text-primary-foreground rounded-r-md',
              range_middle: 'bg-primary/20',
              today: 'bg-accent text-accent-foreground',
              outside: 'text-muted-foreground opacity-50',
              disabled: 'text-muted-foreground opacity-50',
            }}
          />

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleApply} disabled={!range?.from || !range?.to}>
              適用
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
