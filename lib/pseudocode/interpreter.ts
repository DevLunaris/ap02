import { limitError, PseudocodeError, runtimeError } from './errors'
import { parse } from './parser'
import type {
  Expression,
  FunctionDeclaration,
  PseudoValue,
  RunResult,
  Statement,
  TraceStep,
} from './types'

/**
 * Führt Pseudocode aus und zeichnet dabei jeden Schritt auf.
 *
 * Kernentscheidung: Das Programm läuft EINMAL komplett durch, die vollständige
 * Spur landet in einem Array. Die UI navigiert danach nur noch per Index.
 *
 * Warum nicht ein pausierbarer Interpreter (Generator)? Weil "Schritt zurück"
 * gefordert ist - Generatoren können das nicht, man müsste jedes Mal von vorn
 * rechnen. Möglich ist der Vorab-Durchlauf, weil der Dialekt keine Eingabe-
 * Anweisung kennt: Es gibt nichts, worauf gewartet werden müsste.
 *
 * Nebeneffekt: Der Übungsmodus (erste Abweichung zur erwarteten Ausgabe finden)
 * wird zu einem simplen Array-Vergleich.
 */

export const MAX_STEPS = 10_000
const MAX_CALL_DEPTH = 200

/** Signalisiert GIB … ZURÜCK - kein Fehler, sondern Kontrollfluss. */
class ReturnSignal {
  constructor(readonly value: PseudoValue | undefined) {}
}

interface Frame {
  /** Variablen dieser Ebene. Funktionen sehen bewusst NICHT die globalen. */
  variables: Map<string, PseudoValue>
  name?: string
}

class Interpreter {
  private readonly steps: TraceStep[] = []
  private readonly output: string[] = []
  private readonly functions = new Map<string, FunctionDeclaration>()
  private readonly frames: Frame[] = [{ variables: new Map() }]
  /** Spaltenreihenfolge der Wertetabelle: erstes Auftreten gewinnt. */
  private readonly columnOrder: string[] = []

  private get frame(): Frame {
    // frames ist nie leer - der globale Frame wird nie entfernt.
    return this.frames[this.frames.length - 1] as Frame
  }

  // -------------------------------------------------------------------------
  // Spur
  // -------------------------------------------------------------------------

  private record(line: number, description: string, condition?: TraceStep['condition']): void {
    if (this.steps.length >= MAX_STEPS) {
      throw limitError(
        `Das Programm hat mehr als ${MAX_STEPS.toLocaleString('de-DE')} Schritte gebraucht und wurde abgebrochen. ` +
          'Vermutlich läuft eine Schleife endlos - prüfe, ob sich die Abbruchbedingung im Rumpf überhaupt verändert.',
        line,
      )
    }

    const variables: Record<string, PseudoValue> = {}
    for (const [name, value] of this.frame.variables) {
      variables[name] = value
      if (!this.columnOrder.includes(name)) this.columnOrder.push(name)
    }

    this.steps.push({
      line,
      variables,
      outputLength: this.output.length,
      condition,
      description,
      depth: this.frames.length - 1,
      frame: this.frame.name,
    })
  }

  // -------------------------------------------------------------------------
  // Variablen
  // -------------------------------------------------------------------------

  private read(name: string, line: number): PseudoValue {
    const value = this.frame.variables.get(name)
    if (value === undefined) {
      throw runtimeError(
        `Die Variable "${name}" wurde noch nicht gesetzt. Weise ihr vor der Verwendung einen Wert zu.`,
        line,
      )
    }
    return value
  }

  private write(name: string, value: PseudoValue): void {
    this.frame.variables.set(name, value)
  }

  // -------------------------------------------------------------------------
  // Ausführung
  // -------------------------------------------------------------------------

