import { describe, expect, it } from 'vitest'

import { prepareIndex, search } from './search'
import { buildSearchIndex, mdxToPlainText } from './index-builder'

describe('mdxToPlainText', () => {
  it('behält den Fließtext', () => {
    expect(mdxToPlainText('Ein normaler Absatz.')).toBe('Ein normaler Absatz.')
  })

  it('entfernt Markdown-Auszeichnung, behält aber die Wörter', () => {
    const plain = mdxToPlainText('## Überschrift mit **fett** und *kursiv*')
    expect(plain).toContain('Überschrift')
    expect(plain).toContain('fett')
    expect(plain).not.toContain('#')
    expect(plain).not.toContain('**')
  })

  it('überspringt Codeblöcke', () => {
    const plain = mdxToPlainText('Davor\n\n```sql\nSELECT geheim FROM tabelle\n```\n\nDanach')
    expect(plain).toContain('Davor')
    expect(plain).toContain('Danach')
    expect(plain).not.toContain('geheim')
  })

  it('behält Text innerhalb von Komponenten', () => {
    expect(mdxToPlainText('<Callout type="tipp">Wichtiger Hinweis</Callout>')).toContain(
      'Wichtiger Hinweis',
    )
  })

  it('behält Text aus Attributen - genau danach sucht man', () => {
    // "Kohäsion" steht nur im term-Attribut. Eine Regex über Tags würde es verlieren.
    const plain = mdxToPlainText('<TermCard term="Kohäsion">Wie stark etwas zusammengehört.</TermCard>')
    expect(plain).toContain('Kohäsion')
    expect(plain).toContain('zusammengehört')
  })

  it('nimmt keine Quelltext-Attribute auf', () => {
    // schema={`...`} ist ein Ausdruck - der gehört nicht in den Suchindex.
    const plain = mdxToPlainText(
      '<SqlExercise title="Meine Aufgabe" schema={`CREATE TABLE geheim (id INT);`} solution="SELECT 1" />',
    )
    expect(plain).toContain('Meine Aufgabe')
    expect(plain).toContain('SELECT 1')
    expect(plain).not.toContain('CREATE TABLE')
  })

  it('lässt Komponentennamen weg', () => {
    expect(mdxToPlainText('<TermGrid><TermCard term="A">B</TermCard></TermGrid>')).not.toContain(
      'TermGrid',
    )
  })

  it('kommt mit leerem Inhalt zurecht', () => {
    expect(mdxToPlainText('')).toBe('')
  })
})

describe('Suchindex über die echten Inhalte', () => {
  const documents = buildSearchIndex()
  const index = prepareIndex(documents)
  const slugs = (query: string) => search(index, query).map((hit) => hit.document.slug)

  it('enthält alle 89 Themen', () => {
    expect(documents).toHaveLength(89)
  })

  it('erfasst den Fließtext ausgearbeiteter Themen', () => {
    const pseudocode = documents.find((document) => document.slug === 'pseudocode')
    expect(pseudocode?.hasContent).toBe(true)
    expect(pseudocode?.body.length).toBeGreaterThan(500)
  })

  it('findet ausgearbeitete Themen über Begriffe aus dem Fließtext', () => {
    expect(slugs('schreibtischtest')).toContain('pseudocode')
    expect(slugs('auswertungsreihenfolge')).toContain('sql-select')
    expect(slugs('swimlane')).toContain('aktivitaetsdiagramm')
  })

  it('findet auch Themen ohne Inhalt über ihren Titel', () => {
    expect(slugs('normalisierung')).toContain('normalisierung')
    expect(slugs('scrum')).toContain('scrum')
  })

  it('findet trotz fehlender Umlaute', () => {
    expect(slugs('aktivitatsdiagramm')).toContain('aktivitaetsdiagramm')
    expect(slugs('zustandsdiagramm')).toContain('zustandsdiagramm')
  })

  it('setzt den Titeltreffer an die Spitze', () => {
    // Der Inhalts-Bonus ist bewusst nur ein Gleichstand-Brecher: Bei "sql" darf
    // "SQL - Grundlagen" vorne stehen, obwohl es noch keinen Inhalt hat.
    expect(slugs('select')[0]).toBe('sql-select')
    expect(slugs('aktivitatsdiagramm')[0]).toBe('aktivitaetsdiagramm')
  })

  it('grenzt bei zwei Begriffen sinnvoll ein', () => {
    const result = slugs('where having')
    expect(result).toEqual(['sql-select'])
  })
})
