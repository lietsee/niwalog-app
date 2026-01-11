import { supabase } from './supabaseClient'
import { getEmployeesByCodes } from './employeesApi'
import type { ApiResponse, Employee, SalaryType, WorkRecord } from './types'

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

    // 3. 従業員マスタを取得
    const employeesResult = await getEmployeesByCodes(Array.from(employeeCodes))
    if (employeesResult.error || !employeesResult.data) {
      return {
        data: null,
        error: employeesResult.error || '従業員情報の取得に失敗しました',
        status: 400,
      }
    }

    const employeeMap = new Map<string, Employee>()
    for (const emp of employeesResult.data) {
      employeeMap.set(emp.employee_code, emp)
    }

    // 4. 日給/月給従業員の按分計算用: その日の全案件での稼働時間を取得
    const dailyMonthlyEmployees = employeesResult.data.filter(
      (emp) => emp.salary_type === 'daily' || emp.salary_type === 'monthly'
    )

    // 日付と従業員ごとの全案件稼働時間マップ
    const dailyTotalHoursMap = new Map<string, number>() // key: "employee_code:work_date"

    if (dailyMonthlyEmployees.length > 0) {
      // 日給/月給従業員が稼働した日付をすべて収集
      const allDates = new Set<string>()
      for (const emp of dailyMonthlyEmployees) {
        const dates = datesByEmployee.get(emp.employee_code)
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

    // 5. 人件費を計算
    const costByEmployee = new Map<
      string,
      { hours: number; cost: number }
    >()
    const breakdown: LaborCostBreakdown = { hourly: 0, daily: 0, monthly: 0 }

    for (const record of recordsWithDate) {
      const employee = employeeMap.get(record.employee_code)
      if (!employee) {
        // 従業員マスタに登録がない場合はスキップ
        continue
      }

      const hours = record.total_hours ?? record.site_hours ?? 0
      let cost = 0

      if (employee.salary_type === 'hourly') {
        // 時給計算
        cost = (employee.hourly_rate ?? 0) * hours
        breakdown.hourly += cost
      } else {
        // 日給月給/月給: 按分計算
        const dailyRate = employee.daily_rate ?? 0
        const key = `${record.employee_code}:${record.work_date}`
        const totalDayHours = dailyTotalHoursMap.get(key) || hours

        if (totalDayHours > 0) {
          // その日の稼働時間に対するこの案件の割合
          const ratio = hours / totalDayHours
          cost = dailyRate * ratio
        }

        if (employee.salary_type === 'daily') {
          breakdown.daily += cost
        } else {
          breakdown.monthly += cost
        }
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