  run(program: { body: Statement[] }, initialVariables?: Record<string, PseudoValue>): void {
    // Vorbelegte Variablen, z. B. um einen Funktionsrumpf mit festen Parametern
    // durchzuspielen, ohne den Aufruf hinzuschreiben.
    if (initialVariables) {
      for (const [name, value] of Object.entries(initialVariables)) this.write(name, value)
    }

    // Funktionen zuerst registrieren, damit sie auch vorher aufgerufen werden dürfen.
    for (const statement of program.body) {
      if (statement.kind === 'function') this.functions.set(statement.name, statement)
    }

    this.record(program.body[0]?.line ?? 1, 'Start')

    for (const statement of program.body) {
      if (statement.kind === 'function') continue
      this.execute(statement)
    }
  }

  private executeBlock(statements: Statement[]): void {
    for (const statement of statements) this.execute(statement)
  }

  private execute(statement: Statement): void {
    switch (statement.kind) {
      case 'function':
        this.functions.set(statement.name, statement)
        return

      case 'assign': {
        const value = this.evaluate(statement.value)

        if (statement.target.kind === 'identifier') {
          this.write(statement.target.name, value)
          this.record(statement.line, `${statement.target.name} ← ${formatValue(value)}`)
          return
        }

        // Array-Element: a[i] ← wert
        const { arrayName, index, array } = this.resolveIndexTarget(statement.target, statement.line)
        // Copy-on-write: neue Kopie statt Mutation, damit ältere Schritte in der
        // Spur ihren alten Zustand behalten.
        const updated = [...array]
        updated[index] = value
        this.write(arrayName, updated)
        this.record(statement.line, `${arrayName}[${index}] ← ${formatValue(value)}`)
        return
      }

      case 'output': {
        const value = this.evaluate(statement.value)
        this.output.push(formatValue(value))
        this.record(statement.line, `Ausgabe: ${formatValue(value)}`)
        return
      }

      case 'return':
        throw new ReturnSignal(statement.value ? this.evaluate(statement.value) : undefined)

      case 'expression':
        this.evaluate(statement.expression)
        this.record(statement.line, describeExpression(statement.expression))
        return

      case 'if': {
        for (const branch of statement.branches) {
          const result = this.toBoolean(this.evaluate(branch.condition), branch.condition.line)
          this.record(statement.line, `Bedingung geprüft`, {
            text: describeExpression(branch.condition),
            result,
          })
          if (result) {
            this.executeBlock(branch.body)
            return
          }
        }
        if (statement.elseBody) this.executeBlock(statement.elseBody)
        return
      }

      case 'while': {
        while (true) {
          const result = this.toBoolean(this.evaluate(statement.condition), statement.line)
          this.record(statement.line, 'Schleifenbedingung geprüft', {
            text: describeExpression(statement.condition),
            result,
          })
          if (!result) return
          this.executeBlock(statement.body)
        }
      }

      case 'repeat': {
        while (true) {
          this.executeBlock(statement.body)
          const result = this.toBoolean(this.evaluate(statement.condition), statement.condition.line)
          this.record(statement.condition.line, 'Abbruchbedingung geprüft', {
            text: describeExpression(statement.condition),
            result,
          })
          // WIEDERHOLE … BIS: Die Schleife endet, wenn die Bedingung WAHR wird.
          if (result) return
        }
      }

      case 'for': {
        const from = this.toNumber(this.evaluate(statement.from), statement.line)
        const to = this.toNumber(this.evaluate(statement.to), statement.line)
        const step = statement.step ? this.toNumber(this.evaluate(statement.step), statement.line) : 1

        if (step === 0) {
          throw runtimeError(
            'Die Schrittweite einer Zählschleife darf nicht 0 sein - die Schleife würde nie enden.',
            statement.line,
          )
        }

        for (
          let current = from;
          step > 0 ? current <= to : current >= to;
          current += step
        ) {
          this.write(statement.variable, current)
          this.record(statement.line, `${statement.variable} ← ${current}`)
          this.executeBlock(statement.body)
        }
        return
      }
    }
  }

