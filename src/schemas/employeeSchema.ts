import { z } from 'zod'

export const salaryTypeSchema = z.enum(['hourly', 'daily', 'monthly'])

export const employeeSchema = z
  .object({
    employee_code: z
      .string()
      .min(1, '従業員コードを入力してください')
      .max(10, '従業員コードは10文字以内で入力してください')
      .regex(/^[a-zA-Z0-9-_]+$/, '従業員コードは半角英数字とハイフン、アンダースコアのみ使用可能です'),
    name: z
      .string()
      .min(1, '氏名を入力してください')
      .max(100, '氏名は100文字以内で入力してください'),
    salary_type: salaryTypeSchema,
    hourly_rate: z.coerce
      .number()
      .int('時給は整数で入力してください')
      .min(0, '時給は0以上で入力してください')
      .nullable()
      .optional(),
    daily_rate: z.coerce
      .number()
      .int('日給は整数で入力してください')
      .min(0, '日給は0以上で入力してください')
      .nullable()
      .optional(),
    is_active: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    // 時給の場合は時給が必須
    if (data.salary_type === 'hourly') {
      if (data.hourly_rate === null || data.hourly_rate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '時給タイプの場合は時給を入力してください',
          path: ['hourly_rate'],
        })
      }
    }

    // 日給月給/月給の場合は日給が必須
    if (data.salary_type === 'daily' || data.salary_type === 'monthly') {
      if (data.daily_rate === null || data.daily_rate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '日給月給/月給タイプの場合は日給を入力してください',
          path: ['daily_rate'],
        })
      }
    }
  })

export type EmployeeFormData = z.infer<typeof employeeSchema>
