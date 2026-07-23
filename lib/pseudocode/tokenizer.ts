import { syntaxError } from './errors'
import type { Token, TokenType } from './types'

/**
 * Zerlegt Pseudocode in Token.
 *
 * Der IHK-Dialekt ist nicht normiert: Prüfungsaufgaben schreiben mal `←`, mal
 * `:=`, mal `=`; mal `ENDE WENN`, mal `ENDEWENN`, mal `END IF`. Der Tokenizer
 * normalisiert all das auf eine kanonische Form, damit der Parser nur noch
 * einen Fall kennen muss.
 */

/** Alias -> kanonisches Schlüsselwort. Schlüssel sind kleingeschrieben und umlautfrei. */
const KEYWORDS: Record<string, string> = {
  // Verzweigung
  wenn: 'WENN',
  if: 'WENN',
  dann: 'DANN',
  then: 'DANN',
  sonst: 'SONST',
  else: 'SONST',
  // Blockende
  ende: 'ENDE',
  end: 'ENDE',
  // Kopfgesteuerte Schleife
  solange: 'SOLANGE',
  while: 'SOLANGE',
  tue: 'TUE',
  do: 'TUE',
  // Fußgesteuerte Schleife
  wiederhole: 'WIEDERHOLE',
  repeat: 'WIEDERHOLE',
  bis: 'BIS',
  until: 'BIS',
  to: 'BIS',
  // Zählschleife
  fuer: 'FUER',
  for: 'FUER',
  von: 'VON',
  from: 'VON',
  schritt: 'SCHRITT',
  step: 'SCHRITT',
  // Funktionen
  funktion: 'FUNKTION',
  function: 'FUNKTION',
  gib: 'GIB',
  zurueck: 'ZURUECK',
  aus: 'AUS',
  return: 'RETURN',
  // Ausgabe in Kurzform - kommt in Aufgaben gelegentlich vor
  ausgabe: 'AUSGABE',
  schreibe: 'AUSGABE',
  print: 'AUSGABE',
  // Operatoren als Wörter
  mod: 'MOD',
  div: 'DIV',
  und: 'UND',
  and: 'UND',
  oder: 'ODER',
  or: 'ODER',
  nicht: 'NICHT',
  not: 'NICHT',
  // Wahrheitswerte
  wahr: 'WAHR',
  true: 'WAHR',
  falsch: 'FALSCH',
  false: 'FALSCH',
}

/** Blockwörter, die direkt an ENDE angehängt sein dürfen: ENDEWENN, ENDWHILE, … */
const BLOCK_KEYWORDS = ['wenn', 'if', 'solange', 'while', 'fuer', 'for', 'funktion', 'function']

/**
 * Mehrzeichen-Operatoren, längste zuerst. Die Reihenfolge ist entscheidend:
 * '<=' muss vor '<' stehen, sonst wird '<= ' als '<' plus '=' gelesen.
 */
const OPERATORS = [
  '<-', ':=', '<=', '>=', '<>', '!=', '==', '->',
  '←', '≤', '≥', '≠', '→',
  '+', '-', '*', '/', '=', '<', '>', '(', ')', '[', ']', ',', ':',
] as const

/** ü -> ue usw. Nur für den Schlüsselwort-Vergleich, nie für Bezeichner. */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

/** Vereinheitlicht Operator-Schreibweisen auf eine kanonische Form. */
function canonicalOperator(op: string): string {
  switch (op) {
    case '←':
    case '<-':
    case ':=':
      return '←'
    case '≤':
      return '<='
    case '≥':
      return '>='
    case '≠':
    case '!=':
      return '<>'
    case '==':
      return '='
    case '→':
      return '->'
    default:
      return op
  }
}

