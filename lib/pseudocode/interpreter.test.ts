import { describe, expect, it } from 'vitest'

import { compareOutput } from './check'
import { MAX_STEPS, run } from './interpreter'

/** Kurzhelfer: führt aus und erwartet Erfolg, liefert die Ausgabezeilen. */
function outputOf(source: string): string[] {
  const result = run(source)
  if (!result.ok) throw new Error(`Unerwarteter Fehler: ${result.error.message}`)
  return result.output
}

/** Kurzhelfer: führt aus und erwartet einen Fehler, liefert die Meldung. */
function errorOf(source: string): string {
  const result = run(source)
  if (result.ok) throw new Error('Es wurde ein Fehler erwartet, das Programm lief aber durch.')
  return result.error.message
}

describe('Zuweisung und Ausgabe', () => {
  it('rechnet und gibt aus', () => {
    expect(outputOf('x ← 3 + 4\nGIB x AUS')).toEqual(['7'])
  })

  it('akzeptiert alle drei Zuweisungsoperatoren', () => {
    expect(outputOf('a ← 1\nGIB a AUS')).toEqual(['1'])
    expect(outputOf('a := 2\nGIB a AUS')).toEqual(['2'])
    expect(outputOf('a = 3\nGIB a AUS')).toEqual(['3'])
    expect(outputOf('a <- 4\nGIB a AUS')).toEqual(['4'])
  })

  it('beachtet Punkt vor Strich und Klammern', () => {
    expect(outputOf('GIB 2 + 3 * 4 AUS')).toEqual(['14'])
    expect(outputOf('GIB (2 + 3) * 4 AUS')).toEqual(['20'])
  })

  it('kennt MOD und DIV', () => {
    expect(outputOf('GIB 17 MOD 5 AUS')).toEqual(['2'])
    expect(outputOf('GIB 17 DIV 5 AUS')).toEqual(['3'])
  })

  it('verbindet Zeichenketten mit +', () => {
    expect(outputOf('GIB "Ergebnis: " + 42 AUS')).toEqual(['Ergebnis: 42'])
  })

  it('ignoriert Kommentare', () => {
    expect(outputOf('x ← 5 // das ist ein Kommentar\n# noch einer\nGIB x AUS')).toEqual(['5'])
  })
})

describe('WENN / SONST WENN / SONST', () => {
  const source = `
WENN note <= 1 DANN
  GIB "sehr gut" AUS
SONST WENN note <= 2 DANN
  GIB "gut" AUS
SONST
  GIB "geht so" AUS
ENDE WENN`

  it('nimmt den ersten Zweig', () => {
    expect(outputOf(`note ← 1\n${source}`)).toEqual(['sehr gut'])
  })

  it('nimmt den SONST-WENN-Zweig', () => {
    expect(outputOf(`note ← 2\n${source}`)).toEqual(['gut'])
  })

  it('nimmt den SONST-Zweig', () => {
    expect(outputOf(`note ← 5\n${source}`)).toEqual(['geht so'])
  })

  it('akzeptiert ENDEWENN zusammengeschrieben und ohne DANN', () => {
    expect(outputOf('WENN WAHR\n  GIB 1 AUS\nENDEWENN')).toEqual(['1'])
  })

  it('versteht englische Schlüsselwörter', () => {
    expect(outputOf('if 1 < 2 then\n  GIB "ja" AUS\nend if')).toEqual(['ja'])
  })
})

describe('SOLANGE (kopfgesteuert)', () => {
  it('summiert 1 bis 5', () => {
    const source = `
summe ← 0
i ← 1
SOLANGE i <= 5 TUE
  summe ← summe + i
  i ← i + 1
ENDE SOLANGE
GIB summe AUS`
    expect(outputOf(source)).toEqual(['15'])
  })

  it('läuft null Mal, wenn die Bedingung von Anfang an falsch ist', () => {
    const source = `
i ← 10
SOLANGE i < 5 TUE
  GIB "nie" AUS
ENDE SOLANGE
GIB "fertig" AUS`
    expect(outputOf(source)).toEqual(['fertig'])
  })
})

