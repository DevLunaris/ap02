import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { run as runPseudocode } from '@/lib/pseudocode'
import { compareResultSets, execute, hasOrderBy, statementKind } from '@/lib/sql'

import {
  EXERCISE_KINDS,
  extractExercisesFromMdx,
  getAllExercises,
  readMdxFile,
} from './exercises'
import { getSchema } from './schemas'

/**
 * Prüft die Übungen in den Inhaltsdateien selbst.
 *
 * Eine SQL-Übung mit fehlerhaftem Schema oder eine Pseudocode-Übung mit falscher
 * erwarteter Ausgabe fällt sonst erst auf, wenn jemand davorsitzt und lernt -
 * also genau im ungünstigsten Moment.
 *
 * Die Extraktion kommt aus demselben Modul wie /uebung. Damit prüft der Test
 * wirklich das, was auf der Seite landet.
 */

/** Template-Literal oder Zeichenkette aus dem MDX-Quelltext eines Attributs holen. */
function attributeValue(source: string, name: string): string | undefined {
  // Template-Literal: name={`...`}
  const template = new RegExp(`${name}=\\{\`([\\s\\S]*?)\`\\}`).exec(source)
  if (template?.[1] !== undefined) return template[1]

  // Einfache Zeichenkette: name="..."
  const plain = new RegExp(`${name}="([^"]*)"`).exec(source)
  return plain?.[1]
}

/** `['1', '4', '9']` aus dem Quelltext in ein echtes Array verwandeln. */
function stringArray(source: string, name: string): string[] | undefined {
  const raw = new RegExp(`${name}=\\{\\[([\\s\\S]*?)\\]\\}`).exec(source)
  if (!raw?.[1]) return undefined

  const matches = [...raw[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  return matches.map((match) => (match[1] ?? match[2] ?? '').replace(/\\(.)/g, '$1'))
}

const topicExercises = getAllExercises()
// Der Styleguide gehört nicht zu den Themen, seine Aufgaben sollen aber genauso laufen.
const showcaseExercises = extractExercisesFromMdx(readMdxFile('content/showcase.mdx')).map(
  (exercise, index) => ({ ...exercise, id: `showcase#${index}`, topicTitle: 'Styleguide' }),
)

const all = [
  ...topicExercises.map((exercise) => ({
    id: exercise.id,
    label: `${exercise.topicTitle}: ${exercise.title ?? exercise.kind}`,
    kind: exercise.kind,
    source: exercise.source,
  })),
  ...showcaseExercises.map((exercise) => ({
    id: exercise.id,
    label: `Styleguide: ${exercise.title ?? exercise.kind}`,
    kind: exercise.kind,
    source: exercise.source,
  })),
]

const sqlExercises = all.filter((exercise) => exercise.kind === 'SqlExercise')
const tracerExercises = all.filter((exercise) => exercise.kind === 'PseudocodeTracer')

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
}, 60_000)

describe('Extraktion', () => {
  it('findet Übungen in den Inhalten', () => {
    // Schlägt fehl, wenn die Extraktion durch eine MDX-Änderung stillschweigend bricht.
    expect(all.length).toBeGreaterThan(0)
    expect(sqlExercises.length).toBeGreaterThan(0)
    expect(tracerExercises.length).toBeGreaterThan(0)
  })

  it('erkennt nur bekannte Übungstypen', () => {
    for (const exercise of all) {
      expect(EXERCISE_KINDS).toContain(exercise.kind)
    }
  })

  it('vergibt eindeutige Kennungen', () => {
    const ids = all.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('schneidet vollständige Komponenten heraus', () => {
    for (const exercise of all) {
      expect(exercise.source.startsWith(`<${exercise.kind}`), exercise.label).toBe(true)
      expect(exercise.source.trimEnd().endsWith('>'), exercise.label).toBe(true)
    }
  })
})

describe('SQL-Übungen aus den Inhalten', () => {
  it.each(sqlExercises.map((exercise) => [exercise.label, exercise] as const))(
    '%s',
    (_label, exercise) => {
      // Übungen dürfen ein eigenes Schema mitbringen oder ein geteiltes referenzieren.
      const schemaId = attributeValue(exercise.source, 'schemaId')
      const schema = schemaId ? getSchema(schemaId) : attributeValue(exercise.source, 'schema')
      const solution = attributeValue(exercise.source, 'solution')

      expect(schema, 'weder schema noch schemaId gesetzt').toBeTruthy()
      expect(solution, 'solution fehlt').toBeTruthy()
      if (!schema || !solution) return

      // 1. Das Seed-Schema muss fehlerfrei durchlaufen.
      const database = new SQL.Database()
      try {
        database.run(schema)
      } catch (error) {
        database.close()
        throw new Error(`Seed-Schema fehlerhaft: ${(error as Error).message}`)
      }

      // 2. Die Musterlösung muss fehlerfrei durchlaufen.
      const outcome = execute(database, solution)
      if (!outcome.ok) {
        database.close()
        throw new Error(`Musterlösung fehlerhaft: ${outcome.message}`)
      }

      // 3. Eine SELECT-Musterlösung muss auch etwas liefern - eine Aufgabe, deren
      //    Lösung leer ist, taugt nichts als Übung.
      if (statementKind(solution) === 'abfrage') {
        const last = outcome.results[outcome.results.length - 1]
        expect(last, 'Musterlösung liefert kein Result-Set').toBeDefined()
        expect(last?.values.length, 'Musterlösung liefert 0 Zeilen').toBeGreaterThan(0)
        expect(compareResultSets(last, last, hasOrderBy(solution)).equal).toBe(true)
      }

      // 4. Ein vorgegebener Startpunkt darf fehlerhaft sein (didaktisch gewollt),
      //    aber er darf die Datenbank nicht zerstören.
      const starter = attributeValue(exercise.source, 'starter')
      if (starter && starter.trim() !== '') {
        execute(database, starter)
        expect(execute(database, 'SELECT 1').ok, 'Startpunkt zerstört die Datenbank').toBe(true)
      }

      database.close()
    },
  )
})

describe('Pseudocode-Übungen aus den Inhalten', () => {
  it.each(tracerExercises.map((exercise) => [exercise.label, exercise] as const))(
    '%s',
    (_label, exercise) => {
      const code = attributeValue(exercise.source, 'code')
      expect(code, 'code fehlt').toBeTruthy()
      if (!code) return

      const result = runPseudocode(code)
      if (!result.ok) {
        throw new Error(`Pseudocode läuft nicht durch: ${result.error.message}`)
      }

      // Ist eine erwartete Ausgabe hinterlegt, muss sie exakt stimmen - sonst
      // bekommt die lernende Person für eine richtige Antwort "falsch" gesagt.
      const expectedOutput = stringArray(exercise.source, 'expectedOutput')
      if (expectedOutput) {
        expect(result.output).toEqual(expectedOutput)
      }
    },
  )
})
