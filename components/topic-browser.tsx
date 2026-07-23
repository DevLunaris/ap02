'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { TopicCard } from '@/components/topic-meta'
import { EXAM_AREAS } from '@/config/exam'
import { PRIORITY_META, type Category, type ExamArea, type Topic } from '@/lib/content/schema'
import { cn, plural } from '@/lib/utils'

type Grouping = 'prioritaet' | 'kategorie'

const PRIORITY_ORDER = Object.entries(PRIORITY_META)
  .sort(([, a], [, b]) => a.rank - b.rank)
  .map(([key]) => key as keyof typeof PRIORITY_META)

function isExamArea(value: string | null): value is ExamArea {
  return EXAM_AREAS.some((area) => area.id === value)
}

/**
 * Themenliste mit Filter nach Prüfungsbereich und Gruppierung.
 * Der Vorfilter kommt per ?bereich= aus den Links der Startseite.
 */
export function TopicBrowser({
  topics,
  categories,
}: {
  topics: Topic[]
  categories: Category[]
}) {
  const searchParams = useSearchParams()
  const initialArea = searchParams.get('bereich')

  const [area, setArea] = useState<ExamArea | 'alle'>(isExamArea(initialArea) ? initialArea : 'alle')
  const [grouping, setGrouping] = useState<Grouping>('prioritaet')
  const [hideDrafts, setHideDrafts] = useState(false)

  const visible = useMemo(
    () =>
      topics
        .filter((topic) => area === 'alle' || topic.examArea === area)
        .filter((topic) => !hideDrafts || topic.hasContent),
    [topics, area, hideDrafts],
  )

  const groups = useMemo(() => {
    if (grouping === 'kategorie') {
      return categories
        .map((category) => ({
          key: category.slug,
          title: category.title,
          topics: visible.filter((topic) => topic.category === category.slug),
        }))
        .filter((group) => group.topics.length > 0)
    }

    return PRIORITY_ORDER.map((priority) => ({
      key: priority,
      title: PRIORITY_META[priority].label,
      topics: visible.filter((topic) => topic.priority === priority),
    })).filter((group) => group.topics.length > 0)
  }, [visible, grouping, categories])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface-raised p-3">
        <Filter label="Prüfungsbereich">
          <Chip active={area === 'alle'} onClick={() => setArea('alle')}>
            Alle
          </Chip>
          {EXAM_AREAS.map((item) => (
            <Chip key={item.id} active={area === item.id} onClick={() => setArea(item.id)}>
              {item.short}
            </Chip>
          ))}
        </Filter>

        <Filter label="Gruppieren">
          <Chip active={grouping === 'prioritaet'} onClick={() => setGrouping('prioritaet')}>
            Priorität
          </Chip>
          <Chip active={grouping === 'kategorie'} onClick={() => setGrouping('kategorie')}>
            Gebiet
          </Chip>
        </Filter>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={hideDrafts}
            onChange={(event) => setHideDrafts(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          nur ausgearbeitete
        </label>

        <span className="ml-auto text-sm tabular-nums text-ink-muted">
          {plural(visible.length, 'Thema', 'Themen')}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-muted">
          Keine Themen für diese Auswahl.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2.5 flex items-baseline gap-2 text-lg font-bold tracking-tight">
              {group.title}
              <span className="text-sm font-normal tabular-nums text-ink-muted">
                {group.topics.length}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.topics.map((topic) => (
                <TopicCard key={topic.slug} topic={topic} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
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
  children: React.ReactNode
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
