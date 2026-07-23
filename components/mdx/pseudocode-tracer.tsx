'use client'

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { CodeEditor } from '@/components/editor/code-editor'
import { PSEUDOCODE_LANGUAGE_ID } from '@/components/editor/pseudocode-language'
import { CodeView } from '@/components/pseudocode/code-view'
import { TraceTable } from '@/components/pseudocode/trace-table'
import { compareOutput, run, type OutputComparison, type PseudoValue } from '@/lib/pseudocode'
import { cn } from '@/lib/utils'

import { ExerciseButton, ExerciseShell } from './exercise-shell'

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
  /** Startzustand, z. B. um einen Funktionsrumpf mit festen Parametern zu tracen. */
  initialVariables?: Record<string, PseudoValue>
  /** Eigenen Code eintippen erlauben. Standard: ja. */
  editable?: boolean
}

const PLAY_INTERVAL_MS = 550

export function PseudocodeTracer({
  code: initialCode,
  title = 'Schreibtischtest',
  task,
  expectedOutput,
  variables,
  initialVariables,
  editable = true,
}: PseudocodeTracerProps) {
  const [code, setCode] = useState(initialCode.trim())
  const [editing, setEditing] = useState(false)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const isExercise = Boolean(expectedOutput && expectedOutput.length > 0)
  const [answer, setAnswer] = useState('')
  const [check, setCheck] = useState<OutputComparison | null>(null)

  // Die gesamte Spur wird einmal berechnet; Navigation ist danach reine
  // Index-Arithmetik. Siehe lib/pseudocode/interpreter.ts.
  const result = useMemo(() => run(code, { initialVariables }), [code, initialVariables])

  const steps = result.steps
  const lastStep = Math.max(0, steps.length - 1)

  // Spaltenreihenfolge: Vorgabe aus dem MDX gewinnt, Rest hinten anhängen.
  const columns = useMemo(() => {
    if (!variables || variables.length === 0) return result.columns
    const rest = result.columns.filter((name) => !variables.includes(name))
    return [...variables.filter((name) => result.columns.includes(name)), ...rest]
  }, [variables, result.columns])

  const resetTrace = useCallback(() => {
    setStep(0)
    setPlaying(false)
  }, [])

  // Neuer Code -> Spur zurücksetzen, alte Prüfung verwerfen.
  useEffect(() => {
    resetTrace()
    setCheck(null)
  }, [code, resetTrace])

  // Auto-Play
  const playingRef = useRef(playing)
  playingRef.current = playing

  useEffect(() => {
    if (!playing) return

    const timer = setInterval(() => {
      setStep((current) => {
        if (current >= lastStep) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, PLAY_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [playing, lastStep])

  const currentStep = steps[Math.min(step, lastStep)]
  const errorLine = !result.ok ? result.error.line : undefined

  const onCheck = () => {
    const comparison = compareOutput(answer, result.output, steps)
    setCheck(comparison)
    setPlaying(false)
    // Bei Abweichung direkt zum verursachenden Schritt springen - das ist der
    // eigentliche Lerneffekt: sehen, wo der eigene Gedanke abgebogen ist.
    if (!comparison.correct && comparison.mismatchStep !== undefined) {
      setStep(comparison.mismatchStep)
    }
  }

  return (
    <ExerciseShell
      title={title}
      kind="Pseudocode"
      hint={task ? <div className="font-medium">{task}</div> : undefined}
    >
      {/* ------------------------------------------------ Code + Wertetabelle */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-h-[16rem] flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Pseudocode
            </span>
            {editable && (
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <Pencil size={11} />
                {editing ? 'Fertig' : 'Bearbeiten'}
              </button>
            )}
          </div>

          {editing ? (
            // Zum Bearbeiten Monaco mit der eigenen IHK-Dialekt-Grammatik.
            // Beim Abspielen dagegen die schlanke Nur-Lese-Ansicht: Sie zeigt die
            // aktive Zeile ohne Editor-Overhead und ohne Scroll-Konflikte.
            <CodeEditor
              value={code}
              onChange={setCode}
              language={PSEUDOCODE_LANGUAGE_ID}
              height="100%"
              ariaLabel="Pseudocode bearbeiten"
              onRun={() => setEditing(false)}
            />
          ) : (
            <CodeView code={code} activeLine={currentStep?.line} errorLine={errorLine} />
          )}
        </div>

        <TraceTable
          steps={steps}
          columns={columns}
          output={result.output}
          currentStep={Math.min(step, lastStep)}
          highlightStep={check && !check.correct ? check.mismatchStep : undefined}
          onSelectStep={(index) => {
            setStep(index)
            setPlaying(false)
          }}
        />
      </div>

      {/* ------------------------------------------------------- Fehleranzeige */}
      {!result.ok && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/[0.07] px-3 py-2 text-sm">
          <p className="font-semibold text-rose-700 dark:text-rose-300">
            {result.error.phase === 'syntax'
              ? 'Syntaxfehler'
              : result.error.phase === 'limit'
                ? 'Abgebrochen'
                : 'Laufzeitfehler'}
            {result.error.line !== undefined && ` in Zeile ${result.error.line}`}
          </p>
          <p className="mt-0.5 leading-relaxed">{result.error.message}</p>
          {steps.length > 1 && (
            <p className="mt-1 text-xs text-ink-muted">
              Die Tabelle zeigt den Verlauf bis zu diesem Punkt.
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ Steuerung */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ExerciseButton
          onClick={() => {
            setStep((value) => Math.max(0, value - 1))
            setPlaying(false)
          }}
          disabled={step === 0}
          aria-label="Ein Schritt zurück"
        >
          <ChevronLeft size={14} />
          Zurück
        </ExerciseButton>

        <ExerciseButton
          variant="primary"
          onClick={() => {
            setStep((value) => Math.min(lastStep, value + 1))
            setPlaying(false)
          }}
          disabled={step >= lastStep}
          aria-label="Ein Schritt vor"
        >
          Schritt
          <ChevronRight size={14} />
        </ExerciseButton>

        <ExerciseButton
          onClick={() => setPlaying((value) => !value)}
          disabled={step >= lastStep && !playing}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? 'Pause' : 'Abspielen'}
        </ExerciseButton>

        <ExerciseButton
          onClick={() => {
            setStep(lastStep)
            setPlaying(false)
          }}
          disabled={step >= lastStep}
        >
          <SkipForward size={14} />
          Ans Ende
        </ExerciseButton>

        <ExerciseButton onClick={resetTrace} disabled={step === 0 && !playing}>
          <RotateCcw size={14} />
          Zurücksetzen
        </ExerciseButton>

        {code !== initialCode.trim() && (
          <ExerciseButton
            onClick={() => {
              setCode(initialCode.trim())
              setEditing(false)
            }}
          >
            Originalcode
          </ExerciseButton>
        )}
      </div>

      {/* ------------------------------------------------------ Fortschritt */}
      {steps.length > 1 && (
        <input
          type="range"
          min={0}
          max={lastStep}
          value={Math.min(step, lastStep)}
          onChange={(event) => {
            setStep(Number(event.target.value))
            setPlaying(false)
          }}
          aria-label="Schritt wählen"
          className="w-full accent-[var(--accent)]"
        />
      )}

      {/* ------------------------------------------------------- Übungsmodus */}
      {isExercise ? (
        <div className="rounded-lg border border-line bg-surface-sunken p-3">
          <label
            htmlFor="erwartete-ausgabe"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            Deine erwartete Ausgabe – eine Zahl je Zeile
          </label>
          <textarea
            id="erwartete-ausgabe"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={Math.min(6, Math.max(3, expectedOutput?.length ?? 3))}
            spellCheck={false}
            placeholder={'Erst selbst tracen,\ndann hier eintragen …'}
            className="w-full resize-y rounded-lg border border-line bg-surface p-2 font-mono text-[0.8rem] leading-6 outline-none focus:border-accent"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ExerciseButton variant="primary" onClick={onCheck} disabled={answer.trim() === ''}>
              Prüfen
            </ExerciseButton>
            {check && (
              <ExerciseButton
                onClick={() => {
                  setCheck(null)
                  setAnswer('')
                  resetTrace()
                }}
              >
                Nochmal
              </ExerciseButton>
            )}
          </div>

          {check && (
            <div
              className={cn(
                'mt-2 rounded-lg px-3 py-2 text-sm',
                check.correct
                  ? 'bg-emerald-500/[0.1] text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/[0.1] text-rose-800 dark:text-rose-300',
              )}
            >
              {check.correct ? (
                <p className="font-semibold">Richtig – deine Erwartung stimmt Zeile für Zeile.</p>
              ) : (
                <>
                  <p className="font-semibold">{check.hint}</p>
                  {check.mismatchStep !== undefined && (
                    <p className="mt-1 text-ink-muted">
                      Die Tabelle steht jetzt auf dem Schritt, der diese Zeile erzeugt hat – rot
                      markiert. Von dort aus rückwärts prüfen, wo dein Gedanke abgebogen ist.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        result.ok &&
        result.output.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Gesamte Ausgabe
            </p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-surface-sunken p-2.5 font-mono text-[0.8rem] leading-6">
              {result.output.join('\n')}
            </pre>
          </div>
        )
      )}
    </ExerciseShell>
  )
}