describe('WIEDERHOLE … BIS (fußgesteuert)', () => {
  it('läuft immer mindestens einmal', () => {
    const source = `
i ← 10
WIEDERHOLE
  GIB i AUS
  i ← i + 1
BIS i > 5`
    // Prüfungsklassiker: Trotz sofort erfüllter Abbruchbedingung gibt es einen Durchlauf.
    expect(outputOf(source)).toEqual(['10'])
  })

  it('endet, sobald die Bedingung wahr wird', () => {
    const source = `
i ← 1
WIEDERHOLE
  GIB i AUS
  i ← i + 1
BIS i > 3`
    expect(outputOf(source)).toEqual(['1', '2', '3'])
  })
})

describe('FÜR (Zählschleife)', () => {
  it('schließt beide Grenzen ein', () => {
    expect(outputOf('FÜR i VON 1 BIS 3 TUE\n  GIB i AUS\nENDE FÜR')).toEqual(['1', '2', '3'])
  })

  it('beherrscht SCHRITT', () => {
    expect(outputOf('FÜR i VON 0 BIS 10 SCHRITT 5 TUE\n  GIB i AUS\nENDE FÜR')).toEqual([
      '0',
      '5',
      '10',
    ])
  })

  it('zählt mit negativem SCHRITT rückwärts', () => {
    expect(outputOf('FÜR i VON 3 BIS 1 SCHRITT -1 TUE\n  GIB i AUS\nENDE FÜR')).toEqual([
      '3',
      '2',
      '1',
    ])
  })

  it('läuft gar nicht, wenn Start hinter Ende liegt', () => {
    expect(outputOf('FÜR i VON 5 BIS 1 TUE\n  GIB i AUS\nENDE FÜR\nGIB "fertig" AUS')).toEqual([
      'fertig',
    ])
  })

  it('lehnt Schrittweite 0 ab', () => {
    expect(errorOf('FÜR i VON 1 BIS 3 SCHRITT 0 TUE\n  GIB i AUS\nENDE FÜR')).toContain('nicht 0')
  })

  it('akzeptiert FUER ohne Umlaut und in Englisch', () => {
    expect(outputOf('FUER i VON 1 BIS 2 TUE\n  GIB i AUS\nENDE FUER')).toEqual(['1', '2'])
    expect(outputOf('for i from 1 to 2 do\n  GIB i AUS\nend for')).toEqual(['1', '2'])
  })
})

describe('Arrays', () => {
  it('liest und schreibt Elemente', () => {
    const source = `
zahlen ← [4, 8, 15]
GIB zahlen[1] AUS
zahlen[1] ← 99
GIB zahlen[1] AUS`
    expect(outputOf(source)).toEqual(['8', '99'])
  })

  it('kennt die Länge', () => {
    expect(outputOf('a ← [1, 2, 3]\nGIB Länge(a) AUS')).toEqual(['3'])
  })

  it('meldet Indexfehler mit gültigem Bereich', () => {
    const message = errorOf('a ← [1, 2]\nGIB a[5] AUS')
    expect(message).toContain('5')
    expect(message).toContain('0 bis 1')
  })

  it('lässt ältere Schritte unverändert (copy-on-write)', () => {
    const result = run('a ← [1, 2]\na[0] ← 99\nGIB a[0] AUS')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Der Schritt direkt nach der Initialisierung muss noch [1, 2] zeigen.
    const afterInit = result.steps.find((step) => step.description.startsWith('a ←'))
    expect(afterInit?.variables.a).toEqual([1, 2])
  })
})

