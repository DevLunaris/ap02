'use client'

import type { QueryResult, SqlValue } from '@/lib/sql'
import { cn } from '@/lib/utils'

/** Anzeige eines SQL-Result-Sets. Sehr lange Ergebnisse werden gekürzt. */
const MAX_ROWS = 100

function renderValue(value: SqlValue) {
  if (value === null) {
    return <span className="italic text-ink-muted/70">NULL</span>
  }
  if (value instanceof Uint8Array) {
    return <span className="italic text-ink-muted/70">BLOB ({value.length} Byte)</span>
  }
  return String(value)
}

export function ResultTable({ result, className }: { result: QueryResult; className?: string }) {
  if (result.values.length === 0) {
    return (
      <p className={cn('rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted', className)}>
        Die Abfrage ist gültig, liefert aber keine Zeilen.
      </p>
    )
  }

  const rows = result.values.slice(0, MAX_ROWS)
  const hidden = result.values.length - rows.length

  return (
    <div className={cn('overflow-auto rounded-lg border border-line', className)}>
      <table className="w-full border-collapse text-left text-[0.8rem]">
        <thead className="sticky top-0 bg-surface-sunken">
          <tr>
            {result.columns.map((column, index) => (
              <th
                key={`${column}-${index}`}
                className="whitespace-nowrap border-b border-line px-2.5 py-1.5 font-mono text-xs font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line last:border-0 hover:bg-surface-sunken">
              {row.map((value, columnIndex) => (
                <td key={columnIndex} className="whitespace-nowrap px-2.5 py-1 font-mono tabular-nums">
                  {renderValue(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="border-t border-line bg-surface-sunken px-2.5 py-1 text-xs text-ink-muted">
        {result.values.length} Zeile(n)
        {hidden > 0 && ` · ${hidden} weitere ausgeblendet`}
      </p>
    </div>
  )
}
