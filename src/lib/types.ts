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

// WorkRecord (従事者稼働記録) - 4時刻対応
export type WorkRecord = {
  id: string
  work_day_id: string
  employee_code: string
  clock_in: string | null        // 出勤時間（土場）- 途中合流の場合はnull
  site_arrival: string           // 現場到着時間
  site_departure: string         // 現場撤収時間
  clock_out: string | null       // 退勤時間（土場）- 途中離脱の場合はnull
  break_minutes: number
  site_hours: number | null      // 現場作業時間（自動計算）
  prep_hours: number | null      // 準備＋移動時間（自動計算）
  return_hours: number | null    // 帰社時間（自動計算）
  total_hours: number | null     // 総拘束時間（自動計算）
  created_at: string
  updated_at: string
}

// SalaryType (給与タイプ)
export type SalaryType = 'hourly' | 'daily' | 'monthly'

// Employee (従業員マスタ)
export type Employee = {
  employee_code: string
  name: string
  salary_type: SalaryType
  hourly_rate: number | null
  daily_rate: number | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// CostType (経費種別)
export type CostType = 'fixed' | 'variable'

// MonthlyCost (月次経費)
export type MonthlyCost = {
  id: string
  year_month: string
  cost_type: CostType
  category: string
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
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
  monthlyFixedCost: number
  monthlyVariableCost: number
  grossProfit: number
}

// Monthly Stats
export type MonthlyStats = {
  month: string
  invoice: number
  expense: number
  laborCost: number
  fixedCost: number
  variableCost: number
  grossProfit: number
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
  status: 'CURRENT' | 'INSERT' | 'UPDATE' | 'DELETE'
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
  operationType: 'CURRENT' | 'INSERT' | 'UPDATE' | 'DELETE'
  operationAt: string
  operationBy: string | null
}

// Employee History Record
export type EmployeeHistoryRecord = {
  historyId: string
  employeeCode: string
  name: string
  salaryType: SalaryType
  hourlyRate: number | null
  dailyRate: number | null
  operationType: 'CURRENT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE'
  operationAt: string
  operationBy: string | null
}

// Monthly Cost History Record
export type MonthlyCostHistoryRecord = {
  historyId: string
  id: string
  yearMonth: string
  costType: CostType
  category: string
  amount: number
  notes: string | null
  operationType: 'CURRENT' | 'INSERT' | 'UPDATE' | 'DELETE'
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
  | 'employee-list'
  | 'employee-form'
  | 'monthly-cost'
  | 'analysis'
  | 'history'