describe('Funktionen', () => {
  it('gibt einen Wert zurück', () => {
    const source = `
FUNKTION quadrat(x)
  GIB x * x ZURÜCK
ENDE FUNKTION
GIB quadrat(7) AUS`
    expect(outputOf(source)).toEqual(['49'])
  })

  it('erlaubt Rekursion', () => {
    const source = `
FUNKTION fakultaet(n)
  WENN n <= 1 DANN
    GIB 1 ZURÜCK
  ENDE WENN
  GIB n * fakultaet(n - 1) ZURÜCK
ENDE FUNKTION
GIB fakultaet(5) AUS`
    expect(outputOf(source)).toEqual(['120'])
  })

  it('darf vor ihrer Definition aufgerufen werden', () => {
    const source = `
GIB verdopple(4) AUS
FUNKTION verdopple(x)
  GIB x * 2 ZURÜCK
ENDE FUNKTION`
    expect(outputOf(source)).toEqual(['8'])
  })

  it('kapselt lokale Variablen gegen das Hauptprogramm ab', () => {
    const source = `
FUNKTION f(a)
  b ← a + 1
  GIB b ZURÜCK
ENDE FUNKTION
b ← 100
GIB f(1) AUS
GIB b AUS`
    expect(outputOf(source)).toEqual(['2', '100'])
  })

  it('prüft die Anzahl der Argumente', () => {
    const source = `
FUNKTION f(a, b)
  GIB a ZURÜCK
ENDE FUNKTION
GIB f(1) AUS`
    expect(errorOf(source)).toContain('2 Argument')
  })

  it('bricht endlose Rekursion ab', () => {
    const source = `
FUNKTION f(n)
  GIB f(n + 1) ZURÜCK
ENDE FUNKTION
GIB f(1) AUS`
    expect(errorOf(source)).toContain('Aufruftiefe')
  })

  it('akzeptiert Typangaben in der Signatur', () => {
    const source = `
FUNKTION quadrat(x: GANZZAHL) → GANZZAHL
  GIB x * x ZURÜCK
ENDE FUNKTION
GIB quadrat(3) AUS`
    expect(outputOf(source)).toEqual(['9'])
  })
})

describe('Logische Operatoren', () => {
  it('wertet UND, ODER, NICHT aus', () => {
    expect(outputOf('GIB WAHR UND FALSCH AUS')).toEqual(['FALSCH'])
    expect(outputOf('GIB WAHR ODER FALSCH AUS')).toEqual(['WAHR'])
    expect(outputOf('GIB NICHT WAHR AUS')).toEqual(['FALSCH'])
  })

  it('nutzt Kurzschlussauswertung', () => {
    // Ohne Kurzschluss würde die Division durch 0 zuschlagen.
    expect(outputOf('n ← 0\nGIB n <> 0 UND (10 / n) > 1 AUS')).toEqual(['FALSCH'])
  })

  it('bindet UND stärker als ODER', () => {
    expect(outputOf('GIB WAHR ODER WAHR UND FALSCH AUS')).toEqual(['WAHR'])
  })
})

describe('Abbruch bei Endlosschleifen', () => {
  it('stoppt nach dem Schrittlimit mit klarer Meldung', () => {
    const result = run('i ← 0\nSOLANGE WAHR TUE\n  i ← i + 1\nENDE SOLANGE')
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.phase).toBe('limit')
    expect(result.error.message).toContain('Schleife')
    // Die Teilspur bleibt erhalten - man sieht, wie weit das Programm kam.
    expect(result.steps.length).toBe(MAX_STEPS)
  })
})

