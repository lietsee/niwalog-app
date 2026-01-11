import { z } from 'zod'

export const monthlyCostSchema = z.object({
  year_month: z
    .string()
    .min(1, '対象年月は必須です')
    .regex(/^\d{4}-\d{2}$/, '対象年月の形式が不正です（例: 2026-01）'),
  cost_type: z.enum(['fixed', 'variable'], {
    error: '経費種別が不正です',
  }),
  category: z
    .string()
    .min(1, 'カテゴリは必須です')
    .max(100, 'カテゴリは100文字以内で入力してください'),
  amount: z.coerce
    .number()
    .int('金額は整数で入力してください')
    .min(0, '金額は0以上で入力してください'),
  notes: z
    .string()
    .max(1000, '備考は1000文字以内で入力してください')
    .nullable()
    .optional()
    .transform((val) => val || null),
})

export type MonthlyCostFormData = z.infer<typeof monthlyCostSchema>
