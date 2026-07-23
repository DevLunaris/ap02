'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Quelltextanzeige mit Zeilennummern und Hervorhebung der aktuellen Zeile.
 * Read-only - zum Bearbeiten schaltet der Tracer auf ein Textfeld um.
 */
export function CodeView({
  code,
  activeLine,
  errorLine,
}: {
  code: string
  /** 1-basierte Zeile des aktuellen Schritts. */
  activeLine?: number
  /** 1-basierte Zeile eines Syntax- oder Laufzeitfehlers. */
  errorLine?: number
}) {
  const activeRef = useRef<HTMLDivElement>(null)
  const lines = code.replace(/\n$/, '').split('\n')

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeLine])

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-surface-sunken py-1.5 font-mono text-[0.8rem] leading-6">
      {lines.map((line, index) => {
        const number = index + 1
        const isActive = number === activeLine
        const isError = number === errorLine

        return (
          <div
            key={number}
            ref={isActive ? activeRef : undefined}
            className={cn(
              'flex px-1',
              isError && 'bg-rose-500/[0.15]',
              isActive && !isError && 'bg-accent-soft',
            )}
          >
            <span
              className={cn(
                'w-8 shrink-0 select-none pr-2 text-right tabular-nums',
                isActive || isError ? 'font-bold text-accent-text' : 'text-ink-muted/60',
              )}
            >
              {number}
            </span>
            {/* Leerzeichen erhalten, damit Einrückung sichtbar bleibt. */}
            <span className="whitespace-pre">{line || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}
