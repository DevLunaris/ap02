import { afterEach, describe, expect, it, vi } from 'vitest'

import { PistonRunner } from './piston'
import { OUTPUT_LIMIT_BYTES } from './types'

/**
 * Testet die Piston-Anbindung gegen nachgebaute Antworten.
 *
 * Eine echte Piston-Instanz braucht Docker mit privileged-Rechten und ist in der
 * Testumgebung nicht verfügbar - die Antwortformate sind aber stabil dokumentiert,
 * und genau ihre Auswertung ist hier die fehleranfällige Stelle.
 */

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const runner = new PistonRunner('http://piston:2000')

describe('erfolgreiche Ausführung', () => {
  it('reicht stdout, stderr und Exit-Code durch', async () => {
    mockFetch({ run: { stdout: '7\n', stderr: '', code: 0 } })

    const result = await runner.run('csharp', 'class P {}', '3\n4\n')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.stdout).toBe('7\n')
    expect(result.exitCode).toBe(0)
    expect(result.truncated).toBe(false)
  })

  it('spricht den dokumentierten Endpunkt mit den erwarteten Feldern an', async () => {
    const fetchMock = mockFetch({ run: { stdout: '', stderr: '', code: 0 } })
    await runner.run('csharp', 'int a = 1;', 'eingabe')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://piston:2000/api/v2/execute')

    const body = JSON.parse(String(options.body))
    expect(body.language).toBe('csharp')
    expect(body.files[0].name).toBe('Program.cs')
    expect(body.files[0].content).toBe('int a = 1;')
    expect(body.stdin).toBe('eingabe')
    expect(body.run_timeout).toBe(10_000)
  })

  it('entfernt einen abschließenden Slash in der Basis-URL', async () => {
    const fetchMock = mockFetch({ run: { stdout: '', stderr: '', code: 0 } })
    await new PistonRunner('http://piston:2000/').run('csharp', 'x')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://piston:2000/api/v2/execute')
  })

  it('kürzt zu große Ausgaben und meldet das', async () => {
    mockFetch({ run: { stdout: 'x'.repeat(OUTPUT_LIMIT_BYTES + 5_000), stderr: '', code: 0 } })

    const result = await runner.run('csharp', 'class P {}')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.truncated).toBe(true)
    expect(result.stdout).toContain('abgeschnitten')
    expect(Buffer.byteLength(result.stdout, 'utf8')).toBeLessThan(OUTPUT_LIMIT_BYTES + 200)
  })
})

describe('Compile-Fehler', () => {
  it('gilt als gültiges Ergebnis, nicht als Runner-Fehler', async () => {
    // Der Compilerfehler ist genau das, was die lernende Person sehen muss.
    mockFetch({
      compile: { stdout: '', stderr: "Program.cs(3,5): error CS1002: ; expected", code: 1 },
      run: { stdout: '', stderr: '', code: 0 },
    })

    const result = await runner.run('csharp', 'class P { int a }')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('CS1002')
  })

  it('behandelt erfolgreiche Kompilierung normal weiter', async () => {
    mockFetch({
      compile: { stdout: '', stderr: '', code: 0 },
      run: { stdout: 'fertig\n', stderr: '', code: 0 },
    })

    const result = await runner.run('csharp', 'class P {}')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.stdout).toBe('fertig\n')
  })
})

describe('Fehlerfälle', () => {
  it('erkennt eine Zeitüberschreitung am SIGKILL', async () => {
    mockFetch({ run: { stdout: '', stderr: '', code: null, signal: 'SIGKILL' } })

    const result = await runner.run('csharp', 'while(true){}')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('timeout')
    expect(result.message).toContain('Endlosschleife')
  })

  it('meldet einen nicht erreichbaren Runner', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const result = await runner.run('csharp', 'class P {}')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('runner-unreachable')
    expect(result.message).toContain('piston')
  })

  it('erkennt ein Timeout der Anfrage selbst', async () => {
    const timeout = new Error('timed out')
    timeout.name = 'TimeoutError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout))

    const result = await runner.run('csharp', 'class P {}')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('timeout')
  })

  it('meldet HTTP-Fehler von Piston', async () => {
    mockFetch({ message: 'runtime is unknown' }, { ok: false, status: 400 })

    const result = await runner.run('csharp', 'class P {}')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('runner-error')
    expect(result.message).toContain('400')
  })

  it('meldet eine Antwort ohne run-Ergebnis', async () => {
    mockFetch({ message: 'csharp is not installed' })

    const result = await runner.run('csharp', 'class P {}')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('not installed')
  })
})
