import type { Metadata } from 'next'
import Link from 'next/link'

import { New2025Badge, PriorityBadge, TopicStats } from '@/components/topic-meta'
import { getFocusTopics } from '@/lib/content/topics'
import { plural } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Fokus-Lernen',
}

export default function FocusPage() {
  const topics = getFocusTopics()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Fokus-Lernen</h1>
        <p className="mt-1.5 text-ink-muted">
          Die Themen mit dem besten Verhältnis aus Aufwand und Prüfungspunkten – in dieser
          Reihenfolge durcharbeiten. Was hier steht, steuert das Feld{' '}
          <code className="font-mono text-xs">focus</code> in{' '}
          <code className="font-mono text-xs">content/topics.index.json</code>.
        </p>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {plural(topics.length, 'Thema', 'Themen')}
        </p>
      </header>

      <ol className="space-y-2.5">
        {topics.map((topic, index) => (
          <li key={topic.slug}>
            <Link
              href={`/thema/${topic.slug}`}
              className="group flex gap-4 rounded-xl border border-line bg-surface-raised p-4 transition-colors hover:border-line-strong"
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
                <h2 className="mt-1.5 font-semibold tracking-tight group-hover:text-accent-text">
                  {topic.title}
                </h2>
                {topic.summary && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{topic.summary}</p>
                )}
                <TopicStats frequency={topic.frequency} points={topic.points} className="mt-1.5" />
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-ink-muted">
        Der Status je Thema (offen / in Arbeit / sitzt) kommt in Phase 5 dazu, zusammen mit
        Fortschrittsspeicherung im localStorage.
      </p>
    </div>
  )
}
