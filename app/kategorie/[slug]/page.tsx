import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { TopicCard } from '@/components/topic-meta'
import { getCategories, getCategory, getTopicsByCategory } from '@/lib/content/topics'
import { plural } from '@/lib/utils'

export function generateStaticParams() {
  return getCategories().map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) return {}

  return { title: category.title, description: category.description }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) notFound()

  const topics = getTopicsByCategory(slug)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Themen', href: '/themen' }, { label: category.title }]} />

      <header>
        <h1 className="text-3xl font-black tracking-tight">{category.title}</h1>
        <p className="mt-1.5 text-ink-muted">{category.description}</p>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {plural(topics.length, 'Thema', 'Themen')}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.slug} topic={topic} />
        ))}
      </div>
    </div>
  )
}
