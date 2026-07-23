import { z } from 'zod'

/**
 * Verträge für Themen-Index und MDX-Frontmatter.
 *
 * Arbeitsteilung:
 *   topics.index.json  -> Kategorie, Priorität, Häufigkeit, Punkte, Fokus (maßgeblich)
 *   MDX-Frontmatter    -> Lernziele, verwandte Themen, Zusammenfassung
 *
 * Felder, die in beiden vorkommen dürfen (title, category, priority, ...), müssen
 * übereinstimmen - siehe assertFrontmatterMatchesIndex(). Ein Widerspruch bricht den
 * Build ab, statt still eine der beiden Varianten gewinnen zu lassen.
 */

export const PRIORITIES = ['essentiell', 'sehr-hoch', 'hoch', 'mittel', 'niedrig'] as const
export const EXAM_AREA_IDS = ['projekt', 'planung', 'algorithmen', 'wiso'] as const

export const prioritySchema = z.enum(PRIORITIES)
export const examAreaSchema = z.enum(EXAM_AREA_IDS)

export type Priority = z.infer<typeof prioritySchema>
export type ExamArea = z.infer<typeof examAreaSchema>

/** Anzeigelabel und Sortierrang je Priorität. Rang 0 = wichtigstes zuerst. */
export const PRIORITY_META: Record<Priority, { label: string; rank: number }> = {
  essentiell: { label: 'Essentiell', rank: 0 },
  'sehr-hoch': { label: 'Sehr hoch', rank: 1 },
  hoch: { label: 'Hoch', rank: 2 },
  mittel: { label: 'Mittel', rank: 3 },
  niedrig: { label: 'Niedrig', rank: 4 },
}

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten')

export const categorySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  description: z.string().min(1),
})

export const indexEntrySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  category: slugSchema,
  examArea: examAreaSchema,
  priority: prioritySchema,
  /** Anteil der letzten 12 Prüfungen in Prozent. Nur gesetzt, wenn belegt. */
  frequency: z.number().int().min(0).max(100).optional(),
  /** Kumulierte Punkte über die letzten 12 Prüfungen. Nur gesetzt, wenn belegt. */
  points: z.number().int().min(0).optional(),
  new2025: z.boolean().default(false),
  focus: z.boolean().default(false),
})

export const topicsIndexSchema = z.object({
  categories: z.array(categorySchema).min(1),
  topics: z.array(indexEntrySchema).min(1),
})

export type Category = z.infer<typeof categorySchema>
export type IndexEntry = z.infer<typeof indexEntrySchema>
export type TopicsIndex = z.infer<typeof topicsIndexSchema>

/**
 * Frontmatter einer Themen-MDX-Datei. Alle Metadaten, die auch im Index stehen,
 * sind hier optional - wer sie setzt, muss sie identisch zum Index setzen.
 */
export const frontmatterSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  category: slugSchema.optional(),
  examArea: examAreaSchema.optional(),
  priority: prioritySchema.optional(),
  frequency: z.number().int().min(0).max(100).optional(),
  points: z.number().int().min(0).optional(),
  new2025: z.boolean().optional(),
  /** Ein bis zwei Sätze für Kacheln und Suchergebnisse. */
  summary: z.string().optional(),
  learningGoals: z.array(z.string().min(1)).default([]),
  related: z.array(slugSchema).default([]),
})

export type Frontmatter = z.infer<typeof frontmatterSchema>

/** Ein Thema aus dem Index, angereichert um den MDX-Inhalt - sofern vorhanden. */
export type Topic = IndexEntry & {
  /** false = im Index gelistet, aber noch keine MDX-Datei geschrieben. */
  hasContent: boolean
  summary?: string
  learningGoals: string[]
  related: string[]
  /** Roher MDX-Body ohne Frontmatter. Nur gesetzt, wenn hasContent true ist. */
  body?: string
}

const COMPARED_FIELDS = [
  'title',
  'category',
  'examArea',
  'priority',
  'frequency',
  'points',
  'new2025',
] as const

/**
 * Vergleicht die im Frontmatter wiederholten Metadaten mit dem Index und wirft bei
 * jeder Abweichung. Absichtlich hart: eine stille Divergenz zwischen Navigation und
 * Themenseite wäre später kaum zu finden.
 */
export function assertFrontmatterMatchesIndex(frontmatter: Frontmatter, entry: IndexEntry): void {
  const conflicts: string[] = []

  for (const field of COMPARED_FIELDS) {
    const fromMdx = frontmatter[field]
    if (fromMdx === undefined) continue

    // new2025 hat im Index einen Default (false); ein explizites false im MDX ist ok.
    const fromIndex = entry[field]
    if (fromMdx !== fromIndex) {
      conflicts.push(`  ${field}: MDX="${String(fromMdx)}" vs. Index="${String(fromIndex)}"`)
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Frontmatter von content/topics/${frontmatter.slug}.mdx widerspricht content/topics.index.json:\n` +
        conflicts.join('\n') +
        '\nDer Index ist maßgeblich - entweder dort korrigieren oder das Feld im MDX weglassen.',
    )
  }
}
