/** Werte, die SQLite über sql.js zurückgeben kann. */
export type SqlValue = number | string | Uint8Array | null

/** Ein Result-Set, wie sql.js es liefert. */
export interface QueryResult {
  columns: string[]
  values: SqlValue[][]
}

/** Momentaufnahme einer Tabelle - Grundlage des Vergleichs bei INSERT/UPDATE/DELETE. */
export interface TableSnapshot {
  table: string
  columns: string[]
  rows: SqlValue[][]
}

export type SqlRunOutcome =
  | {
      ok: true
      /** Result-Sets der ausgeführten Anweisungen; bei reinen Mutationen leer. */
      results: QueryResult[]
      /** Zustand aller (oder der konfigurierten) Tabellen nach der Ausführung. */
      snapshots: TableSnapshot[]
      /** Von INSERT/UPDATE/DELETE betroffene Zeilen. */
      rowsModified: number
    }
  | {
      ok: false
      /** Aufbereitete SQLite-Meldung. */
      message: string
      /** Originalmeldung von SQLite - für Nachvollziehbarkeit. */
      raw: string
    }

export type SqlCheckResult =
  | { status: 'richtig'; message: string }
  | { status: 'falsch'; message: string; details?: string[] }
  | { status: 'fehler'; message: string }
