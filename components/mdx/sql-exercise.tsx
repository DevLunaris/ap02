'use client'

import type { Database } from 'sql.js'
import { Database as DatabaseIcon, Lightbulb, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { CodeEditor } from '@/components/editor/code-editor'
import { ResultTable } from '@/components/sql/result-table'
import {
  compareResultSets,
  compareSnapshots,
  createDatabase,
  execute,
  hasOrderBy,
  runSolution,
  statementKind,
  type QueryResult,
  type SqlCheckResult,
  type SqlRunOutcome,
} from '@/lib/sql'
import { cn } from '@/lib/utils'

import { ExerciseButton, ExerciseShell } from './exercise-shell'

export interface SqlExerciseProps {
  /** CREATE TABLE + INSERT für die In-Memory-DB dieser Übung. */
  schema: string
  /** Musterlösung. Grundlage der automatischen Prüfung. */
  solution: string
  task: ReactNode
  title?: string
  /** Vorbelegung des Editors. */
  starter?: string
  /** Ein Tipp, auf Knopfdruck sichtbar. */
  hint?: ReactNode
  /**
   * Bei INSERT/UPDATE/DELETE: Tabellen, deren Zustand nach der Ausführung
   * verglichen wird. Ohne Angabe werden alle Tabellen verglichen.
   */
  compareTables?: string[]
}

export function SqlExercise({
  schema,
  solution,
  task,
  title = 'SQL-Übung',
  starter = '',
  hint,
  compareTables,
}: SqlExerciseProps) {
  const [sql, setSql] = useState(starter)
  const [outcome, setOutcome] = useState<SqlRunOutcome | null>(null)
  const [check, setCheck] = useState<SqlCheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [showSchema, setShowSchema] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  /** Die Lösung wird erst nach einem echten Ausführversuch freigeschaltet. */
  const [attempted, setAttempted] = useState(false)

  const database = useRef<Database | null>(null)

  // sql.js lädt lazy: erst wenn die Übung wirklich benutzt wird.
  const openDatabase = useCallback(async (): Promise<Database | null> => {
    if (database.current) return database.current
    try {
      database.current = await createDatabase(schema)
      return database.current
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? `Die Datenbank konnte nicht angelegt werden: ${error.message}`
          : 'Die Datenbank konnte nicht angelegt werden.',
      )
      return null
    }
  }, [schema])

  useEffect(() => {
    return () => {
      database.current?.close()
      database.current = null
    }
  }, [])

  const resetDatabase = useCallback(() => {
    database.current?.close()
    database.current = null
    setOutcome(null)
    setCheck(null)
  }, [])

  const onRun = useCallback(async () => {
    if (sql.trim() === '' || busy) return

    setBusy(true)
    setAttempted(true)
    setCheck(null)

    try {
      const db = await openDatabase()
      if (!db) return

      const result = execute(db, sql, compareTables)
      setOutcome(result)

      if (!result.ok) {
        setCheck({ status: 'fehler', message: result.message })
        return
      }

      // Musterlösung in einer eigenen Datenbank ausführen - sie darf die
      // Datenbank der lernenden Person nicht verändern.
      const reference = await runSolution(schema, solution, compareTables)
      if (!reference.ok) {
        setCheck({
          status: 'fehler',
          message: `Die hinterlegte Musterlösung läuft selbst nicht durch: ${reference.message}`,
        })
        return
      }

      // SELECT -> Result-Sets vergleichen. INSERT/UPDATE/DELETE -> Tabellenzustand.
      const kind = statementKind(solution)

      if (kind === 'abfrage') {
        const comparison = compareResultSets(
          lastResult(result.results),
          lastResult(reference.results),
          hasOrderBy(solution),
        )
        setCheck(
          comparison.equal
            ? { status: 'richtig', message: 'Richtig – dein Ergebnis stimmt mit der Musterlösung überein.' }
            : { status: 'falsch', message: comparison.reason ?? 'Das Ergebnis stimmt nicht.' },
        )
        return
      }

      const comparison = compareSnapshots(result.snapshots, reference.snapshots)
      setCheck(
        comparison.equal
          ? {
              status: 'richtig',
              message: `Richtig – der Tabellenzustand stimmt (${result.rowsModified} Zeile(n) geändert).`,
            }
          : { status: 'falsch', message: comparison.reason ?? 'Der Tabellenzustand stimmt nicht.' },
      )
    } finally {
      setBusy(false)
    }
  }, [sql, busy, openDatabase, compareTables, schema, solution])

  const displayed = outcome?.ok ? lastResult(outcome.results) : undefined

  return (
    <ExerciseShell
      title={title}
      kind="SQL"
      hint={<div className="font-medium">{task}</div>}
      footer={
        <span className="text-ink-muted">
          Ausführen mit <kbd className="rounded border border-line px-1 font-mono text-xs">Strg</kbd>
          {' + '}
          <kbd className="rounded border border-line px-1 font-mono text-xs">Enter</kbd>
          {compareTables && compareTables.length > 0 && (
            <> · geprüft wird der Zustand von <code className="font-mono text-xs">{compareTables.join(', ')}</code></>
          )}
        </span>
      }
    >
      <CodeEditor
        value={sql}
        onChange={setSql}
        language="sql"
        height="9rem"
        onRun={onRun}
        ariaLabel="SQL-Eingabe"
      />

      <div className="flex flex-wrap gap-2">
        <ExerciseButton variant="primary" onClick={onRun} disabled={busy || sql.trim() === ''}>
          <Play size={14} />
          {busy ? 'Läuft …' : 'Ausführen'}
        </ExerciseButton>

        <ExerciseButton onClick={() => setShowSchema((value) => !value)}>
          <DatabaseIcon size={14} />
          {showSchema ? 'Schema ausblenden' : 'Schema anzeigen'}
        </ExerciseButton>

        <ExerciseButton onClick={resetDatabase}>
          <RotateCcw size={14} />
          DB zurücksetzen
        </ExerciseButton>

        {hint && (
          <ExerciseButton onClick={() => setShowHint((value) => !value)}>
            <Lightbulb size={14} />
            Tipp
          </ExerciseButton>
        )}

        <ExerciseButton
          onClick={() => setShowSolution((value) => !value)}
          disabled={!attempted}
          title={attempted ? undefined : 'Erst einmal selbst ausführen'}
        >
          {showSolution ? 'Lösung ausblenden' : 'Lösung zeigen'}
        </ExerciseButton>
      </div>

      {!attempted && (
        <p className="text-xs text-ink-muted">
          Die Musterlösung wird freigeschaltet, sobald du einmal ausgeführt hast.
        </p>
      )}

      {showSchema && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Seed-Schema dieser Übung
          </p>
          <pre className="overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-[0.78rem] leading-relaxed">
            {schema.trim()}
          </pre>
        </div>
      )}

      {showHint && hint && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/[0.07] px-3 py-2 text-sm">
          <p className="mb-0.5 font-semibold text-sky-700 dark:text-sky-300">Tipp</p>
          <div className="[&>*+*]:mt-2">{hint}</div>
        </div>
      )}

      {loadError && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/[0.07] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {loadError}
        </p>
      )}

      {check && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            check.status === 'richtig' && 'bg-emerald-500/[0.1] text-emerald-800 dark:text-emerald-300',
            check.status === 'falsch' && 'bg-rose-500/[0.1] text-rose-800 dark:text-rose-300',
            check.status === 'fehler' && 'border border-rose-500/40 bg-rose-500/[0.07]',
          )}
        >
          {check.status === 'fehler' && (
            <p className="font-semibold text-rose-700 dark:text-rose-300">SQLite meldet einen Fehler</p>
          )}
          <p className={cn(check.status !== 'fehler' && 'font-semibold')}>{check.message}</p>
          {check.status === 'fehler' && outcome && !outcome.ok && outcome.raw !== check.message && (
            <p className="mt-1 font-mono text-xs text-ink-muted">{outcome.raw}</p>
          )}
        </div>
      )}

      {displayed && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Ergebnis</p>
          <ResultTable result={displayed} className="max-h-72" />
        </div>
      )}

      {outcome?.ok && outcome.results.length === 0 && (
        <p className="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          Kein Result-Set – die Anweisung hat {outcome.rowsModified} Zeile(n) geändert.
        </p>
      )}

      {showSolution && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <p className="mb-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">Musterlösung</p>
          <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[0.78rem] leading-relaxed">
            {solution.trim()}
          </pre>
        </div>
      )}
    </ExerciseShell>
  )
}

/**
 * Bei mehreren Anweisungen zählt das letzte Result-Set - das ist üblicherweise
 * das SELECT, um das es in der Aufgabe geht.
 */
function lastResult(results: QueryResult[]): QueryResult | undefined {
  return results[results.length - 1]
}
