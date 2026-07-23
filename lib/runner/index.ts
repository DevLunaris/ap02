import { PistonRunner } from './piston'
import {
  FAILURE_MESSAGES,
  type CodeRunner,
  type RunnerLanguage,
  type RunResult,
} from './types'

/**
 * Ohne konfigurierten Executor. Wirft nicht, sondern liefert ein sauberes
 * Fehlerergebnis - die UI zeigt daraufhin einen Hinweis statt zu crashen.
 */
class UnavailableRunner implements CodeRunner {
  async run(_lang: RunnerLanguage, _source: string, _stdin?: string): Promise<RunResult> {
    return {
      ok: false,
      reason: 'no-runner-configured',
      message: FAILURE_MESSAGES['no-runner-configured'],
    }
  }
}

/**
 * Baut den CodeRunner aus der Umgebung. Nur serverseitig aufrufen -
 * CODE_RUNNER_URL zeigt auf einen internen Host und gehört nicht in den Browser.
 */
export function createCodeRunner(): CodeRunner {
  const url = process.env.CODE_RUNNER_URL?.trim()
  return url ? new PistonRunner(url) : new UnavailableRunner()
}

/** Für die UI: Ist überhaupt ein Executor konfiguriert? */
export function isRunnerConfigured(): boolean {
  return Boolean(process.env.CODE_RUNNER_URL?.trim())
}

export * from './types'
export { PistonRunner }
