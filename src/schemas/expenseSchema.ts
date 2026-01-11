import { z } from 'zod'

export const expenseSchema = z.object({
  project_id: z.string().uuid('案件IDが無効です'),
  expense_item: z
    .string()
    .min(1, '項目名は必須です')
    .max(255, '項目名は255文字以内で入力してください'),
  amount: z.coerce
    .number()
    .int('金額は整数で入力してください')
    .min(0, '金額は0以上で入力してください'),
  expense_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>
