import { Plus, X, Copy, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkRecordInput as WorkRecordInputType } from '@/schemas/workDaySchema'

// 時計アイコン付き時刻入力コンポーネント（必須フィールド用）
function TimeInputWithIcon({
  value,
  onChange,
  className,
  title,
  hasError,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  title?: string
  hasError?: boolean
}) {
  return (
    <div className={`relative ${className || ''}`}>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${hasError ? 'border-destructive' : ''}`}
        title={title}
      />
      <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

// クリア可能な時刻入力コンポーネント（任意フィールド用）
function ClearableTimeInput({
  value,
  onChange,
  className,
  title,
  hasError,
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  className?: string
  title?: string
  hasError?: boolean
}) {
  return (
    <div className={`relative ${className || ''}`}>
      <Input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${hasError ? 'border-destructive' : ''}`}
        title={title}
      />
      {value ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
          title="クリア"
        >
          <XCircle className="h-4 w-4" />
        </button>
      ) : (
        <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      )}
    </div>
  )
}

interface WorkRecordInputProps {
  value: WorkRecordInputType[]
  onChange: (value: WorkRecordInputType[]) => void
  errors?: Record<number, {
    employee_code?: string
    clock_in?: string
    site_arrival?: string
    site_departure?: string
    clock_out?: string
    break_minutes?: string
  }>
}