  private resolveIndexTarget(
    target: Extract<Statement, { kind: 'assign' }>['target'],
    line: number,
  ): { arrayName: string; index: number; array: PseudoValue[] } {
    if (target.kind !== 'index') {
      throw runtimeError('Ungültiges Ziel einer Zuweisung.', line)
    }

    if (target.target.kind !== 'identifier') {
      throw runtimeError(
        'Zuweisungen sind nur an einfache Array-Elemente möglich, z. B. a[i] ← 5.',
        line,
      )
    }

    const arrayName = target.target.name
    const array = this.read(arrayName, line)

    if (!Array.isArray(array)) {
      throw runtimeError(`"${arrayName}" ist kein Array - ein Index-Zugriff ist hier nicht möglich.`, line)
    }

    const index = this.toNumber(this.evaluate(target.index), line)
    if (!Number.isInteger(index)) {
      throw runtimeError(`Ein Array-Index muss ganzzahlig sein, war aber ${index}.`, line)
    }
    if (index < 0 || index >= array.length) {
      throw runtimeError(
        `Index ${index} liegt außerhalb von "${arrayName}" (gültig sind 0 bis ${array.length - 1}).`,
        line,
      )
    }

    return { arrayName, index, array }
  }

  // -------------------------------------------------------------------------
  // Ausdrücke
  // -------------------------------------------------------------------------

  private evaluate(expression: Expression): PseudoValue {
    switch (expression.kind) {
      case 'number':
      case 'string':
      case 'boolean':
        return expression.value

      case 'array':
        return expression.elements.map((element) => this.evaluate(element))

      case 'identifier':
        return this.read(expression.name, expression.line)

      case 'index': {
        const target = this.evaluate(expression.target)
        const index = this.toNumber(this.evaluate(expression.index), expression.line)

        if (typeof target === 'string') {
          const character = target[index]
          if (character === undefined) {
            throw runtimeError(
              `Index ${index} liegt außerhalb der Zeichenkette (gültig sind 0 bis ${target.length - 1}).`,
              expression.line,
            )
          }
          return character
        }

        if (!Array.isArray(target)) {
          throw runtimeError('Index-Zugriff ist nur auf Arrays und Zeichenketten möglich.', expression.line)
        }

        const value = target[index]
        if (value === undefined) {
          throw runtimeError(
            `Index ${index} liegt außerhalb des Arrays (gültig sind 0 bis ${target.length - 1}).`,
            expression.line,
          )
        }
        return value
      }

      case 'unary': {
        const operand = this.evaluate(expression.operand)
        if (expression.operator === '-') return -this.toNumber(operand, expression.line)
        return !this.toBoolean(operand, expression.line)
      }

      case 'binary':
        return this.evaluateBinary(expression)

      case 'call':
        return this.callFunction(expression.name, expression.args, expression.line)
    }
  }

