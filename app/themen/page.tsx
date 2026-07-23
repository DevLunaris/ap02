import type { Metadata } from 'next'
import { Suspense } from 'react'

import { TopicBrowser } from '@/components/topic-browser'
import { getAllTopics, getCategories } from '@/lib/content/topics'

export const metadata: Metadata = {
  title: 'Alle Themen',
}

export default function TopicsPage() {
  const topics = getAllTopics()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Alle Themen</h1>
        <p className="mt-1.5 text-ink-muted">
          Nach Prüfungsrelevanz sortiert. Häufigkeits- und Punktangaben stammen aus dem Themen-Index.
        </p>
      </header>

      {/* useSearchParams im Browser erfordert eine Suspense-Grenze. */}
      <Suspense fallback={<p className="text-ink-muted">Themen werden geladen …</p>}>
        <TopicBrowser topics={topics} categories={getCategories()} />
      </Suspense>
    </div>
  )
}
