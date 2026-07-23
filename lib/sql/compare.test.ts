import { describe, expect, it } from 'vitest'

import {
  compareResultSets,
  compareSnapshots,
  explainSqliteError,
  hasOrderBy,
  statementKind,
} from './compare'
import type { QueryResult, TableSnapshot } from './types'

function result(columns: string[], values: Array<Array<string | number | null>>): QueryResult {
  return { columns, values }
}

describe('hasOrderBy', () => {
  it('erkennt ORDER BY', () => {
    expect(hasOrderBy('SELECT * FROM k ORDER BY name')).toBe(true)
    expect(hasOrderBy('select * from k order   by name desc')).toBe(true)
  })

  it('erkennt es auch in einer Unterabfrage', () => {
    expect(hasOrderBy('SELECT * FROM (SELECT * FROM k ORDER BY id)')).toBe(true)
  })

  it('meldet nichts ohne ORDER BY', () => {
    expect(hasOrderBy('SELECT * FROM kunde WHERE ort = \'Koeln\'')).toBe(false)
  })

  it('lässt sich von Zeichenketten nicht täuschen', () => {
    expect(hasOrderBy("SELECT * FROM k WHERE name = 'ORDER BY'")).toBe(false)
  })

  it('lässt sich von Kommentaren nicht täuschen', () => {
    expect(hasOrderBy('SELECT * FROM k -- ORDER BY name')).toBe(false)
    expect(hasOrderBy('SELECT * FROM k /* ORDER BY name */')).toBe(false)
  })
})

describe('statementKind', () => {
  it('erkennt Abfragen', () => {
    expect(statementKind('SELECT 1')).toBe('abfrage')
    expect(statementKind('  \n select * from k')).toBe('abfrage')
    expect(statementKind('WITH x AS (SELECT 1) SELECT * FROM x')).toBe('abfrage')
  })

  it('erkennt Änderungen', () => {
    expect(statementKind('INSERT INTO k VALUES (1)')).toBe('aenderung')
    expect(statementKind('UPDATE k SET a = 1')).toBe('aenderung')
    expect(statementKind('DELETE FROM k')).toBe('aenderung')
  })

  it('meldet unbekannt bei leerer Eingabe', () => {
    expect(statementKind('   ')).toBe('unbekannt')
    expect(statementKind('-- nur ein Kommentar')).toBe('unbekannt')
  })
})

describe('compareResultSets - Spalten', () => {
  it('akzeptiert vertauschte Spaltenreihenfolge', () => {
    const mine = result(['gehalt', 'name'], [[4200, 'Meier']])
    const expected = result(['name', 'gehalt'], [['Meier', 4200]])
    expect(compareResultSets(mine, expected, false).equal).toBe(true)
  })

  it('akzeptiert andere Spaltennamen (Aliase)', () => {
    const mine = result(['mitarbeiter'], [['Meier']])
    const expected = result(['name'], [['Meier']])
    expect(compareResultSets(mine, expected, false).equal).toBe(true)
  })

  it('bemängelt eine abweichende Spaltenanzahl', () => {
    const mine = result(['name', 'gehalt'], [['Meier', 4200]])
    const expected = result(['name'], [['Meier']])
    const comparison = compareResultSets(mine, expected, false)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('1 Spalte')
  })
})

describe('compareResultSets - Zeilen', () => {
  const a = result(['name'], [['Meier'], ['Schulz'], ['Yildiz']])

  it('ignoriert die Zeilenreihenfolge ohne ORDER BY', () => {
    const shuffled = result(['name'], [['Yildiz'], ['Meier'], ['Schulz']])
    expect(compareResultSets(shuffled, a, false).equal).toBe(true)
  })

  it('besteht mit ORDER BY auf der Reihenfolge', () => {
    const shuffled = result(['name'], [['Yildiz'], ['Meier'], ['Schulz']])
    const comparison = compareResultSets(shuffled, a, true)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('Reihenfolge')
    expect(comparison.reason).toContain('ORDER BY')
  })

  it('akzeptiert bei ORDER BY die richtige Reihenfolge', () => {
    expect(compareResultSets(a, a, true).equal).toBe(true)
  })

  it('bemängelt eine abweichende Zeilenanzahl', () => {
    const fewer = result(['name'], [['Meier']])
    const comparison = compareResultSets(fewer, a, false)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('3 Zeile')
  })

  it('erkennt gleiche Anzahl bei anderem Inhalt', () => {
    const other = result(['name'], [['Meier'], ['Schulz'], ['Anders']])
    const comparison = compareResultSets(other, a, false)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('Inhalt')
  })

  it('behandelt ein leeres Ergebnis als gültiges Ergebnis', () => {
    const leer = result(['name'], [])
    expect(compareResultSets(leer, leer, false).equal).toBe(true)
  })
})

