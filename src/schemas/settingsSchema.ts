import { z } from 'zod'

export const baseAddressSchema = z.object({
  address: z
    .string()
    .min(1, '基準住所を入力してください')
    .max(500, '住所は500文字以内で入力してください'),
  lat: z
    .number()
    .min(-90, '緯度は-90〜90の範囲で入力してください')
    .max(90, '緯度は-90〜90の範囲で入力してください'),
  lng: z
    .number()
    .min(-180, '経度は-180〜180の範囲で入力してください')
    .max(180, '経度は-180〜180の範囲で入力してください'),
})

export type BaseAddressFormData = z.infer<typeof baseAddressSchema>
