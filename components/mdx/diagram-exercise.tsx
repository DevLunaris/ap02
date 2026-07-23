'use client'

import dynamic from 'next/dynamic'
import { useState, type ReactNode } from 'react'

import { ExerciseButton, ExerciseShell } from './exercise-shell'

const MermaidRender = dynamic(
  () => import('./mermaid-render').then((module) => module.MermaidRender),
  { ssr: false, loading: () => <div className="min-h-40" /> },
)

/**
 * UML-/BPMN-Übung: links Mermaid tippen, rechts live das Ergebnis sehen.
 *
 * Bewusst ohne automatische Bewertung - ein Diagramm hat viele richtige
 * Darstellungen. Der Vergleich mit der Musterlösung passiert per Auge.
 */
export function DiagramExercise({
  task,
  starter = '',
  solution,
  title = 'Diagramm zeichnen',
}: {
  task: ReactNode
  /** Vorgabe im Editor, z. B. bereits die erste Zeile `flowchart TD`. */
  starter?: string
  solution: string
  title?: string
}) {
  const [code, setCode] = useState(starter)
  const [showSolution, setShowSolution] = useState(false)

  return (
    <ExerciseShell title={title} kind="Diagramm" hint={<div className="font-medium">{task}</div>}>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col">
          <label
            htmlFor="mermaid-input"
            className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            Mermaid-Code
          </label>
          <textarea
            id="mermaid-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="flowchart TD&#10;  A[Start] --> B[Ende]"
            className="h-full w-full resize-y rounded-lg border border-line bg-surface-sunken px-3 py-2 font-mono text-[0.8rem] leading-relaxed outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Vorschau
          </span>
          <div className="min-h-40 flex-1 rounded-lg border border-line bg-surface p-3">
            {code.trim() ? (
              <MermaidRender code={code} quietErrors />
            ) : (
              <p className="grid h-full min-h-32 place-items-center text-sm text-ink-muted">
                Tippe links Mermaid-Code.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ExerciseButton onClick={() => setShowSolution((value) => !value)}>
          {showSolution ? 'Musterlösung ausblenden' : 'Musterlösung anzeigen'}
        </ExerciseButton>
        <ExerciseButton onClick={() => setCode(starter)} disabled={code === starter}>
          Zurücksetzen
        </ExerciseButton>
      </div>

      {showSolution && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <p className="mb-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">Musterlösung</p>
          <MermaidRender code={solution.trim()} />
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
              Quelltext der Musterlösung
            </summary>
            <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-[0.75rem] leading-relaxed">
              {solution.trim()}
            </pre>
          </details>
        </div>
      )}
    </ExerciseShell>
  )
}
