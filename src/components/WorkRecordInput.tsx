import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkRecordInput as WorkRecordInputType } from '@/schemas/workDaySchema'

interface WorkRecordInputProps {
  value: WorkRecordInputType[]
  onChange: (value: WorkRecordInputType[]) => void
  errors?: Record<number, { employee_code?: string; start_time?: string; end_time?: string }>
}

export function WorkRecordInput({ value, onChange, errors }: WorkRecordInputProps) {
  const addRecord = () => {
    const newRecord: WorkRecordInputType = {
      employee_code: '',
      start_time: '08:00',
      end_time: '17:00',
    }
    onChange([...value, newRecord])
  }

  const removeRecord = (index: number) => {
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
  }

  const updateRecord = (
    index: number,
    field: keyof WorkRecordInputType,
    newValue: string
  ) => {
    const updated = value.map((record, i) =>
      i === index ? { ...record, [field]: newValue } : record
    )
    onChange(updated)
  }

  const calculateHours = (start: string, end: string): string => {
    if (!start || !end) return '-'
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    if (endMinutes <= startMinutes) return '-'
    const hours = (endMinutes - startMinutes) / 60
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
          {value.map((record, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <div className="flex-1">
                  <Input
                    placeholder="従業員コード（例: f001）"
                    value={record.employee_code}
                    onChange={(e) =>
                      updateRecord(index, 'employee_code', e.target.value)
                    }
                    className={errors?.[index]?.employee_code ? 'border-destructive' : ''}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={record.start_time}
                    onChange={(e) =>
                      updateRecord(index, 'start_time', e.target.value)
                    }
                    className={`w-28 ${errors?.[index]?.start_time ? 'border-destructive' : ''}`}
                  />
                  <span className="text-muted-foreground">〜</span>
                  <Input
                    type="time"
                    value={record.end_time}
                    onChange={(e) => updateRecord(index, 'end_time', e.target.value)}
                    className={`w-28 ${errors?.[index]?.end_time ? 'border-destructive' : ''}`}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {calculateHours(record.start_time, record.end_time)}
                </span>
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
              {errors?.[index] && (
                <div className="text-sm text-destructive pl-2">
                  {errors[index].employee_code && (
                    <p>{errors[index].employee_code}</p>
                  )}
                  {errors[index].start_time && <p>{errors[index].start_time}</p>}
                  {errors[index].end_time && <p>{errors[index].end_time}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
