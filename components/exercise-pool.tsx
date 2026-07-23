'use client'

import { Shuffle } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'

import { EXAM_AREAS } from '@/config/exam'
import type { ExamArea } from '@/lib/content/schema'
import { cn, plural } from '@/lib/utils'

/**
 * Filter- und Mischlogik des Übungspools.
 *
 * Die Übungen selbst kommen als vorgerenderte Server-Komponenten herein - so
 * bleibt die MDX-Pipeline auf dem Server und der Client kümmert sich nur um
 * Auswahl und Reihenfolge.
 */

export interface PoolItem {
  id: string
  topicSlug: string
  topicTitle: string
  examArea: ExamArea
  kind: string
  kindLabel: string
  /** Die fertig gerenderte Übung. */
  node: ReactNode
}

/** Fisher-Yates - gleichverteilt, im Gegensatz zu sort(() => Math.random() - 0.5). */
function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = result[i] as T
    const b = result[j] as T
    result[i] = b
    result[j] = a
  }
  return result
}

export function ExercisePool({ items, kinds }: { items: PoolItem[]; kinds: string[] }) {
  const [area, setArea] = useState<ExamArea | 'alle'>('alle')
  const [kind, setKind] = useState<string | 'alle'>('alle')
  /** Reihenfolge als Liste von IDs; null = Ausgangsreihenfolge. */
  const [order, setOrder] = useState<string[] | null>(null)

  const visible = useMemo(() => {
    const filtered = items
      .filter((item) => area === 'alle' || item.examArea === area)
      .filter((item) => kind === 'alle' || item.kind === kind)

    if (!order) return filtered

    const rank = new Map(order.map((id, index) => [id, index]))
    return [...filtered].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  }, [items, area, kind, order])

  const kindLabels = useMemo(() => {
    const labels = new Map<string, string>()
    for (const item of items) labels.set(item.kind, item.kindLabel)
    return labels
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface-raised p-3">
        <Filter label="Prüfungsbereich">
          <Chip active={area === 'alle'} onClick={() => setArea('alle')}>
            Alle
          </Chip>
          {EXAM_AREAS.filter((item) => items.some((exercise) => exercise.examArea === item.id)).map(
            (item) => (
              <Chip key={item.id} active={area === item.id} onClick={() => setArea(item.id)}>
                {item.short}
              </Chip>
            ),
          )}
        </Filter>

        <Filter label="Typ">
          <Chip active={kind === 'alle'} onClick={() => setKind('alle')}>
            Alle
          </Chip>
          {kinds.map((value) => (
            <Chip key={value} active={kind === value} onClick={() => setKind(value)}>
              {kindLabels.get(value) ?? value}
            </Chip>
          ))}
        </Filter>

        <button
          type="button"
          onClick={() => setOrder(shuffled(items.map((item) => item.id)))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <Shuffle size={13} />
          Mischen
        </button>

        <span className="ml-auto text-sm tabular-nums text-ink-muted">
          {plural(visible.length, 'Übung', 'Übungen')}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-muted">
          Keine Übungen für diese Auswahl.
        </p>
      ) : (
        <ol className="space-y-6">
          {visible.map((item, index) => (
            <li key={item.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                <span className="font-semibold tabular-nums">{index + 1}.</span>
                <Link
                  href={`/thema/${item.topicSlug}`}
                  className="font-semibold text-accent-text hover:underline"
                >
                  {item.topicTitle}
                </Link>
                <span aria-hidden>·</span>
                <span>{item.kindLabel}</span>
              </div>
              {item.node}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-2.5 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-white'
          : 'border border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
