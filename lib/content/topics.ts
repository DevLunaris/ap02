// Bricht den Build ab, sobald diese Datei in einem Client-Bundle landet.
// Typen für Client-Komponenten kommen aus ./schema, das ohne Node-APIs auskommt.
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'

import rawIndex from '@/content/topics.index.json'
import {
  assertFrontmatterMatchesIndex,
  frontmatterSchema,
  PRIORITY_META,
  topicsIndexSchema,
  type Category,
  type ExamArea,
  type IndexEntry,
  type Priority,
  type Topic,
} from './schema'

const TOPICS_DIR = path.join(process.cwd(), 'content', 'topics')

/**
 * Server-seitiger Content-Layer. Liest topics.index.json + content/topics/*.mdx,
 * validiert beides und stellt die Abfragen bereit, die die Seiten brauchen.
 * Alle Loader sind über React.cache() pro Request memoisiert.
 */

const loadIndex = cache((): { categories: Category[]; topics: IndexEntry[] } => {
  const parsed = topicsIndexSchema.safeParse(rawIndex)
  if (!parsed.success) {
    throw new Error(
      `content/topics.index.json ist ungültig:\n${JSON.stringify(parsed.error.issues, null, 2)}`,
    )
  }

  const categorySlugs = new Set(parsed.data.categories.map((c) => c.slug))
  const seen = new Set<string>()

  for (const topic of parsed.data.topics) {
    if (seen.has(topic.slug)) {
      throw new Error(`Doppelter Themen-Slug in topics.index.json: "${topic.slug}"`)
    }
    seen.add(topic.slug)

    if (!categorySlugs.has(topic.category)) {
      throw new Error(
        `Thema "${topic.slug}" verweist auf unbekannte Kategorie "${topic.category}".`,
      )
    }
  }

  return parsed.data
})

/** Liest eine MDX-Datei und verschmilzt sie mit ihrem Index-Eintrag. */
function readTopicFile(entry: IndexEntry): Topic {
  const filePath = path.join(TOPICS_DIR, `${entry.slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    // Im Index gelistet, aber noch nicht geschrieben. Kein Fehler - die Seite
    // zeigt dann einen Stub statt eines 404.
    return { ...entry, hasContent: false, learningGoals: [], related: [] }
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  const parsed = frontmatterSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(
      `Frontmatter von content/topics/${entry.slug}.mdx ist ungültig:\n` +
        JSON.stringify(parsed.error.issues, null, 2),
    )
  }

  const frontmatter = parsed.data

  if (frontmatter.slug !== entry.slug) {
    throw new Error(
      `content/topics/${entry.slug}.mdx trägt slug "${frontmatter.slug}" - Dateiname und Slug müssen übereinstimmen.`,
    )
  }

  assertFrontmatterMatchesIndex(frontmatter, entry)

  return {
    ...entry,
    hasContent: true,
    summary: frontmatter.summary,
    learningGoals: frontmatter.learningGoals,
    related: frontmatter.related,
    body: content,
  }
}

/**
 * Warnt vor MDX-Dateien, die zu keinem Index-Eintrag gehören. Ohne diese Prüfung
 * würde eine Datei mit vertipptem Namen einfach nirgends auftauchen.
 */
function assertNoOrphanFiles(knownSlugs: Set<string>): void {
  if (!fs.existsSync(TOPICS_DIR)) return

  const orphans = fs
    .readdirSync(TOPICS_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .filter((slug) => !knownSlugs.has(slug))

  if (orphans.length > 0) {
    throw new Error(
      `Diese MDX-Dateien haben keinen Eintrag in content/topics.index.json und würden nirgends angezeigt:\n` +
        orphans.map((slug) => `  content/topics/${slug}.mdx`).join('\n') +
        '\nEntweder in den Index aufnehmen oder die Datei umbenennen.',
    )
  }
}

const loadAllTopics = cache((): Topic[] => {
  const { topics } = loadIndex()

  assertNoOrphanFiles(new Set(topics.map((topic) => topic.slug)))

  const all = topics.map(readTopicFile)

  // Verwandte Themen müssen existieren, sonst laufen Links ins Leere.
  const known = new Set(all.map((t) => t.slug))
  for (const topic of all) {
    for (const ref of topic.related) {
      if (!known.has(ref)) {
        throw new Error(
          `Thema "${topic.slug}" verweist unter "related" auf unbekanntes Thema "${ref}".`,
        )
      }
    }
  }

  return all
})

/** Sortierung für alle Listen: Priorität, dann Häufigkeit, dann Titel. */
export function byRelevance(a: IndexEntry, b: IndexEntry): number {
  const rank = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank
  if (rank !== 0) return rank

  const freq = (b.frequency ?? -1) - (a.frequency ?? -1)
  if (freq !== 0) return freq

  return a.title.localeCompare(b.title, 'de')
}

export function getAllTopics(): Topic[] {
  return [...loadAllTopics()].sort(byRelevance)
}

export function getTopic(slug: string): Topic | undefined {
  return loadAllTopics().find((topic) => topic.slug === slug)
}

export function getCategories(): Category[] {
  return loadIndex().categories
}

export function getCategory(slug: string): Category | undefined {
  return loadIndex().categories.find((category) => category.slug === slug)
}

export function getTopicsByCategory(slug: string): Topic[] {
  return getAllTopics().filter((topic) => topic.category === slug)
}

export function getTopicsByExamArea(area: ExamArea): Topic[] {
  return getAllTopics().filter((topic) => topic.examArea === area)
}

export function getFocusTopics(): Topic[] {
  return getAllTopics().filter((topic) => topic.focus)
}

/** Die unter `related` verlinkten Themen eines Themas, in Index-Reihenfolge. */
export function getRelated(topic: Topic): Topic[] {
  return topic.related
    .map((slug) => getTopic(slug))
    .filter((related): related is Topic => related !== undefined)
}

/** Kategorien mit Themenanzahl - für die Kacheln auf der Startseite. */
export function getCategoriesWithCounts(): Array<Category & { count: number; done: number }> {
  const topics = getAllTopics()
  return getCategories().map((category) => {
    const inCategory = topics.filter((topic) => topic.category === category.slug)
    return {
      ...category,
      count: inCategory.length,
      done: inCategory.filter((topic) => topic.hasContent).length,
    }
  })
}

/** Vorheriges/nächstes Thema innerhalb derselben Kategorie - für die Pfeiltasten. */
export function getTopicNeighbours(slug: string): { prev?: Topic; next?: Topic } {
  const topic = getTopic(slug)
  if (!topic) return {}

  const siblings = getTopicsByCategory(topic.category)
  const position = siblings.findIndex((t) => t.slug === slug)
  if (position === -1) return {}

  return {
    prev: siblings[position - 1],
    next: siblings[position + 1],
  }
}

export type { Category, ExamArea, IndexEntry, Priority, Topic }
export { PRIORITY_META }
