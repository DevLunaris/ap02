import type { ReactNode } from 'react'

import { EnginePlaceholder, StaticCode } from './engine-placeholder'
import { ExerciseShell } from './exercise-shell'

export interface CSharpTestCase {
  stdin: string
  expectedStdout: string
  /** Kurzbeschreibung für die Testliste, z. B. "leeres Array". */
  label?: string
}

/**
 * Props-Vertrag der C#-Übung. Ausführung läuft über /api/run gegen den
 * konfigurierten CodeRunner - Umsetzung in Phase 3.
 */
export interface CSharpExerciseProps {
  /** Startcode im Editor. */
  starter: string
  task: ReactNode
  title?: string
  /** Testfälle für den Prüfmodus. */
  tests?: CSharpTestCase[]
  /**
   * Rahmenprogramm, das den eingegebenen Code umschließt. `{{CODE}}` wird durch
   * die Eingabe ersetzt. Damit lassen sich einzelne Methoden üben
   * (z. B. BubbleSort), ohne jedes Mal ein ganzes Programm zu schreiben.
   */
  hiddenTestHarness?: string
  solution?: string
}

export function CSharpExercise({
  starter,
  task,
  title = 'C#-Übung',
  tests,
  hiddenTestHarness,
  solution,
}: CSharpExerciseProps) {
  return (
    <ExerciseShell
      title={title}
      kind="C#"
      hint={<div className="font-medium">{task}</div>}
      footer={
        tests && tests.length > 0 ? (
          <p className="text-ink-muted">
            {tests.length === 1 ? '1 Testfall' : `${tests.length} Testfälle`} hinterlegt
            {hiddenTestHarness ? ' · läuft in einem Test-Harness' : ''}.
          </p>
        ) : undefined
      }
    >
      <EnginePlaceholder phase="Phase 3" what="Monaco-Editor und Ausführung über den CodeRunner">
        <StaticCode code={starter} label="Startcode" />
        {tests && tests.length > 0 && (
          <StaticCode
            label="Testfälle"
            code={tests
              .map((test, index) => {
                const name = test.label ?? `Test ${index + 1}`
                const input = test.stdin ? `stdin: ${JSON.stringify(test.stdin)}` : 'ohne stdin'
                return `${name} - ${input} -> ${JSON.stringify(test.expectedStdout)}`
              })
              .join('\n')}
          />
        )}
        {solution && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
              Musterlösung
            </summary>
            <StaticCode code={solution} />
          </details>
        )}
      </EnginePlaceholder>
    </ExerciseShell>
  )
}
