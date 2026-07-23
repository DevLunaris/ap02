import { syntaxError } from './errors'
import { tokenize } from './tokenizer'
import type {
  BinaryOperator,
  Expression,
  IfBranch,
  Program,
  Statement,
  Token,
} from './types'

/**
 * Recursive-Descent-Parser für den IHK-Pseudocode.
 *
 * Zwei Leitlinien:
 * 1. Großzügig lesen - `DANN`, `TUE` und das Blockwort nach `ENDE` sind optional,
 *    weil Prüfungsaufgaben das uneinheitlich handhaben.
 * 2. Streng melden - jede Fehlermeldung nennt Zeile und sagt, was fehlt.
 */

const COMPARISON: Record<string, BinaryOperator> = {
  '=': '=',
  '<>': '<>',
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
}

class Parser {
  private position = 0

  constructor(private readonly tokens: Token[]) {}

  // -------------------------------------------------------------------------
  // Token-Navigation
  // -------------------------------------------------------------------------

  private peek(offset = 0): Token {
    const token = this.tokens[this.position + offset]
    // Der Tokenizer hängt immer ein eof an; das letzte Token ist der sichere Fallback.
    return token ?? (this.tokens[this.tokens.length - 1] as Token)
  }

  private next(): Token {
    const token = this.peek()
    if (token.type !== 'eof') this.position++
    return token
  }

  private atKeyword(...names: string[]): boolean {
    const token = this.peek()
    return token.type === 'keyword' && names.includes(token.value)
  }

  private atOperator(...symbols: string[]): boolean {
    const token = this.peek()
    return token.type === 'operator' && symbols.includes(token.value)
  }

  private acceptKeyword(...names: string[]): Token | null {
    return this.atKeyword(...names) ? this.next() : null
  }

  private acceptOperator(...symbols: string[]): Token | null {
    return this.atOperator(...symbols) ? this.next() : null
  }

  private expectOperator(symbol: string, context: string): Token {
    if (!this.atOperator(symbol)) {
      const token = this.peek()
      throw syntaxError(
        `Hier wird "${symbol}" erwartet (${context}), gefunden wurde ${this.describe(token)}.`,
        token.line,
        token.column,
      )
    }
    return this.next()
  }

  private describe(token: Token): string {
    switch (token.type) {
      case 'eof':
        return 'das Ende des Programms'
      case 'newline':
        return 'ein Zeilenende'
      default:
        return `"${token.raw}"`
    }
  }

  /** Zeilenumbrüche überspringen - sie trennen Anweisungen, sind sonst bedeutungslos. */
  private skipNewlines(): void {
    while (this.peek().type === 'newline') this.position++
  }

  /** Nach einer Anweisung: Zeilenende oder Programmende erwarten. */
  private endStatement(): void {
    if (this.peek().type === 'newline' || this.peek().type === 'eof') return
    const token = this.peek()
    throw syntaxError(
      `Nach dieser Anweisung wurde ein Zeilenende erwartet, gefunden wurde ${this.describe(token)}.`,
      token.line,
      token.column,
    )
  }

  // -------------------------------------------------------------------------
  // Programm und Blöcke
  // -------------------------------------------------------------------------

  parseProgram(): Program {
    const body: Statement[] = []
    this.skipNewlines()
    while (this.peek().type !== 'eof') {
      body.push(this.parseStatement())
      this.skipNewlines()
    }
    return { body }
  }

  /**
   * Liest Anweisungen, bis eines der Abschlusswörter erreicht ist. Das Abschluss-
   * wort selbst wird NICHT konsumiert - darum kümmert sich der Aufrufer.
   */
  private parseBlock(terminators: string[], opener: Token, expected: string): Statement[] {
    const body: Statement[] = []
    this.skipNewlines()

    while (true) {
      const token = this.peek()

      if (token.type === 'eof') {
        throw syntaxError(
          `Der Block "${opener.raw}" aus Zeile ${opener.line} wurde nie geschlossen - es fehlt "${expected}".`,
          opener.line,
          opener.column,
        )
      }

      if (token.type === 'keyword' && terminators.includes(token.value)) break

      body.push(this.parseStatement())
      this.skipNewlines()
    }

    return body
  }

