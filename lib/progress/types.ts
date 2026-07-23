import { z } from 'zod'

/**
 * Lernfortschritt und Notizen. Liegt im localStorage - es gibt bewusst keinen
 * Server und keine Anmeldung.
 */

export const TOPIC_STATUSES = ['offen', 'gelesen', 'sitzt'] as const
export type TopicStatus = (typeof TOPIC_STATUSES)[number]

export const STATUS_META: Record<TopicStatus, { label: string; short: string; rank: number }> = {
  offen: { label: 'Noch nicht angeschaut', short: 'Offen', rank: 0 },
  gelesen: { label: 'Gelesen', short: 'Gelesen', rank: 1 },
  sitzt: { label: 'Sitzt', short: 'Sitzt', rank: 2 },
}

export const topicProgressSchema = z.object({
  status: z.enum(TOPIC_STATUSES).default('offen'),
  notes: z.string().default(''),
  /** ISO-Zeitstempel der letzten Änderung. */
  updatedAt: z.string().optional(),
})

export type TopicProgress = z.infer<typeof topicProgressSchema>

/**
 * Schema-Version. Wird sie erhöht, muss migrate() in store.ts einen Übergang
 * bekommen - sonst verliert jemand beim Update seinen Fortschritt.
 */
export const PROGRESS_VERSION = 1

export const progressStateSchema = z.object({
  version: z.number().int().positive(),
  topics: z.record(z.string(), topicProgressSchema).default({}),
  /** Slug des zuletzt geöffneten Themas - Ziel des "Weiterlernen"-Knopfs. */
  lastTopic: z.string().optional(),
  /** Wann zuletzt irgendetwas gespeichert wurde. */
  updatedAt: z.string().optional(),
})

export type ProgressState = z.infer<typeof progressStateSchema>

export const EMPTY_PROGRESS: ProgressState = { version: PROGRESS_VERSION, topics: {} }

export const EMPTY_TOPIC_PROGRESS: TopicProgress = { status: 'offen', notes: '' }

/** Format der Export-Datei - enthält zusätzlich Kontext für den Menschen davor. */
export const exportFileSchema = z.object({
  app: z.literal('ap2-lernhub'),
  exportedAt: z.string(),
  state: progressStateSchema,
})

export type ExportFile = z.infer<typeof exportFileSchema>
