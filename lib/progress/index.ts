'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  buildExport,
  getServerSnapshot,
  getSnapshot,
  getTopicProgress,
  importProgress,
  markVisited,
  resetProgress,
  setTopicNotes,
  setTopicStatus,
  subscribe,
  summarize,
  type ImportOutcome,
  type ProgressSummary,
} from './store'
import type { ProgressState, TopicProgress, TopicStatus } from './types'

/**
 * Zugang zum Lernfortschritt. Alle Komponenten gehen hierüber - nie direkt an
 * localStorage, damit Speicherformat und Schema an einer Stelle bleiben.
 */
export function useProgress() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    state,
    /** Fortschritt eines einzelnen Themas. */
    topic: useCallback((slug: string) => getTopicProgress(slug, state), [state]),
    /** Zusammenfassung über eine Themenmenge. */
    summary: useCallback((slugs: string[]) => summarize(slugs, state), [state]),
    setStatus: setTopicStatus,
    setNotes: setTopicNotes,
    markVisited,
    reset: resetProgress,
    exportJson: buildExport,
    importJson: importProgress,
  }
}

/** Schlanke Variante für Komponenten, die nur ein Thema brauchen. */
export function useTopicProgress(slug: string): TopicProgress {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return getTopicProgress(slug, state)
}

export { STATUS_META, TOPIC_STATUSES } from './types'
export type { ImportOutcome, ProgressState, ProgressSummary, TopicProgress, TopicStatus }
