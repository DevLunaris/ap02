import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { beforeAll, afterEach, describe, expect, it } from 'vitest'

import { compareResultSets, compareSnapshots, hasOrderBy, statementKind } from './compare'
import { execute, listTables, snapshotTables } from './runner'

/**
 * Integrationstest gegen echtes SQLite. sql.js läuft auch in Node, deshalb lässt
 * sich die komplette Prüfkette hier verifizieren - nicht nur die Vergleichslogik
 * mit erfundenen Daten.
 *
 * Der Browser-Loader aus runner.ts wird bewusst umgangen (locateFile zeigt dort
 * auf public/); die eigentliche Logik ist identisch.
 */

const SCHEMA = `
CREATE TABLE abteilung (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE mitarbeiter (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  abteilung_id INTEGER REFERENCES abteilung(id),
  gehalt INTEGER NOT NULL
);
INSERT INTO abteilung VALUES (1, 'IT'), (2, 'Vertrieb');
INSERT INTO mitarbeiter VALUES
  (1, 'Meier',  1, 4200),
  (2, 'Schulz', 2, 3800),
  (3, 'Yildiz', 1, 4600);
`

let SQL: SqlJsStatic
const open: Database[] = []

function freshDatabase(): Database {
  const database = new SQL.Database()
  database.run(SCHEMA)
  open.push(database)
  return database
}

/** Führt Übungs-SQL und Musterlösung in getrennten Datenbanken aus und prüft. */
function checkAnswer(answer: string, solution: string, compareTables?: string[]) {
  const mine = execute(freshDatabase(), answer, compareTables)
  const reference = execute(freshDatabase(), solution, compareTables)

  if (!mine.ok) return { kind: 'fehler' as const, message: mine.message }
  if (!reference.ok) throw new Error(`Musterlösung fehlerhaft: ${reference.message}`)

  if (statementKind(solution) === 'abfrage') {
    return {
      kind: 'vergleich' as const,
      ...compareResultSets(
        mine.results[mine.results.length - 1],
        reference.results[reference.results.length - 1],
        hasOrderBy(solution),
      ),
    }
  }

  return { kind: 'vergleich' as const, ...compareSnapshots(mine.snapshots, reference.snapshots) }
}

beforeAll(async () => {
  SQL = await initSqlJs()
}, 60_000)

afterEach(() => {
  while (open.length > 0) open.pop()?.close()
})

describe('Datenbank aufsetzen', () => {
  it('legt die Tabellen des Seed-Schemas an', () => {
    expect(listTables(freshDatabase())).toEqual(['abteilung', 'mitarbeiter'])
  })

  it('spielt die Seed-Daten ein', () => {
    const outcome = execute(freshDatabase(), 'SELECT COUNT(*) FROM mitarbeiter')
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.results[0]?.values[0]?.[0]).toBe(3)
  })

  it('gibt jeder Übung eine eigene Datenbank', () => {
    const a = freshDatabase()
    execute(a, "INSERT INTO abteilung VALUES (9, 'Test')")

    // Die zweite Datenbank darf davon nichts mitbekommen.
    const b = execute(freshDatabase(), 'SELECT COUNT(*) FROM abteilung')
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(b.results[0]?.values[0]?.[0]).toBe(2)
  })
})

describe('SELECT prüfen', () => {
  const solution = "SELECT name, gehalt FROM mitarbeiter WHERE abteilung_id = 1"

  it('akzeptiert die identische Lösung', () => {
    expect(checkAnswer(solution, solution)).toMatchObject({ equal: true })
  })

  it('akzeptiert vertauschte Spalten und Aliase', () => {
    const answer = 'SELECT gehalt AS verdienst, name AS wer FROM mitarbeiter WHERE abteilung_id = 1'
    expect(checkAnswer(answer, solution)).toMatchObject({ equal: true })
  })

  it('akzeptiert einen anderen Weg zum gleichen Ergebnis', () => {
    const answer = `SELECT m.name, m.gehalt FROM mitarbeiter m
                    JOIN abteilung a ON a.id = m.abteilung_id WHERE a.name = 'IT'`
    expect(checkAnswer(answer, solution)).toMatchObject({ equal: true })
  })

  it('lehnt ein falsches WHERE ab', () => {
    const answer = 'SELECT name, gehalt FROM mitarbeiter WHERE abteilung_id = 2'
    expect(checkAnswer(answer, solution)).toMatchObject({ equal: false })
  })

  it('lehnt zu viele Spalten ab', () => {
    const answer = 'SELECT * FROM mitarbeiter WHERE abteilung_id = 1'
    const check = checkAnswer(answer, solution)
    expect(check).toMatchObject({ equal: false })
    expect((check as { reason?: string }).reason).toContain('Spalte')
  })
})