  /**
   * Konsumiert ein Blockende: ENDE, optional gefolgt vom Blockwort.
   * Akzeptiert also `ENDE WENN`, `ENDEWENN` (vom Tokenizer aufgespalten) und
   * ein bloßes `ENDE`.
   */
  private consumeBlockEnd(blockKeyword: string, opener: Token): void {
    if (!this.acceptKeyword('ENDE')) {
      const token = this.peek()
      throw syntaxError(
        `Der Block "${opener.raw}" aus Zeile ${opener.line} wurde nicht geschlossen - es fehlt "ENDE ${blockKeyword}".`,
        token.line,
        token.column,
      )
    }
    this.acceptKeyword(blockKeyword)
  }

  // -------------------------------------------------------------------------
  // Anweisungen
  // -------------------------------------------------------------------------

  private parseStatement(): Statement {
    const token = this.peek()

    if (token.type === 'keyword') {
      switch (token.value) {
        case 'WENN':
          return this.parseIf()
        case 'SOLANGE':
          return this.parseWhile()
        case 'WIEDERHOLE':
          return this.parseRepeat()
        case 'FUER':
          return this.parseFor()
        case 'FUNKTION':
          return this.parseFunction()
        case 'GIB':
          return this.parseGib()
        case 'RETURN':
          return this.parseReturn()
        case 'AUSGABE':
          return this.parseAusgabe()
        case 'ENDE':
          throw syntaxError(
            `"${token.raw}" steht hier ohne zugehörigen Block.`,
            token.line,
            token.column,
          )
        case 'SONST':
          throw syntaxError(
            `"${token.raw}" steht hier ohne zugehöriges WENN.`,
            token.line,
            token.column,
          )
        default:
          break
      }
    }

    return this.parseAssignOrExpression()
  }

  private parseIf(): Statement {
    const opener = this.next() // WENN
    const condition = this.parseExpression()
    this.acceptKeyword('DANN')

    const branches: IfBranch[] = []
    let body = this.parseBlock(['SONST', 'ENDE'], opener, 'ENDE WENN')
    branches.push({ condition, body })

    let elseBody: Statement[] | undefined

    while (this.atKeyword('SONST')) {
      this.next() // SONST

      if (this.acceptKeyword('WENN')) {
        // SONST WENN … DANN
        const elseIfCondition = this.parseExpression()
        this.acceptKeyword('DANN')
        body = this.parseBlock(['SONST', 'ENDE'], opener, 'ENDE WENN')
        branches.push({ condition: elseIfCondition, body })
        continue
      }

      elseBody = this.parseBlock(['ENDE'], opener, 'ENDE WENN')
      break
    }

    this.consumeBlockEnd('WENN', opener)

    return { kind: 'if', branches, elseBody, line: opener.line }
  }

  private parseWhile(): Statement {
    const opener = this.next() // SOLANGE
    const condition = this.parseExpression()
    this.acceptKeyword('TUE')
    const body = this.parseBlock(['ENDE'], opener, 'ENDE SOLANGE')
    this.consumeBlockEnd('SOLANGE', opener)
    return { kind: 'while', condition, body, line: opener.line }
  }

  private parseRepeat(): Statement {
    const opener = this.next() // WIEDERHOLE
    const body = this.parseBlock(['BIS'], opener, 'BIS <Bedingung>')

    if (!this.acceptKeyword('BIS')) {
      const token = this.peek()
      throw syntaxError(
        `Zu "${opener.raw}" aus Zeile ${opener.line} fehlt das abschließende "BIS <Bedingung>".`,
        token.line,
        token.column,
      )
    }

    const condition = this.parseExpression()
    return { kind: 'repeat', body, condition, line: opener.line }
  }

  private parseFor(): Statement {
    const opener = this.next() // FUER

    const variableToken = this.peek()
    if (variableToken.type !== 'identifier') {
      throw syntaxError(
        `Nach "${opener.raw}" wird ein Variablenname erwartet, gefunden wurde ${this.describe(variableToken)}.`,
        variableToken.line,
        variableToken.column,
      )
    }
    this.next()

    // "FÜR i VON 1 BIS n" - das VON ist optional, manche schreiben "FÜR i ← 1 BIS n"
    if (!this.acceptKeyword('VON')) {
      this.acceptOperator('←')
    }

    const from = this.parseExpression()

    if (!this.acceptKeyword('BIS')) {
      const token = this.peek()
      throw syntaxError(
        `In der Zählschleife fehlt "BIS" vor dem Endwert, gefunden wurde ${this.describe(token)}.`,
        token.line,
        token.column,
      )
    }

    const to = this.parseExpression()
    const step = this.acceptKeyword('SCHRITT') ? this.parseExpression() : undefined

    this.acceptKeyword('TUE')
    const body = this.parseBlock(['ENDE'], opener, 'ENDE FÜR')
    this.consumeBlockEnd('FUER', opener)

    return { kind: 'for', variable: variableToken.value, from, to, step, body, line: opener.line }
  }