describe('Fehlermeldungen', () => {
  it('nennt bei fehlendem ENDE den öffnenden Block samt Zeile', () => {
    const message = errorOf('WENN WAHR DANN\n  GIB 1 AUS')
    expect(message).toContain('Zeile 1')
    expect(message).toContain('ENDE WENN')
  })

  it('erkennt eine nicht gesetzte Variable', () => {
    expect(errorOf('GIB unbekannt AUS')).toContain('unbekannt')
  })

  it('meldet Division durch 0', () => {
    expect(errorOf('GIB 1 / 0 AUS')).toContain('Division durch 0')
  })

  it('weist bei Zuweisung statt Vergleich auf die Verwechslung hin', () => {
    // "WENN x ← 5" ist Unsinn; die Meldung soll den typischen Fehler ansprechen.
    const message = errorOf('x ← 5\nWENN x DANN\n  GIB 1 AUS\nENDE WENN')
    expect(message).toContain('Zuweisung')
  })

  it('liefert Zeilennummern', () => {
    const result = run('x ← 1\nGIB 1 / 0 AUS')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.line).toBe(2)
  })

  it('behält die Teilspur bis zum Fehler', () => {
    const result = run('a ← 1\nb ← 2\nGIB 1 / 0 AUS')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.steps.length).toBeGreaterThan(1)
  })
})

describe('Spur und Wertetabelle', () => {
  const source = `summe ← 0
FÜR i VON 1 BIS 3 TUE
  summe ← summe + i
ENDE FÜR
GIB summe AUS`

  it('führt die Spalten in Reihenfolge des ersten Auftretens', () => {
    const result = run(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.columns).toEqual(['summe', 'i'])
  })

  it('hält den Variablenzustand je Schritt fest', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const last = result.steps[result.steps.length - 1]
    expect(last?.variables.summe).toBe(6)
    expect(last?.line).toBe(5)
  })

  it('verzeichnet Bedingungen mit Text und Ergebnis', () => {
    const result = run('i ← 5\nWENN i > 3 DANN\n  GIB "ja" AUS\nENDE WENN')
    if (!result.ok) throw new Error('sollte laufen')

    const conditionStep = result.steps.find((step) => step.condition)
    expect(conditionStep?.condition).toEqual({ text: 'i > 3', result: true })
  })

  it('zählt die Ausgabelänge je Schritt mit', () => {
    const result = run('GIB 1 AUS\nGIB 2 AUS')
    if (!result.ok) throw new Error('sollte laufen')

    const lengths = result.steps.map((step) => step.outputLength)
    expect(lengths[lengths.length - 1]).toBe(2)
    // Monoton steigend - Grundlage dafür, den Schritt zu einer Ausgabezeile zu finden.
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b))
  })

  it('markiert Schritte innerhalb einer Funktion mit Tiefe und Namen', () => {
    const source = `
FUNKTION f(x)
  y ← x + 1
  GIB y ZURÜCK
ENDE FUNKTION
GIB f(1) AUS`
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const inside = result.steps.find((step) => step.frame === 'f')
    expect(inside).toBeDefined()
    expect(inside?.depth).toBe(1)
  })
})

describe('Übungsmodus: Ausgabe prüfen', () => {
  const source = 'FÜR i VON 1 BIS 3 TUE\n  GIB i * i AUS\nENDE FÜR'

  it('erkennt eine richtige Erwartung', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const check = compareOutput('1\n4\n9', result.output, result.steps)
    expect(check.correct).toBe(true)
  })

  it('toleriert Leerzeilen und Leerraum', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    expect(compareOutput('  1 \n\n4\n 9  \n', result.output, result.steps).correct).toBe(true)
  })

  it('findet die erste Abweichung und den erzeugenden Schritt', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const check = compareOutput('1\n4\n10', result.output, result.steps)
    expect(check.correct).toBe(false)
    expect(check.firstMismatch).toBe(2)
    expect(check.hint).toContain('erwartet "10"')
    expect(check.mismatchStep).toBeDefined()

    // Der genannte Schritt muss wirklich die dritte Ausgabezeile erzeugt haben.
    const step = result.steps[check.mismatchStep as number]
    expect(step?.outputLength).toBe(3)
  })

  it('meldet, wenn zu wenige Zeilen erwartet wurden', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const check = compareOutput('1\n4', result.output, result.steps)
    expect(check.correct).toBe(false)
    expect(check.hint).toContain('mehr Zeilen')
  })

  it('meldet, wenn zu viele Zeilen erwartet wurden', () => {
    const result = run(source)
    if (!result.ok) throw new Error('sollte laufen')

    const check = compareOutput('1\n4\n9\n16', result.output, result.steps)
    expect(check.correct).toBe(false)
    expect(check.hint).toContain('nur 3')
  })
})

