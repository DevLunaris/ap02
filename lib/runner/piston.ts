import {
  clampOutput,
  RUN_TIMEOUT_MS,
  type CodeRunner,
  type RunnerLanguage,
  type RunResult,
} from './types'

/**
 * CodeRunner gegen eine selbst gehostete Piston-Instanz.
 * API-Referenz: POST {base}/api/v2/execute
 */

/** Dateiname und Piston-Sprachkennung je unterstützter Sprache. */
const LANGUAGE_CONFIG: Record<RunnerLanguage, { pistonLanguage: string; fileName: string }> = {
  csharp: { pistonLanguage: 'csharp', fileName: 'Program.cs' },
}

interface PistonStage {
  stdout?: string
  stderr?: string
  code?: number | null
  signal?: string | null
}

interface PistonResponse {
  run?: PistonStage
  compile?: PistonStage
  message?: string
}

export class PistonRunner implements CodeRunner {
  constructor(private readonly baseUrl: string) {}

  async run(lang: RunnerLanguage, source: string, stdin = ''): Promise<RunResult> {
    const config = LANGUAGE_CONFIG[lang]
    if (!config) {
      return {
        ok: false,
        reason: 'unsupported-language',
        message: `Sprache "${lang}" ist nicht konfiguriert.`,
      }
    }

    // Eigener Abbruch zusätzlich zum run_timeout von Piston: schützt auch dann,
    // wenn Piston selbst hängt statt die Ausführung zu beenden.
    const abort = AbortSignal.timeout(RUN_TIMEOUT_MS + 5_000)
    const startedAt = Date.now()

    let response: Response
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v2/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort,
        body: JSON.stringify({
          language: config.pistonLanguage,
          version: '*',
          files: [{ name: config.fileName, content: source }],
          stdin,
          run_timeout: RUN_TIMEOUT_MS,
          compile_timeout: RUN_TIMEOUT_MS,
        }),
      })
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      return {
        ok: false,
        reason: isTimeout ? 'timeout' : 'runner-unreachable',
        message: isTimeout
          ? `Der Code-Runner hat nicht innerhalb von ${RUN_TIMEOUT_MS / 1000} s geantwortet.`
          : `Piston unter ${this.baseUrl} nicht erreichbar: ${(error as Error).message}`,
      }
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return {
        ok: false,
        reason: 'runner-error',
        message: `Piston antwortete mit HTTP ${response.status}. ${detail.slice(0, 500)}`.trim(),
      }
    }

    const payload = (await response.json()) as PistonResponse

    if (payload.message && !payload.run) {
      return { ok: false, reason: 'runner-error', message: payload.message }
    }

    // Ein Compile-Fehler ist kein Runner-Fehler, sondern ein normales Ergebnis:
    // Der Lernende soll die Fehlermeldung des Compilers sehen.
    const compile = payload.compile
    const run = payload.run

    if (compile && typeof compile.code === 'number' && compile.code !== 0) {
      const stderr = clampOutput(compile.stderr ?? 'Kompilierung fehlgeschlagen.')
      return {
        ok: true,
        stdout: clampOutput(compile.stdout ?? '').text,
        stderr: stderr.text,
        exitCode: compile.code,
        truncated: stderr.truncated,
        durationMs: Date.now() - startedAt,
      }
    }

    if (!run) {
      return {
        ok: false,
        reason: 'runner-error',
        message: 'Piston lieferte kein run-Ergebnis zurück.',
      }
    }

    // Piston beendet Zeitüberschreitungen per SIGKILL.
    if (run.signal === 'SIGKILL') {
      return {
        ok: false,
        reason: 'timeout',
        message: `Zeitlimit von ${RUN_TIMEOUT_MS / 1000} s überschritten - vermutlich eine Endlosschleife.`,
      }
    }

    const stdout = clampOutput(run.stdout ?? '')
    const stderr = clampOutput(run.stderr ?? '')

    return {
      ok: true,
      stdout: stdout.text,
      stderr: stderr.text,
      exitCode: run.code ?? 0,
      truncated: stdout.truncated || stderr.truncated,
      durationMs: Date.now() - startedAt,
    }
  }
}
