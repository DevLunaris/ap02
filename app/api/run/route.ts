import { NextResponse } from 'next/server'

import { createCodeRunner, isRunnerLanguage, type RunResult } from '@/lib/runner'

/**
 * Proxy zwischen Browser und Code-Runner.
 *
 * Der Browser ruft absichtlich nicht direkt Piston auf: So bleibt CODE_RUNNER_URL
 * (eine interne Homelab-Adresse) serverseitig, und Timeout sowie Ausgabegrenze
 * werden hier erzwungen statt im vertrauensunwürdigen Client.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SOURCE_BYTES = 100 * 1024
const MAX_STDIN_BYTES = 16 * 1024

export async function POST(request: Request): Promise<NextResponse<RunResult>> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'runner-error', message: 'Ungültiger JSON-Body.' },
      { status: 400 },
    )
  }

  const { lang, source, stdin } = (payload ?? {}) as {
    lang?: unknown
    source?: unknown
    stdin?: unknown
  }

  if (typeof lang !== 'string' || !isRunnerLanguage(lang)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unsupported-language',
        message: `Unbekannte Sprache: ${String(lang)}`,
      },
      { status: 400 },
    )
  }

  if (typeof source !== 'string' || source.trim().length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'runner-error', message: 'Kein Quelltext übermittelt.' },
      { status: 400 },
    )
  }

  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    return NextResponse.json(
      { ok: false, reason: 'runner-error', message: 'Quelltext ist zu groß (max. 100 KB).' },
      { status: 413 },
    )
  }

  const input = typeof stdin === 'string' ? stdin : ''
  if (Buffer.byteLength(input, 'utf8') > MAX_STDIN_BYTES) {
    return NextResponse.json(
      { ok: false, reason: 'runner-error', message: 'stdin ist zu groß (max. 16 KB).' },
      { status: 413 },
    )
  }

  const result = await createCodeRunner().run(lang, source, input)

  // Auch Fehlschläge kommen mit HTTP 200 zurück: Es ist ein fachliches Ergebnis,
  // das die UI darstellen soll, kein Transportfehler.
  return NextResponse.json(result)
}
