/**
 * Zentrale Prüfungs-Konfiguration. Alles, was sich am Prüfungstermin ändert,
 * steht hier - sonst nirgends.
 */

/**
 * PLATZHALTER - Sommerprüfung 2027. Sobald der echte Termin feststeht,
 * hier das Datum eintragen; alle Countdowns ziehen automatisch nach.
 */
export const EXAM_DATE = new Date('2027-05-04T09:00:00+02:00')

export const EXAM_LABEL = 'AP2 Sommer 2027'

/** Die vier Prüfungsbereiche mit ihrer Gewichtung. Reihenfolge = Anzeigereihenfolge. */
export const EXAM_AREAS = [
  {
    id: 'projekt',
    title: 'Projektarbeit',
    short: 'Projekt',
    weight: 50,
    duration: null,
    description: 'Dokumentation, Präsentation und Fachgespräch.',
  },
  {
    id: 'planung',
    title: 'Planen eines Softwareproduktes',
    short: 'Planung',
    weight: 10,
    duration: 90,
    description: 'UML, ERM & Normalisierung, Architektur & Design Patterns, Vorgehensmodelle, BPMN 2.0.',
  },
  {
    id: 'algorithmen',
    title: 'Entwicklung und Umsetzung von Algorithmen',
    short: 'Algorithmen',
    weight: 10,
    duration: 90,
    description: 'Pseudocode & Tracing, SQL, OOP, Testverfahren & Coverage, Sortieralgorithmen.',
  },
  {
    id: 'wiso',
    title: 'Wirtschafts- und Sozialkunde',
    short: 'WiSo',
    weight: 10,
    duration: 60,
    description: 'Arbeits- und Ausbildungsrecht, Sozialversicherung, BGB & Vertragsarten, Rechtsformen, Nachhaltigkeit.',
  },
] as const

export type ExamAreaId = (typeof EXAM_AREAS)[number]['id']

export function getExamArea(id: ExamAreaId) {
  return EXAM_AREAS.find((area) => area.id === id)
}

/** Verbleibende volle Tage bis zur Prüfung. Negativ, wenn der Termin vorbei ist. */
export function daysUntilExam(now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((EXAM_DATE.getTime() - now.getTime()) / msPerDay)
}
