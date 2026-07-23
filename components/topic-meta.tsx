import { BarChart3, Sparkles, Target } from 'lucide-react'
import Link from 'next/link'

// Bewusst aus schema statt topics: topics.ts liest Dateien und darf nie in einem
// Client-Bundle landen. schema.ts ist frei von Node-APIs.
import { PRIORITY_META, type Priority, type Topic } from '@/lib/content/schema'
import { cn, formatNumber } from '@/lib/utils'

/** Farbrolle je Priorität - einmal hier, damit Badges überall gleich aussehen. */
const PRIORITY_CLASS: Record<Priority, string> = {
  essentiell: 'bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  'sehr-hoch': 'bg-orange-500/12 text-orange-700 ring-orange-500/25 dark:text-orange-300',
  hoch: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  mittel: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300',
  niedrig: 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-400',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        PRIORITY_CLASS[priority],
        className,
      )}
    >
      {PRIORITY_META[priority].label}
    </span>
  )
}

export function New2025Badge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/12 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-500/25 dark:text-violet-300">
      <Sparkles size={11} />
      NEU 2025
    </span>
  )
}

export function DraftBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong px-2 py-0.5 text-xs font-medium text-ink-muted">
      noch nicht erstellt
    </span>
  )
}

/**
 * Häufigkeit und Punkte. Beide Werte sind optional und werden ausschließlich
 * gerendert, wenn sie im Index belegt sind - nie geschätzt.
 */
export function TopicStats({
  frequency,
  points,
  className,
}: {
  frequency?: number
  points?: number
  className?: string
}) {
  if (frequency === undefined && points === undefined) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted', className)}>
      {frequency !== undefined && (
        <span className="inline-flex items-center gap-1.5" title="Anteil der letzten 12 Prüfungen">
          <BarChart3 size={13} />
          {frequency} % der letzten 12 Prüfungen
        </span>
      )}
      {points !== undefined && (
        <span className="inline-flex items-center gap-1.5" title="Kumulierte Punkte">
          <Target size={13} />~{formatNumber(points)} Punkte kumuliert
        </span>
      )}
    </div>
  )
}

export function TopicCard({ topic, showCategory = false }: { topic: Topic; showCategory?: boolean }) {
  return (
    <Link
      href={`/thema/${topic.slug}`}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border border-line bg-surface-raised p-4 transition-all',
        'hover:border-line-strong hover:shadow-sm',
        !topic.hasContent && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={topic.priority} />
        {topic.new2025 && <New2025Badge />}
        {!topic.hasContent && <DraftBadge />}
      </div>

      <h3 className="font-semibold leading-snug tracking-tight group-hover:text-accent-text">
        {topic.title}
      </h3>

      {topic.summary && <p className="line-clamp-2 text-sm text-ink-muted">{topic.summary}</p>}

      <TopicStats frequency={topic.frequency} points={topic.points} className="mt-auto pt-1" />

      {showCategory && <span className="text-xs text-ink-muted">{topic.category}</span>}
    </Link>
  )
}
