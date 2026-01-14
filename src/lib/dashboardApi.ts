import { supabase } from './supabaseClient'
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns'
import type { ApiResponse, DashboardSummary, MonthlyStats, EmployeeWorkSummary, RecentProject } from './types'
import { getAnnualContractRevenueForPeriod } from './annualContractsApi'

/**
 * ダッシュボードサマリー取得
 * @param startDate 開始日（デフォルト: 今月1日）
 * @param endDate 終了日（デフォルト: 今月末日）
 */
export async function getDashboardSummary(
  startDate?: Date,
  endDate?: Date
): Promise<ApiResponse<DashboardSummary>> {
  try {
    const now = new Date()
    const monthStart = format(startDate ? startOfMonth(startDate) : startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endDate ? endOfMonth(endDate) : endOfMonth(now), 'yyyy-MM-dd')

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

    // 期間内の通常案件取得（売上・人件費）
    // 年間契約案件（contract_type='annual'）は月次配分で計上するため除外
    const { data: monthlyProjects, error: monthlyProjectsError } = await supabase
      .from('projects')
      .select('invoice_amount, labor_cost, contract_type')
      .gte('implementation_date', monthStart)
      .lte('implementation_date', monthEnd)

    if (monthlyProjectsError) {
      console.error('Monthly projects error:', monthlyProjectsError)
      return { data: null, error: monthlyProjectsError.message, status: 400 }
    }

    // 年間契約の月次収益を取得
    const annualRevenueResult = await getAnnualContractRevenueForPeriod(monthStart, monthEnd)
    const annualContractRevenue = annualRevenueResult.data || 0

    // 期間内の経費取得
    const { data: monthlyExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)

    if (expensesError) {
      console.error('Monthly expenses error:', expensesError)
      return { data: null, error: expensesError.message, status: 400 }
    }

    // 期間内の月次経費（固定費・変動費）取得
    const yearMonth = format(startDate || now, 'yyyy-MM')
    const { data: monthlyCosts, error: monthlyCostsError } = await supabase
      .from('monthly_costs')
      .select('cost_type, amount')
      .eq('year_month', yearMonth)

    if (monthlyCostsError) {
      console.error('Monthly costs error:', monthlyCostsError)
      return { data: null, error: monthlyCostsError.message, status: 400 }
    }

    // 集計（Supabaseがnumericを文字列で返す場合があるためNumber()で変換）
    // 通常案件の売上（年間契約案件は除外）
    const standardInvoice = (monthlyProjects || []).reduce(
      (sum, p) => {
        // 年間契約案件は月次配分で計上するため除外
        if (p.contract_type === 'annual') return sum
        return sum + Number(p.invoice_amount ?? 0)
      },
      0
    )
    // 通常案件 + 年間契約の月次配分
    const monthlyInvoice = standardInvoice + annualContractRevenue

    // 人件費は全案件（年間契約含む）から集計
    const monthlyLaborCost = (monthlyProjects || []).reduce(
      (sum, p) => sum + Number(p.labor_cost ?? 0),
      0
    )
    const monthlyExpense = (monthlyExpenses || []).reduce(
      (sum, e) => sum + Number(e.amount ?? 0),
      0
    )

    // 固定費・変動費集計
    let monthlyFixedCost = 0
    let monthlyVariableCost = 0
    for (const cost of monthlyCosts || []) {
      if (cost.cost_type === 'fixed') {
        monthlyFixedCost += Number(cost.amount ?? 0)
      } else {
        monthlyVariableCost += Number(cost.amount ?? 0)
      }
    }

    // 粗利計算: 売上 - 経費 - 人件費 - 固定費 - 変動費
    const grossProfit = monthlyInvoice - monthlyExpense - monthlyLaborCost - monthlyFixedCost - monthlyVariableCost

    return {
      data: {
        totalFields: totalFields || 0,
        totalProjects: totalProjects || 0,
        monthlyInvoice,
        monthlyExpense,
        monthlyLaborCost,
        monthlyFixedCost,
        monthlyVariableCost,
        grossProfit,
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
 * 月別集計取得
 * @param startDate 開始月（デフォルト: 6ヶ月前）
 * @param endDate 終了月（デフォルト: 今月）
 */
export async function getMonthlyStats(
  startDate?: Date,
  endDate?: Date
): Promise<ApiResponse<MonthlyStats[]>> {
  try {
    const now = new Date()
    const effectiveEndDate = endDate || now
    const effectiveStartDate = startDate || subMonths(now, 5)
    const stats: MonthlyStats[] = []

    // 開始月から終了月までループ
    let currentMonth = startOfMonth(effectiveStartDate)
    const lastMonth = startOfMonth(effectiveEndDate)

    while (currentMonth <= lastMonth) {
      const targetMonth = currentMonth
      const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthKey = format(targetMonth, 'yyyy-MM')

      // 案件取得（売上・人件費）
      const { data: projects } = await supabase
        .from('projects')
        .select('invoice_amount, labor_cost, contract_type')
        .gte('implementation_date', monthStart)
        .lte('implementation_date', monthEnd)

      // 年間契約の月次収益を取得
      const annualRevenueResult = await getAnnualContractRevenueForPeriod(monthStart, monthEnd)
      const annualContractRevenue = annualRevenueResult.data || 0

      // 経費取得
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)

      // 月次経費（固定費・変動費）取得
      const { data: monthlyCosts } = await supabase
        .from('monthly_costs')
        .select('cost_type, amount')
        .eq('year_month', monthKey)

      // 通常案件の売上（年間契約案件は除外）
      const standardInvoice = (projects || []).reduce((sum, p) => {
        if (p.contract_type === 'annual') return sum
        return sum + Number(p.invoice_amount ?? 0)
      }, 0)
      const invoice = standardInvoice + annualContractRevenue
      const laborCost = (projects || []).reduce((sum, p) => sum + Number(p.labor_cost ?? 0), 0)
      const expense = (expenses || []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

      // 固定費・変動費集計
      let fixedCost = 0
      let variableCost = 0
      for (const cost of monthlyCosts || []) {
        if (cost.cost_type === 'fixed') {
          fixedCost += Number(cost.amount ?? 0)
        } else {
          variableCost += Number(cost.amount ?? 0)
        }
      }

      // 粗利計算
      const grossProfit = invoice - expense - laborCost - fixedCost - variableCost

      stats.push({
        month: monthKey,
        invoice,
        expense,
        laborCost,
        fixedCost,
        variableCost,
        grossProfit,
      })

      // 次の月へ
      currentMonth = addMonths(currentMonth, 1)
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
 * 従業員稼働サマリー取得
 * @param startDate 開始日（デフォルト: 今月1日）
 * @param endDate 終了日（デフォルト: 今月末日）
 */
export async function getEmployeeWorkSummary(
  startDate?: Date,
  endDate?: Date
): Promise<ApiResponse<EmployeeWorkSummary[]>> {
  try {
    const now = new Date()
    const monthStart = format(startDate ? startOfMonth(startDate) : startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endDate ? endOfMonth(endDate) : endOfMonth(now), 'yyyy-MM-dd')

    // 期間内の作業日を取得
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

    // 従事者記録取得（site_hoursで現場作業時間を集計）
    const { data: records, error: recordsError } = await supabase
      .from('work_records')
      .select('employee_code, site_hours')
      .in('work_day_id', workDayIds)

    if (recordsError) {
      console.error('Work records error:', recordsError)
      return { data: null, error: recordsError.message, status: 400 }
    }

    // 従業員コードごとに集計（現場作業時間）
    const employeeHours: Record<string, number> = {}
    for (const record of records || []) {
      if (!employeeHours[record.employee_code]) {
        employeeHours[record.employee_code] = 0
      }
      employeeHours[record.employee_code] += record.site_hours || 0
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
 * @param limit 取得件数（デフォルト: 5）
 * @param startDate 開始日（指定時は期間内の案件のみ）
 * @param endDate 終了日（指定時は期間内の案件のみ）
 */
export async function getRecentProjects(
  limit: number = 5,
  startDate?: Date,
  endDate?: Date
): Promise<ApiResponse<RecentProject[]>> {
  try {
    let query = supabase
      .from('projects')
      .select(`
        id,
        implementation_date,
        invoice_amount,
        fields (field_name)
      `)

    // 期間指定がある場合はフィルタリング
    if (startDate) {
      const start = format(startOfMonth(startDate), 'yyyy-MM-dd')
      query = query.gte('implementation_date', start)
    }
    if (endDate) {
      const end = format(endOfMonth(endDate), 'yyyy-MM-dd')
      query = query.lte('implementation_date', end)
    }

    const { data, error } = await query
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