describe('Prüfungstypische Programme', () => {
  it('findet alle Teiler von 12', () => {
    const source = `
n ← 12
i ← 1
SOLANGE i <= n TUE
  WENN n MOD i = 0 DANN
    GIB i AUS
  ENDE WENN
  i ← i + 1
ENDE SOLANGE`
    expect(outputOf(source)).toEqual(['1', '2', '3', '4', '6', '12'])
  })

  it('sortiert mit BubbleSort', () => {
    const source = `
a ← [5, 3, 8, 1]
n ← Länge(a)
FÜR i VON 0 BIS n - 2 TUE
  FÜR j VON 0 BIS n - 2 - i TUE
    WENN a[j] > a[j + 1] DANN
      hilf ← a[j]
      a[j] ← a[j + 1]
      a[j + 1] ← hilf
    ENDE WENN
  ENDE FÜR
ENDE FÜR
GIB a AUS`
    expect(outputOf(source)).toEqual(['[1, 3, 5, 8]'])
  })

  it('berechnet Fibonacci iterativ', () => {
    const source = `
a ← 0
b ← 1
FÜR i VON 1 BIS 6 TUE
  GIB a AUS
  hilf ← a + b
  a ← b
  b ← hilf
ENDE FÜR`
    expect(outputOf(source)).toEqual(['0', '1', '1', '2', '3', '5'])
  })
})

describe('Belegte IHK-Schreibvarianten', () => {
  // Quellen: u-form-Prüfungstrainer FIAE (Musterlösungen) und oer-informatik.de
  // (CC BY 4.0) zum deutschen "Pseudo-Pascal". Es gibt keine verbindliche
  // Notation - der Parser muss die real vorkommenden Varianten lesen können.

  it('akzeptiert "falls" statt "WENN"', () => {
    const source = `x ← 5
falls x > 3 dann
  GIB "gross" AUS
ende falls`
    expect(outputOf(source)).toEqual(['gross'])
  })

  it('akzeptiert "falls … sonst"', () => {
    const source = `x ← 1
falls x > 3 dann
  GIB "gross" AUS
sonst
  GIB "klein" AUS
ende falls`
    expect(outputOf(source)).toEqual(['klein'])
  })

  it('akzeptiert "ZÄHLE i VON a BIS b" als Zählschleife', () => {
    const source = `ZÄHLE i VON 1 BIS 3
  GIB i AUS
ENDE ZÄHLE`
    expect(outputOf(source)).toEqual(['1', '2', '3'])
  })

  it('akzeptiert "RÜCKGABE" statt "GIB … ZURÜCK"', () => {
    const source = `FUNKTION quadrat(x)
  RÜCKGABE x * x
ENDE FUNKTION
GIB quadrat(6) AUS`
    expect(outputOf(source)).toEqual(['36'])
  })

  it('akzeptiert "Rueckgabe:" mit Doppelpunkt', () => {
    const source = `FUNKTION doppelt(x)
  Rueckgabe: x * 2
ENDE FUNKTION
GIB doppelt(21) AUS`
    expect(outputOf(source)).toEqual(['42'])
  })

  it('liest eine Musterlösung im u-form-Stil', () => {
    // Deutschsprachig, "=" als Zuweisung und Vergleich, "falls"/"sonst".
    const source = `suchwort = "b"
gefunden = FALSCH
ZÄHLE i VON 0 BIS 2
  falls suchwort = "b" dann
    gefunden = WAHR
  ende falls
ENDE ZÄHLE
GIB gefunden AUS`
    expect(outputOf(source)).toEqual(['WAHR'])
  })
})
