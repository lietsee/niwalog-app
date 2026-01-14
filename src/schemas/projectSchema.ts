import { z } from 'zod'

export const projectSchema = z.object({
  field_id: z.string().uuid('現場IDが無効です'),
  project_number: z.coerce
    .number()
    .int('案件番号は整数で入力してください')
    .min(1, '案件番号は1以上で入力してください'),
  implementation_date: z.string().min(1, '実施日は必須です'),
  work_type_pruning: z.boolean().default(false),
  work_type_weeding: z.boolean().default(false),
  work_type_cleaning: z.boolean().default(false),
  work_type_other: z
    .string()
    .max(255, 'その他作業内容は255文字以内で入力してください')
    .nullable()
    .optional(),
  estimate_amount: z.coerce
    .number()
    .int('見積金額は整数で入力してください')
    .min(0, '見積金額は0以上で入力してください')
    .nullable()
    .optional()
    .transform((val) => (val === 0 || val ? val : null)),
  invoice_amount: z.coerce
    .number()
    .int('請求金額は整数で入力してください')
    .min(0, '請求金額は0以上で入力してください')
    .nullable()
    .optional()
    .transform((val) => (val === 0 || val ? val : null)),
  labor_cost: z.coerce
    .number()
    .int('人件費は整数で入力してください')
    .min(0, '人件費は0以上で入力してください')
    .nullable()
    .optional()
    .transform((val) => (val === 0 || val ? val : null)),
  review_good_points: z.string().nullable().optional(),
  review_improvements: z.string().nullable().optional(),
  review_next_actions: z.string().nullable().optional(),
  contract_type: z.enum(['standard', 'annual']).default('standard'),
  annual_contract_id: z.string().uuid('年間契約IDが無効です').nullable().optional(),
}).superRefine((data, ctx) => {
  // 年間契約を選択した場合、年間契約IDは必須
  if (data.contract_type === 'annual' && !data.annual_contract_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '年間契約を選択した場合は、対象の年間契約を選択してください',
      path: ['annual_contract_id'],
    })
  }
})

export type ProjectFormData = z.infer<typeof projectSchema>
