/**
 * Typen der Pseudocode-Engine: Token, AST und Ausführungsspur.
 *
 * Zielsprache ist der deutsche IHK-Dialekt, wie er in AP2-Prüfungen vorkommt.
 * Er ist nicht normiert - der Parser ist deshalb bewusst großzügig und
 * akzeptiert Schreibvarianten sowie englische Schlüsselwörter als Alias.
 */

// ---------------------------------------------------------------------------
// Werte
// ---------------------------------------------------------------------------

export type PseudoValue = number | string | boolean | PseudoValue[]

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export type TokenType = 'number' | 'string' | 'identifier' | 'keyword' | 'operator' | 'newline' | 'eof'

export interface Token {
  type: TokenType
  /** Bei Schlüsselwörtern die kanonische Form (z. B. FUER), sonst der Rohtext. */
  value: string
  /** Unveränderter Quelltext - für Fehlermeldungen. */
  raw: string
  line: number
  column: number
}

// ---------------------------------------------------------------------------
// Ausdrücke
// ---------------------------------------------------------------------------

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | ArrayLiteral
  | Identifier
  | IndexAccess
  | BinaryExpression
  | UnaryExpression
  | CallExpression

export interface NumberLiteral {
  kind: 'number'
  value: number
  line: number
}

export interface StringLiteral {
  kind: 'string'
  value: string
  line: number
}

export interface BooleanLiteral {
  kind: 'boolean'
  value: boolean
  line: number
}

export interface ArrayLiteral {
  kind: 'array'
  elements: Expression[]
  line: number
}

export interface Identifier {
  kind: 'identifier'
  name: string
  line: number
}

export interface IndexAccess {
  kind: 'index'
  target: Expression
  index: Expression
  line: number
}

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | 'MOD' | 'DIV'
  | '=' | '<>' | '<' | '>' | '<=' | '>='
  | 'UND' | 'ODER'

export interface BinaryExpression {
  kind: 'binary'
  operator: BinaryOperator
  left: Expression
  right: Expression
  line: number
}

export interface UnaryExpression {
  kind: 'unary'
  operator: '-' | 'NICHT'
  operand: Expression
  line: number
}

export interface CallExpression {
  kind: 'call'
  name: string
  args: Expression[]
  line: number
}

// ---------------------------------------------------------------------------
// Anweisungen
// ---------------------------------------------------------------------------

export type Statement =
  | AssignStatement
  | IfStatement
  | WhileStatement
  | RepeatStatement
  | ForStatement
  | FunctionDeclaration
  | ReturnStatement
  | OutputStatement
  | ExpressionStatement

export interface AssignStatement {
  kind: 'assign'
  target: Identifier | IndexAccess
  value: Expression
  line: number
}

export interface IfBranch {
  condition: Expression
  body: Statement[]
}

export interface IfStatement {
  kind: 'if'
  /** WENN plus alle SONST-WENN-Zweige, in Reihenfolge. */
  branches: IfBranch[]
  elseBody?: Statement[]
  line: number
}

export interface WhileStatement {
  kind: 'while'
  condition: Expression
  body: Statement[]
  line: number
}

/** WIEDERHOLE … BIS - fußgesteuert, läuft immer mindestens einmal. */
export interface RepeatStatement {
  kind: 'repeat'
  body: Statement[]
  condition: Expression
  line: number
}

export interface ForStatement {
  kind: 'for'
  variable: string
  from: Expression
  to: Expression
  step?: Expression
  body: Statement[]
  line: number
}

export interface FunctionDeclaration {
  kind: 'function'
  name: string
  parameters: string[]
  body: Statement[]
  line: number
}

export interface ReturnStatement {
  kind: 'return'
  value?: Expression
  line: number
}

export interface OutputStatement {
  kind: 'output'
  value: Expression
  line: number
}

export interface ExpressionStatement {
  kind: 'expression'
  expression: Expression
  line: number
}

export interface Program {
  body: Statement[]
}

// ---------------------------------------------------------------------------
// Ausführungsspur
// ---------------------------------------------------------------------------

/**
 * Ein Schritt des Schreibtischtests. Die Spur wird vollständig im Voraus
 * berechnet - siehe interpreter.ts - damit die UI beliebig vor und zurück
 * springen kann, ohne neu zu rechnen.
 */
export interface TraceStep {
  /** 1-basierte Zeile im Quelltext, die diesen Schritt ausgelöst hat. */
  line: number
  /** Zustand aller sichtbaren Variablen NACH diesem Schritt. */
  variables: Record<string, PseudoValue>
  /**
   * Anzahl der bis hier ausgegebenen Zeilen. Die Ausgabe selbst steht einmal
   * in RunResult.output - so bleibt die Spur klein statt quadratisch zu wachsen.
   */
  outputLength: number
  /** Ausgewertete Bedingung, falls dieser Schritt eine geprüft hat. */
  condition?: { text: string; result: boolean }
  /** Kurzbeschreibung für die Spalte "Aktion", z. B. "summe ← 15". */
  description: string
  /** Aufruftiefe: 0 = Hauptprogramm, 1 = in einer Funktion, usw. */
  depth: number
  /** Name der Funktion, in der dieser Schritt passiert ist. */
  frame?: string
}

export type RunResult =
  | {
      ok: true
      steps: TraceStep[]
      output: string[]
      /** Variablennamen in Reihenfolge ihres ersten Auftretens - Spalten der Wertetabelle. */
      columns: string[]
    }
  | {
      ok: false
      error: PseudocodeErrorInfo
      /** Teilspur bis zum Fehler - man sieht, wie weit das Programm kam. */
      steps: TraceStep[]
      output: string[]
      columns: string[]
    }

export interface PseudocodeErrorInfo {
  /** Deutsche, für Lernende verständliche Meldung. */
  message: string
  line?: number
  column?: number
  phase: 'syntax' | 'laufzeit' | 'limit'
}