  private evaluateBinary(expression: Extract<Expression, { kind: 'binary' }>): PseudoValue {
    const { operator, line } = expression

    // Kurzschlussauswertung - wie in jeder ernstzunehmenden Sprache.
    if (operator === 'UND') {
      if (!this.toBoolean(this.evaluate(expression.left), line)) return false
      return this.toBoolean(this.evaluate(expression.right), line)
    }
    if (operator === 'ODER') {
      if (this.toBoolean(this.evaluate(expression.left), line)) return true
      return this.toBoolean(this.evaluate(expression.right), line)
    }

    const left = this.evaluate(expression.left)
    const right = this.evaluate(expression.right)

    switch (operator) {
      case '=':
        return valuesEqual(left, right)
      case '<>':
        return !valuesEqual(left, right)
      case '+':
        // "+" verbindet auch Zeichenketten - praktisch für Ausgaben.
        if (typeof left === 'string' || typeof right === 'string') {
          return formatValue(left) + formatValue(right)
        }
        return this.toNumber(left, line) + this.toNumber(right, line)
      case '-':
        return this.toNumber(left, line) - this.toNumber(right, line)
      case '*':
        return this.toNumber(left, line) * this.toNumber(right, line)
      case '/': {
        const divisor = this.toNumber(right, line)
        if (divisor === 0) throw runtimeError('Division durch 0 ist nicht definiert.', line)
        return this.toNumber(left, line) / divisor
      }
      case 'DIV': {
        const divisor = this.toNumber(right, line)
        if (divisor === 0) throw runtimeError('Division durch 0 ist nicht definiert.', line)
        return Math.trunc(this.toNumber(left, line) / divisor)
      }
      case 'MOD': {
        const divisor = this.toNumber(right, line)
        if (divisor === 0) throw runtimeError('MOD mit 0 ist nicht definiert.', line)
        return this.toNumber(left, line) % divisor
      }
      case '<':
        return this.compare(left, right, line) < 0
      case '>':
        return this.compare(left, right, line) > 0
      case '<=':
        return this.compare(left, right, line) <= 0
      case '>=':
        return this.compare(left, right, line) >= 0
      default:
        throw runtimeError(`Unbekannter Operator "${operator}".`, line)
    }
  }

  private compare(left: PseudoValue, right: PseudoValue, line: number): number {
    if (typeof left === 'string' && typeof right === 'string') {
      return left < right ? -1 : left > right ? 1 : 0
    }
    const a = this.toNumber(left, line)
    const b = this.toNumber(right, line)
    return a < b ? -1 : a > b ? 1 : 0
  }

  private callFunction(name: string, args: Expression[], line: number): PseudoValue {
    const declaration = this.functions.get(name)

    if (!declaration) {
      const builtin = this.callBuiltin(name, args, line)
      if (builtin !== undefined) return builtin
      throw runtimeError(`Die Funktion "${name}" ist nicht definiert.`, line)
    }

    if (args.length !== declaration.parameters.length) {
      throw runtimeError(
        `"${name}" erwartet ${declaration.parameters.length} Argument(e), bekommen hat sie ${args.length}.`,
        line,
      )
    }

    // Argumente noch im aufrufenden Frame auswerten.
    const values = args.map((argument) => this.evaluate(argument))

    if (this.frames.length > MAX_CALL_DEPTH) {
      throw limitError(
        `Die Aufruftiefe von ${MAX_CALL_DEPTH} wurde überschritten - vermutlich eine Rekursion ohne Abbruchbedingung.`,
        line,
      )
    }

    const variables = new Map<string, PseudoValue>()
    declaration.parameters.forEach((parameter, position) => {
      variables.set(parameter, values[position] as PseudoValue)
    })

    this.frames.push({ variables, name })
    this.record(declaration.line, `Aufruf ${name}(${values.map(formatValue).join(', ')})`)

    try {
      this.executeBlock(declaration.body)
      return 0 // Funktion ohne GIB … ZURÜCK
    } catch (error) {
      if (error instanceof ReturnSignal) {
        const result = error.value ?? 0
        this.record(declaration.line, `${name} gibt ${formatValue(result)} zurück`)
        return result
      }
      throw error
    } finally {
      this.frames.pop()
    }
  }

  /** Kleine eingebaute Helfer, die in Prüfungsaufgaben üblich sind. */
  private callBuiltin(name: string, args: Expression[], line: number): PseudoValue | undefined {
    const lower = name.toLowerCase()
    const values = args.map((argument) => this.evaluate(argument))
    const first = values[0]

    switch (lower) {
      case 'länge':
      case 'laenge':
      case 'length':
      case 'size': {
        if (typeof first === 'string') return first.length
        if (Array.isArray(first)) return first.length
        throw runtimeError(`"${name}" erwartet ein Array oder eine Zeichenkette.`, line)
      }
      case 'abs':
        return Math.abs(this.toNumber(first ?? 0, line))
      case 'ganzzahl':
      case 'int':
        return Math.trunc(this.toNumber(first ?? 0, line))
      default:
        return undefined
    }
  }

