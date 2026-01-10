// API Response Type
export type ApiResponse<T> = {
  data: T | null
  error: string | null
  status?: number
}

// Field (現場マスタ)
export type Field = {
  id: string
  field_code: string
  field_name: string
  customer_name: string | null
  address: string | null
  has_electricity: boolean
  has_water: boolean
  has_toilet: boolean
  toilet_distance: string | null
  travel_distance_km: number | null
  travel_time_minutes: number | null
  travel_cost: number | null
  notes: string | null
  warnings: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// Project (案件)
export type Project = {
  id: string
  field_id: string
  project_number: number
  implementation_date: string
  work_type_pruning: boolean
  work_type_weeding: boolean
  work_type_cleaning: boolean
  work_type_other: string | null
  estimate_amount: number | null
  invoice_amount: number
  labor_cost: number | null
  expense_total: number | null
  review_good_points: string | null
  review_improvements: string | null
  review_next_actions: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// Page Type for routing
export type Page =
  | 'login'
  | 'dashboard'
  | 'field-list'
  | 'field-form'
  | 'project-list'
  | 'project-form'
  | 'work-day-form'
  | 'history'
