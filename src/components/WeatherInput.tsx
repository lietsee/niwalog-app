import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WeatherEntry } from '@/lib/types'

interface WeatherInputProps {
  value: WeatherEntry[]
  onChange: (value: WeatherEntry[]) => void
}

const WEATHER_OPTIONS = [
  '晴れ',
  '曇り',
  '雨',
  '雪',
  '晴れ時々曇り',
  '曇り時々雨',
  '強風',
  '猛暑',
]

export function WeatherInput({ value, onChange }: WeatherInputProps) {
  const addEntry = () => {
    const newEntry: WeatherEntry = {
      time: '08:00',
      condition: '晴れ',
    }
    onChange([...value, newEntry])
  }

  const removeEntry = (index: number) => {
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
  }

  const updateEntry = (index: number, field: keyof WeatherEntry, newValue: string) => {
    const updated = value.map((entry, i) =>
      i === index ? { ...entry, [field]: newValue } : entry
    )
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>天候情報</Label>
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          天候情報が未登録です。「追加」ボタンで時刻ごとの天候を記録できます。
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
            >
              <Input
                type="time"
                value={entry.time}
                onChange={(e) => updateEntry(index, 'time', e.target.value)}
                className="w-28"
              />
              <select
                value={WEATHER_OPTIONS.includes(entry.condition) ? entry.condition : ''}
                onChange={(e) => updateEntry(index, 'condition', e.target.value)}
                className="h-10 px-3 border rounded-md bg-background"
              >
                <option value="" disabled>
                  選択...
                </option>
                {WEATHER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Input
                placeholder="その他（自由入力）"
                value={WEATHER_OPTIONS.includes(entry.condition) ? '' : entry.condition}
                onChange={(e) => updateEntry(index, 'condition', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeEntry(index)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
