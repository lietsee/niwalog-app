import { supabase } from './supabaseClient'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import type { ApiResponse, DashboardSummary, MonthlyStats, EmployeeWorkSummary, RecentProject } from './types'

/**
 * ダッシュボードサマリー取得
 */
export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  try {
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    // 現場数取得
    const { count: totalFields, error: fieldsError } = await supabase
      .from('fields')
      .select('*', { count: 'exact', head: true })

    if (fieldsError) {
      console.error('Fields count error:', fieldsError)
      return { data: null, error: fieldsError.message, status: 400 }
    }

    // 案件数取得
    const { count: totalProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    if (projectsError) {
      console.error('Projects count error:', projectsError)
      return { data: null, error: projectsError.message, status: 400 }
    }

    // 今月の案件取得（売上・人件費）
    const { data: monthlyProjects, error: monthlyProjectsError } = await supabase
      .from('projects')
      .select('invoice_amount, labor_cost')
      .gte('implementation_date', monthStart)
      .lte('implementation_date', monthEnd)

    if (monthlyProjectsError) {
      console.error('Monthly projects error:', monthlyProjectsError)
      return { data: null, error: monthlyProjectsError.message, status: 400 }
    }

    // 今月の経費取得
    const { data: monthlyExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)

    if (expensesError) {
      console.error('Monthly expenses error:', expensesError)
      return { data: null, error: expensesError.message, status: 400 }
    }

    // 集計
    const monthlyInvoice = (monthlyProjects || []).reduce(
      (sum, p) => sum + (p.invoice_amount || 0),
      0
    )
    const monthlyLaborCost = (monthlyProjects || []).reduce(
      (sum, p) => sum + (p.labor_cost || 0),
      0
    )
    const monthlyExpense = (monthlyExpenses || []).reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    )

    return {
      data: {
        totalFields: totalFields || 0,
        totalProjects: totalProjects || 0,
        monthlyInvoice,
        monthlyExpense,
        monthlyLaborCost,
      },
      error: null,
      status: 200,
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 月別集計取得（過去N ヶ月）
 */
export async function getMonthlyStats(months: number = 6): Promise<ApiResponse<MonthlyStats[]>> {
  try {
    const now = new Date()
    const stats: MonthlyStats[] = []

    for (let i = months - 1; i >= 0; i--) {
      const targetMonth = subMonths(now, i)
      const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthKey = format(targetMonth, 'yyyy-MM')

      // 案件取得（売上・人件費）
      const { data: projects } = await supabase
        .from('projects')
        .select('invoice_amount, labor_cost')
        .gte('implementation_date', monthStart)
        .lte('implementation_date', monthEnd)

      // 経費取得
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)

      const invoice = (projects || []).reduce((sum, p) => sum + (p.invoice_amount || 0), 0)
      const laborCost = (projects || []).reduce((sum, p) => sum + (p.labor_cost || 0), 0)
      const expense = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)

      stats.push({
        month: monthKey,
        invoice,
        expense,
        laborCost,
      })
    }

    return { data: stats, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 従業員稼働サマリー取得（今月）
 */
export async function getEmployeeWorkSummary(): Promise<ApiResponse<EmployeeWorkSummary[]>> {
  try {
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    // 今月の作業日を取得
    const { data: workDays, error: workDaysError } = await supabase
      .from('work_days')
      .select('id')
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    if (workDaysError) {
      console.error('Work days error:', workDaysError)
      return { data: null, error: workDaysError.message, status: 400 }
    }

    if (!workDays || workDays.length === 0) {
      return { data: [], error: null, status: 200 }
    }

    const workDayIds = workDays.map((wd) => wd.id)

    // 従事者記録取得
    const { data: records, error: recordsError } = await supabase
      .from('work_records')
      .select('employee_code, working_hours')
      .in('work_day_id', workDayIds)

    if (recordsError) {
      console.error('Work records error:', recordsError)
      return { data: null, error: recordsError.message, status: 400 }
    }

    // 従業員コードごとに集計
    const employeeHours: Record<string, number> = {}
    for (const record of records || []) {
      if (!employeeHours[record.employee_code]) {
        employeeHours[record.employee_code] = 0
      }
      employeeHours[record.employee_code] += record.working_hours || 0
    }

    const summary: EmployeeWorkSummary[] = Object.entries(employeeHours)
      .map(([employeeCode, totalHours]) => ({
        employeeCode,
        totalHours: Math.round(totalHours * 10) / 10,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)

    return { data: summary, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 直近案件取得
 */
export async function getRecentProjects(limit: number = 5): Promise<ApiResponse<RecentProject[]>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        implementation_date,
        invoice_amount,
        fields (field_name)
      `)
      .order('implementation_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Recent projects error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const projects: RecentProject[] = (data || []).map((p) => ({
      id: p.id,
      fieldName: (p.fields as unknown as { field_name: string } | null)?.field_name || '不明',
      implementationDate: p.implementation_date,
      invoiceAmount: p.invoice_amount,
    }))

    return { data: projects, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
