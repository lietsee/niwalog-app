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
  invoice_amount: number | null
  labor_cost: number | null
  expense_total: number | null
  review_good_points: string | null
  review_improvements: string | null
  review_next_actions: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// ProjectWithField (現場情報付き案件)
export type ProjectWithField = Project & {
  fields: {
    field_code: string
    field_name: string
    customer_name: string | null
  }
}

// WeatherEntry (天候エントリ)
export type WeatherEntry = {
  time: string
  condition: string
}

// WorkDay (日別作業記録)
export type WorkDay = {
  id: string
  project_id: string
  work_date: string
  day_number: number
  weather: WeatherEntry[] | null
  work_description: string | null
  troubles: string | null
  created_at: string
  updated_at: string
}

// WorkDayWithRecords (従事者稼働記録付き作業日)
export type WorkDayWithRecords = WorkDay & {
  work_records: WorkRecord[]
}

// WorkRecord (従事者稼働記録)
export type WorkRecord = {
  id: string
  work_day_id: string
  employee_code: string
  start_time: string
  end_time: string
  break_minutes: number
  working_hours: number | null
  created_at: string
  updated_at: string
}

// Expense (経費)
export type Expense = {
  id: string
  project_id: string
  expense_item: string
  amount: number
  notes: string | null
  expense_date: string | null
  created_at: string
  updated_at: string
}

// Dashboard Summary
export type DashboardSummary = {
  totalFields: number
  totalProjects: number
  monthlyInvoice: number
  monthlyExpense: number
  monthlyLaborCost: number
}

// Monthly Stats
export type MonthlyStats = {
  month: string
  invoice: number
  expense: number
  laborCost: number
}

// Employee Work Summary
export type EmployeeWorkSummary = {
  employeeCode: string
  totalHours: number
}

// Recent Project
export type RecentProject = {
  id: string
  fieldName: string
  implementationDate: string
  invoiceAmount: number | null
}

// Field Profitability Report
export type FieldProfitabilityReport = {
  fieldId: string
  fieldCode: string
  fieldName: string
  customerName: string | null
  totalInvoice: number
  totalLaborCost: number
  totalExpense: number
  profit: number
  profitMargin: number
  projectCount: number
  travelCost: number | null
}

// Project Review
export type ProjectReview = {
  id: string
  fieldName: string
  fieldCode: string
  projectNumber: number
  implementationDate: string
  goodPoints: string | null
  improvements: string | null
  nextActions: string | null
}

// Field History Record
export type FieldHistoryRecord = {
  id: string
  fieldCode: string
  fieldName: string
  customerName: string | null
  address: string | null
  status: 'CURRENT' | 'UPDATE' | 'DELETE'
  operationAt: string
  operationBy: string | null
}

// Project History Record
export type ProjectHistoryRecord = {
  id: string
  fieldId: string
  fieldCode: string
  fieldName: string
  projectNumber: number
  implementationDate: string
  operationType: string
  operationAt: string
  operationBy: string | null
}

// Page Type for routing
export type Page =
  | 'login'
  | 'dashboard'
  | 'field-list'
  | 'field-form'
  | 'project-list'
  | 'project-form'
  | 'project-detail'
  | 'work-day-form'
  | 'expense-form'
  | 'analysis'
  | 'history'
