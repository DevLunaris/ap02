import type { ReactNode } from 'react'

import { EnginePlaceholder, StaticCode } from './engine-placeholder'
import { ExerciseShell } from './exercise-shell'

/**
 * Props-Vertrag des Pseudocode-Tracers. Der Interpreter dahinter entsteht in
 * Phase 2 - diese Signatur ändert sich dann nicht mehr.
 */
export interface PseudocodeTracerProps {
  /** Pseudocode im deutschen IHK-Dialekt. */
  code: string
  title?: string
  /** Aufgabenstellung; ohne sie läuft die Komponente im reinen Demo-Modus. */
  task?: ReactNode
  /**
   * Erwartete Programmausgabe, eine Zeile je Eintrag. Ist sie gesetzt, schaltet
   * der Tracer in den Übungsmodus: erst tippen, dann "Prüfen".
   */
  expectedOutput?: string[]
  /** Erzwingt Spaltenreihenfolge der Wertetabelle. Sonst nach Erstauftreten. */
  variables?: string[]
  /** Startzustand der Wertetabelle, z. B. für Funktionsparameter. */
  initialVariables?: Record<string, string | number>
}

export function PseudocodeTracer({
  code,
  title = 'Schreibtischtest',
  task,
  expectedOutput,
}: PseudocodeTracerProps) {
  return (
    <ExerciseShell
      title={title}
      kind="Pseudocode"
      hint={task ? <div className="font-medium">{task}</div> : undefined}
    >
      <EnginePlaceholder phase="Phase 2" what="Der schrittweise Tracer mit Wertetabelle">
        <StaticCode code={code} label="Pseudocode" />
        {expectedOutput && expectedOutput.length > 0 && (
          <StaticCode code={expectedOutput.join('\n')} label="Erwartete Ausgabe" />
        )}
      </EnginePlaceholder>
    </ExerciseShell>
  )
}
