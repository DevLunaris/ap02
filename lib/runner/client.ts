import type { RunnerLanguage, RunResult } from './types'

/**
 * Clientseitiger Zugang zur Code-Ausführung.
 *
 * Ruft ausschließlich /api/run auf - nie direkt den Executor. Dadurch bleibt
 * CODE_RUNNER_URL serverseitig und Timeout sowie Ausgabegrenze werden dort
 * erzwungen, wo man ihnen trauen kann.
 */
export async function runCode(
  lang: RunnerLanguage,
  source: string,
  stdin = '',
): Promise<RunResult> {
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, source, stdin }),
    })

    return (await response.json()) as RunResult
  } catch (error) {
    return {
      ok: false,
      reason: 'runner-unreachable',
      message:
        error instanceof Error
          ? `Die Anfrage an /api/run ist fehlgeschlagen: ${error.message}`
          : 'Die Anfrage an /api/run ist fehlgeschlagen.',
    }
  }
}

/**
 * Platzhalter im hiddenTestHarness, an dessen Stelle der eingegebene Code
 * eingesetzt wird.
 */
export const CODE_PLACEHOLDER = '{{CODE}}'

/**
 * Setzt den Code in das Rahmenprogramm ein. Ohne Harness bleibt der Code, wie
 * er ist. Fehlt der Platzhalter im Harness, wird der Code angehängt - besser
 * als still das Falsche auszuführen.
 */
export function applyHarness(source: string, harness?: string): string {
  if (!harness) return source
  if (harness.includes(CODE_PLACEHOLDER)) return harness.split(CODE_PLACEHOLDER).join(source)
  return `${harness}\n${source}`
}

/**
 * Vergleicht Ausgaben zeilenweise.
 *
 * Toleriert Windows-Zeilenenden, Leerraum am Zeilenende und führende bzw.
 * abschließende Leerzeilen. Einrückung am Zeilenanfang bleibt dagegen
 * bedeutsam - sie kann Teil der Aufgabe sein, etwa bei Baum- oder
 * Tabellenausgaben.
 */
export function stdoutMatches(actual: string, expected: string): boolean {
  const normalize = (text: string) =>
    text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')

  return normalize(actual) === normalize(expected)
}
