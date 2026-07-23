'use client'

import { useEffect, useState } from 'react'

import { EXAM_DATE, EXAM_LABEL } from '@/config/exam'
import { formatDate } from '@/lib/utils'

interface Remaining {
  days: number
  hours: number
  minutes: number
  past: boolean
}

function computeRemaining(): Remaining {
  const diff = EXAM_DATE.getTime() - Date.now()
  const absolute = Math.abs(diff)

  return {
    days: Math.floor(absolute / 86_400_000),
    hours: Math.floor((absolute % 86_400_000) / 3_600_000),
    minutes: Math.floor((absolute % 3_600_000) / 60_000),
    past: diff < 0,
  }
}

/**
 * Countdown bis zur Prüfung. Rechnet erst nach der Hydration, weil Server- und
 * Clientzeit sonst auseinanderlaufen und React einen Hydration-Mismatch meldet.
 */
export function ExamCountdown() {
  const [remaining, setRemaining] = useState<Remaining | null>(null)

  useEffect(() => {
    setRemaining(computeRemaining())
    const timer = setInterval(() => setRemaining(computeRemaining()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const units = remaining
    ? [
        { value: remaining.days, label: remaining.days === 1 ? 'Tag' : 'Tage' },
        { value: remaining.hours, label: remaining.hours === 1 ? 'Stunde' : 'Stunden' },
        { value: remaining.minutes, label: remaining.minutes === 1 ? 'Minute' : 'Minuten' },
      ]
    : null

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {remaining?.past ? 'Seit der Prüfung' : 'Bis zur Prüfung'}
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
        {units ? (
          units.map((unit) => (
            <div key={unit.label} className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
                {unit.value}
              </span>
              <span className="text-sm text-ink-muted">{unit.label}</span>
            </div>
          ))
        ) : (
          // Platzhalter gleicher Höhe, bis der Client gerechnet hat.
          <span className="text-4xl font-black tracking-tight text-ink-muted sm:text-5xl">–</span>
        )}
      </div>

      <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
        {EXAM_LABEL} · {formatDate(EXAM_DATE)}
      </p>
    </div>
  )
}
