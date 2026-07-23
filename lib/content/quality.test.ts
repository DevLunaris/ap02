import { describe, expect, it } from 'vitest'

import { getAllExercises } from './exercises'
import { getAllTopics } from './topics'

/**
 * Erzwingt den Qualitätsmaßstab aus CLAUDE.md.
 *
 * Bisher stand er nur dort und wurde von nichts geprüft - über 86 zu schreibende
 * Themen wäre das eine Einladung, still davon abzuweichen. Geprüft wird nur, was
 * sich objektiv messen lässt; Textqualität bleibt Handarbeit.
 */

const written = getAllTopics().filter((topic) => topic.hasContent)
const exercises = getAllExercises()

/** Mindestumfang je Priorität - siehe "Tiefe gestaffelt" in CLAUDE.md. */
const MIN_EXERCISES: Record<string, number> = {
  essentiell: 4,
  'sehr-hoch': 4,
  hoch: 4,
  mittel: 2,
  niedrig: 2,
}

describe('Ausgearbeitete Themen', () => {
  it('es gibt überhaupt welche', () => {
    expect(written.length).toBeGreaterThan(0)
  })

  it.each(written.map((topic) => [topic.slug, topic] as const))(
    '%s erfüllt den Maßstab',
    (slug, topic) => {
      const body = topic.body ?? ''
      const own = exercises.filter((exercise) => exercise.topicSlug === slug)

      // Kein Content ohne Übung - die zentrale Regel aus PROJEKT.md.
      const minimum = MIN_EXERCISES[topic.priority] ?? 2
      expect(own.length, `braucht mindestens ${minimum} Übungen`).toBeGreaterThanOrEqual(minimum)

      // Abschluss-Checkliste für die letzten Minuten vor der Abgabe.
      expect(body, 'es fehlt eine <Checklist />').toContain('<Checklist')

      // Lernziele stehen im Frontmatter und erscheinen als Kasten oben.
      expect(topic.learningGoals.length, 'es fehlen learningGoals').toBeGreaterThanOrEqual(3)

      // Eine Zusammenfassung braucht jede Kachel und jedes Suchergebnis.
      expect(topic.summary, 'es fehlt summary im Frontmatter').toBeTruthy()

      // Querverweise halten die Themen zusammen.
      expect(topic.related.length, 'es fehlen related-Verweise').toBeGreaterThanOrEqual(2)
    },
  )
})

describe('Multiple-Choice-Aufgaben', () => {
  const choices = exercises.filter((exercise) => exercise.kind === 'MultipleChoice')

  it('es gibt welche', () => {
    expect(choices.length).toBeGreaterThan(0)
  })

  it.each(choices.map((exercise) => [`${exercise.topicTitle}: ${exercise.title ?? exercise.id}`, exercise] as const))(
    '%s begründet jede Option',
    (_label, exercise) => {
      const correctCount = (exercise.source.match(/correct:\s*(true|false)/g) ?? []).length
      const explanationCount = (exercise.source.match(/explanation:/g) ?? []).length

      expect(correctCount, 'keine Optionen gefunden').toBeGreaterThanOrEqual(2)

      // Der eigentliche Lerneffekt steckt in der Begründung der FALSCHEN Optionen.
      expect(explanationCount, `${correctCount} Optionen, aber nur ${explanationCount} Begründungen`).toBe(
        correctCount,
      )
    },
  )
})

describe('Übungen insgesamt', () => {
  it('jede Übung hat einen Titel', () => {
    // Ohne Titel ist eine Aufgabe im Übungspool nicht wiederzuerkennen.
    const ohne = exercises.filter((exercise) => !exercise.title)
    expect(ohne.map((exercise) => exercise.id)).toEqual([])
  })
})
