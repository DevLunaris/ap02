import {
  EMPTY_PROGRESS,
  EMPTY_TOPIC_PROGRESS,
  exportFileSchema,
  PROGRESS_VERSION,
  progressStateSchema,
  type ProgressState,
  type TopicProgress,
  type TopicStatus,
} from './types'

/**
 * Fortschritts-Store auf localStorage.
 *
 * Bewusst ein externer Store statt React-Context: Header, Themenseite, Fokus-Liste
 * und Startseite lesen denselben Zustand, und mit useSyncExternalStore aktualisieren
 * sich nur die Komponenten, die ihn wirklich abonniert haben.
 *
 * Hydration: getSnapshot liefert vor dem ersten subscribe denselben leeren Zustand
 * wie der Server. Erst wenn React im Effekt abonniert, wird localStorage gelesen -
 * dadurch stimmen Server- und Client-Ausgabe beim ersten Rendern überein.
 */

export const STORAGE_KEY = 'ap2-lernhub:progress'

let state: ProgressState = EMPTY_PROGRESS
let loaded = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** Hebt einen gespeicherten Zustand auf die aktuelle Schemaversion. */
function migrate(raw: unknown): ProgressState {
  const parsed = progressStateSchema.safeParse(raw)
  if (!parsed.success) return EMPTY_PROGRESS

  // Noch gibt es nur Version 1. Kommt Version 2 dazu, hier den Übergang ergänzen,
  // statt den Zustand zu verwerfen.
  return { ...parsed.data, version: PROGRESS_VERSION }
}

function load(): void {
  loaded = true
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    state = migrate(JSON.parse(raw))
  } catch {
    // Kaputter oder fremder Inhalt: lieber leer starten als crashen.
    state = EMPTY_PROGRESS
  }
}

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Speicher voll oder Schreibzugriff verweigert (privater Modus).
    // Der Zustand bleibt im Arbeitsspeicher gültig - kein Grund abzubrechen.
  }
}

function update(next: ProgressState): void {
  state = { ...next, version: PROGRESS_VERSION, updatedAt: new Date().toISOString() }
  persist()
  notify()
}

// ---------------------------------------------------------------------------
// Anbindung für useSyncExternalStore
// ---------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  if (!loaded) {
    load()
    // Nach dem Laden benachrichtigen, aber nicht mitten im Abonnieren -
    // React soll den Render abschließen können.
    if (state !== EMPTY_PROGRESS) queueMicrotask(notify)
  }

  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): ProgressState {
  return state
}

/** Auf dem Server gibt es keinen Fortschritt - immer der leere Zustand. */
export function getServerSnapshot(): ProgressState {
  return EMPTY_PROGRESS
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

export function getTopicProgress(slug: string, from: ProgressState = state): TopicProgress {
  return from.topics[slug] ?? EMPTY_TOPIC_PROGRESS
}

export function setTopicStatus(slug: string, status: TopicStatus): void {
  const current = getTopicProgress(slug)
  update({
    ...state,
    topics: {
      ...state.topics,
      [slug]: { ...current, status, updatedAt: new Date().toISOString() },
    },
  })
}

export function setTopicNotes(slug: string, notes: string): void {
  const current = getTopicProgress(slug)
  update({
    ...state,
    topics: {
      ...state.topics,
      [slug]: { ...current, notes, updatedAt: new Date().toISOString() },
    },
  })
}

/** Merkt sich das zuletzt geöffnete Thema für den "Weiterlernen"-Knopf. */
export function markVisited(slug: string): void {
  if (state.lastTopic === slug) return
  update({ ...state, lastTopic: slug })
}

export function resetProgress(): void {
  update({ ...EMPTY_PROGRESS })
}

// ---------------------------------------------------------------------------
// Export und Import
// ---------------------------------------------------------------------------

export function buildExport(): string {
  return JSON.stringify(
    { app: 'ap2-lernhub', exportedAt: new Date().toISOString(), state },
    null,
    2,
  )
}

export type ImportOutcome =
  | { ok: true; topics: number; mode: 'ersetzt' | 'zusammengeführt' }
  | { ok: false; message: string }

/**
 * Liest eine Export-Datei ein.
 *
 * `merge` behält vorhandene Einträge und ergänzt nur fehlende - so lässt sich ein
 * Backup einspielen, ohne neuere Arbeit zu verlieren. Ohne `merge` wird ersetzt.
 */
export function importProgress(json: string, { merge = false } = {}): ImportOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, message: 'Die Datei enthält kein gültiges JSON.' }
  }

  const file = exportFileSchema.safeParse(parsed)
  if (!file.success) {
    // Auch einen blanken Zustand ohne Hülle akzeptieren - hilfreich, wenn jemand
    // die Datei von Hand bearbeitet hat.
    const bare = progressStateSchema.safeParse(parsed)
    if (!bare.success) {
      return {
        ok: false,
        message: 'Die Datei stammt nicht aus dem AP2 Lernhub oder ist beschädigt.',
      }
    }
    return applyImport(bare.data, merge)
  }

  return applyImport(file.data.state, merge)
}

function applyImport(incoming: ProgressState, merge: boolean): ImportOutcome {
  const topics = merge ? { ...incoming.topics, ...state.topics } : incoming.topics

  update({
    version: PROGRESS_VERSION,
    topics,
    lastTopic: incoming.lastTopic ?? state.lastTopic,
  })

  return {
    ok: true,
    topics: Object.keys(topics).length,
    mode: merge ? 'zusammengeführt' : 'ersetzt',
  }
}

// ---------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------

export interface ProgressSummary {
  total: number
  gelesen: number
  sitzt: number
  offen: number
  /** Anteil in Prozent, „sitzt" zählt voll, „gelesen" zur Hälfte. */
  percent: number
}

/**
 * Fortschritt über eine Themenmenge. „Gelesen" zählt bewusst nur halb: Einmal
 * durchgelesen ist nicht dasselbe wie sitzen.
 */
export function summarize(slugs: string[], from: ProgressState = state): ProgressSummary {
  let gelesen = 0
  let sitzt = 0

  for (const slug of slugs) {
    const status = getTopicProgress(slug, from).status
    if (status === 'sitzt') sitzt++
    else if (status === 'gelesen') gelesen++
  }

  const total = slugs.length
  const percent = total === 0 ? 0 : Math.round(((sitzt + gelesen * 0.5) / total) * 100)

  return { total, gelesen, sitzt, offen: total - gelesen - sitzt, percent }
}

/** Nur für Tests: setzt den Modulzustand zurück. */
export function __resetForTests(): void {
  state = EMPTY_PROGRESS
  loaded = false
  listeners.clear()
}
