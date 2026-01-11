import { z } from 'zod'

// 天候エントリのスキーマ
export const weatherEntrySchema = z.object({
  time: z.string().min(1, '時刻を入力してください'),
  condition: z.string().min(1, '天候を入力してください'),
})

// 従事者稼働記録のスキーマ（インライン編集用）
export const workRecordInputSchema = z.object({
  id: z.string().optional(), // 既存レコードの場合はID
  employee_code: z
    .string()
    .min(1, '従業員コードを入力してください')
    .max(10, '従業員コードは10文字以内で入力してください'),
  start_time: z.string().min(1, '開始時刻を入力してください'),
  end_time: z.string().min(1, '終了時刻を入力してください'),
  break_minutes: z.coerce
    .number()
    .int('休憩時間は整数で入力してください')
    .min(0, '休憩時間は0以上で入力してください')
    .default(60),
})

// 作業日スキーマ
export const workDaySchema = z.object({
  project_id: z.string().uuid('案件IDが無効です'),
  day_number: z.coerce
    .number()
    .int('日番号は整数で入力してください')
    .min(1, '日番号は1以上で入力してください'),
  work_date: z.string().min(1, '作業日は必須です'),
  weather: z.array(weatherEntrySchema).optional().nullable(),
  work_description: z.string().nullable().optional(),
  troubles: z.string().nullable().optional(),
  work_records: z.array(workRecordInputSchema).optional(),
})

export type WorkDayFormData = z.infer<typeof workDaySchema>
export type WeatherEntryInput = z.infer<typeof weatherEntrySchema>
export type WorkRecordInput = z.infer<typeof workRecordInputSchema>
