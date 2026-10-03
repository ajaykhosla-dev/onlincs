import type { CSSProperties, ReactNode } from 'react'

export type Column<T> = {
  header: ReactNode
  cell: (row: T) => ReactNode
  /** style applied to the cell itself */ tdStyle?: CSSProperties | ((row: T) => CSSProperties)
}

/** Borderless table with rounded row hover (the spacing and hover live in theme.css). Takes column definitions and rows. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c, i) => (
                <td key={i} style={typeof c.tdStyle === 'function' ? c.tdStyle(r) : c.tdStyle}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
