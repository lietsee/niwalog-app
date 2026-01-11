/**
 * CSVエクスポート・印刷ユーティリティ
 */

type ColumnDef<T> = {
  key: keyof T
  label: string
  formatter?: (value: T[keyof T]) => string
}

/**
 * CSV生成（BOM付きでExcel対応）
 */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnDef<T>[]
): string {
  // BOM for Excel
  const BOM = '\uFEFF'

  // ヘッダー行
  const header = columns.map((col) => escapeCSVField(col.label)).join(',')

  // データ行
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key]
        if (col.formatter) {
          return escapeCSVField(col.formatter(value))
        }
        return escapeCSVField(formatValue(value))
      })
      .join(',')
  )

  return BOM + [header, ...rows].join('\n')
}

/**
 * CSVフィールドのエスケープ
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * 値のフォーマット
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (typeof value === 'boolean') {
    return value ? 'はい' : 'いいえ'
  }
  return String(value)
}

/**
 * ファイルダウンロード
 */
export function downloadFile(
  content: string,
  filename: string,
  type: string = 'text/csv;charset=utf-8'
): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * CSVエクスポート（生成+ダウンロード）
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string
): void {
  const csv = generateCSV(data, columns)
  downloadFile(csv, filename)
}

/**
 * 印刷実行
 */
export function triggerPrint(): void {
  window.print()
}

/**
 * 日付フォーマッター（CSVエクスポート用）
 */
export function formatDateForExport(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

/**
 * 日時フォーマッター（CSVエクスポート用）
 */
export function formatDateTimeForExport(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

/**
 * 金額フォーマッター（CSVエクスポート用）
 */
export function formatCurrencyForExport(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) return ''
  return value.toString()
}
