import { describe, expect, it } from 'vitest'

import { applyHarness, CODE_PLACEHOLDER, stdoutMatches } from './client'

describe('applyHarness', () => {
  it('gibt den Code unverändert zurück, wenn kein Harness gesetzt ist', () => {
    expect(applyHarness('int a = 1;')).toBe('int a = 1;')
  })

  it('setzt den Code an die Stelle des Platzhalters', () => {
    const harness = `class Program {\n${CODE_PLACEHOLDER}\n  static void Main() {}\n}`
    const result = applyHarness('  int Add(int a) => a;', harness)

    expect(result).toContain('int Add(int a) => a;')
    expect(result).not.toContain(CODE_PLACEHOLDER)
    expect(result.startsWith('class Program {')).toBe(true)
  })

  it('ersetzt jeden Platzhalter, nicht nur den ersten', () => {
    const result = applyHarness('X', `${CODE_PLACEHOLDER}|${CODE_PLACEHOLDER}`)
    expect(result).toBe('X|X')
  })

  it('hängt den Code an, wenn der Harness keinen Platzhalter enthält', () => {
    // Besser sichtbar anhängen als still das Falsche ausführen.
    const result = applyHarness('int a = 1;', '// Rahmen ohne Platzhalter')
    expect(result).toContain('// Rahmen ohne Platzhalter')
    expect(result).toContain('int a = 1;')
  })
})

describe('stdoutMatches', () => {
  it('erkennt identische Ausgaben', () => {
    expect(stdoutMatches('7\n', '7\n')).toBe(true)
  })

  it('toleriert fehlenden oder zusätzlichen Zeilenumbruch am Ende', () => {
    expect(stdoutMatches('7', '7\n')).toBe(true)
    expect(stdoutMatches('7\n\n', '7')).toBe(true)
  })

  it('toleriert Windows-Zeilenenden', () => {
    expect(stdoutMatches('1\r\n2\r\n', '1\n2\n')).toBe(true)
  })

  it('toleriert Leerraum am Zeilenende', () => {
    expect(stdoutMatches('7   \n', '7\n')).toBe(true)
  })

  it('unterscheidet abweichende Werte', () => {
    expect(stdoutMatches('7\n', '8\n')).toBe(false)
  })

  it('unterscheidet die Zeilenreihenfolge', () => {
    expect(stdoutMatches('1\n2\n', '2\n1\n')).toBe(false)
  })

  it('achtet auf Einrückung am Zeilenanfang', () => {
    // Führender Leerraum kann Teil der Aufgabe sein (z. B. Baumausgabe).
    expect(stdoutMatches('  7\n', '7\n')).toBe(false)
  })
})
