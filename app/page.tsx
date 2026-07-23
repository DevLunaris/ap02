import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { ExamCountdown } from '@/components/exam-countdown'
import { TopicCard } from '@/components/topic-meta'
import { EXAM_AREAS } from '@/config/exam'
import { getAllTopics, getCategoriesWithCounts, getFocusTopics } from '@/lib/content/topics'
import { plural } from '@/lib/utils'

export default function HomePage() {
  const topics = getAllTopics()
  const categories = getCategoriesWithCounts()
  const focus = getFocusTopics().slice(0, 6)

  const withContent = topics.filter((topic) => topic.hasContent).length
  const coverage = Math.round((withContent / topics.length) * 100)

  return (
    <div className="space-y-12">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Alles, was in 90 Minuten Punkte bringt.
          </h1>
          <p className="mt-3 text-ink-muted">
            {plural(topics.length, 'Thema', 'Themen')} in {categories.length} Gebieten, nach
            Prüfungsrelevanz sortiert – mit ausführbaren Übungen statt nur Lesestoff.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/fokus"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Fokus-Themen
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/themen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-sunken"
            >
              Alle Themen
            </Link>
          </div>
        </div>

        <ExamCountdown />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Inhaltsstand</h2>
          <span className="text-sm tabular-nums text-ink-muted">
            {withContent} von {topics.length} Themen ausgearbeitet
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={coverage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Anteil ausgearbeiteter Themen"
        >
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${coverage}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Der persönliche Lernfortschritt (gelesen / sitzt) kommt in Phase 5 dazu.
        </p>
      </section>

      {focus.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">Zuerst dran</h2>
            <Link href="/fokus" className="text-sm font-semibold text-accent-text hover:underline">
              alle ansehen
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {focus.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold tracking-tight">Prüfungsbereiche</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXAM_AREAS.map((area) => {
            const count = topics.filter((topic) => topic.examArea === area.id).length
            return (
              <Link
                key={area.id}
                href={`/themen?bereich=${area.id}`}
                className="group rounded-xl border border-line bg-surface-raised p-4 transition-colors hover:border-line-strong"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold group-hover:text-accent-text">{area.short}</span>
                  <span className="text-xs font-semibold text-ink-muted">{area.weight} %</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{area.description}</p>
                <p className="mt-2 text-xs tabular-nums text-ink-muted">
                  {plural(count, 'Thema', 'Themen')}
                  {area.duration ? ` · ${area.duration} min` : ''}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold tracking-tight">Gebiete</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/kategorie/${category.slug}`}
              className="group rounded-xl border border-line bg-surface-raised p-4 transition-colors hover:border-line-strong"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold tracking-tight group-hover:text-accent-text">
                  {category.title}
                </h3>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  {category.done}/{category.count}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
