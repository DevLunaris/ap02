import type { Database, SqlJsStatic } from 'sql.js'

import { explainSqliteError } from './compare'
import type { QueryResult, SqlRunOutcome, TableSnapshot } from './types'

/**
 * Ausführung von SQL im Browser über sql.js (SQLite als WebAssembly).
 *
 * Läuft vollständig clientseitig - es gibt keinen Datenbankserver und keine
 * Netzwerkanfrage außer dem einmaligen Laden der WASM-Datei von der eigenen
 * Domain. Jede Übung bekommt ihre eigene In-Memory-Datenbank.
 */

/**
 * Das WASM-Modul wird einmal pro Seitenaufruf geladen und dann geteilt -
 * es ist ~640 KB groß und für jede Übung erneut zu laden wäre Verschwendung.
 */
let sqlJsPromise: Promise<SqlJsStatic> | null = null

export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = import('sql.js').then((module) =>
      // Die .wasm liegt in public/ - kopiert von scripts/prepare-assets.mjs.
      module.default({ locateFile: (file: string) => `/${file}` }),
    )
  }
  return sqlJsPromise
}

/** Legt eine frische Datenbank an und spielt das Seed-Schema der Übung ein. */
export async function createDatabase(schema: string): Promise<Database> {
  const SQL = await loadSqlJs()
  const database = new SQL.Database()
  database.run(schema)
  return database
}

/** Namen aller vom Schema angelegten Tabellen, ohne SQLite-Interna. */
export function listTables(database: Database): string[] {
  const results = database.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  const first = results[0]
  if (!first) return []
  return first.values.map((row) => String(row[0]))
}

/** Momentaufnahme der genannten Tabellen - oder aller, wenn keine genannt sind. */
export function snapshotTables(database: Database, tables?: string[]): TableSnapshot[] {
  const names = tables && tables.length > 0 ? tables : listTables(database)

  return names.map((table) => {
    // Tabellennamen kommen aus dem MDX bzw. aus sqlite_master, nicht aus
    // Nutzereingaben; die Anführungszeichen schützen trotzdem vor Sonderzeichen.
    const results = database.exec(`SELECT * FROM "${table.replace(/"/g, '""')}"`)
    const first = results[0]
    return {
      table,
      columns: first?.columns ?? [],
      rows: first?.values ?? [],
    }
  })
}

/**
 * Führt SQL aus und liefert Result-Sets, Tabellenzustand und die Anzahl
 * geänderter Zeilen. Wirft nicht - Fehler kommen als Ergebnis zurück.
 */
export function execute(
  database: Database,
  sql: string,
  compareTables?: string[],
): SqlRunOutcome {
  try {
    const results: QueryResult[] = database.exec(sql).map((result) => ({
      columns: result.columns,
      values: result.values,
    }))

    return {
      ok: true,
      results,
      snapshots: snapshotTables(database, compareTables),
      rowsModified: database.getRowsModified(),
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    return { ok: false, message: explainSqliteError(raw), raw }
  }
}

/**
 * Führt die Musterlösung in einer eigenen, frischen Datenbank aus. Sie darf die
 * Datenbank der lernenden Person nicht anfassen - sonst würde eine Musterlösung
 * mit INSERT deren Daten verändern.
 */
export async function runSolution(
  schema: string,
  solution: string,
  compareTables?: string[],
): Promise<SqlRunOutcome> {
  const database = await createDatabase(schema)
  try {
    return execute(database, solution, compareTables)
  } finally {
    database.close()
  }
}
