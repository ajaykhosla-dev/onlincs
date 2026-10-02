import React from 'react'

interface ColumnDef {
  key: string
  label: string
}

interface DataTableProps {
  columns: ColumnDef[]
  data: Record<string, unknown>[]
  renderCell?: (key: string, row: Record<string, unknown>) => React.ReactNode
  footerSlot?: React.ReactNode
}

export function DataTable({ columns, data, renderCell, footerSlot }: DataTableProps) {
  return (
    <div className="card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key}>
                    {renderCell ? renderCell(c.key, row) : String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footerSlot && <div className="table-foot">{footerSlot}</div>}
    </div>
  )
}
