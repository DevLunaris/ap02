'use client'

import { BookOpen, Check, Circle } from 'lucide-react'
import Link from 'next/link'

import { New2025Badge, PriorityBadge, TopicStats } from '@/components/topic-meta'
import type { Topic } from '@/lib/content/schema'
import { STATUS_META, useProgress, type TopicStatus } from '@/lib/progress'
import { cn } from '@/lib/utils'

const STATUS_ICON: Record<TopicStatus, typeof Circle> = {
  offen: Circle,
  gelesen: BookOpen,
  sitzt: Check,
}

const STATUS_STYLE: Record<TopicStatus, string> = {
  offen: 'border-line text-ink-muted',
  gelesen: 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  sitzt: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
}

/**
 * Fokus-Liste in fester Reihenfolge, mit Status je Thema.
 *
 * Der Status lässt sich direkt hier weiterschalten, ohne das Thema zu öffnen -
 * beim Durchgehen der Liste ist das der schnellere Weg.
 */
export function FocusList({ topics }: { topics: Topic[] }) {
  const { topic: progressOf, setStatus, summary } = useProgress()
  const stats = summary(topics.map((item) => item.slug))

  /** Klick schaltet weiter: offen → gelesen → sitzt → offen. */
  const cycle = (slug: string, current: TopicStatus) => {
    const next: TopicStatus = current === 'offen' ? 'gelesen' : current === 'gelesen' ? 'sitzt' : 'offen'
    setStatus(slug, next)
  }

  return (
    <>
      <div className="rounded-xl border border-line bg-surface-raised p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Fortschritt im Fokus-Bereich</span>
          <span className="text-sm tabular-nums text-ink-muted">
            {stats.sitzt} von {stats.total} sitzen
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${(stats.sitzt / Math.max(1, stats.total)) * 100}%` }}
          />
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${(stats.gelesen / Math.max(1, stats.total)) * 100}%` }}
          />
        </div>
      </div>

      <ol className="space-y-2.5">
        {topics.map((topic, index) => {
          const status = progressOf(topic.slug).status
          const Icon = STATUS_ICON[status]

          return (
            <li
              key={topic.slug}
              className="flex gap-3 rounded-xl border border-line bg-surface-raised p-4"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-sm font-black tabular-nums text-ink-muted">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PriorityBadge priority={topic.priority} />
                  {topic.new2025 && <New2025Badge />}
                  {!topic.hasContent && (
                    <span className="text-xs text-ink-muted">noch nicht erstellt</span>
                  )}
                </div>

                <Link
                  href={`/thema/${topic.slug}`}
                  className="mt-1.5 block font-semibold tracking-tight hover:text-accent-text"
                >
                  {topic.title}
                </Link>

                {topic.summary && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{topic.summary}</p>
                )}

                <TopicStats frequency={topic.frequency} points={topic.points} className="mt-1.5" />
              </div>

              <button
                type="button"
                onClick={() => cycle(topic.slug, status)}
                title={`${STATUS_META[status].label} – klicken zum Weiterschalten`}
                aria-label={`Status von ${topic.title}: ${STATUS_META[status].label}`}
                className={cn(
                  'inline-flex h-fit shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-sunken',
                  STATUS_STYLE[status],
                )}
              >
                <Icon size={13} strokeWidth={status === 'offen' ? 2 : 3} />
                {STATUS_META[status].short}
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
