import { supabase } from './supabaseClient'
import type { ApiResponse, Employee, SalaryType, WorkRecord } from './types'

// 月キー（営業日数テーブル用）
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
type MonthKey = typeof MONTH_KEYS[number]

/**
 * 指定年月の営業日数情報を取得
 * @param year 年
 * @param month 月 (0-11)
 * @returns 営業日数と臨時休業日数、またはデータがない場合はnull
 */
async function getBusinessDaysForMonth(
  year: number,
  month: number
): Promise<{ workingDays: number; temporaryClosure: number } | null> {
  const { data } = await supabase
    .from('business_days')
    .select('*')
    .eq('year', year)

  if (!data || data.length === 0) {
    return null
  }

  const monthKey = MONTH_KEYS[month] as MonthKey
  const workingDaysRecord = data.find(d => d.day_type === 'working_days')
  const closureRecord = data.find(d => d.day_type === 'temporary_closure')

  if (!workingDaysRecord) {
    return null
  }

  return {
    workingDays: (workingDaysRecord[monthKey] as number) ?? 0,
    temporaryClosure: (closureRecord?.[monthKey] as number) ?? 0,
  }
}

export type LaborCostDetail = {
  employee_code: string
  name: string
  salary_type: SalaryType
  hours: number
  cost: number
}

export type LaborCostBreakdown = {
  hourly: number
  daily: number
  monthly: number
}

export type LaborCostResult = {
  total: number
  breakdown: LaborCostBreakdown
  details: LaborCostDetail[]
}

type WorkRecordWithDate = WorkRecord & {
  work_date: string
}

/**
 * 指定日時点での従業員給与情報を取得（履歴ベース）
 *
 * ロジック:
 * 1. employees_historyから、指定日以前で最新のINSERT/UPDATE/RESTOREレコードを検索
 * 2. 見つかればその時点の給与情報を返す
 * 3. なければemployeesの現行データを返す（履歴がない過去データ対応）
 * 4. 現行にもなければnull（削除済み従業員で履歴もない場合）
 */
async function getEmployeeAtDate(
  employeeCode: string,
  workDate: string
): Promise<Employee | null> {
  // 1. 履歴から指定日以前の最新レコードを検索
  const { data: historyRecord } = await supabase
    .from('employees_history')
    .select('*')
    .eq('employee_code', employeeCode)
    .lte('operation_at', workDate + 'T23:59:59Z')
    .in('operation_type', ['INSERT', 'UPDATE', 'RESTORE'])
    .order('operation_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (historyRecord) {
    return {
      employee_code: historyRecord.employee_code,
      name: historyRecord.name,
      salary_type: historyRecord.salary_type as SalaryType,
      hourly_rate: historyRecord.hourly_rate,
      daily_rate: historyRecord.daily_rate,
      created_at: historyRecord.created_at,
      updated_at: historyRecord.updated_at,
      created_by: historyRecord.created_by,
    }
  }

  // 2. 履歴になければ現行テーブルを確認（後方互換性）
  const { data: current } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_code', employeeCode)
    .maybeSingle()

  return current
}

/**
 * 複数従業員の作業日ごとの給与情報を一括取得
 *
 * @param recordsWithDate 日付付きの作業記録
 * @returns Map<"employee_code:work_date", Employee>
 */
async function getEmployeesAtDates(
  recordsWithDate: WorkRecordWithDate[]
): Promise<Map<string, Employee>> {
  const result = new Map<string, Employee>()

  // 従業員コードと日付の組み合わせを収集
  const codeAndDateSet = new Set<string>()
  for (const record of recordsWithDate) {
    codeAndDateSet.add(`${record.employee_code}:${record.work_date}`)
  }

  // 各組み合わせについて従業員情報を取得
  // TODO: パフォーマンス最適化の余地あり（現状はN+1問題）
  // 案件あたりの従業員数は少数（通常1〜5名）のため許容
  for (const key of codeAndDateSet) {
    const [code, date] = key.split(':')
    const employee = await getEmployeeAtDate(code, date)
    if (employee) {
      result.set(key, employee)
    }
  }

  return result
}

