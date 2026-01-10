import { z } from 'zod'

export const fieldSchema = z.object({
  field_code: z
    .string()
    .min(1, '現場コードは必須です')
    .max(50, '現場コードは50文字以内で入力してください'),
  field_name: z
    .string()
    .min(1, '現場名は必須です')
    .max(255, '現場名は255文字以内で入力してください'),
  customer_name: z
    .string()
    .max(255, '顧客名は255文字以内で入力してください')
    .nullable()
    .optional(),
  address: z.string().nullable().optional(),
  has_electricity: z.boolean().default(false),
  has_water: z.boolean().default(false),
  has_toilet: z.boolean().default(false),
  toilet_distance: z
    .string()
    .max(100, 'トイレまでの距離は100文字以内で入力してください')
    .nullable()
    .optional(),
  travel_distance_km: z.preprocess(
    (val) => (typeof val === 'number' && isNaN(val) ? null : val),
    z.number().min(0, '移動距離は0以上で入力してください').nullable().optional()
  ),
  travel_time_minutes: z.preprocess(
    (val) => (typeof val === 'number' && isNaN(val) ? null : val),
    z
      .number()
      .int('移動時間は整数で入力してください')
      .min(0, '移動時間は0以上で入力してください')
      .nullable()
      .optional()
  ),
  travel_cost: z.preprocess(
    (val) => (typeof val === 'number' && isNaN(val) ? null : val),
    z
      .number()
      .int('移動費は整数で入力してください')
      .min(0, '移動費は0以上で入力してください')
      .nullable()
      .optional()
  ),
  notes: z.string().nullable().optional(),
  warnings: z.string().nullable().optional(),
})

export type FieldFormData = z.infer<typeof fieldSchema>
