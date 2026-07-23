import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetForTests,
  buildExport,
  getSnapshot,
  getTopicProgress,
  importProgress,
  markVisited,
  resetProgress,
  setTopicNotes,
  setTopicStatus,
  STORAGE_KEY,
  subscribe,
  summarize,
} from './store'

/** Minimaler localStorage-Ersatz - vitest läuft hier im Node-Environment. */
function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    get length() {
      return data.size
    },
    key: (index: number) => [...data.keys()][index] ?? null,
  }
  vi.stubGlobal('window', { localStorage: storage })
  return { data, storage }
}

beforeEach(() => {
  __resetForTests()
  vi.unstubAllGlobals()
})

describe('Laden', () => {
  it('startet leer, solange nicht abonniert wurde', () => {
    installStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, topics: { a: { status: 'sitzt' } } }) })

    // Vor dem Abonnieren muss der Snapshot dem Server-Snapshot entsprechen,
    // sonst gibt es beim Hydrieren einen Mismatch.
    expect(getSnapshot().topics).toEqual({})
  })

  it('liest den gespeicherten Zustand beim ersten Abonnieren', () => {
    installStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 1, topics: { pseudocode: { status: 'sitzt', notes: 'hi' } } }),
    })

    subscribe(() => {})

    expect(getTopicProgress('pseudocode').status).toBe('sitzt')
    expect(getTopicProgress('pseudocode').notes).toBe('hi')
  })

  it('verkraftet beschädigten Inhalt', () => {
    installStorage({ [STORAGE_KEY]: '{kein gültiges JSON' })
    subscribe(() => {})
    expect(getSnapshot().topics).toEqual({})
  })

  it('verwirft fremde Daten mit falschem Schema', () => {
    installStorage({ [STORAGE_KEY]: JSON.stringify({ irgendwas: true }) })
    subscribe(() => {})
    expect(getSnapshot().topics).toEqual({})
  })

  it('liefert für unbekannte Themen einen Standardwert statt undefined', () => {
    installStorage()
    subscribe(() => {})
    expect(getTopicProgress('gibtesnicht')).toEqual({ status: 'offen', notes: '' })
  })
})

describe('Schreiben', () => {
  beforeEach(() => {
    installStorage()
    subscribe(() => {})
  })

  it('speichert einen Status und schreibt ihn weg', () => {
    setTopicStatus('erm', 'gelesen')

    expect(getTopicProgress('erm').status).toBe('gelesen')
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toContain('gelesen')
  })

  it('behält Notizen beim Statuswechsel', () => {
    setTopicNotes('erm', 'Kardinalitäten wiederholen')
    setTopicStatus('erm', 'sitzt')

    expect(getTopicProgress('erm').notes).toBe('Kardinalitäten wiederholen')
    expect(getTopicProgress('erm').status).toBe('sitzt')
  })

  it('behält den Status beim Ändern der Notizen', () => {
    setTopicStatus('erm', 'sitzt')
    setTopicNotes('erm', 'Notiz')

    expect(getTopicProgress('erm').status).toBe('sitzt')
  })

  it('benachrichtigt Abonnenten', () => {
    const listener = vi.fn()
    subscribe(listener)

    setTopicStatus('erm', 'gelesen')
    expect(listener).toHaveBeenCalled()
  })

  it('merkt sich das zuletzt besuchte Thema', () => {
    markVisited('sql-select')
    expect(getSnapshot().lastTopic).toBe('sql-select')
  })

  it('schreibt nicht erneut, wenn dasselbe Thema erneut besucht wird', () => {
    markVisited('sql-select')
    const listener = vi.fn()
    subscribe(listener)

    markVisited('sql-select')
    expect(listener).not.toHaveBeenCalled()
  })

  it('setzt alles zurück', () => {
    setTopicStatus('erm', 'sitzt')
    resetProgress()
    expect(getSnapshot().topics).toEqual({})
  })
})

