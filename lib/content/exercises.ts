import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'

import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { getAllTopics } from './topics'
import type { ExamArea } from './schema'

/**
 * Liest die Übungen aus den MDX-Dateien.
 *
 * Grundlage für /uebung (alle Aufgaben gemischt) und für den Wächter-Test, der
 * jede Aufgabe wirklich ausführt. Beide nutzen dieselbe Extraktion - sonst würde
 * der Test etwas anderes prüfen, als die Seite anzeigt.
 */

/** Komponenten, die als Übung zählen. Reihenfolge = Anzeigereihenfolge im Filter. */
export const EXERCISE_KINDS = [
  'PseudocodeTracer',
  'SqlExercise',
  'CSharpExercise',
  'DiagramExercise',
  'MultipleChoice',
  'FreeText',
] as const

export type ExerciseKind = (typeof EXERCISE_KINDS)[number]

export const EXERCISE_KIND_LABEL: Record<ExerciseKind, string> = {
  PseudocodeTracer: 'Pseudocode',
  SqlExercise: 'SQL',
  CSharpExercise: 'C#',
  DiagramExercise: 'Diagramm',
  MultipleChoice: 'Multiple Choice',
  FreeText: 'Freitext',
}

export interface ExtractedExercise {
  /** Stabile Kennung: <slug>#<laufende Nummer>. */
  id: string
  topicSlug: string
  topicTitle: string
  examArea: ExamArea
  kind: ExerciseKind
  title?: string
  /**
   * Der unveränderte MDX-Ausschnitt dieser Übung. Wird auf /uebung erneut durch
   * die MDX-Pipeline gerendert - dadurch verhält sich die Aufgabe dort exakt wie
   * auf der Themenseite, ohne dass Props von Hand nachgebaut werden müssen.
   */
  source: string
}

const parser = unified().use(remarkParse).use(remarkMdx)

interface JsxNode {
  type?: string
  name?: string | null
  position?: { start?: { offset?: number }; end?: { offset?: number } }
  attributes?: Array<{ type?: string; name?: string; value?: unknown }>
}

function isExerciseKind(name: string): name is ExerciseKind {
  return (EXERCISE_KINDS as readonly string[]).includes(name)
}

/** Titel-Attribut auslesen, sofern es ein einfacher Text ist. */
function readTitle(node: JsxNode): string | undefined {
  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== 'mdxJsxAttribute') continue
    if (attribute.name !== 'title') continue
    if (typeof attribute.value === 'string') return attribute.value
  }
  return undefined
}

/**
 * Findet alle Übungen in einem MDX-Body und schneidet ihren Quelltext heraus.
 * Erwartet den Body **ohne** Frontmatter, damit die Offsets stimmen.
 */
export function extractExercisesFromMdx(body: string): Array<{
  kind: ExerciseKind
  title?: string
  source: string
}> {
  const tree = parser.parse(body)
  const found: Array<{ kind: ExerciseKind; title?: string; source: string }> = []

  visit(tree, (node) => {
    const element = node as JsxNode
    if (element.type !== 'mdxJsxFlowElement') return
    if (!element.name || !isExerciseKind(element.name)) return

    const start = element.position?.start?.offset
    const end = element.position?.end?.offset
    if (start === undefined || end === undefined) return

    found.push({
      kind: element.name,
      title: readTitle(element),
      source: body.slice(start, end),
    })
  })

  return found
}

/** Entfernt den Frontmatter-Block, damit die Positionen zum Body passen. */
export function stripFrontmatter(source: string): string {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/** Alle Übungen aller ausgearbeiteten Themen, in Index-Reihenfolge. */
export const getAllExercises = cache((): ExtractedExercise[] => {
  const exercises: ExtractedExercise[] = []

  for (const topic of getAllTopics()) {
    if (!topic.hasContent || !topic.body) continue

    extractExercisesFromMdx(topic.body).forEach((exercise, index) => {
      exercises.push({
        id: `${topic.slug}#${index}`,
        topicSlug: topic.slug,
        topicTitle: topic.title,
        examArea: topic.examArea,
        kind: exercise.kind,
        title: exercise.title,
        source: exercise.source,
      })
    })
  }

  return exercises
})

/** Zählt die Übungen je Thema - für Kacheln und Listen. */
export function countExercisesByTopic(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const exercise of getAllExercises()) {
    counts[exercise.topicSlug] = (counts[exercise.topicSlug] ?? 0) + 1
  }
  return counts
}

/**
 * Liest eine MDX-Datei außerhalb von content/topics/ - etwa den Styleguide.
 * Nur für Werkzeuge und Tests gedacht.
 */
export function readMdxFile(relativePath: string): string {
  return stripFrontmatter(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'))
}
