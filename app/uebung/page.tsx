import type { Metadata } from 'next'
import Link from 'next/link'

import { ExercisePool, type PoolItem } from '@/components/exercise-pool'
import { EXERCISE_KIND_LABEL, getAllExercises } from '@/lib/content/exercises'
import { TopicContent } from '@/lib/content/mdx'
import { plural } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Übungspool',
}

export default function ExercisePoolPage() {
  const exercises = getAllExercises()

  // Jede Übung wird hier serverseitig durch dieselbe MDX-Pipeline gerendert wie
  // auf der Themenseite - dadurch verhält sie sich identisch, ohne dass Props
  // von Hand nachgebaut werden müssten.
  const items: PoolItem[] = exercises.map((exercise) => ({
    id: exercise.id,
    topicSlug: exercise.topicSlug,
    topicTitle: exercise.topicTitle,
    examArea: exercise.examArea,
    kind: exercise.kind,
    kindLabel: EXERCISE_KIND_LABEL[exercise.kind],
    node: <TopicContent source={exercise.source} />,
  }))

  // Nur Typen anbieten, die es tatsächlich gibt.
  const kinds = Object.keys(EXERCISE_KIND_LABEL).filter((kind) =>
    exercises.some((exercise) => exercise.kind === kind),
  )

  const topics = new Set(exercises.map((exercise) => exercise.topicSlug))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Übungspool</h1>
        <p className="mt-1.5 text-ink-muted">
          Alle Aufgaben aus allen Themen an einem Ort – filterbar und mischbar. Gedacht für
          den Endspurt, wenn es nicht mehr ums Lesen geht, sondern ums Können.
        </p>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {plural(exercises.length, 'Übung', 'Übungen')} aus{' '}
          {plural(topics.size, 'Thema', 'Themen')}
        </p>
      </header>

      {exercises.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-muted">
          Noch keine Übungen vorhanden – es ist bisher kein Thema ausgearbeitet.{' '}
          <Link href="/themen" className="font-semibold text-accent-text hover:underline">
            Zu den Themen
          </Link>
        </p>
      ) : (
        <ExercisePool items={items} kinds={kinds} />
      )}
    </div>
  )
}
