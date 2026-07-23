import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'

/**
 * Geteilte Seed-Schemas für SQL-Übungen.
 *
 * Ohne das stünde dasselbe CREATE TABLE in jeder einzelnen Übung - bei zwölf
 * SQL-Themen mit je drei bis vier Aufgaben wären das rund 40 Kopien, die bei
 * jeder Spaltenänderung alle angefasst werden müssten.
 *
 * In MDX: <SqlExercise schemaId="handel" … /> statt schema={`…`}
 */

const SCHEMA_DIR = path.join(process.cwd(), 'content', 'schemas')

export const getSchemaIds = cache((): string[] => {
  if (!fs.existsSync(SCHEMA_DIR)) return []
  return fs
    .readdirSync(SCHEMA_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.replace(/\.sql$/, ''))
    .sort()
})

/**
 * Lädt ein Schema. Wirft mit einer Meldung, die alle vorhandenen Kennungen
 * nennt - ein Tippfehler im MDX soll sofort klar sein, nicht erst im Browser.
 */
export const getSchema = cache((id: string): string => {
  const file = path.join(SCHEMA_DIR, `${id}.sql`)

  if (!fs.existsSync(file)) {
    const known = getSchemaIds()
    throw new Error(
      `Unbekanntes SQL-Schema "${id}". Vorhanden sind: ${known.join(', ') || '(keine)'}. ` +
        `Schemas liegen in content/schemas/<id>.sql.`,
    )
  }

  return fs.readFileSync(file, 'utf8')
})