describe('Zusammenfassung', () => {
  beforeEach(() => {
    installStorage()
    subscribe(() => {})
  })

  it('zählt leeren Fortschritt als 0 %', () => {
    expect(summarize(['a', 'b'])).toMatchObject({ total: 2, offen: 2, percent: 0 })
  })

  it('wertet "gelesen" nur halb', () => {
    setTopicStatus('a', 'gelesen')
    setTopicStatus('b', 'gelesen')

    // 2 x 0,5 von 2 Themen = 50 %
    expect(summarize(['a', 'b']).percent).toBe(50)
  })

  it('wertet "sitzt" voll', () => {
    setTopicStatus('a', 'sitzt')
    setTopicStatus('b', 'sitzt')
    expect(summarize(['a', 'b']).percent).toBe(100)
  })

  it('mischt gelesen und sitzt korrekt', () => {
    setTopicStatus('a', 'sitzt')
    setTopicStatus('b', 'gelesen')

    // (1 + 0,5) / 2 = 75 %
    expect(summarize(['a', 'b'])).toMatchObject({ sitzt: 1, gelesen: 1, offen: 0, percent: 75 })
  })

  it('kommt mit einer leeren Liste zurecht', () => {
    expect(summarize([])).toMatchObject({ total: 0, percent: 0 })
  })

  it('ignoriert Fortschritt zu Themen außerhalb der Liste', () => {
    setTopicStatus('fremd', 'sitzt')
    expect(summarize(['a']).percent).toBe(0)
  })
})

describe('Export und Import', () => {
  beforeEach(() => {
    installStorage()
    subscribe(() => {})
  })

  it('exportiert ein wiedereinlesbares Format', () => {
    setTopicStatus('pseudocode', 'sitzt')
    setTopicNotes('pseudocode', 'Tracer geübt')

    const json = buildExport()
    expect(JSON.parse(json).app).toBe('ap2-lernhub')

    resetProgress()
    expect(getTopicProgress('pseudocode').status).toBe('offen')

    const outcome = importProgress(json)
    expect(outcome.ok).toBe(true)
    expect(getTopicProgress('pseudocode').status).toBe('sitzt')
    expect(getTopicProgress('pseudocode').notes).toBe('Tracer geübt')
  })

  it('ersetzt beim Import standardmäßig', () => {
    setTopicStatus('a', 'sitzt')
    const json = buildExport()

    resetProgress()
    setTopicStatus('b', 'gelesen')
    importProgress(json)

    expect(getTopicProgress('a').status).toBe('sitzt')
    expect(getTopicProgress('b').status).toBe('offen')
  })

  it('behält im Zusammenführen-Modus den aktuellen Stand', () => {
    setTopicStatus('a', 'sitzt')
    const json = buildExport()

    resetProgress()
    setTopicStatus('a', 'gelesen')
    setTopicStatus('b', 'sitzt')

    const outcome = importProgress(json, { merge: true })

    expect(outcome).toMatchObject({ ok: true, mode: 'zusammengeführt' })
    // Der aktuelle Stand gewinnt, die Sicherung ergänzt nur Fehlendes.
    expect(getTopicProgress('a').status).toBe('gelesen')
    expect(getTopicProgress('b').status).toBe('sitzt')
  })

  it('lehnt kaputtes JSON mit klarer Meldung ab', () => {
    const outcome = importProgress('{kein json')
    expect(outcome).toMatchObject({ ok: false })
    if (outcome.ok) return
    expect(outcome.message).toContain('JSON')
  })

  it('lehnt fremde Dateien ab', () => {
    const outcome = importProgress(JSON.stringify({ irgendein: 'objekt' }))
    expect(outcome).toMatchObject({ ok: false })
    if (outcome.ok) return
    expect(outcome.message).toContain('AP2 Lernhub')
  })

  it('akzeptiert auch einen blanken Zustand ohne Hülle', () => {
    // Falls jemand die Datei von Hand bearbeitet und die Hülle verliert.
    const outcome = importProgress(JSON.stringify({ version: 1, topics: { x: { status: 'sitzt' } } }))
    expect(outcome.ok).toBe(true)
    expect(getTopicProgress('x').status).toBe('sitzt')
  })

  it('verwirft einen ungültigen Status in der Datei', () => {
    const outcome = importProgress(
      JSON.stringify({ version: 1, topics: { x: { status: 'erfunden' } } }),
    )
    expect(outcome.ok).toBe(false)
  })
})

describe('Robustheit', () => {
  it('bricht nicht ab, wenn localStorage nicht schreibbar ist', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      },
    })
    subscribe(() => {})

    // Der Zustand muss im Arbeitsspeicher trotzdem stimmen.
    expect(() => setTopicStatus('a', 'sitzt')).not.toThrow()
    expect(getTopicProgress('a').status).toBe('sitzt')
  })
})
