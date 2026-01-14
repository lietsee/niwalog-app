import { supabase } from './supabaseClient'
import type { ApiResponse } from './types'

// NDJSON schema version
const SCHEMA_VERSION = 1

// Table names in import order (respecting foreign key constraints)
const TABLE_ORDER = [
  'app_settings',
  'employees',
  'business_days',
  'monthly_costs',
  'fields',
  'annual_contracts',
  'projects',
  'work_days',
  'work_records',
  'expenses',
  'monthly_revenue_allocations',
] as const

type TableName = (typeof TABLE_ORDER)[number]

// Foreign key mapping for each table
const FOREIGN_KEY_MAP: Record<TableName, { column: string; refTable: TableName }[]> = {
  app_settings: [],
  employees: [],
  business_days: [],
  monthly_costs: [],
  fields: [],
  annual_contracts: [{ column: 'field_id', refTable: 'fields' }],
  projects: [
    { column: 'field_id', refTable: 'fields' },
    { column: 'annual_contract_id', refTable: 'annual_contracts' },
  ],
  work_days: [{ column: 'project_id', refTable: 'projects' }],
  work_records: [{ column: 'work_day_id', refTable: 'work_days' }],
  expenses: [{ column: 'project_id', refTable: 'projects' }],
  monthly_revenue_allocations: [{ column: 'annual_contract_id', refTable: 'annual_contracts' }],
}

// Primary key for each table
const PRIMARY_KEY_MAP: Record<TableName, string> = {
  app_settings: 'id',
  employees: 'employee_code',
  business_days: 'id',
  monthly_costs: 'id',
  fields: 'id',
  annual_contracts: 'id',
  projects: 'id',
  work_days: 'id',
  work_records: 'id',
  expenses: 'id',
  monthly_revenue_allocations: 'id',
}

// UNIQUE constraints for each table (excluding primary key)
// Used to check for conflicts in restore mode
const UNIQUE_CONSTRAINT_MAP: Record<TableName, string[]> = {
  app_settings: ['setting_key'],
  employees: [], // employee_code is PK
  business_days: [], // Composite unique (year, day_type) - handled separately
  monthly_costs: [],
  fields: ['field_code'],
  annual_contracts: [], // Composite unique (field_id, contract_name, fiscal_year) - handled separately
  projects: [],
  work_days: [], // Composite unique (project_id, work_date) - FK handles this
  work_records: [],
  expenses: [],
  monthly_revenue_allocations: [], // Composite unique (annual_contract_id, allocation_month) - handled separately
}

