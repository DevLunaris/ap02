import type { ReactNode } from 'react'

import { EnginePlaceholder, StaticCode } from './engine-placeholder'
import { ExerciseShell } from './exercise-shell'

/**
 * Props-Vertrag der SQL-Übung. Ausführung via sql.js (SQLite-WASM) folgt in Phase 3.
 */
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
   * verglichen wird - statt eines Result-Sets.
   */
  compareTables?: string[]
}

export function SqlExercise({
  schema,
  solution,
  task,
  title = 'SQL-Übung',
  starter,
  compareTables,
}: SqlExerciseProps) {
  return (
    <ExerciseShell
      title={title}
      kind="SQL"
      hint={<div className="font-medium">{task}</div>}
      footer={
        compareTables && compareTables.length > 0 ? (
          <p className="text-ink-muted">
            Geprüft wird der Tabellenzustand von{' '}
            <code className="font-mono text-xs">{compareTables.join(', ')}</code>.
          </p>
        ) : undefined
      }
    >
      <EnginePlaceholder phase="Phase 3" what="Monaco-Editor und Ausführung über sql.js">
        <StaticCode code={schema} label="Seed-Schema" />
        {starter && <StaticCode code={starter} label="Startpunkt" />}
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
            Musterlösung (in der fertigen Engine erst nach einem Ausführversuch sichtbar)
          </summary>
          <StaticCode code={solution} />
        </details>
      </EnginePlaceholder>
    </ExerciseShell>
  )
}
