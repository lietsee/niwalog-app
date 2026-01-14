import { supabase } from './supabaseClient'
import type {
  ApiResponse,
  AnnualContract,
  AnnualContractWithField,
  AnnualContractInput,
  MonthlyRevenueAllocation,
  AnnualContractProgress,
} from './types'
import { format, startOfMonth, addMonths, isBefore, isAfter, parseISO } from 'date-fns'

// ============================================================================
// 年間契約 CRUD
// ============================================================================

/**
 * 全年間契約取得（現場情報付き）
 */
export async function listAllAnnualContracts(): Promise<ApiResponse<AnnualContractWithField[]>> {
  try {
    const { data, error } = await supabase
      .from('annual_contracts')
      .select(`
        *,
        fields (
          field_code,
          field_name,
          customer_name
        )
      `)
      .order('fiscal_year', { ascending: false })
      .order('contract_name')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * ID指定で年間契約取得（現場情報付き）
 */
export async function getAnnualContractById(
  id: string
): Promise<ApiResponse<AnnualContractWithField>> {
  try {
    const { data, error } = await supabase
      .from('annual_contracts')
      .select(`
        *,
        fields (
          field_code,
          field_name,
          customer_name
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 200 }
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
 * フィールド指定で年間契約取得
 */
export async function listAnnualContractsByField(
  fieldId: string
): Promise<ApiResponse<AnnualContract[]>> {
  try {
    const { data, error } = await supabase
      .from('annual_contracts')
      .select('*')
      .eq('field_id', fieldId)
      .order('fiscal_year', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 年度指定で年間契約取得（現場情報付き）
 */
export async function listAnnualContractsByYear(
  fiscalYear: number
): Promise<ApiResponse<AnnualContractWithField[]>> {
  try {
    const { data, error } = await supabase
      .from('annual_contracts')
      .select(`
        *,
        fields (
          field_code,
          field_name,
          customer_name
        )
      `)
      .eq('fiscal_year', fiscalYear)
      .order('contract_name')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 年間契約作成
 */
export async function createAnnualContract(
  input: AnnualContractInput
): Promise<ApiResponse<AnnualContract>> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    const { data, error } = await supabase
      .from('annual_contracts')
      .insert({
        ...input,
        revenue_recognition_method: input.revenue_recognition_method || 'hours_based',
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 201 }
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
 * 年間契約更新
 */
export async function updateAnnualContract(
  id: string,
  input: Partial<AnnualContractInput>
): Promise<ApiResponse<AnnualContract>> {
  try {
    const { data, error } = await supabase
      .from('annual_contracts')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 200 }
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
 * 年間契約削除
 */
export async function deleteAnnualContract(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('annual_contracts').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: null, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}

// ============================================================================
// 月次収益配分
// ============================================================================

/**
 * 月次配分取得
 */
export async function getMonthlyAllocations(
  annualContractId: string
): Promise<ApiResponse<MonthlyRevenueAllocation[]>> {
  try {
    const { data, error } = await supabase
      .from('monthly_revenue_allocations')
      .select('*')
      .eq('annual_contract_id', annualContractId)
      .order('allocation_month')

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    return { data: data || [], error: null, status: 200 }
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
 * 年間契約に紐づく案件の実稼働時間を計算
 * @throws エラー時は例外をスロー（呼び出し元で適切にハンドリングすること）
 */
async function calculateActualHoursForMonth(
  annualContractId: string,
  yearMonth: string // YYYY-MM-DD形式（月初日）
): Promise<number> {
  const monthStart = yearMonth
  const monthEnd = format(addMonths(parseISO(yearMonth), 1), 'yyyy-MM-dd')

  // 年間契約に紐づく案件を取得
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('annual_contract_id', annualContractId)

  if (projectsError) {
    console.error('案件取得エラー:', projectsError)
    throw new Error(`案件取得エラー: ${projectsError.message}`)
  }

  if (!projects || projects.length === 0) {
    return 0
  }

  const projectIds = projects.map((p) => p.id)

  // 対象月の作業日を取得
  const { data: workDays, error: workDaysError } = await supabase
    .from('work_days')
    .select(`
      id,
      work_records (
        site_hours,
        total_hours
      )
    `)
    .in('project_id', projectIds)
    .gte('work_date', monthStart)
    .lt('work_date', monthEnd)

  if (workDaysError) {
    console.error('作業日取得エラー:', workDaysError)
    throw new Error(`作業日取得エラー: ${workDaysError.message}`)
  }

  if (!workDays) {
    return 0
  }

  // 稼働時間を集計（Supabaseはdecimalを文字列で返す場合があるためNumber()で変換）
  let totalHours = 0
  for (const wd of workDays) {
    for (const record of wd.work_records || []) {
      // total_hoursを優先、なければsite_hoursを使用
      const hours = record.total_hours ?? record.site_hours ?? 0
      totalHours += Number(hours)
    }
  }

  return totalHours
}

/**
 * 月次収益計算（累計ベースで計算→差分で月次）
 */
export async function calculateMonthlyRevenue(
  annualContractId: string,
  yearMonth: string // YYYY-MM-DD形式（月初日）
): Promise<ApiResponse<MonthlyRevenueAllocation>> {
  try {
    // 1. 年間契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('annual_contracts')
      .select('*')
      .eq('id', annualContractId)
      .single()

    if (contractError || !contract) {
      return { data: null, error: '年間契約が見つかりません', status: 404 }
    }

    // 1.5. 精算済みチェック
    if (contract.is_settled) {
      return { data: null, error: '精算済みの契約は再計算できません', status: 400 }
    }

    // 2. 契約期間チェック
    const allocationDate = parseISO(yearMonth)
    const contractStart = parseISO(contract.contract_start_date)
    const contractEnd = parseISO(contract.contract_end_date)

    if (isBefore(allocationDate, startOfMonth(contractStart)) ||
        isAfter(allocationDate, contractEnd)) {
      return { data: null, error: '指定月は契約期間外です', status: 400 }
    }

    // 2.5. 既存レコードが調整済みでないかチェック
    const { data: existingCheck, error: existingError } = await supabase
      .from('monthly_revenue_allocations')
      .select('id, status')
      .eq('annual_contract_id', annualContractId)
      .eq('allocation_month', yearMonth)
      .maybeSingle()  // .single()ではなく.maybeSingle()でエラー回避

    if (existingError) {
      console.error('既存配分チェックエラー:', existingError)
      return { data: null, error: existingError.message, status: 400 }
    }

    if (existingCheck?.status === 'adjusted') {
      return { data: null, error: '調整済みの配分は再計算できません', status: 400 }
    }

    // 3. 対象月の実稼働時間を計算
    const actualHours = await calculateActualHoursForMonth(annualContractId, yearMonth)

    // 4. 前月までの累計収益を取得
    const { data: previousAllocations, error: prevError } = await supabase
      .from('monthly_revenue_allocations')
      .select('cumulative_hours, cumulative_revenue')
      .eq('annual_contract_id', annualContractId)
      .lt('allocation_month', yearMonth)
      .order('allocation_month', { ascending: false })
      .limit(1)

    if (prevError) {
      console.error('前月累計取得エラー:', prevError)
      return { data: null, error: prevError.message, status: 400 }
    }

    // Supabaseはdecimalを文字列で返す場合があるためNumber()で変換
    const previousCumulativeHours =
      previousAllocations && previousAllocations.length > 0
        ? Number(previousAllocations[0].cumulative_hours)
        : 0
    const previousCumulativeRevenue =
      previousAllocations && previousAllocations.length > 0
        ? Number(previousAllocations[0].cumulative_revenue)
        : 0

    // 5. 累計稼働時間を計算（前月の累計 + 当月）
    const cumulativeHours = previousCumulativeHours + actualHours

    // 6. 配分率を計算（Number()で確実に数値変換）
    const budgetHours = Number(contract.budget_hours)
    const contractAmount = Number(contract.contract_amount)
    const allocationRate = actualHours / budgetHours
    const cumulativeRate = cumulativeHours / budgetHours

    // 7. 収益を計算（累計ベース→差分）
    // 累計収益は契約額を上限としてキャップ
    const cumulativeRevenue = Math.min(
      contractAmount,
      Math.round((contractAmount * cumulativeHours) / budgetHours)
    )
    const allocatedRevenue = cumulativeRevenue - previousCumulativeRevenue

    // 8. 残予算時間と年間見込みを計算
    const remainingBudgetHours = budgetHours - cumulativeHours

    // 経過月数を計算（契約開始からの月数）
    let elapsedMonths = 0
    let currentMonth = startOfMonth(contractStart)
    while (!isAfter(currentMonth, allocationDate)) {
      elapsedMonths++
      currentMonth = addMonths(currentMonth, 1)
    }

    const projectedAnnualHours =
      elapsedMonths > 0 ? (cumulativeHours / elapsedMonths) * 12 : null

    // 9. 保存または更新
    const allocationData = {
      annual_contract_id: annualContractId,
      allocation_month: yearMonth,
      actual_hours: actualHours,
      cumulative_hours: cumulativeHours,
      allocation_rate: allocationRate,
      cumulative_rate: cumulativeRate,
      allocated_revenue: allocatedRevenue,
      cumulative_revenue: cumulativeRevenue,
      adjustment_amount: 0,
      remaining_budget_hours: remainingBudgetHours,
      projected_annual_hours: projectedAnnualHours,
      status: 'provisional' as const,
      calculated_at: new Date().toISOString(),
    }

    let result
    if (existingCheck) {
      // 更新（既存チェックは上で済んでいる）
      const { data, error } = await supabase
        .from('monthly_revenue_allocations')
        .update(allocationData)
        .eq('id', existingCheck.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, status: 400 }
      }
      result = data
    } else {
      // 新規作成
      const { data, error } = await supabase
        .from('monthly_revenue_allocations')
        .insert(allocationData)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, status: 400 }
      }
      result = data
    }

    return { data: result, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 指定月以降の月次収益を再計算
 */
export async function recalculateFromMonth(
  annualContractId: string,
  fromYearMonth: string // YYYY-MM-DD形式（月初日）
): Promise<ApiResponse<MonthlyRevenueAllocation[]>> {
  try {
    // 年間契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('annual_contracts')
      .select('*')
      .eq('id', annualContractId)
      .single()

    if (contractError || !contract) {
      return { data: null, error: '年間契約が見つかりません', status: 404 }
    }

    // 精算済みチェック
    if (contract.is_settled) {
      return { data: null, error: '精算済みの契約は再計算できません', status: 400 }
    }

    // 再計算対象の月を取得
    const results: MonthlyRevenueAllocation[] = []
    const errors: string[] = []
    let currentMonth = parseISO(fromYearMonth)
    const contractEnd = parseISO(contract.contract_end_date)
    const today = new Date()

    while (!isAfter(currentMonth, contractEnd) && !isAfter(currentMonth, today)) {
      const monthStr = format(currentMonth, 'yyyy-MM-dd')
      const result = await calculateMonthlyRevenue(annualContractId, monthStr)

      if (result.data) {
        results.push(result.data)
      } else if (result.error && result.error !== '調整済みの配分は再計算できません') {
        // 調整済みスキップ以外のエラーは記録
        errors.push(`${monthStr}: ${result.error}`)
      }

      currentMonth = addMonths(currentMonth, 1)
    }

    if (results.length === 0 && errors.length > 0) {
      return { data: null, error: errors.join(', '), status: 400 }
    }

    return { data: results, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : 'システムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * 年度末精算
 */
export async function settleAnnualContract(
  annualContractId: string
): Promise<ApiResponse<AnnualContract>> {
  try {
    // 年間契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('annual_contracts')
      .select('*')
      .eq('id', annualContractId)
      .single()

    if (contractError || !contract) {
      return { data: null, error: '年間契約が見つかりません', status: 404 }
    }

    if (contract.is_settled) {
      return { data: null, error: 'この契約は既に精算済みです', status: 400 }
    }

    // 全配分を取得
    const { data: allocations, error: allocationsError } = await supabase
      .from('monthly_revenue_allocations')
      .select('*')
      .eq('annual_contract_id', annualContractId)
      .order('allocation_month')

    if (allocationsError) {
      console.error('Supabase error:', allocationsError)
      return { data: null, error: allocationsError.message, status: 400 }
    }

    if (!allocations || allocations.length === 0) {
      return { data: null, error: '月次配分がありません', status: 400 }
    }

    // 累計認識収益（Number()で確実に数値変換）
    const totalRecognizedRevenue = allocations.reduce(
      (sum, a) => sum + Number(a.allocated_revenue),
      0
    )

    // 差額を最終月に調整
    const contractAmount = Number(contract.contract_amount)
    const adjustmentAmount = contractAmount - totalRecognizedRevenue
    const lastAllocation = allocations[allocations.length - 1]

    if (adjustmentAmount !== 0) {
      const { error: updateError } = await supabase
        .from('monthly_revenue_allocations')
        .update({
          adjustment_amount: adjustmentAmount,
          allocated_revenue: Number(lastAllocation.allocated_revenue) + adjustmentAmount,
          cumulative_revenue: contractAmount,
          status: 'adjusted',
        })
        .eq('id', lastAllocation.id)

      if (updateError) {
        console.error('月次配分更新エラー:', updateError)
        return { data: null, error: updateError.message, status: 400 }
      }
    }

    // 契約を精算済みに
    const { data, error } = await supabase
      .from('annual_contracts')
      .update({
        is_settled: true,
        settled_at: new Date().toISOString(),
        settlement_adjustment: adjustmentAmount,
      })
      .eq('id', annualContractId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 400 }
    }

    return { data, error: null, status: 200 }
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
 * 年間契約の進捗情報を取得
 */
export async function getAnnualContractProgress(
  annualContractId: string
): Promise<ApiResponse<AnnualContractProgress>> {
  try {
    // 年間契約情報を取得
    const contractResult = await getAnnualContractById(annualContractId)
    if (contractResult.error || !contractResult.data) {
      return { data: null, error: contractResult.error || '年間契約が見つかりません', status: 404 }
    }

    // 月次配分を取得
    const allocationsResult = await getMonthlyAllocations(annualContractId)
    const allocations = allocationsResult.data || []

    // 進捗情報を計算（Number()で確実に数値変換）
    const totalActualHours = allocations.reduce((sum, a) => sum + Number(a.actual_hours), 0)
    const totalAllocatedRevenue = allocations.reduce((sum, a) => sum + Number(a.allocated_revenue), 0)
    const budgetHours = Number(contractResult.data.budget_hours)
    const progressRate = budgetHours > 0 ? totalActualHours / budgetHours : 0
    const remainingBudgetHours = budgetHours - totalActualHours

    return {
      data: {
        contract: contractResult.data,
        allocations,
        totalActualHours,
        totalAllocatedRevenue,
        progressRate,
        remainingBudgetHours,
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
 * 指定期間の年間契約収益を取得（ダッシュボード用）
 *
 * 注意: allocated_revenueは精算時にadjustment_amountを含むように更新されるため、
 * allocated_revenueのみを合計する（adjustment_amountを加算すると二重計上になる）
 */
export async function getAnnualContractRevenueForPeriod(
  startDate: string,
  endDate: string
): Promise<ApiResponse<number>> {
  try {
    // 期間内の月次配分を取得
    const { data, error } = await supabase
      .from('monthly_revenue_allocations')
      .select('allocated_revenue')
      .gte('allocation_month', startDate)
      .lte('allocation_month', endDate)

    if (error) {
      console.error('Supabase error:', error)
      return { data: null, error: error.message, status: 400 }
    }

    // 収益を合計（Supabaseがintegerを数値で返すが念のためNumber()変換）
    const totalRevenue = (data || []).reduce(
      (sum, a) => sum + Number(a.allocated_revenue),
      0
    )

    return { data: totalRevenue, error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'システムエラーが発生しました',
      status: 500,
    }
  }
}
