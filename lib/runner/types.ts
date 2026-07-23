/**
 * Austauschbare Code-Ausführung.
 *
 * Alles, was Code ausführt, geht durch dieses Interface - nie direkt gegen Piston.
 * Dadurch lässt sich der Executor später ersetzen (anderer Dienst, lokaler Container,
 * WASM), ohne dass eine einzige UI-Komponente angefasst werden muss.
 */

export const SUPPORTED_LANGUAGES = ['csharp'] as const
export type RunnerLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isRunnerLanguage(value: string): value is RunnerLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export type RunResult =
  | {
      ok: true
      stdout: string
      stderr: string
      exitCode: number
      /** true, wenn die Ausgabe wegen OUTPUT_LIMIT_BYTES gekürzt wurde. */
      truncated: boolean
      /** Laufzeit in Millisekunden, sofern der Executor sie liefert. */
      durationMs?: number
    }
  | {
      ok: false
      reason: RunFailureReason
      message: string
    }

export type RunFailureReason =
  | 'no-runner-configured'
  | 'timeout'
  | 'runner-unreachable'
  | 'runner-error'
  | 'unsupported-language'

export interface CodeRunner {
  run(lang: RunnerLanguage, source: string, stdin?: string): Promise<RunResult>
}

/** Harte Grenzen, serverseitig durchgesetzt. */
export const RUN_TIMEOUT_MS = 10_000
export const OUTPUT_LIMIT_BYTES = 50 * 1024

/** Kürzt Ausgaben auf OUTPUT_LIMIT_BYTES und meldet, ob gekürzt wurde. */
export function clampOutput(text: string): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, 'utf8') <= OUTPUT_LIMIT_BYTES) {
    return { text, truncated: false }
  }

  const clipped = Buffer.from(text, 'utf8').subarray(0, OUTPUT_LIMIT_BYTES).toString('utf8')
  return {
    text: `${clipped}\n\n[… Ausgabe bei ${OUTPUT_LIMIT_BYTES / 1024} KB abgeschnitten]`,
    truncated: true,
  }
}

/** Für die UI: Klartext-Meldung zu einem Fehlschlag. */
export const FAILURE_MESSAGES: Record<RunFailureReason, string> = {
  'no-runner-configured':
    'Kein Code-Runner konfiguriert. Setze CODE_RUNNER_URL (z. B. http://piston:2000) und starte neu.',
  timeout: `Zeitlimit von ${RUN_TIMEOUT_MS / 1000} Sekunden überschritten - vermutlich eine Endlosschleife.`,
  'runner-unreachable': 'Der Code-Runner ist nicht erreichbar. Läuft der Piston-Container?',
  'runner-error': 'Der Code-Runner hat einen Fehler gemeldet.',
  'unsupported-language': 'Diese Sprache unterstützt der Code-Runner nicht.',
}
