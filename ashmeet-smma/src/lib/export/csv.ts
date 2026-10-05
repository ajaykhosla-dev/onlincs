/** CSV that opens cleanly in Excel: UTF-8 with a BOM, CRLF line ends, quoted fields, and no formula injection. */

export type Cell = string | number | boolean | null | undefined

/** A cell starting with = + - @ (or a tab/CR) would be run as a formula by Excel; a leading quote makes it text. */
export function safeCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const csvRow = (cells: Cell[]) => cells.map(safeCell).join(',')

/** One table: a header row and data rows. */
export function toCsv(header: string[], rows: Cell[][]) {
  return '﻿' + [csvRow(header), ...rows.map(csvRow)].join('\r\n') + '\r\n'
}

/** Several titled sections separated by a blank row, for reports that carry more than one table. */
export function sectionsCsv(sections: { title: string; header?: string[]; rows: Cell[][] }[]) {
  const lines: string[] = []
  for (const section of sections) {
    if (lines.length) lines.push('')
    lines.push(csvRow([section.title]))
    if (section.header) lines.push(csvRow(section.header))
    for (const row of section.rows) lines.push(csvRow(row))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export const fileSlug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