/**
 * 案件の人件費を計算
 *
 * 計算ロジック:
 * - 時給: hourly_rate × (total_hours || site_hours)
 * - 日給月給/月給: daily_rate × (この案件の稼働時間 / その日の全案件の稼働時間合計)
 */
export async function calculateLaborCost(
  projectId: string
): Promise<ApiResponse<LaborCostResult>> {
  try {
    // 1. この案件の全作業日と従事者記録を取得
    const { data: workDays, error: workDaysError } = await supabase
      .from('work_days')
      .select(`
        id,
        work_date,
        work_records (*)
      `)
      .eq('project_id', projectId)

    if (workDaysError) {
      console.error('Supabase error:', workDaysError)
      return { data: null, error: workDaysError.message, status: 400 }
    }

    if (!workDays || workDays.length === 0) {
      return {
        data: {
          total: 0,
          breakdown: { hourly: 0, daily: 0, monthly: 0 },
          details: [],
        },
        error: null,
        status: 200,
      }
    }

    // 2. 従事者記録を日付付きでフラット化
    const recordsWithDate: WorkRecordWithDate[] = []
    const employeeCodes = new Set<string>()
    const datesByEmployee = new Map<string, Set<string>>()

    for (const wd of workDays) {
      const workRecords = wd.work_records as WorkRecord[]
      for (const record of workRecords) {
        recordsWithDate.push({
          ...record,
          work_date: wd.work_date,
        })
        employeeCodes.add(record.employee_code)

        // 日給/月給従業員の日ごとの按分計算用
        if (!datesByEmployee.has(record.employee_code)) {
          datesByEmployee.set(record.employee_code, new Set())
        }
        datesByEmployee.get(record.employee_code)!.add(wd.work_date)
      }
    }

    if (employeeCodes.size === 0) {
      return {
        data: {
          total: 0,
          breakdown: { hourly: 0, daily: 0, monthly: 0 },
          details: [],
        },
        error: null,
        status: 200,
      }
    }

    // 3. 作業日時点での従業員給与情報を取得（履歴ベース）
    // key: "employee_code:work_date" → 作業日時点の従業員情報
    const employeeAtDateMap = await getEmployeesAtDates(recordsWithDate)

    // 従業員コードごとに最新の情報も保持（詳細表示用）
    // 日付が複数ある場合は最新の作業日の情報を使用
    const employeeMap = new Map<string, Employee>()
    for (const record of recordsWithDate) {
      const key = `${record.employee_code}:${record.work_date}`
      const emp = employeeAtDateMap.get(key)
      if (emp && !employeeMap.has(record.employee_code)) {
        employeeMap.set(record.employee_code, emp)
      }
    }

    // 4. 日給/月給従業員の按分計算用: その日の全案件での稼働時間を取得
    // 時点参照で取得した従業員情報から日給/月給従業員を抽出
    const dailyMonthlyEmployeeCodes = new Set<string>()
    for (const [, emp] of employeeAtDateMap) {
      if (emp.salary_type === 'daily' || emp.salary_type === 'monthly') {
        dailyMonthlyEmployeeCodes.add(emp.employee_code)
      }
    }

    // 日付と従業員ごとの全案件稼働時間マップ
    const dailyTotalHoursMap = new Map<string, number>() // key: "employee_code:work_date"

    if (dailyMonthlyEmployeeCodes.size > 0) {
      // 日給/月給従業員が稼働した日付をすべて収集
      const allDates = new Set<string>()
      for (const code of dailyMonthlyEmployeeCodes) {
        const dates = datesByEmployee.get(code)
        if (dates) {
          for (const d of dates) {
            allDates.add(d)
          }
        }
      }

      // その日のすべての作業記録を取得（全案件）
      if (allDates.size > 0) {
        const { data: allWorkDays, error: allWdError } = await supabase
          .from('work_days')
          .select(`
            work_date,
            work_records (
              employee_code,
              total_hours,
              site_hours
            )
          `)
          .in('work_date', Array.from(allDates))

        if (allWdError) {
          console.error('Supabase error:', allWdError)
          return { data: null, error: allWdError.message, status: 400 }
        }

        // 各従業員の各日付の合計稼働時間を計算
        if (allWorkDays) {
          for (const wd of allWorkDays) {
            const workRecords = wd.work_records as Array<{
              employee_code: string
              total_hours: number | null
              site_hours: number | null
            }>
            for (const r of workRecords) {
              const hours = r.total_hours ?? r.site_hours ?? 0
              const key = `${r.employee_code}:${wd.work_date}`
              const current = dailyTotalHoursMap.get(key) || 0
              dailyTotalHoursMap.set(key, current + hours)
            }
          }
        }
      }
    }

    // 5. 人件費を計算（作業日時点の給与情報を使用）
    const costByEmployee = new Map<
      string,
      { hours: number; cost: number }
    >()
    const breakdown: LaborCostBreakdown = { hourly: 0, daily: 0, monthly: 0 }

    for (const record of recordsWithDate) {
      // 作業日時点の従業員情報を取得
      const key = `${record.employee_code}:${record.work_date}`
      const employee = employeeAtDateMap.get(key)
      if (!employee) {
        // 従業員情報が取得できない場合はスキップ
        continue
      }

      const hours = record.total_hours ?? record.site_hours ?? 0
      let cost = 0

      if (employee.salary_type === 'hourly') {
        // 時給計算（作業日時点の時給を使用）
        cost = (employee.hourly_rate ?? 0) * hours
        breakdown.hourly += cost
      } else if (employee.salary_type === 'daily') {
        // 日給月給: 按分計算（作業日時点の日給を使用）
        const dailyRate = employee.daily_rate ?? 0
        const totalDayHours = dailyTotalHoursMap.get(key) || hours

        if (totalDayHours > 0) {
          // その日の稼働時間に対するこの案件の割合
          const ratio = hours / totalDayHours
          cost = dailyRate * ratio
        }
        breakdown.daily += cost
      } else if (employee.salary_type === 'monthly') {
        // 月給: 月給を営業日数で割って日給を算出、按分計算
        const monthlyRate = employee.daily_rate ?? 0 // DBには月給がdaily_rateに保存される
        const workDate = new Date(record.work_date)
        const year = workDate.getFullYear()
        const month = workDate.getMonth() // 0-11

        // 営業日数データを取得
        const businessDays = await getBusinessDaysForMonth(year, month)

        if (!businessDays) {
          // 営業日数データがない場合はスキップ（計算しない）
          continue
        }

        const { workingDays, temporaryClosure } = businessDays
        const actualWorkingDays = workingDays - temporaryClosure

        if (actualWorkingDays <= 0) {
          // 実働日数が0以下の場合はスキップ
          continue
        }

        // 月給から日給を計算
        const dailyRate = monthlyRate / actualWorkingDays
        const totalDayHours = dailyTotalHoursMap.get(key) || hours

        if (totalDayHours > 0) {
          // その日の稼働時間に対するこの案件の割合
          const ratio = hours / totalDayHours
          cost = dailyRate * ratio
        }
        breakdown.monthly += cost
      }

      // 従業員ごとの集計
      const current = costByEmployee.get(record.employee_code) || {
        hours: 0,
        cost: 0,
      }
      costByEmployee.set(record.employee_code, {
        hours: current.hours + hours,
        cost: current.cost + cost,
      })
    }

    // 6. 詳細リストを作成
    const details: LaborCostDetail[] = []
    for (const [code, data] of costByEmployee) {
      const employee = employeeMap.get(code)
      if (employee) {
        details.push({
          employee_code: code,
          name: employee.name,
          salary_type: employee.salary_type,
          hours: data.hours,
          cost: Math.round(data.cost), // 円未満四捨五入
        })
      }
    }

    // 従業員コード順にソート
    details.sort((a, b) => a.employee_code.localeCompare(b.employee_code))

    const total = Math.round(
      breakdown.hourly + breakdown.daily + breakdown.monthly
    )

    return {
      data: {
        total,
        breakdown: {
          hourly: Math.round(breakdown.hourly),
          daily: Math.round(breakdown.daily),
          monthly: Math.round(breakdown.monthly),
        },
        details,
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