const IDENT_START = /[A-Za-zÄÖÜäöüß_]/
const IDENT_PART = /[A-Za-zÄÖÜäöüß0-9_]/

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  let line = 1
  let lineStart = 0

  const column = () => index - lineStart + 1

  const push = (type: TokenType, value: string, raw: string, col: number) => {
    tokens.push({ type, value, raw, line, column: col })
  }

  while (index < source.length) {
    const char = source[index]
    if (char === undefined) break

    // Zeilenumbruch - im Pseudocode trennt er Anweisungen und ist bedeutsam.
    if (char === '\n') {
      push('newline', '\n', '\n', column())
      index++
      line++
      lineStart = index
      continue
    }

    // Sonstiger Leerraum
    if (char === ' ' || char === '\t' || char === '\r') {
      index++
      continue
    }

    // Kommentare: // … und # … bis Zeilenende
    if ((char === '/' && source[index + 1] === '/') || char === '#') {
      while (index < source.length && source[index] !== '\n') index++
      continue
    }

    // Zahl
    if (char >= '0' && char <= '9') {
      const startCol = column()
      const start = index
      while (index < source.length) {
        const c = source[index]
        if (c === undefined || !(c >= '0' && c <= '9')) break
        index++
      }
      // Nachkommastelle nur, wenn danach wirklich eine Ziffer folgt
      const next = source[index + 1]
      if (source[index] === '.' && next !== undefined && next >= '0' && next <= '9') {
        index++
        while (index < source.length) {
          const c = source[index]
          if (c === undefined || !(c >= '0' && c <= '9')) break
          index++
        }
      }
      const raw = source.slice(start, index)
      push('number', raw, raw, startCol)
      continue
    }

    // Zeichenkette
    if (char === '"' || char === "'") {
      const quote = char
      const startCol = column()
      const startLine = line
      index++
      let value = ''
      while (index < source.length && source[index] !== quote) {
        if (source[index] === '\n') {
          throw syntaxError(
            'Die Zeichenkette wurde nicht geschlossen - es fehlt ein abschließendes Anführungszeichen.',
            startLine,
            startCol,
          )
        }
        value += source[index]
        index++
      }
      if (index >= source.length) {
        throw syntaxError(
          'Die Zeichenkette wurde nicht geschlossen - es fehlt ein abschließendes Anführungszeichen.',
          startLine,
          startCol,
        )
      }
      index++ // schließendes Anführungszeichen
      push('string', value, `${quote}${value}${quote}`, startCol)
      continue
    }

    // Bezeichner oder Schlüsselwort
    if (IDENT_START.test(char)) {
      const startCol = column()
      const start = index
      while (index < source.length) {
        const c = source[index]
        if (c === undefined || !IDENT_PART.test(c)) break
        index++
      }
      const raw = source.slice(start, index)
      const normalized = normalizeWord(raw)

      const keyword = KEYWORDS[normalized]
      if (keyword) {
        push('keyword', keyword, raw, startCol)
        continue
      }

      // Zusammengeschriebene Blockenden aufspalten: ENDEWENN -> ENDE + WENN
      const fused = BLOCK_KEYWORDS.find(
        (block) => normalized.startsWith('ende') && normalized.slice(4) === block,
      )
      if (fused) {
        const mapped = KEYWORDS[fused]
        push('keyword', 'ENDE', raw.slice(0, 4), startCol)
        if (mapped) push('keyword', mapped, raw.slice(4), startCol + 4)
        continue
      }
      const fusedEnd = BLOCK_KEYWORDS.find(
        (block) => normalized.startsWith('end') && normalized.slice(3) === block,
      )
      if (fusedEnd) {
        const mapped = KEYWORDS[fusedEnd]
        push('keyword', 'ENDE', raw.slice(0, 3), startCol)
        if (mapped) push('keyword', mapped, raw.slice(3), startCol + 3)
        continue
      }

      push('identifier', raw, raw, startCol)
      continue
    }

    // Operator
    const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index))
    if (operator) {
      const startCol = column()
      index += operator.length
      push('operator', canonicalOperator(operator), operator, startCol)
      continue
    }

    throw syntaxError(`Unbekanntes Zeichen "${char}".`, line, column())
  }

  tokens.push({ type: 'eof', value: '', raw: '', line, column: column() })
  return tokens
}
