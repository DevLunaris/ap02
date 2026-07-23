'use client'

import { Check, RotateCcw, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ExerciseButton, ExerciseShell } from './exercise-shell'
import { cn } from '@/lib/utils'

export interface ChoiceOption {
  /** Der Antworttext. */
  text: string
  correct: boolean
  /**
   * Begründung - Pflicht auch für falsche Optionen. Genau daraus entsteht der
   * Lerneffekt: zu wissen, *warum* eine plausible Antwort nicht stimmt.
   */
  explanation: string
}

export function MultipleChoice({
  question,
  options,
  title = 'Multiple Choice',
  hint,
}: {
  question: string
  options: ChoiceOption[]
  title?: string
  hint?: ReactNode
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)

  const correctCount = options.filter((option) => option.correct).length
  const isMulti = correctCount > 1

  const toggle = (index: number) => {
    if (checked) return
    setSelected((previous) => {
      if (!isMulti) return new Set([index])
      const next = new Set(previous)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const isFullyCorrect = options.every((option, index) => option.correct === selected.has(index))

  const reset = () => {
    setSelected(new Set())
    setChecked(false)
  }

  return (
    <ExerciseShell
      title={title}
      kind={isMulti ? 'Mehrfachauswahl' : 'Multiple Choice'}
      hint={
        hint ?? (
          <p className="font-medium">
            {question}
            {isMulti && (
              <span className="ml-1.5 text-sm font-normal text-ink-muted">
                ({correctCount} Antworten sind richtig)
              </span>
            )}
          </p>
        )
      }
      footer={
        checked && (
          <p
            className={cn(
              'font-semibold',
              isFullyCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
            )}
          >
            {isFullyCorrect
              ? 'Richtig – alle Optionen korrekt zugeordnet.'
              : 'Noch nicht richtig. Lies die Begründungen und versuche es erneut.'}
          </p>
        )
      }
    >
      <ul className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selected.has(index)
          // Nach dem Prüfen wird jede Option eingefärbt - auch die nicht gewählten
          // richtigen, sonst bleibt unklar, was man übersehen hat.
          const state = !checked
            ? isSelected
              ? 'selected'
              : 'idle'
            : option.correct
              ? 'correct'
              : isSelected
                ? 'wrong'
                : 'idle'

          return (
            <li key={option.text}>
              <button
                type="button"
                onClick={() => toggle(index)}
                disabled={checked}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  state === 'idle' && 'border-line hover:bg-surface-sunken',
                  state === 'selected' && 'border-accent bg-accent-soft',
                  state === 'correct' && 'border-emerald-500/50 bg-emerald-500/[0.08]',
                  state === 'wrong' && 'border-rose-500/50 bg-rose-500/[0.08]',
                  checked && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-[18px] shrink-0 place-items-center border',
                    isMulti ? 'rounded' : 'rounded-full',
                    state === 'correct' && 'border-emerald-600 bg-emerald-600 text-white',
                    state === 'wrong' && 'border-rose-600 bg-rose-600 text-white',
                    state === 'selected' && 'border-accent bg-accent text-white',
                    state === 'idle' && 'border-line-strong',
                  )}
                >
                  {checked && option.correct && <Check size={12} strokeWidth={3.5} />}
                  {checked && !option.correct && isSelected && <X size={12} strokeWidth={3.5} />}
                  {!checked && isSelected && <Check size={12} strokeWidth={3.5} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[0.95rem]">{option.text}</span>
                  {checked && (
                    <span className="mt-1.5 block text-sm text-ink-muted">
                      <strong
                        className={cn(
                          'font-semibold',
                          option.correct
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400',
                        )}
                      >
                        {option.correct ? 'Richtig: ' : 'Falsch: '}
                      </strong>
                      {option.explanation}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-2">
        <ExerciseButton variant="primary" onClick={() => setChecked(true)} disabled={checked || selected.size === 0}>
          Prüfen
        </ExerciseButton>
        {checked && (
          <ExerciseButton onClick={reset}>
            <RotateCcw size={14} />
            Nochmal
          </ExerciseButton>
        )}
      </div>
    </ExerciseShell>
  )
}
