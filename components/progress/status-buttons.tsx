'use client'

import { BookOpen, Check, Circle } from 'lucide-react'
import { useEffect } from 'react'

import { STATUS_META, useProgress, type TopicStatus } from '@/lib/progress'
import { cn } from '@/lib/utils'

const OPTIONS: Array<{ value: TopicStatus; Icon: typeof Circle; active: string }> = [
  { value: 'offen', Icon: Circle, active: 'border-slate-400 bg-slate-500/15 text-ink' },
  {
    value: 'gelesen',
    Icon: BookOpen,
    active: 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  {
    value: 'sitzt',
    Icon: Check,
    active: 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  },
]

/**
 * Die drei Statusknöpfe auf der Themenseite. Merkt sich nebenbei, dass dieses
 * Thema zuletzt offen war - das ist das Ziel des "Weiterlernen"-Knopfs.
 */
export function StatusButtons({ slug }: { slug: string }) {
  const { topic, setStatus, markVisited } = useProgress()
  const current = topic(slug).status

  useEffect(() => {
    markVisited(slug)
  }, [slug, markVisited])

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Wie sitzt das Thema?
      </p>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lernstatus">
        {OPTIONS.map(({ value, Icon, active }) => {
          const selected = current === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setStatus(slug, value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                selected ? active : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <Icon size={14} strokeWidth={selected ? 3 : 2} />
              {STATUS_META[value].short}
            </button>
          )
        })}
      </div>
    </div>
  )
}
