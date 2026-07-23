'use client'

import { Check, Play, RotateCcw, TerminalSquare, X } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'

import { CodeEditor } from '@/components/editor/code-editor'
import { applyHarness, runCode, stdoutMatches } from '@/lib/runner/client'
import type { RunResult } from '@/lib/runner/types'
import { cn } from '@/lib/utils'

import { ExerciseButton, ExerciseShell } from './exercise-shell'

export interface CSharpTestCase {
  stdin: string
  expectedStdout: string
  /** Kurzbeschreibung für die Testliste, z. B. "leeres Array". */
  label?: string
}

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

interface TestOutcome {
  test: CSharpTestCase
  passed: boolean
  actual: string
  stderr: string
  failure?: string
}

export function CSharpExercise({
  starter,
  task,
  title = 'C#-Übung',
  tests,
  hiddenTestHarness,
  solution,
}: CSharpExerciseProps) {
  const [code, setCode] = useState(starter.trim())
  const [result, setResult] = useState<RunResult | null>(null)
  const [outcomes, setOutcomes] = useState<TestOutcome[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const hasTests = Boolean(tests && tests.length > 0)

  /** Einmal ausführen, ohne Prüfung - zum Ausprobieren. */
  const onRun = useCallback(async () => {
    if (busy || code.trim() === '') return
    setBusy(true)
    setOutcomes(null)
    setAttempted(true)

    try {
      setResult(await runCode('csharp', applyHarness(code, hiddenTestHarness)))
    } finally {
      setBusy(false)
    }
  }, [busy, code, hiddenTestHarness])

  /** Alle Testfälle nacheinander - Piston verträgt keine Parallelität gut. */
  const onCheck = useCallback(async () => {
    if (busy || !tests || code.trim() === '') return
    setBusy(true)
    setResult(null)
    setAttempted(true)

    const collected: TestOutcome[] = []
    const source = applyHarness(code, hiddenTestHarness)

    try {
      for (const test of tests) {
        const run = await runCode('csharp', source, test.stdin)

        if (!run.ok) {
          collected.push({
            test,
            passed: false,
            actual: '',
            stderr: '',
            failure: run.message,
          })
          // Ist der Runner nicht erreichbar, sind auch alle weiteren Läufe sinnlos.
          setOutcomes([...collected])
          return
        }

        collected.push({
          test,
          passed: run.exitCode === 0 && stdoutMatches(run.stdout, test.expectedStdout),
          actual: run.stdout,
          stderr: run.stderr,
          failure: run.exitCode !== 0 ? `Programm endete mit Exit-Code ${run.exitCode}.` : undefined,
        })
        setOutcomes([...collected])
      }
    } finally {
      setBusy(false)
    }
  }, [busy, tests, code, hiddenTestHarness])

  const passedCount = outcomes?.filter((outcome) => outcome.passed).length ?? 0
  const allPassed = outcomes !== null && outcomes.length === tests?.length && passedCount === outcomes.length

  return (
    <ExerciseShell
      title={title}
      kind="C#"
      hint={<div className="font-medium">{task}</div>}
      footer={
        <span className="text-ink-muted">
          Ausführen mit <kbd className="rounded border border-line px-1 font-mono text-xs">Strg</kbd>
          {' + '}
          <kbd className="rounded border border-line px-1 font-mono text-xs">Enter</kbd>
          {hiddenTestHarness && ' · dein Code läuft in einem vorgegebenen Rahmenprogramm'}
        </span>
      }
    >
      <CodeEditor
        value={code}
        onChange={setCode}
        language="csharp"
        height="16rem"
        onRun={hasTests ? onCheck : onRun}
        ariaLabel="C#-Eingabe"
      />

      <div className="flex flex-wrap gap-2">
        {hasTests && (
          <ExerciseButton variant="primary" onClick={onCheck} disabled={busy}>
            <Check size={14} />
            {busy ? 'Läuft …' : 'Testen'}
          </ExerciseButton>
        )}

        <ExerciseButton variant={hasTests ? 'secondary' : 'primary'} onClick={onRun} disabled={busy}>
          <Play size={14} />
          Ausführen
        </ExerciseButton>

        <ExerciseButton onClick={() => setCode(starter.trim())} disabled={code === starter.trim()}>
          <RotateCcw size={14} />
          Zurücksetzen
        </ExerciseButton>

        {solution && (
          <ExerciseButton
            onClick={() => setShowSolution((value) => !value)}
            disabled={!attempted}
            title={attempted ? undefined : 'Erst einmal selbst ausführen'}
          >
            {showSolution ? 'Lösung ausblenden' : 'Lösung zeigen'}
          </ExerciseButton>
        )}
      </div>

      {/* ------------------------------------------------------- Testergebnisse */}
      {outcomes && (
        <div className="space-y-1.5">
          <p
            className={cn(
              'text-sm font-semibold',
              allPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink',
            )}
          >
            {passedCount} von {tests?.length} Test(s) bestanden
            {allPassed && ' – alles richtig.'}
          </p>

          {outcomes.map((outcome, index) => (
            <div
              key={index}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                outcome.passed
                  ? 'border-emerald-500/40 bg-emerald-500/[0.07]'
                  : 'border-rose-500/40 bg-rose-500/[0.07]',
              )}
            >
              <p className="flex items-center gap-1.5 font-semibold">
                {outcome.passed ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <X size={14} className="text-rose-600" />
                )}
                {outcome.test.label ?? `Test ${index + 1}`}
              </p>

              {!outcome.passed && (
                <div className="mt-1.5 space-y-1 font-mono text-xs">
                  {outcome.failure && <p className="font-sans text-ink-muted">{outcome.failure}</p>}
                  {outcome.test.stdin && (
                    <p>
                      <span className="text-ink-muted">Eingabe: </span>
                      {JSON.stringify(outcome.test.stdin)}
                    </p>
                  )}
                  <p>
                    <span className="text-ink-muted">Erwartet: </span>
                    {JSON.stringify(outcome.test.expectedStdout)}
                  </p>
                  <p>
                    <span className="text-ink-muted">Bekommen: </span>
                    {JSON.stringify(outcome.actual)}
                  </p>
                  {outcome.stderr && (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded border border-line bg-surface p-2 text-[0.7rem]">
                      {outcome.stderr}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------- Ausgabe eines Laufs */}
      {result && <RunOutput result={result} />}

      {showSolution && solution && (
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

function RunOutput({ result }: { result: RunResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2.5 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
          <TerminalSquare size={14} />
          Ausführung nicht möglich
        </p>
        <p className="mt-0.5 leading-relaxed">{result.message}</p>
        {result.reason === 'no-runner-configured' && (
          <p className="mt-1.5 text-xs text-ink-muted">
            Alles andere auf dieser Seite funktioniert weiterhin – nur C# braucht den Runner.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
        <span
          className={cn(
            'font-semibold',
            result.exitCode === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
          )}
        >
          Exit-Code {result.exitCode}
        </span>
        {result.durationMs !== undefined && <span>{result.durationMs} ms</span>}
        {result.truncated && <span className="text-amber-700 dark:text-amber-400">Ausgabe gekürzt</span>}
      </div>

      {result.stdout && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Ausgabe</p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-sunken p-3 font-mono text-[0.78rem] leading-relaxed">
            {result.stdout}
          </pre>
        </div>
      )}

      {result.stderr && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
            Fehlerausgabe
          </p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-500/40 bg-rose-500/[0.07] p-3 font-mono text-[0.78rem] leading-relaxed">
            {result.stderr}
          </pre>
        </div>
      )}

      {!result.stdout && !result.stderr && (
        <p className="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          Das Programm lief durch, hat aber nichts ausgegeben.
        </p>
      )}
    </div>
  )
}