describe('ORDER BY', () => {
  const sorted = 'SELECT name FROM mitarbeiter ORDER BY gehalt DESC'

  it('verlangt die richtige Reihenfolge, wenn die Musterlösung sortiert', () => {
    const wrongOrder = 'SELECT name FROM mitarbeiter ORDER BY gehalt ASC'
    const check = checkAnswer(wrongOrder, sorted)
    expect(check).toMatchObject({ equal: false })
    expect((check as { reason?: string }).reason).toContain('Reihenfolge')
  })

  it('akzeptiert die richtige Sortierung', () => {
    expect(checkAnswer(sorted, sorted)).toMatchObject({ equal: true })
  })

  it('ignoriert die Reihenfolge, wenn die Musterlösung nicht sortiert', () => {
    const unsorted = 'SELECT name FROM mitarbeiter'
    const answer = 'SELECT name FROM mitarbeiter ORDER BY name DESC'
    expect(checkAnswer(answer, unsorted)).toMatchObject({ equal: true })
  })
})

describe('INSERT, UPDATE und DELETE über den Tabellenzustand', () => {
  it('akzeptiert ein gleichwertiges INSERT', () => {
    const solution = "INSERT INTO abteilung (id, name) VALUES (3, 'Einkauf')"
    const answer = "INSERT INTO abteilung VALUES (3, 'Einkauf')"
    expect(checkAnswer(answer, solution, ['abteilung'])).toMatchObject({ equal: true })
  })

  it('lehnt ein INSERT mit falschem Wert ab', () => {
    const solution = "INSERT INTO abteilung VALUES (3, 'Einkauf')"
    const answer = "INSERT INTO abteilung VALUES (3, 'Enkauf')"
    expect(checkAnswer(answer, solution, ['abteilung'])).toMatchObject({ equal: false })
  })

  it('prüft ein UPDATE unabhängig vom Weg', () => {
    const solution = 'UPDATE mitarbeiter SET gehalt = gehalt + 100 WHERE abteilung_id = 1'
    const answer = 'UPDATE mitarbeiter SET gehalt = gehalt + 100 WHERE id IN (1, 3)'
    expect(checkAnswer(answer, solution, ['mitarbeiter'])).toMatchObject({ equal: true })
  })

  it('erkennt ein zu weit gefasstes DELETE', () => {
    const solution = 'DELETE FROM mitarbeiter WHERE gehalt < 4000'
    const answer = 'DELETE FROM mitarbeiter'
    const check = checkAnswer(answer, solution, ['mitarbeiter'])
    expect(check).toMatchObject({ equal: false })
    expect((check as { reason?: string }).reason).toContain('mitarbeiter')
  })

  it('meldet rowsModified', () => {
    const outcome = execute(freshDatabase(), 'UPDATE mitarbeiter SET gehalt = 1')
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.rowsModified).toBe(3)
  })
})

describe('Fehler von SQLite', () => {
  it('übersetzt eine unbekannte Tabelle', () => {
    const outcome = execute(freshDatabase(), 'SELECT * FROM kunden')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.message).toContain('kunden')
    expect(outcome.raw).toContain('no such table')
  })

  it('übersetzt eine unbekannte Spalte', () => {
    const outcome = execute(freshDatabase(), 'SELECT lohn FROM mitarbeiter')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.message).toContain('lohn')
  })

  it('übersetzt einen Syntaxfehler', () => {
    const outcome = execute(freshDatabase(), 'SELEKT * FROM mitarbeiter')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.message).toContain('Syntaxfehler')
  })

  it('meldet eine verletzte UNIQUE-Bedingung', () => {
    const outcome = execute(freshDatabase(), "INSERT INTO abteilung VALUES (1, 'Doppelt')")
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.message).toContain('vergeben')
  })

  it('lässt die Datenbank nach einem Fehler weiter benutzbar', () => {
    const database = freshDatabase()
    execute(database, 'SELECT * FROM gibtesnicht')

    const outcome = execute(database, 'SELECT COUNT(*) FROM mitarbeiter')
    expect(outcome.ok).toBe(true)
  })
})

describe('snapshotTables', () => {
  it('erfasst ohne Angabe alle Tabellen', () => {
    const snapshots = snapshotTables(freshDatabase())
    expect(snapshots.map((snapshot) => snapshot.table)).toEqual(['abteilung', 'mitarbeiter'])
  })

  it('beschränkt sich auf die genannten Tabellen', () => {
    const snapshots = snapshotTables(freshDatabase(), ['abteilung'])
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.rows).toHaveLength(2)
  })

  it('kommt mit einer leeren Tabelle zurecht', () => {
    const database = freshDatabase()
    execute(database, 'DELETE FROM mitarbeiter')
    const snapshots = snapshotTables(database, ['mitarbeiter'])
    expect(snapshots[0]?.rows).toEqual([])
  })
})
