import { supabase } from './supabaseClient'
import type { ApiResponse, FieldProfitabilityReport, ProjectReview } from './types'

type ExpenseData = {
  project_id: string
  amount: number
}

/**
 * 現場別収益性レポート取得
 */
export async function getFieldProfitabilityReport(
  startDate: string,
  endDate: string
): Promise<ApiResponse<FieldProfitabilityReport[]>> {
  try {
    // 期間内の案件を現場情報付きで取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        field_id,
        invoice_amount,
        labor_cost,
        fields (
          id,
          field_code,
          field_name,
          customer_name,
          travel_cost
        )
      `)
      .gte('implementation_date', startDate)
      .lte('implementation_date', endDate)

    if (projectsError) {
      console.error('Projects error:', projectsError)
      return { data: null, error: projectsError.message, status: 400 }
    }

    // 期間内の経費を取得（案件に紐づくもの）
    const projectIds = (projects || []).map((p) => p.id)
    let expensesByProject: Record<string, number> = {}

    if (projectIds.length > 0) {
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('project_id, amount')
        .in('project_id', projectIds)

      if (expensesError) {
        console.error('Expenses error:', expensesError)
        return { data: null, error: expensesError.message, status: 400 }
      }

      // 案件ごとの経費合計
      for (const expense of (expenses || []) as ExpenseData[]) {
        if (!expensesByProject[expense.project_id]) {
          expensesByProject[expense.project_id] = 0
        }
        expensesByProject[expense.project_id] += expense.amount
      }
    }

    // 現場ごとに集計
    const fieldMap = new Map<string, FieldProfitabilityReport>()

    for (const project of projects || []) {
      const fields = Array.isArray(project.fields) ? project.fields[0] : project.fields
      if (!fields) continue

      const fieldId = project.field_id
      const existing = fieldMap.get(fieldId)

      const invoice = project.invoice_amount || 0
      const laborCost = project.labor_cost || 0
      const expense = expensesByProject[project.id] || 0

      if (existing) {
        existing.totalInvoice += invoice
        existing.totalLaborCost += laborCost
        existing.totalExpense += expense
        existing.projectCount += 1
      } else {
        fieldMap.set(fieldId, {
          fieldId,
          fieldCode: fields.field_code,
          fieldName: fields.field_name,
          customerName: fields.customer_name,
          totalInvoice: invoice,
          totalLaborCost: laborCost,
          totalExpense: expense,
          profit: 0,
          profitMargin: 0,
          projectCount: 1,
          travelCost: fields.travel_cost,
        })
      }
    }

    // 粗利益・粗利益率を計算
    const reports: FieldProfitabilityReport[] = []
    for (const report of fieldMap.values()) {
      report.profit = report.totalInvoice - report.totalLaborCost - report.totalExpense
      report.profitMargin =
        report.totalInvoice > 0
          ? Math.round((report.profit / report.totalInvoice) * 100 * 10) / 10
          : 0
      reports.push(report)
    }

    // 売上降順でソート
    reports.sort((a, b) => b.totalInvoice - a.totalInvoice)

    return { data: reports, error: null, status: 200 }
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
 * 案件レビュー一覧取得
 */
export async function getProjectReviewList(
  startDate: string,
  endDate: string
): Promise<ApiResponse<ProjectReview[]>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        project_number,
        implementation_date,
        review_good_points,
        review_improvements,
        review_next_actions,
        fields (
          field_code,
          field_name
        )
      `)
      .gte('implementation_date', startDate)
      .lte('implementation_date', endDate)
      .or('review_good_points.neq.,review_improvements.neq.,review_next_actions.neq.')
      .order('implementation_date', { ascending: false })

    if (error) {
      console.error('Reviews error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    const reviews: ProjectReview[] = (data || [])
      .filter((p) => p.fields)
      .map((p) => {
        const fields = Array.isArray(p.fields) ? p.fields[0] : p.fields
        return {
          id: p.id,
          fieldName: fields?.field_name || '',
          fieldCode: fields?.field_code || '',
          projectNumber: p.project_number,
          implementationDate: p.implementation_date,
          goodPoints: p.review_good_points,
          improvements: p.review_improvements,
          nextActions: p.review_next_actions,
        }
      })

    return { data: reviews, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