export function WorkRecordInput({ value, onChange, errors }: WorkRecordInputProps) {
  const addRecord = () => {
    const newRecord: WorkRecordInputType = {
      employee_code: '',
      clock_in: '08:00',
      site_arrival: '08:30',
      site_departure: '16:00',
      clock_out: '17:00',
      break_minutes: 60,
    }
    onChange([...value, newRecord])
  }

  const duplicateRecord = (index: number) => {
    const recordToDuplicate = value[index]
    const newRecord: WorkRecordInputType = {
      employee_code: '', // 従業員コードは空にして新規入力を促す
      clock_in: recordToDuplicate.clock_in,
      site_arrival: recordToDuplicate.site_arrival,
      site_departure: recordToDuplicate.site_departure,
      clock_out: recordToDuplicate.clock_out,
      break_minutes: recordToDuplicate.break_minutes,
    }
    // 複製元の直後に挿入
    const newValue = [
      ...value.slice(0, index + 1),
      newRecord,
      ...value.slice(index + 1),
    ]
    onChange(newValue)
  }

  const removeRecord = (index: number) => {
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
  }

  const updateRecord = (
    index: number,
    field: keyof WorkRecordInputType,
    newValue: string | number | null
  ) => {
    const updated = value.map((record, i) =>
      i === index ? { ...record, [field]: newValue } : record
    )
    onChange(updated)
  }

  // 現場作業時間を計算（site_departure - site_arrival - break_minutes）
  const calculateSiteHours = (arrival: string, departure: string, breakMinutes: number): string => {
    if (!arrival || !departure) return '-'
    const [ah, am] = arrival.split(':').map(Number)
    const [dh, dm] = departure.split(':').map(Number)
    const arrivalMinutes = ah * 60 + am
    const departureMinutes = dh * 60 + dm
    if (departureMinutes <= arrivalMinutes) return '-'
    const hours = (departureMinutes - arrivalMinutes - breakMinutes) / 60
    if (hours <= 0) return '-'
    return `${hours.toFixed(1)}h`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>従事者</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRecord}>
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          従事者が未登録です。「追加」ボタンで作業者を追加できます。
        </p>
      ) : (
        <div className="space-y-2">
          {/* ヘッダー行 */}
          <div className="hidden lg:flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <div className="w-24">従業員</div>
            <div className="w-24 text-center">出勤</div>
            <div className="w-24 text-center">現着</div>
            <div className="w-24 text-center">撤収</div>
            <div className="w-24 text-center">退勤</div>
            <div className="w-16 text-center">休憩</div>
            <div className="w-12 text-right">現場</div>
            <div className="w-16"></div>
          </div>
          {value.map((record, index) => (
            <div key={index} className="space-y-1">
              {/* デスクトップ表示（lg以上） */}
              <div className="hidden lg:flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <Input
                  placeholder="f001"
                  value={record.employee_code}
                  onChange={(e) => updateRecord(index, 'employee_code', e.target.value)}
                  className={`w-24 ${errors?.[index]?.employee_code ? 'border-destructive' : ''}`}
                />
                <ClearableTimeInput
                  value={record.clock_in}
                  onChange={(v) => updateRecord(index, 'clock_in', v)}
                  className="w-24"
                  hasError={!!errors?.[index]?.clock_in}
                  title="出勤時間（途中合流の場合は空欄）"
                />
                <TimeInputWithIcon
                  value={record.site_arrival}
                  onChange={(v) => updateRecord(index, 'site_arrival', v)}
                  className="w-24"
                  hasError={!!errors?.[index]?.site_arrival}
                  title="現場到着時間"
                />
                <TimeInputWithIcon
                  value={record.site_departure}
                  onChange={(v) => updateRecord(index, 'site_departure', v)}
                  className="w-24"
                  hasError={!!errors?.[index]?.site_departure}
                  title="現場撤収時間"
                />
                <ClearableTimeInput
                  value={record.clock_out}
                  onChange={(v) => updateRecord(index, 'clock_out', v)}
                  className="w-24"
                  hasError={!!errors?.[index]?.clock_out}
                  title="退勤時間（途中離脱の場合は空欄）"
                />
                <Input
                  type="number"
                  value={record.break_minutes ?? 60}
                  onChange={(e) => updateRecord(index, 'break_minutes', parseInt(e.target.value) || 0)}
                  className={`w-16 text-center ${errors?.[index]?.break_minutes ? 'border-destructive' : ''}`}
                  min={0}
                  step={15}
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {calculateSiteHours(record.site_arrival, record.site_departure, record.break_minutes ?? 60)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateRecord(index)}
                  title="この行を複製"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecord(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* モバイル表示（lg未満） */}
              <div className="lg:hidden p-3 border rounded-md bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="従業員コード（例: f001）"
                    value={record.employee_code}
                    onChange={(e) => updateRecord(index, 'employee_code', e.target.value)}
                    className={`flex-1 ${errors?.[index]?.employee_code ? 'border-destructive' : ''}`}
                  />
                  <div className="flex ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateRecord(index)}
                      title="この行を複製"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecord(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">出勤</Label>
                    <ClearableTimeInput
                      value={record.clock_in}
                      onChange={(v) => updateRecord(index, 'clock_in', v)}
                      hasError={!!errors?.[index]?.clock_in}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">現着</Label>
                    <TimeInputWithIcon
                      value={record.site_arrival}
                      onChange={(v) => updateRecord(index, 'site_arrival', v)}
                      hasError={!!errors?.[index]?.site_arrival}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">撤収</Label>
                    <TimeInputWithIcon
                      value={record.site_departure}
                      onChange={(v) => updateRecord(index, 'site_departure', v)}
                      hasError={!!errors?.[index]?.site_departure}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">退勤</Label>
                    <ClearableTimeInput
                      value={record.clock_out}
                      onChange={(v) => updateRecord(index, 'clock_out', v)}
                      hasError={!!errors?.[index]?.clock_out}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">休憩(分)</Label>
                    <Input
                      type="number"
                      value={record.break_minutes ?? 60}
                      onChange={(e) => updateRecord(index, 'break_minutes', parseInt(e.target.value) || 0)}
                      className={`w-20 text-center ${errors?.[index]?.break_minutes ? 'border-destructive' : ''}`}
                      min={0}
                      step={15}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    現場: {calculateSiteHours(record.site_arrival, record.site_departure, record.break_minutes ?? 60)}
                  </div>
                </div>
              </div>

              {errors?.[index] && (
                <div className="text-sm text-destructive pl-2">
                  {errors[index].employee_code && <p>{errors[index].employee_code}</p>}
                  {errors[index].clock_in && <p>{errors[index].clock_in}</p>}
                  {errors[index].site_arrival && <p>{errors[index].site_arrival}</p>}
                  {errors[index].site_departure && <p>{errors[index].site_departure}</p>}
                  {errors[index].clock_out && <p>{errors[index].clock_out}</p>}
                  {errors[index].break_minutes && <p>{errors[index].break_minutes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