  private parseFunction(): Statement {
    const opener = this.next() // FUNKTION

    const nameToken = this.peek()
    if (nameToken.type !== 'identifier') {
      throw syntaxError(
        `Nach "${opener.raw}" wird ein Funktionsname erwartet, gefunden wurde ${this.describe(nameToken)}.`,
        nameToken.line,
        nameToken.column,
      )
    }
    this.next()

    this.expectOperator('(', 'Parameterliste der Funktion')

    const parameters: string[] = []
    if (!this.atOperator(')')) {
      do {
        const parameter = this.peek()
        if (parameter.type !== 'identifier') {
          throw syntaxError(
            `In der Parameterliste wird ein Name erwartet, gefunden wurde ${this.describe(parameter)}.`,
            parameter.line,
            parameter.column,
          )
        }
        this.next()
        parameters.push(parameter.value)

        // Optionale Typangabe: "zahl: GANZZAHL" - fürs Ausführen belanglos.
        if (this.acceptOperator(':')) this.next()
      } while (this.acceptOperator(','))
    }

    this.expectOperator(')', 'Ende der Parameterliste')

    // Optionaler Rückgabetyp: "→ GANZZAHL"
    if (this.acceptOperator('->')) this.next()

    const body = this.parseBlock(['ENDE'], opener, 'ENDE FUNKTION')
    this.consumeBlockEnd('FUNKTION', opener)

    return { kind: 'function', name: nameToken.value, parameters, body, line: opener.line }
  }

  /** `GIB x AUS` oder `GIB x ZURÜCK` - unterscheidet sich erst am Ende. */
  private parseGib(): Statement {
    const opener = this.next() // GIB

    // "GIB ZURÜCK" ohne Wert
    if (this.acceptKeyword('ZURUECK')) {
      this.endStatement()
      return { kind: 'return', line: opener.line }
    }

    const value = this.parseExpression()

    if (this.acceptKeyword('AUS')) {
      this.endStatement()
      return { kind: 'output', value, line: opener.line }
    }

    if (this.acceptKeyword('ZURUECK')) {
      this.endStatement()
      return { kind: 'return', value, line: opener.line }
    }

    const token = this.peek()
    throw syntaxError(
      `Nach "GIB <Wert>" fehlt "AUS" (Ausgabe) oder "ZURÜCK" (Rückgabewert).`,
      token.line,
      token.column,
    )
  }

  private parseReturn(): Statement {
    const opener = this.next() // RETURN
    // Musterlösungen schreiben teils "Rueckgabe: ergebnis" - der Doppelpunkt
    // ist reine Schreibweise und wird geschluckt.
    this.acceptOperator(':')

    if (this.peek().type === 'newline' || this.peek().type === 'eof') {
      return { kind: 'return', line: opener.line }
    }
    const value = this.parseExpression()
    this.endStatement()
    return { kind: 'return', value, line: opener.line }
  }

  private parseAusgabe(): Statement {
    const opener = this.next() // AUSGABE
    const value = this.parseExpression()
    this.endStatement()
    return { kind: 'output', value, line: opener.line }
  }

  private parseAssignOrExpression(): Statement {
    const start = this.peek()

    /*
     * "=" ist im IHK-Dialekt doppeldeutig: am Anfang einer Anweisung eine
     * Zuweisung, innerhalb eines Ausdrucks ein Vergleich. Deshalb hier erst ein
     * Versuch mit Rücksetzpunkt - sonst würde parseComparison das "=" in
     * "a = 3" als Vergleich verschlucken und die Zuweisung ginge verloren.
     */
    if (start.type === 'identifier') {
      const checkpoint = this.position
      const target = this.parsePostfix()

      if ((target.kind === 'identifier' || target.kind === 'index') && this.atOperator('←', '=')) {
        this.next()
        const value = this.parseExpression()
        this.endStatement()
        return { kind: 'assign', target, value, line: start.line }
      }

      this.position = checkpoint
    }

    const expression = this.parseExpression()

    if (this.atOperator('←')) {
      this.next()
      throw syntaxError(
        'Links von der Zuweisung muss eine Variable oder ein Array-Element stehen.',
        start.line,
        start.column,
      )
    }

    this.endStatement()
    return { kind: 'expression', expression, line: start.line }
  }

  // -------------------------------------------------------------------------
  // Ausdrücke - nach Bindungsstärke, schwächste zuerst
  // -------------------------------------------------------------------------

