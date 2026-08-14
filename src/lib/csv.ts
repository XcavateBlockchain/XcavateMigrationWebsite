import type { WalletMigration } from './api'

/** The export's columns, in order. The header row is these names verbatim,
 *  so the file round-trips back into the API's own shape. */
const COLUMNS = ['ss58address', 'solanaAddress'] as const

/**
 * RFC 4180 quoting: a field is wrapped in quotes when it holds a comma, a
 * quote or a line break, and any quote inside it is doubled. Base58 and SS58
 * addresses never trip that rule — the escaping is here so the writer stays
 * correct if the API ever grows a freer-form column.
 */
function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** The migration list as CSV text: header row first, CRLF-delimited. */
export function toCsv(rows: WalletMigration[]): string {
  const lines = [COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => escapeField(row[column] ?? '')).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

/**
 * Hands the text to the browser as a file download. The object URL outlives
 * the click by design — revoking it in the same tick cancels the download in
 * some browsers.
 */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
