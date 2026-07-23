import type { TraceStep } from './types'

/**
 * Übungsmodus: Vergleicht die getippte Erwartung mit der tatsächlichen Ausgabe
 * und findet den Schritt, ab dem beides auseinanderläuft.
 *
 * Möglich ist das so einfach, weil die Spur vollständig vorberechnet vorliegt -
 * siehe interpreter.ts.
 */

export interface OutputComparison {
  correct: boolean
  expected: string[]
  actual: string[]
  /** Index der ersten abweichenden Zeile; -1, wenn alles passt. */
  firstMismatch: number
  /** Schritt in der Spur, der die erste abweichende Zeile erzeugt hat. */
  mismatchStep?: number
  /** Erklärender Satz für die UI. */
  hint?: string
}

/** Toleriert unterschiedliche Zeilenenden und Leerraum an den Rändern. */
function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Findet den Spur-Schritt, der die Ausgabezeile mit dem gegebenen Index erzeugt hat.
 * Das ist der erste Schritt, dessen outputLength den Index übersteigt.
 */
function findStepForOutputLine(steps: TraceStep[], outputIndex: number): number | undefined {
  const position = steps.findIndex((step) => step.outputLength > outputIndex)
  return position === -1 ? undefined : position
}

export function compareOutput(
  expectedInput: string | string[],
  actual: string[],
  steps: TraceStep[],
): OutputComparison {
  const expected = Array.isArray(expectedInput)
    ? expectedInput.map((line) => line.trim()).filter((line) => line.length > 0)
    : normalizeLines(expectedInput)

  const limit = Math.max(expected.length, actual.length)
  let firstMismatch = -1

  for (let i = 0; i < limit; i++) {
    if (expected[i] !== actual[i]) {
      firstMismatch = i
      break
    }
  }

  if (firstMismatch === -1) {
    return { correct: true, expected, actual, firstMismatch: -1 }
  }

  const expectedLine = expected[firstMismatch]
  const actualLine = actual[firstMismatch]

  let hint: string
  if (actualLine === undefined) {
    hint =
      `Du hast ${expected.length} Ausgabezeile(n) erwartet, das Programm erzeugt aber nur ${actual.length}. ` +
      `Ab Zeile ${firstMismatch + 1} deiner Erwartung ("${expectedLine}") gibt es keine Ausgabe mehr.`
  } else if (expectedLine === undefined) {
    hint =
      `Das Programm gibt mehr Zeilen aus als erwartet: Zeile ${firstMismatch + 1} lautet "${actualLine}". ` +
      'Läuft eine Schleife öfter, als du gedacht hast?'
  } else {
    hint =
      `Die erste Abweichung ist Ausgabezeile ${firstMismatch + 1}: ` +
      `erwartet "${expectedLine}", tatsächlich "${actualLine}".`
  }

  // Bei zu wenig Ausgabe gibt es keinen erzeugenden Schritt - dann auf den
  // letzten vorhandenen Ausgabeschritt zeigen.
  const mismatchStep =
    actualLine === undefined
      ? findStepForOutputLine(steps, Math.max(0, actual.length - 1))
      : findStepForOutputLine(steps, firstMismatch)

  return { correct: false, expected, actual, firstMismatch, mismatchStep, hint }
}
