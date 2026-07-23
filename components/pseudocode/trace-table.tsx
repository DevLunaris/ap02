'use client'

import { useEffect, useRef } from 'react'

import { formatValue, type TraceStep } from '@/lib/pseudocode'
import { cn } from '@/lib/utils'

/**
 * Die Wertetabelle des Schreibtischtests: eine Zeile je ausgeführtem Schritt,
 * eine Spalte je Variable, dazu Zeile, Aktion und Ausgabe.
 *
 * Sie wächst mit dem Fortschritt mit - genau so, wie man sie in der Prüfung
 * von Hand aufschreibt.
 */

/** Sehr lange Spuren nicht komplett rendern - sonst hängt der Browser. */
const MAX_VISIBLE_ROWS = 200

export function TraceTable({
  steps,
  columns,
  output,
  currentStep,
  highlightStep,
  onSelectStep,
}: {
  steps: TraceStep[]
  columns: string[]
  output: string[]
  /** Index des aktuellen Schritts; alle Zeilen bis hier sind sichtbar. */
  currentStep: number
  /** Optional hervorgehobener Schritt, z. B. die erste Abweichung im Übungsmodus. */
  highlightStep?: number
  onSelectStep?: (index: number) => void
}) {
  const activeRow = useRef<HTMLTableRowElement>(null)

  // Die aktuelle Zeile immer im Blick behalten.
  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' })
  }, [currentStep])

  const visible = steps.slice(0, currentStep + 1)
  const skipped = Math.max(0, visible.length - MAX_VISIBLE_ROWS)
  const rows = skipped > 0 ? visible.slice(-MAX_VISIBLE_ROWS) : visible

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Wertetabelle
        </span>
        <span className="text-xs tabular-nums text-ink-muted">
          Schritt {currentStep} von {steps.length - 1}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left text-[0.8rem]">
          <thead className="sticky top-0 z-10 bg-surface-sunken">
            <tr>
              <Th className="w-10 text-right">Zl.</Th>
              <Th className="min-w-[9rem]">Aktion</Th>
              {columns.map((name) => (
                <Th key={name} className="min-w-[3.5rem] font-mono">
                  {name}
                </Th>
              ))}
              <Th className="min-w-[5rem]">Ausgabe</Th>
            </tr>
          </thead>

          <tbody>
            {skipped > 0 && (
              <tr>
                <td
                  colSpan={columns.length + 3}
                  className="border-b border-line px-2 py-1.5 text-center text-xs text-ink-muted"
                >
                  … {skipped} frühere Schritte ausgeblendet
                </td>
              </tr>
            )}

            {rows.map((step, offset) => {
              const index = skipped + offset
              const isCurrent = index === currentStep
              const isHighlighted = index === highlightStep
              const previous = index > 0 ? steps[index - 1] : undefined

              // Nur die in diesem Schritt neu hinzugekommene Ausgabe zeigen -
              // sonst wiederholt sich jede Zeile bis nach unten.
              const newOutput =
                previous && step.outputLength > previous.outputLength
                  ? output[step.outputLength - 1]
                  : index === 0 && step.outputLength > 0
                    ? output[0]
                    : undefined

              return (
                <tr
                  key={index}
                  ref={isCurrent ? activeRow : undefined}
                  onClick={onSelectStep ? () => onSelectStep(index) : undefined}
                  className={cn(
                    'border-b border-line last:border-0',
                    onSelectStep && 'cursor-pointer',
                    isHighlighted && 'bg-rose-500/[0.12]',
                    isCurrent && !isHighlighted && 'bg-accent-soft',
                    !isCurrent && !isHighlighted && 'hover:bg-surface-sunken',
                  )}
                >
                  <Td className="text-right tabular-nums text-ink-muted">{step.line}</Td>

                  <Td>
                    <span className={cn(step.depth > 0 && 'text-ink-muted')}>
                      {step.depth > 0 && (
                        <span className="mr-1 font-mono text-[0.7rem]" title={`in ${step.frame}`}>
                          {'›'.repeat(step.depth)}
                        </span>
                      )}
                      {step.description}
                    </span>
                    {step.condition && (
                      <span
                        className={cn(
                          'ml-1.5 whitespace-nowrap font-mono text-[0.7rem]',
                          step.condition.result
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400',
                        )}
                      >
                        {step.condition.text} → {step.condition.result ? 'WAHR' : 'FALSCH'}
                      </span>
                    )}
                  </Td>

                  {columns.map((name) => {
                    const value = step.variables[name]
                    const changed = previous && previous.variables[name] !== value
                    return (
                      <Td key={name} className="font-mono tabular-nums">
                        {value === undefined ? (
                          <span className="text-ink-muted/50">–</span>
                        ) : (
                          <span className={cn(changed && 'font-bold text-accent-text')}>
                            {formatValue(value)}
                          </span>
                        )}
                      </Td>
                    )
                  })}

                  <Td className="font-mono">
                    {newOutput !== undefined ? (
                      <span className="text-emerald-700 dark:text-emerald-400">{newOutput}</span>
                    ) : (
                      <span className="text-ink-muted/50">–</span>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-line px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-2 py-1 align-top', className)}>{children}</td>
}
