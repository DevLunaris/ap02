import fs from 'node:fs'
import path from 'node:path'

import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { beforeAll, describe, expect, it } from 'vitest'

import { run as runPseudocode } from '@/lib/pseudocode'
import { compareResultSets, execute, hasOrderBy, statementKind } from '@/lib/sql'

/**
 * Prüft die Übungen in den Inhaltsdateien selbst.
 *
 * Eine SQL-Übung mit fehlerhaftem Schema oder eine Pseudocode-Übung mit falscher
 * erwarteter Ausgabe fällt sonst erst auf, wenn jemand davorsitzt und lernt -
 * also genau im ungünstigsten Moment. Deshalb laufen hier alle Aufgaben aus allen
 * MDX-Dateien wirklich durch.
 */

const CONTENT_DIRS = [
  path.join(process.cwd(), 'content'),
  path.join(process.cwd(), 'content', 'topics'),
]

interface ExtractedExercise {
  file: string
  component: string
  props: Record<string, string>
}

/** Liest die Attribute aller Übungs-Komponenten aus einer MDX-Datei. */
function extractExercises(file: string): ExtractedExercise[] {
  const source = fs.readFileSync(file, 'utf8')
  // Frontmatter entfernen - der Parser läuft hier ohne remark-frontmatter.
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')

  const tree = unified().use(remarkParse).use(remarkMdx).parse(body)
  const found: ExtractedExercise[] = []

  visit(tree, (node: unknown) => {
    const element = node as {
      type?: string
      name?: string
      attributes?: Array<{
        type?: string
        name?: string
        value?: string | { type?: string; value?: string }
      }>
    }

    if (element.type !== 'mdxJsxFlowElement' || !element.name) return
    if (!['SqlExercise', 'PseudocodeTracer'].includes(element.name)) return

    const props: Record<string, string> = {}
    for (const attribute of element.attributes ?? []) {
      if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) continue

      if (typeof attribute.value === 'string') {
        props[attribute.name] = attribute.value
      } else if (attribute.value?.value !== undefined) {
        // Ausdruck, z. B. ein Template-Literal oder ein Array.
        props[attribute.name] = attribute.value.value
      }
    }

    found.push({ file: path.basename(file), component: element.name, props })
  })

  return found
}

/** Wert eines Template-Literals aus dem MDX-Quelltext holen. */
function templateValue(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) return trimmed.slice(1, -1)
  return trimmed
}

/** `['1', '4', '9']` aus dem MDX-Quelltext in ein echtes Array verwandeln. */
function stringArrayValue(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined
  const matches = [...raw.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  if (matches.length === 0) return undefined
  return matches.map((match) => (match[1] ?? match[2] ?? '').replace(/\\(.)/g, '$1'))
}

const allExercises = CONTENT_DIRS.filter((directory) => fs.existsSync(directory)).flatMap((directory) =>
  fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.mdx'))
    .flatMap((name) => extractExercises(path.join(directory, name))),
)

const sqlExercises = allExercises.filter((exercise) => exercise.component === 'SqlExercise')
const tracerExercises = allExercises.filter((exercise) => exercise.component === 'PseudocodeTracer')

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
}, 60_000)

describe('Inhalte einlesen', () => {
  it('findet Übungen in den MDX-Dateien', () => {
    // Schlägt fehl, wenn die Extraktion durch eine MDX-Änderung stillschweigend bricht.
    expect(allExercises.length).toBeGreaterThan(0)
  })
})

describe.runIf(sqlExercises.length > 0)('SQL-Übungen aus den Inhalten', () => {
  it.each(sqlExercises.map((exercise) => [`${exercise.file}: ${exercise.props.title ?? 'ohne Titel'}`, exercise] as const))(
    '%s',
    (_name, exercise) => {
      const schema = templateValue(exercise.props.schema)
      const solution = templateValue(exercise.props.solution)

      expect(schema, 'schema fehlt').toBeTruthy()
      expect(solution, 'solution fehlt').toBeTruthy()
      if (!schema || !solution) return

      // 1. Das Seed-Schema muss fehlerfrei durchlaufen.
      const database = new SQL.Database()
      try {
        database.run(schema)
      } catch (error) {
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

        // 4. Sie muss sich selbst als richtig erkennen.
        expect(compareResultSets(last, last, hasOrderBy(solution)).equal).toBe(true)
      }

      // 5. Ein vorgegebener Startpunkt darf ruhig fehlerhaft sein (didaktisch
      //    gewollt), aber er darf die Datenbank nicht zerstören.
      const starter = templateValue(exercise.props.starter)
      if (starter && starter.trim() !== '') {
        execute(database, starter)
        expect(execute(database, 'SELECT 1').ok).toBe(true)
      }

      database.close()
    },
  )
})

describe.runIf(tracerExercises.length > 0)('Pseudocode-Übungen aus den Inhalten', () => {
  it.each(
    tracerExercises.map(
      (exercise) => [`${exercise.file}: ${exercise.props.title ?? 'ohne Titel'}`, exercise] as const,
    ),
  )('%s', (_name, exercise) => {
    const code = templateValue(exercise.props.code)
    expect(code, 'code fehlt').toBeTruthy()
    if (!code) return

    const result = runPseudocode(code)

    if (!result.ok) {
      throw new Error(`Pseudocode läuft nicht durch: ${result.error.message}`)
    }

    // Ist eine erwartete Ausgabe hinterlegt, muss sie exakt stimmen - sonst
    // bekommt die lernende Person für eine richtige Antwort "falsch" gesagt.
    const expectedOutput = stringArrayValue(exercise.props.expectedOutput)
    if (expectedOutput) {
      expect(result.output).toEqual(expectedOutput)
    }
  })
})
