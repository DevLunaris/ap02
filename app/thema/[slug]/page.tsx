import { ArrowLeft, ArrowRight, Target } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { StatusButtons } from '@/components/progress/status-buttons'
import { TopicNotes } from '@/components/progress/topic-notes'
import { TopicArrowKeys } from '@/components/topic-arrow-keys'
import { New2025Badge, PriorityBadge, TopicStats } from '@/components/topic-meta'
import { getExamArea } from '@/config/exam'
import { TopicContent } from '@/lib/content/mdx'
import {
  getAllTopics,
  getCategory,
  getRelated,
  getTopic,
  getTopicNeighbours,
} from '@/lib/content/topics'

export function generateStaticParams() {
  return getAllTopics().map((topic) => ({ slug: topic.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const topic = getTopic(slug)
  if (!topic) return {}

  return { title: topic.title, description: topic.summary }
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const topic = getTopic(slug)
  if (!topic) notFound()

  const category = getCategory(topic.category)
  const examArea = getExamArea(topic.examArea)
  const related = getRelated(topic)
  const { prev, next } = getTopicNeighbours(slug)

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Themen', href: '/themen' },
          ...(category ? [{ label: category.title, href: `/kategorie/${category.slug}` }] : []),
          { label: topic.title },
        ]}
      />

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={topic.priority} />
          {topic.new2025 && <New2025Badge />}
          {examArea && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-muted">
              {examArea.short} · {examArea.weight} %
            </span>
          )}
        </div>

        <h1 className="mt-2.5 text-3xl font-black tracking-tight sm:text-4xl">{topic.title}</h1>

        {topic.summary && <p className="mt-2 text-lg text-ink-muted">{topic.summary}</p>}

        <TopicStats frequency={topic.frequency} points={topic.points} className="mt-3" />
      </header>

      {topic.learningGoals.length > 0 && (
        <section className="mt-6 rounded-xl border border-line bg-surface-raised p-4">
          <h2 className="mb-2 flex items-center gap-2 font-bold tracking-tight">
            <Target size={16} className="text-accent" />
            Lernziele
          </h2>
          <ul className="space-y-1.5 text-[0.95rem]">
            {topic.learningGoals.map((goal) => (
              <li key={goal} className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <StatusButtons slug={topic.slug} />
      </div>

      {topic.hasContent && topic.body ? (
        <div className="mt-8">
          <TopicContent source={topic.body} />
        </div>
      ) : (
        <DraftNotice slug={topic.slug} />
      )}

      <div className="mt-10">
        <TopicNotes slug={topic.slug} />
      </div>

      {related.length > 0 && (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className="mb-3 font-bold tracking-tight">Verwandte Themen</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/thema/${item.slug}`}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:border-line-strong hover:bg-surface-sunken"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <TopicArrowKeys prevSlug={prev?.slug} nextSlug={next?.slug} />

      {(prev || next) && (
        <nav className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/thema/${prev.slug}`}
              className="group rounded-xl border border-line p-3 transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                <ArrowLeft size={13} />
                Vorheriges Thema
              </span>
              <span className="mt-0.5 block font-semibold group-hover:text-accent-text">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/thema/${next.slug}`}
              className="group rounded-xl border border-line p-3 text-right transition-colors hover:border-line-strong sm:col-start-2"
            >
              <span className="flex items-center justify-end gap-1.5 text-xs text-ink-muted">
                Nächstes Thema
                <ArrowRight size={13} />
              </span>
              <span className="mt-0.5 block font-semibold group-hover:text-accent-text">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  )
}

/** Für Themen, die im Index stehen, aber noch keine MDX-Datei haben. */
function DraftNotice({ slug }: { slug: string }) {
  return (
    <section className="mt-8 rounded-xl border border-dashed border-line-strong bg-surface-sunken p-6">
      <h2 className="font-bold tracking-tight">Dieses Thema ist noch nicht ausgearbeitet.</h2>
      <p className="mt-1.5 text-[0.95rem] text-ink-muted">
        Es steht bereits im Themen-Index, aber es gibt noch keine Inhaltsdatei. Zum Ausarbeiten
        eine Datei anlegen unter:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[0.8rem]">
        content/topics/{slug}.mdx
      </pre>
      <p className="mt-3 text-sm text-ink-muted">
        Aufbau und verfügbare Komponenten stehen in <code className="font-mono text-xs">CLAUDE.md</code>.
      </p>
    </section>
  )
}