// NDJSON record with metadata
type NDJSONRecord = {
  _table: TableName
  _version: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Import modes
export type ImportMode = 'restore' | 'add'
export type ErrorHandling = 'partial' | 'rollback'

export type ImportOptions = {
  mode: ImportMode
  errorHandling: ErrorHandling
}

// Import result
export type ImportResult = {
  success: boolean
  imported: Record<string, number>
  skipped: Record<string, number>
  errors: string[]
  rolledBack?: boolean
}

// ID mapping type
type IdMapping = Map<TableName, Map<string, string>>

/**
 * Export all data to NDJSON format
 */
export async function exportAllToNDJSON(): Promise<ApiResponse<string>> {
  try {
    const lines: string[] = []

    // Fetch and convert each table
    for (const tableName of TABLE_ORDER) {
      const { data, error } = await supabase.from(tableName).select('*')

      if (error) {
        console.error(`Error fetching ${tableName}:`, error)
        return { data: null, error: `${tableName}の取得に失敗しました: ${error.message}`, status: 400 }
      }

      if (data) {
        for (const record of data) {
          const ndjsonRecord: NDJSONRecord = {
            _table: tableName,
            _version: SCHEMA_VERSION,
            ...record,
          }
          lines.push(JSON.stringify(ndjsonRecord))
        }
      }
    }

    return { data: lines.join('\n'), error: null, status: 200 }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'エクスポート中にシステムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * Parse NDJSON content and group by table
 */
function parseNDJSON(content: string): {
  records: Map<TableName, NDJSONRecord[]>
  errors: string[]
} {
  const records = new Map<TableName, NDJSONRecord[]>()
  const errors: string[] = []

  // Initialize empty arrays for each table
  for (const tableName of TABLE_ORDER) {
    records.set(tableName, [])
  }

  const lines = content.split('\n').filter((line) => line.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    try {
      const record = JSON.parse(line) as NDJSONRecord

      if (!record._table) {
        errors.push(`行 ${i + 1}: _table フィールドがありません`)
        continue
      }

      if (!TABLE_ORDER.includes(record._table)) {
        errors.push(`行 ${i + 1}: 不明なテーブル名 "${record._table}"`)
        continue
      }

      records.get(record._table)!.push(record)
    } catch {
      errors.push(`行 ${i + 1}: JSONパースエラー`)
    }
  }

  return { records, errors }
}

/**
 * Remove metadata fields from record
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripMetadata(record: NDJSONRecord): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _table, _version, ...rest } = record
  return rest
}

/**
 * Generate new UUIDs and create mapping (for add mode)
 */
function generateIdMapping(records: Map<TableName, NDJSONRecord[]>): IdMapping {
  const mapping: IdMapping = new Map()

  for (const tableName of TABLE_ORDER) {
    const tableMapping = new Map<string, string>()
    const tableRecords = records.get(tableName) || []
    const primaryKey = PRIMARY_KEY_MAP[tableName]

    for (const record of tableRecords) {
      const oldId = record[primaryKey]
      if (oldId) {
        // employees uses employee_code as primary key - don't regenerate
        if (tableName === 'employees') {
          tableMapping.set(oldId, oldId)
        } else {
          // Generate new UUID
          const newId = crypto.randomUUID()
          tableMapping.set(oldId, newId)
        }
      }
    }

    mapping.set(tableName, tableMapping)
  }

  return mapping
}

/**
 * Remap foreign keys using ID mapping
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function remapForeignKeys(
  tableName: TableName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  idMapping: IdMapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const foreignKeys = FOREIGN_KEY_MAP[tableName]

  for (const fk of foreignKeys) {
    const oldValue = data[fk.column]
    if (oldValue) {
      const refMapping = idMapping.get(fk.refTable)
      if (refMapping) {
        const newValue = refMapping.get(oldValue)
        if (newValue) {
          data[fk.column] = newValue
        }
      }
    }
  }

  return data
}

/**
 * Rollback inserted records in reverse order
 */
async function rollbackInserted(
  insertedIds: Map<TableName, string[]>
): Promise<string[]> {
  const errors: string[] = []
  const reversedOrder = [...TABLE_ORDER].reverse()

  for (const tableName of reversedOrder) {
    const ids = insertedIds.get(tableName)
    if (!ids || ids.length === 0) continue

    const primaryKey = PRIMARY_KEY_MAP[tableName]

    const { error } = await supabase
      .from(tableName)
      .delete()
      .in(primaryKey, ids)

    if (error) {
      errors.push(`${tableName}のロールバックに失敗: ${error.message}`)
    }
  }

  return errors
}

/**
 * Import data from NDJSON content
 */
export async function importFromNDJSON(
  content: string,
  options: ImportOptions
): Promise<ApiResponse<ImportResult>> {
  const { mode, errorHandling } = options

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const currentUserId = user?.id || null

    // Parse NDJSON
    const { records, errors } = parseNDJSON(content)

    if (errors.length > 0 && records.size === 0) {
      return {
        data: {
          success: false,
          imported: {},
          skipped: {},
          errors,
        },
        error: 'ファイルの解析に失敗しました',
        status: 400,
      }
    }

    const imported: Record<string, number> = {}
    const skipped: Record<string, number> = {}
    const insertedIds: Map<TableName, string[]> = new Map()

    // Initialize counts
    for (const tableName of TABLE_ORDER) {
      imported[tableName] = 0
      skipped[tableName] = 0
      insertedIds.set(tableName, [])
    }

    // Generate ID mapping for add mode
    const idMapping = mode === 'add' ? generateIdMapping(records) : null

    // Import based on error handling mode
    if (errorHandling === 'rollback') {
      // Rollback mode: bulk insert, rollback on error
      for (const tableName of TABLE_ORDER) {
        const tableRecords = records.get(tableName) || []
        if (tableRecords.length === 0) continue

        const primaryKey = PRIMARY_KEY_MAP[tableName]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedRecords: Record<string, any>[] = []

        for (const record of tableRecords) {
          let data = stripMetadata(record)

          // Override created_by and updated_by with current user (to avoid FK violations)
          if ('created_by' in data) {
            data.created_by = currentUserId
          }
          if ('updated_by' in data) {
            data.updated_by = currentUserId
          }

          // For work_records, remove auto-calculated fields
          if (tableName === 'work_records') {
            delete data.site_hours
            delete data.prep_hours
            delete data.return_hours
            delete data.total_hours
          }

          // Add mode: regenerate IDs and remap foreign keys
          if (mode === 'add' && idMapping) {
            // Update primary key
            if (tableName !== 'employees') {
              const oldId = data[primaryKey]
              const newId = idMapping.get(tableName)?.get(oldId)
              if (newId) {
                data[primaryKey] = newId
              }
            }
            // Remap foreign keys
            data = remapForeignKeys(tableName, data, idMapping)
          }

          // Restore mode: check if already exists (PK and UNIQUE constraints)
          if (mode === 'restore') {
            const pkValue = data[primaryKey]

            // Check PK
            const { data: existingByPk } = await supabase
              .from(tableName)
              .select(primaryKey)
              .eq(primaryKey, pkValue)
              .maybeSingle()

            if (existingByPk) {
              skipped[tableName]++
              continue
            }

            // Check UNIQUE constraints
            const uniqueColumns = UNIQUE_CONSTRAINT_MAP[tableName]
            if (uniqueColumns.length > 0) {
              let uniqueQuery = supabase.from(tableName).select(primaryKey)
              for (const col of uniqueColumns) {
                uniqueQuery = uniqueQuery.eq(col, data[col])
              }
              const { data: existingByUnique } = await uniqueQuery.maybeSingle()

              if (existingByUnique) {
                skipped[tableName]++
                continue
              }
            }

            // Check composite unique for business_days (year, day_type)
            if (tableName === 'business_days') {
              const { data: existingBd } = await supabase
                .from('business_days')
                .select('id')
                .eq('year', data.year)
                .eq('day_type', data.day_type)
                .maybeSingle()

              if (existingBd) {
                skipped[tableName]++
                continue
              }
            }

            // Check composite unique for annual_contracts (field_id, contract_name, fiscal_year)
            if (tableName === 'annual_contracts') {
              const { data: existingAc } = await supabase
                .from('annual_contracts')
                .select('id')
                .eq('field_id', data.field_id)
                .eq('contract_name', data.contract_name)
                .eq('fiscal_year', data.fiscal_year)
                .maybeSingle()

              if (existingAc) {
                skipped[tableName]++
                continue
              }
            }

            // Check composite unique for monthly_revenue_allocations (annual_contract_id, allocation_month)
            if (tableName === 'monthly_revenue_allocations') {
              const { data: existingMra } = await supabase
                .from('monthly_revenue_allocations')
                .select('id')
                .eq('annual_contract_id', data.annual_contract_id)
                .eq('allocation_month', data.allocation_month)
                .maybeSingle()

              if (existingMra) {
                skipped[tableName]++
                continue
              }
            }
          }

          processedRecords.push(data)
        }

        if (processedRecords.length === 0) continue

        // Bulk insert
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(processedRecords)

        if (insertError) {
          // Rollback all previously inserted records
          const rollbackErrors = await rollbackInserted(insertedIds)
          errors.push(`${tableName}: 挿入エラー - ${insertError.message}`)
          errors.push(...rollbackErrors)

          return {
            data: {
              success: false,
              imported,
              skipped,
              errors,
              rolledBack: true,
            },
            error: 'インポートに失敗しました。ロールバックしました。',
            status: 400,
          }
        }

        // Record inserted IDs for potential rollback
        const insertedPks = processedRecords.map((r) => r[primaryKey])
        insertedIds.set(tableName, insertedPks)
        imported[tableName] = processedRecords.length
      }
    } else {
      // Partial mode: insert one by one, skip on error
      for (const tableName of TABLE_ORDER) {
        const tableRecords = records.get(tableName) || []
        if (tableRecords.length === 0) continue

        const primaryKey = PRIMARY_KEY_MAP[tableName]

        for (const record of tableRecords) {
          let data = stripMetadata(record)

          // Override created_by and updated_by with current user (to avoid FK violations)
          if ('created_by' in data) {
            data.created_by = currentUserId
          }
          if ('updated_by' in data) {
            data.updated_by = currentUserId
          }

          // For work_records, remove auto-calculated fields
          if (tableName === 'work_records') {
            delete data.site_hours
            delete data.prep_hours
            delete data.return_hours
            delete data.total_hours
          }

          // Add mode: regenerate IDs and remap foreign keys
          if (mode === 'add' && idMapping) {
            // Update primary key
            if (tableName !== 'employees') {
              const oldId = data[primaryKey]
              const newId = idMapping.get(tableName)?.get(oldId)
              if (newId) {
                data[primaryKey] = newId
              }
            }
            // Remap foreign keys
            data = remapForeignKeys(tableName, data, idMapping)
          }

          const pkValue = data[primaryKey]

          if (!pkValue) {
            errors.push(`${tableName}: 主キーがありません`)
            continue
          }

          // Check if record exists by PK
          const { data: existingByPk } = await supabase
            .from(tableName)
            .select(primaryKey)
            .eq(primaryKey, pkValue)
            .maybeSingle()

          if (existingByPk) {
            skipped[tableName]++
            continue
          }

          // Check UNIQUE constraints (for restore mode)
          const uniqueColumns = UNIQUE_CONSTRAINT_MAP[tableName]
          if (uniqueColumns.length > 0) {
            let uniqueQuery = supabase.from(tableName).select(primaryKey)
            for (const col of uniqueColumns) {
              uniqueQuery = uniqueQuery.eq(col, data[col])
            }
            const { data: existingByUnique } = await uniqueQuery.maybeSingle()

            if (existingByUnique) {
              skipped[tableName]++
              continue
            }
          }

          // Check composite unique for business_days (year, day_type)
          if (tableName === 'business_days') {
            const { data: existingBd } = await supabase
              .from('business_days')
              .select('id')
              .eq('year', data.year)
              .eq('day_type', data.day_type)
              .maybeSingle()

            if (existingBd) {
              skipped[tableName]++
              continue
            }
          }

          // Check composite unique for annual_contracts (field_id, contract_name, fiscal_year)
          if (tableName === 'annual_contracts') {
            const { data: existingAc } = await supabase
              .from('annual_contracts')
              .select('id')
              .eq('field_id', data.field_id)
              .eq('contract_name', data.contract_name)
              .eq('fiscal_year', data.fiscal_year)
              .maybeSingle()

            if (existingAc) {
              skipped[tableName]++
              continue
            }
          }

          // Check composite unique for monthly_revenue_allocations (annual_contract_id, allocation_month)
          if (tableName === 'monthly_revenue_allocations') {
            const { data: existingMra } = await supabase
              .from('monthly_revenue_allocations')
              .select('id')
              .eq('annual_contract_id', data.annual_contract_id)
              .eq('allocation_month', data.allocation_month)
              .maybeSingle()

            if (existingMra) {
              skipped[tableName]++
              continue
            }
          }

          // Insert new record
          const { error: insertError } = await supabase.from(tableName).insert(data)

          if (insertError) {
            errors.push(`${tableName} (${pkValue}): 挿入エラー - ${insertError.message}`)
            continue
          }

          imported[tableName]++
        }
      }
    }

    return {
      data: {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        rolledBack: false,
      },
      error: null,
      status: 200,
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      data: null,
      error: 'インポート中にシステムエラーが発生しました',
      status: 500,
    }
  }
}

/**
 * Download NDJSON as file
 */
export function downloadNDJSON(content: string, filename?: string): void {
  const date = new Date().toISOString().split('T')[0]
  const defaultFilename = `niwalog_backup_${date}.ndjson`

  const blob = new Blob([content], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get record counts per table for preview
 */
export function getRecordCounts(content: string): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const tableName of TABLE_ORDER) {
    counts[tableName] = 0
  }

  const lines = content.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as NDJSONRecord
      if (record._table && TABLE_ORDER.includes(record._table)) {
        counts[record._table]++
      }
    } catch {
      // Skip invalid lines
    }
  }

  return counts
}