describe('compareResultSets - Werte', () => {
  it('behandelt "5" und 5 als gleich', () => {
    expect(compareResultSets(result(['a'], [['5']]), result(['a'], [[5]]), false).equal).toBe(true)
  })

  it('unterscheidet NULL von leerem Text', () => {
    const comparison = compareResultSets(result(['a'], [[null]]), result(['a'], [['']]), false)
    expect(comparison.equal).toBe(false)
  })

  it('gleicht Fließkomma-Rundungen aus', () => {
    expect(
      compareResultSets(result(['a'], [[0.1 + 0.2]]), result(['a'], [[0.3]]), false).equal,
    ).toBe(true)
  })

  it('meldet eine fehlende Musterlösung statt still durchzuwinken', () => {
    const comparison = compareResultSets(result(['a'], [[1]]), undefined, false)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('Musterlösung')
  })

  it('weist auf ein fehlendes SELECT hin', () => {
    const comparison = compareResultSets(undefined, result(['a'], [[1]]), false)
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('SELECT')
  })
})

describe('compareSnapshots', () => {
  const snapshot = (rows: Array<Array<string | number>>): TableSnapshot[] => [
    { table: 'kunde', columns: ['id', 'name'], rows },
  ]

  it('erkennt einen gleichen Tabellenzustand', () => {
    expect(compareSnapshots(snapshot([[1, 'Meier']]), snapshot([[1, 'Meier']])).equal).toBe(true)
  })

  it('ignoriert die Zeilenreihenfolge', () => {
    const mine = snapshot([
      [2, 'Schulz'],
      [1, 'Meier'],
    ])
    const expected = snapshot([
      [1, 'Meier'],
      [2, 'Schulz'],
    ])
    expect(compareSnapshots(mine, expected).equal).toBe(true)
  })

  it('erkennt eine fehlende Zeile nach DELETE', () => {
    const comparison = compareSnapshots(snapshot([]), snapshot([[1, 'Meier']]))
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('1 Zeile')
  })

  it('erkennt einen falschen Wert nach UPDATE', () => {
    const comparison = compareSnapshots(snapshot([[1, 'Meyer']]), snapshot([[1, 'Meier']]))
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('kunde')
  })

  it('meldet eine fehlende Tabelle', () => {
    const comparison = compareSnapshots([], snapshot([[1, 'Meier']]))
    expect(comparison.equal).toBe(false)
    expect(comparison.reason).toContain('fehlt')
  })
})

describe('explainSqliteError', () => {
  it('übersetzt unbekannte Tabelle', () => {
    expect(explainSqliteError('no such table: kunden')).toContain('"kunden"')
  })

  it('übersetzt unbekannte Spalte und nennt JOIN als Ursache', () => {
    const message = explainSqliteError('no such column: k.name')
    expect(message).toContain('k.name')
    expect(message).toContain('JOIN')
  })

  it('übersetzt Syntaxfehler mit Fundstelle', () => {
    expect(explainSqliteError('near "FROM": syntax error')).toContain('FROM')
  })

  it('übersetzt Constraint-Verletzungen', () => {
    expect(explainSqliteError('UNIQUE constraint failed: kunde.id')).toContain('vergeben')
    expect(explainSqliteError('NOT NULL constraint failed: kunde.name')).toContain('NULL')
  })

  it('reicht unbekannte Meldungen unverändert durch', () => {
    expect(explainSqliteError('irgendwas Unerwartetes')).toBe('irgendwas Unerwartetes')
  })
})
