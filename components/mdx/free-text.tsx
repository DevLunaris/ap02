'use client'

import { useState, type ReactNode } from 'react'

import { ExerciseButton, ExerciseShell } from './exercise-shell'
import { cn } from '@/lib/utils'

type SelfRating = 'richtig' | 'teilweise' | 'falsch'

const RATINGS: Array<{ value: SelfRating; label: string; className: string }> = [
  { value: 'richtig', label: 'Saß', className: 'border-emerald-500/50 bg-emerald-500/[0.1] text-emerald-700 dark:text-emerald-400' },
  { value: 'teilweise', label: 'Teilweise', className: 'border-amber-500/50 bg-amber-500/[0.1] text-amber-700 dark:text-amber-400' },
  { value: 'falsch', label: 'Daneben', className: 'border-rose-500/50 bg-rose-500/[0.1] text-rose-700 dark:text-rose-400' },
]

/**
 * Selbstkontrolle: erst selbst formulieren, dann Musterlösung aufklappen und
 * ehrlich bewerten. Die Musterlösung ist absichtlich erst nach dem Aufklappen
 * sichtbar - vorher zu spicken macht die Übung wertlos.
 */
export function FreeText({
  question,
  solution,
  title = 'Freitext',
  rows = 5,
  placeholder = 'Deine Antwort …',
}: {
  question: ReactNode
  solution: ReactNode
  title?: string
  rows?: number
  placeholder?: string
}) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState<SelfRating | null>(null)

  return (
    <ExerciseShell
      title={title}
      kind="Freitext"
      hint={<div className="font-medium">{question}</div>}
      footer={
        revealed && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">Selbsteinschätzung:</span>
            {RATINGS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRating(item.value)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors',
                  rating === item.value ? item.className : 'border-line text-ink-muted hover:bg-surface-sunken',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )
      }
    >
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[0.95rem] leading-relaxed outline-none focus:border-accent"
      />

      {!revealed ? (
        <ExerciseButton variant="primary" onClick={() => setRevealed(true)}>
          Musterlösung anzeigen
        </ExerciseButton>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
          <p className="mb-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">Musterlösung</p>
          <div className="text-[0.95rem] leading-relaxed [&>*+*]:mt-2">{solution}</div>
        </div>
      )}
    </ExerciseShell>
  )
}