  parseExpression(): Expression {
    return this.parseOr()
  }

  private parseOr(): Expression {
    let left = this.parseAnd()
    while (this.atKeyword('ODER')) {
      const token = this.next()
      const right = this.parseAnd()
      left = { kind: 'binary', operator: 'ODER', left, right, line: token.line }
    }
    return left
  }

  private parseAnd(): Expression {
    let left = this.parseNot()
    while (this.atKeyword('UND')) {
      const token = this.next()
      const right = this.parseNot()
      left = { kind: 'binary', operator: 'UND', left, right, line: token.line }
    }
    return left
  }

  private parseNot(): Expression {
    if (this.atKeyword('NICHT')) {
      const token = this.next()
      const operand = this.parseNot()
      return { kind: 'unary', operator: 'NICHT', operand, line: token.line }
    }
    return this.parseComparison()
  }

  private parseComparison(): Expression {
    let left = this.parseSum()

    // Bewusst nicht in einer Schleife: "a < b < c" ist im Pseudocode kein
    // sinnvoller Ausdruck und wäre eher ein Tippfehler.
    const token = this.peek()
    if (token.type === 'operator') {
      const operator = COMPARISON[token.value]
      if (operator) {
        this.next()
        const right = this.parseSum()
        left = { kind: 'binary', operator, left, right, line: token.line }
      }
    }

    return left
  }

  private parseSum(): Expression {
    let left = this.parseProduct()
    while (this.atOperator('+', '-')) {
      const token = this.next()
      const right = this.parseProduct()
      left = {
        kind: 'binary',
        operator: token.value as '+' | '-',
        left,
        right,
        line: token.line,
      }
    }
    return left
  }

  private parseProduct(): Expression {
    let left = this.parseUnary()
    while (this.atOperator('*', '/') || this.atKeyword('MOD', 'DIV')) {
      const token = this.next()
      const right = this.parseUnary()
      left = {
        kind: 'binary',
        operator: token.value as BinaryOperator,
        left,
        right,
        line: token.line,
      }
    }
    return left
  }

  private parseUnary(): Expression {
    if (this.atOperator('-')) {
      const token = this.next()
      const operand = this.parseUnary()
      return { kind: 'unary', operator: '-', operand, line: token.line }
    }
    return this.parsePostfix()
  }

  /** Indexzugriffe: a[i], matrix[i][j] */
  private parsePostfix(): Expression {
    let expression = this.parsePrimary()

    while (this.atOperator('[')) {
      const token = this.next()
      const index = this.parseExpression()
      this.expectOperator(']', 'Ende des Array-Zugriffs')
      expression = { kind: 'index', target: expression, index, line: token.line }
    }

    return expression
  }

  private parsePrimary(): Expression {
    const token = this.peek()

    if (token.type === 'number') {
      this.next()
      return { kind: 'number', value: Number(token.value), line: token.line }
    }

    if (token.type === 'string') {
      this.next()
      return { kind: 'string', value: token.value, line: token.line }
    }

    if (token.type === 'keyword' && (token.value === 'WAHR' || token.value === 'FALSCH')) {
      this.next()
      return { kind: 'boolean', value: token.value === 'WAHR', line: token.line }
    }

    if (token.type === 'identifier') {
      this.next()

      if (this.atOperator('(')) {
        this.next()
        const args: Expression[] = []
        if (!this.atOperator(')')) {
          do {
            args.push(this.parseExpression())
          } while (this.acceptOperator(','))
        }
        this.expectOperator(')', `Ende der Argumentliste von "${token.value}"`)
        return { kind: 'call', name: token.value, args, line: token.line }
      }

      return { kind: 'identifier', name: token.value, line: token.line }
    }

    if (this.atOperator('(')) {
      this.next()
      const inner = this.parseExpression()
      this.expectOperator(')', 'schließende Klammer')
      return inner
    }

    // Array-Literal: [1, 2, 3]
    if (this.atOperator('[')) {
      const open = this.next()
      const elements: Expression[] = []
      if (!this.atOperator(']')) {
        do {
          elements.push(this.parseExpression())
        } while (this.acceptOperator(','))
      }
      this.expectOperator(']', 'Ende der Array-Liste')
      return { kind: 'array', elements, line: open.line }
    }

    throw syntaxError(
      `Hier wird ein Wert erwartet (Zahl, Variable oder Klammer), gefunden wurde ${this.describe(token)}.`,
      token.line,
      token.column,
    )
  }
}

export function parse(source: string): Program {
  return new Parser(tokenize(source)).parseProgram()
}
