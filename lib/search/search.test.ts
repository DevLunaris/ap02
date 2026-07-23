import { describe, expect, it } from 'vitest'

import { normalize, prepareIndex, search, type SearchDocument } from './search'

function doc(overrides: Partial<SearchDocument> & { slug: string; title: string }): SearchDocument {
  return {
    category: 'algorithmen',
    categoryTitle: 'Algorithmen & Pseudocode',
    examArea: 'algorithmen',
    priority: 'mittel',
    keywords: [],
    body: '',
    hasContent: true,
    ...overrides,
  }
}

const DOCS: SearchDocument[] = [
  doc({
    slug: 'pseudocode',
    title: 'Pseudocode',
    priority: 'essentiell',
    summary: 'Sprachunabhängige Notation für Algorithmen.',
    keywords: ['Schreibtischtest', 'Wertetabelle', 'Terminierung'],
    body: 'Der Schreibtischtest ist das manuelle Durchspielen eines Algorithmus mit konkreten Werten.',
  }),
  doc({
    slug: 'sql-select',
    title: 'SELECT-Abfragen',
    category: 'datenbanken',
    categoryTitle: 'Datenbanken & SQL',
    summary: 'Daten gezielt abfragen, filtern und gruppieren.',
    keywords: ['Projektion', 'Selektion', 'Aggregatfunktion'],
    body: 'WHERE filtert Zeilen vor der Gruppierung, HAVING filtert Gruppen danach.',
  }),
  doc({
    slug: 'sql-joins',
    title: 'JOINs & Unterabfragen',
    category: 'datenbanken',
    categoryTitle: 'Datenbanken & SQL',
    hasContent: false,
    body: '',
  }),
  doc({
    slug: 'aktivitaetsdiagramm',
    title: 'Aktivitätsdiagramm',
    category: 'uml',
    categoryTitle: 'UML & Objektorientierung',
    examArea: 'planung',
    keywords: ['Fork', 'Join', 'Swimlane'],
    body: 'Ein Fork teilt den Ablauf in gleichzeitig laufende Stränge.',
  }),
]

const index = prepareIndex(DOCS)
const slugs = (query: string) => search(index, query).map((hit) => hit.document.slug)

describe('normalize', () => {
  it('führt alle drei Umlaut-Schreibweisen auf dieselbe Form', () => {
    const ziel = normalize('Aktivitätsdiagramm')
    expect(normalize('aktivitaetsdiagramm')).toBe(ziel)
    expect(normalize('aktivitatsdiagramm')).toBe(ziel)
  })

  it('behandelt ß wie ss und wie s', () => {
    const ziel = normalize('Größe')
    expect(normalize('Groesse')).toBe(ziel)
    expect(normalize('Grosse')).toBe(ziel)
  })

  it('entfernt Satzzeichen', () => {
    expect(normalize('SELECT-Abfragen!')).toBe('select abfragen')
  })

  it('kommt mit leerer Eingabe zurecht', () => {
    expect(normalize('   ')).toBe('')
  })
})

describe('search - Grundlagen', () => {
  it('findet über den Titel', () => {
    expect(slugs('pseudocode')).toContain('pseudocode')
  })

  it('findet ohne Umlaute getippt', () => {
    expect(slugs('aktivitatsdiagramm')).toContain('aktivitaetsdiagramm')
    expect(slugs('aktivitaetsdiagramm')).toContain('aktivitaetsdiagramm')
  })

  it('ignoriert Groß- und Kleinschreibung', () => {
    expect(slugs('SELECT')).toContain('sql-select')
    expect(slugs('select')).toContain('sql-select')
  })

  it('findet über Kernbegriffe', () => {
    expect(slugs('schreibtischtest')).toContain('pseudocode')
  })

  it('findet über den Fließtext', () => {
    expect(slugs('having')).toContain('sql-select')
  })

  it('findet über die Kategorie', () => {
    expect(slugs('datenbanken')).toEqual(expect.arrayContaining(['sql-select', 'sql-joins']))
  })

  it('liefert nichts bei leerer Eingabe', () => {
    expect(search(index, '')).toEqual([])
    expect(search(index, '   ')).toEqual([])
  })

  it('liefert nichts bei einem Begriff, den es nirgends gibt', () => {
    expect(slugs('quantenphysik')).toEqual([])
  })
})

describe('search - Gewichtung', () => {
  it('setzt Titeltreffer vor Fließtexttreffer', () => {
    const result = slugs('pseudocode')
    expect(result[0]).toBe('pseudocode')
  })

  it('bevorzugt bei gleichem Begriff das ausgearbeitete Thema', () => {
    // Beide heißen "SQL ...", aber nur sql-select hat Inhalt.
    const result = slugs('sql')
    expect(result.indexOf('sql-select')).toBeLessThan(result.indexOf('sql-joins'))
  })

  it('wertet ein ganzes Wort höher als einen Wortteil', () => {
    const whole = search(index, 'fork')[0]
    expect(whole?.document.slug).toBe('aktivitaetsdiagramm')
  })
})

describe('search - mehrere Begriffe', () => {
  it('verknüpft Begriffe mit UND', () => {
    // "select" kommt in sql-select vor, "gruppierung" ebenfalls - sql-joins nicht.
    expect(slugs('select gruppierung')).toEqual(['sql-select'])
  })

  it('liefert nichts, wenn ein Begriff fehlt', () => {
    expect(slugs('pseudocode datenbanken')).toEqual([])
  })

  it('findet auch bei umgekehrter Reihenfolge', () => {
    expect(slugs('gruppierung select')).toEqual(['sql-select'])
  })
})

describe('search - Ergebnisse', () => {
  it('respektiert das Limit', () => {
    expect(search(index, 'sql', 1)).toHaveLength(1)
  })

  it('liefert einen Textausschnitt, wenn der Treffer im Fließtext liegt', () => {
    const hit = search(index, 'having')[0]
    expect(hit?.snippet).toContain('HAVING')
  })

  it('kommt ohne Fließtext zurecht', () => {
    const hit = search(index, 'joins')[0]
    expect(hit?.document.slug).toBe('sql-joins')
    expect(hit?.snippet).toBeUndefined()
  })
})
