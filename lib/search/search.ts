import type { ExamArea, Priority } from '@/lib/content/schema'

/**
 * Clientseitige Volltextsuche über alle Themen.
 *
 * Bewusst ohne FlexSearch: Bei 89 Dokumenten bringt eine Suchbibliothek keinen
 * spürbaren Vorteil, kostet aber Bundle-Größe und nimmt die Kontrolle über die
 * deutsche Normalisierung (Umlaute, ß) aus der Hand. Diese ~70 Zeilen sind dafür
 * vollständig testbar.
 */

export interface SearchDocument {
  slug: string
  title: string
  category: string
  categoryTitle: string
  examArea: ExamArea
  priority: Priority
  summary?: string
  /** Lernziele und Kernaussagen - gewichtet zwischen Titel und Fließtext. */
  keywords: string[]
  /** Fließtext ohne Markdown und JSX. */
  body: string
  hasContent: boolean
}

export interface SearchHit {
  document: SearchDocument
  score: number
  /** Textausschnitt um den ersten Treffer im Fließtext. */
  snippet?: string
}

/**
 * Vereinheitlicht Umlaute und ß.
 *
 * Knackpunkt: Umlaute werden auf zwei Arten ersetzt - korrekt als „ae" oder
 * schnell getippt als „a". Beides muss dasselbe finden wie das Original.
 * Deshalb erst die diakritischen Zeichen entfernen (ä → a) und danach auch
 * „ae" auf „a" zusammenziehen. Alle drei Schreibweisen landen so auf einer Form:
 *
 *   Aktivitätsdiagramm → aktivitatsdiagramm
 *   aktivitaetsdiagramm → aktivitatsdiagramm
 *   aktivitatsdiagramm → aktivitatsdiagramm
 *
 * Das erzeugt gelegentlich zu großzügige Treffer (Steuer → steur), was bei einer
 * Suche deutlich weniger stört als ein ausbleibender Treffer.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diakritische Zeichen entfernen
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ss/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(text: string): string[] {
  const normalized = normalize(text)
  return normalized === '' ? [] : normalized.split(' ')
}

/** Gewichte je Feld. Ein Titeltreffer wiegt deutlich mehr als einer im Fließtext. */
const WEIGHTS = { title: 12, keywords: 5, summary: 4, category: 3, body: 1 } as const

/** Bewertet ein Feld gegen einen Suchbegriff. */
function scoreField(haystack: string, term: string, weight: number): number {
  if (haystack === '' || term === '') return 0

  const position = haystack.indexOf(term)
  if (position === -1) return 0

  const wholeWord = new RegExp(`(^| )${term}( |$)`).test(haystack)
  const atWordStart = position === 0 || haystack[position - 1] === ' '

  // Ganzes Wort > Wortanfang > irgendwo enthalten.
  const quality = wholeWord ? 1 : atWordStart ? 0.7 : 0.35
  return weight * quality
}

interface PreparedDocument {
  document: SearchDocument
  title: string
  keywords: string
  summary: string
  category: string
  body: string
}

/** Bereitet die Dokumente einmalig auf - die Normalisierung ist der teure Teil. */
export function prepareIndex(documents: SearchDocument[]): PreparedDocument[] {
  return documents.map((document) => ({
    document,
    title: normalize(document.title),
    keywords: normalize(document.keywords.join(' ')),
    summary: normalize(document.summary ?? ''),
    category: normalize(document.categoryTitle),
    body: normalize(document.body),
  }))
}

/**
 * Sucht in einem vorbereiteten Index.
 *
 * Alle Suchbegriffe müssen irgendwo vorkommen (UND-Verknüpfung) - sonst liefert
 * eine Eingabe wie „sql join" alles, was auch nur „sql" enthält.
 */
export function search(
  index: PreparedDocument[],
  query: string,
  limit = 12,
): SearchHit[] {
  const terms = tokens(query)
  if (terms.length === 0) return []

  const hits: SearchHit[] = []

  for (const entry of index) {
    let total = 0
    let allTermsFound = true

    for (const term of terms) {
      const termScore =
        scoreField(entry.title, term, WEIGHTS.title) +
        scoreField(entry.keywords, term, WEIGHTS.keywords) +
        scoreField(entry.summary, term, WEIGHTS.summary) +
        scoreField(entry.category, term, WEIGHTS.category) +
        scoreField(entry.body, term, WEIGHTS.body)

      if (termScore === 0) {
        allTermsFound = false
        break
      }
      total += termScore
    }

    if (!allTermsFound) continue

    // Ausgearbeitete Themen leicht bevorzugen - dort steht tatsächlich etwas.
    if (entry.document.hasContent) total *= 1.15

    hits.push({
      document: entry.document,
      score: total,
      snippet: buildSnippet(entry.document.body, terms[0] as string),
    })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title, 'de'))
    .slice(0, limit)
}

/** Schneidet einen lesbaren Ausschnitt um den ersten Treffer heraus. */
export function buildSnippet(body: string, term: string, radius = 70): string | undefined {
  if (body === '' || term === '') return undefined

  const normalizedBody = normalize(body)
  const position = normalizedBody.indexOf(term)
  if (position === -1) return undefined

  // Die Normalisierung kann die Länge verändern (ä -> ae). Für den Ausschnitt
  // reicht die Näherung; ein paar Zeichen Versatz fallen nicht auf.
  const approximate = Math.min(position, Math.max(0, body.length - 1))
  const start = Math.max(0, approximate - radius)
  const end = Math.min(body.length, approximate + radius)

  return `${start > 0 ? '… ' : ''}${body.slice(start, end).trim()}${end < body.length ? ' …' : ''}`
}
