import { describe, expect, it } from 'vitest'

import { EXAM_AREAS } from '@/config/exam'

import { getAllTopics, getCategories, getFocusTopics, getTopic } from './topics'
import { PRIORITIES } from './schema'

/**
 * Wacht über die Integrität des Themen-Index. Läuft absichtlich gegen die echten
 * Dateien - genau die Fehler, die hier auffallen, würden sonst erst beim Build
 * oder gar nicht auffallen.
 */
describe('Themen-Index', () => {
  const topics = getAllTopics()

  it('enthält alle 89 Themen', () => {
    expect(topics).toHaveLength(89)
  })

  it('hat eindeutige Slugs', () => {
    const slugs = topics.map((topic) => topic.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('verweist nur auf bekannte Kategorien', () => {
    const known = new Set(getCategories().map((category) => category.slug))
    for (const topic of topics) {
      expect(known, `Thema ${topic.slug}`).toContain(topic.category)
    }
  })

  it('nutzt nur gültige Prioritäten und Prüfungsbereiche', () => {
    const areas = EXAM_AREAS.map((area) => area.id)
    for (const topic of topics) {
      expect(PRIORITIES, `Thema ${topic.slug}`).toContain(topic.priority)
      expect(areas, `Thema ${topic.slug}`).toContain(topic.examArea)
    }
  })

  it('hält Häufigkeit und Punkte in plausiblen Grenzen', () => {
    for (const topic of topics) {
      if (topic.frequency !== undefined) {
        expect(topic.frequency, `Thema ${topic.slug}`).toBeGreaterThanOrEqual(0)
        expect(topic.frequency, `Thema ${topic.slug}`).toBeLessThanOrEqual(100)
      }
      if (topic.points !== undefined) {
        expect(topic.points, `Thema ${topic.slug}`).toBeGreaterThan(0)
      }
    }
  })

  it('markiert mindestens ein Fokus-Thema', () => {
    expect(getFocusTopics().length).toBeGreaterThan(0)
  })

  it('sortiert nach Relevanz - Essentielles zuerst', () => {
    expect(topics[0]?.priority).toBe('essentiell')
  })
})

describe('getTopic', () => {
  it('liefert das ausgearbeitete Thema pseudocode mit Inhalt', () => {
    const topic = getTopic('pseudocode')
    expect(topic?.hasContent).toBe(true)
    expect(topic?.body).toBeTruthy()
    expect(topic?.learningGoals.length).toBeGreaterThan(0)
  })

  it('liefert für ein noch nicht geschriebenes Thema hasContent=false statt undefined', () => {
    // Bewusst dynamisch: Ein fest verdrahteter Slug wird falsch, sobald das
    // Thema geschrieben ist - genau das ist hier schon einmal passiert.
    const ungeschrieben = getAllTopics().find((topic) => !topic.hasContent)

    expect(ungeschrieben, 'alle Themen sind ausgearbeitet - Test anpassen').toBeDefined()
    expect(ungeschrieben?.hasContent).toBe(false)
    expect(ungeschrieben?.body).toBeUndefined()
  })

  it('liefert undefined für einen unbekannten Slug', () => {
    expect(getTopic('gibt-es-nicht')).toBeUndefined()
  })
})
