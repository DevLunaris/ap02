import type { PseudocodeErrorInfo } from './types'

/**
 * Fehler der Pseudocode-Engine.
 *
 * Die Meldungen richten sich an Lernende, nicht an Compilerbauer: Sie sagen,
 * was fehlt und wo - nicht "unexpected token". Das ist der Unterschied zwischen
 * einem brauchbaren und einem frustrierenden Werkzeug.
 */
export class PseudocodeError extends Error {
  readonly line?: number
  readonly column?: number
  readonly phase: PseudocodeErrorInfo['phase']

  constructor(message: string, phase: PseudocodeErrorInfo['phase'], line?: number, column?: number) {
    super(message)
    this.name = 'PseudocodeError'
    this.phase = phase
    this.line = line
    this.column = column
  }

  toInfo(): PseudocodeErrorInfo {
    return { message: this.message, line: this.line, column: this.column, phase: this.phase }
  }
}

export function syntaxError(message: string, line?: number, column?: number): PseudocodeError {
  return new PseudocodeError(message, 'syntax', line, column)
}

export function runtimeError(message: string, line?: number): PseudocodeError {
  return new PseudocodeError(message, 'laufzeit', line)
}

export function limitError(message: string, line?: number): PseudocodeError {
  return new PseudocodeError(message, 'limit', line)
}

/** "Zeile 4: …" - einheitliches Präfix für die Anzeige. */
export function formatErrorLocation(info: PseudocodeErrorInfo): string {
  return info.line === undefined ? info.message : `Zeile ${info.line}: ${info.message}`
}
