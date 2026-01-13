import { z } from 'zod'

// 各月の最大日数
const DAYS_IN_MONTH = {
  jan: 31,
  feb: 29, // うるう年考慮
  mar: 31,
  apr: 30,
  may: 31,
  jun: 30,
  jul: 31,
  aug: 31,
  sep: 30,
  oct: 31,
  nov: 30,
  dec: 31,
} as const

// 月名（日本語表示用）
export const MONTH_NAMES = {
  jan: '1月',
  feb: '2月',
  mar: '3月',
  apr: '4月',
  may: '5月',
  jun: '6月',
  jul: '7月',
  aug: '8月',
  sep: '9月',
  oct: '10月',
  nov: '11月',
  dec: '12月',
} as const

export const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
export type MonthKey = (typeof MONTH_KEYS)[number]

// 各月の最大日数を取得
export function getMaxDaysInMonth(month: MonthKey): number {
  return DAYS_IN_MONTH[month]
}

// 月ごとの日数検証スキーマ
const monthDaySchema = (month: MonthKey) =>
  z.coerce
    .number()
    .int('整数で入力してください')
    .min(0, '0以上で入力してください')
    .max(DAYS_IN_MONTH[month], `${DAYS_IN_MONTH[month]}以下で入力してください`)

export const businessDaySchema = z.object({
  year: z.coerce
    .number()
    .int('年は整数で入力してください')
    .min(2000, '2000年以上で入力してください')
    .max(2100, '2100年以下で入力してください'),
  day_type: z.enum(['working_days', 'temporary_closure'], {
    error: '日数タイプが不正です',
  }),
  jan: monthDaySchema('jan'),
  feb: monthDaySchema('feb'),
  mar: monthDaySchema('mar'),
  apr: monthDaySchema('apr'),
  may: monthDaySchema('may'),
  jun: monthDaySchema('jun'),
  jul: monthDaySchema('jul'),
  aug: monthDaySchema('aug'),
  sep: monthDaySchema('sep'),
  oct: monthDaySchema('oct'),
  nov: monthDaySchema('nov'),
  dec: monthDaySchema('dec'),
  notes: z
    .string()
    .max(1000, '備考は1000文字以内で入力してください')
    .nullable()
    .optional()
    .transform((val) => val || null),
})

export type BusinessDayFormData = z.infer<typeof businessDaySchema>

// 年度追加用スキーマ
export const addYearSchema = z.object({
  year: z.coerce
    .number()
    .int('年は整数で入力してください')
    .min(2000, '2000年以上で入力してください')
    .max(2100, '2100年以下で入力してください'),
})

export type AddYearFormData = z.infer<typeof addYearSchema>