  // -------------------------------------------------------------------------
  // Typumwandlung
  // -------------------------------------------------------------------------

  private toNumber(value: PseudoValue, line: number): number {
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1 : 0
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed) && value.trim() !== '') return parsed
    }
    throw runtimeError(`Hier wird eine Zahl erwartet, vorhanden ist ${formatValue(value)}.`, line)
  }

  private toBoolean(value: PseudoValue, line: number): boolean {
    if (typeof value === 'boolean') return value
    throw runtimeError(
      `Hier wird eine Bedingung (WAHR oder FALSCH) erwartet, vorhanden ist ${formatValue(value)}. ` +
        'Verwechselst du eventuell "=" (Vergleich) mit "←" (Zuweisung)?',
      line,
    )
  }

  finish(): { steps: TraceStep[]; output: string[]; columns: string[] } {
    return { steps: this.steps, output: this.output, columns: this.columnOrder }
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

export function formatValue(value: PseudoValue): string {
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`
  if (typeof value === 'boolean') return value ? 'WAHR' : 'FALSCH'
  if (typeof value === 'number') {
    // Fließkomma-Artefakte wie 0.30000000000000004 vermeiden.
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
  }
  return value
}

function valuesEqual(left: PseudoValue, right: PseudoValue): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, i) => valuesEqual(item, right[i] as PseudoValue))
  }
  return left === right
}

/** Rekonstruiert einen Ausdruck als Text - für Bedingungsspalte und Beschreibungen. */
export function describeExpression(expression: Expression): string {
  switch (expression.kind) {
    case 'number':
      return String(expression.value)
    case 'string':
      return `"${expression.value}"`
    case 'boolean':
      return expression.value ? 'WAHR' : 'FALSCH'
    case 'array':
      return `[${expression.elements.map(describeExpression).join(', ')}]`
    case 'identifier':
      return expression.name
    case 'index':
      return `${describeExpression(expression.target)}[${describeExpression(expression.index)}]`
    case 'unary':
      return expression.operator === '-'
        ? `-${describeExpression(expression.operand)}`
        : `NICHT ${describeExpression(expression.operand)}`
    case 'binary': {
      const spaced = ['UND', 'ODER', 'MOD', 'DIV'].includes(expression.operator)
      const operator = spaced ? ` ${expression.operator} ` : ` ${expression.operator} `
      return `${describeExpression(expression.left)}${operator}${describeExpression(expression.right)}`
    }
    case 'call':
      return `${expression.name}(${expression.args.map(describeExpression).join(', ')})`
  }
}

/**
 * Führt Pseudocode aus. Wirft nicht - Fehler kommen als Ergebnis zurück,
 * zusammen mit der Teilspur bis zum Fehler.
 */
export function run(
  source: string,
  options?: { initialVariables?: Record<string, PseudoValue> },
): RunResult {
  const interpreter = new Interpreter()

  try {
    const program = parse(source)
    interpreter.run(program, options?.initialVariables)
    const { steps, output, columns } = interpreter.finish()
    return { ok: true, steps, output, columns }
  } catch (error) {
    const { steps, output, columns } = interpreter.finish()

    if (error instanceof PseudocodeError) {
      return { ok: false, error: error.toInfo(), steps, output, columns }
    }

    if (error instanceof ReturnSignal) {
      return {
        ok: false,
        error: {
          message: 'GIB … ZURÜCK steht außerhalb einer Funktion.',
          phase: 'laufzeit',
        },
        steps,
        output,
        columns,
      }
    }

    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Unbekannter Fehler.',
        phase: 'laufzeit',
      },
      steps,
      output,
      columns,
    }
  }
}
