/**
 * Legt das MDX-Gerüst für ein Thema an.
 *
 *   npm run neues-thema -- sql-joins
 *
 * Zieht Titel, Kategorie und Priorität aus content/topics.index.json und baut die
 * Sektionsstruktur des Qualitätsmaßstabs vor - inklusive der je Priorität
 * geforderten Anzahl Übungen. Schreibt nie über eine vorhandene Datei.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const slug = process.argv[2]

const index = JSON.parse(fs.readFileSync(path.join(root, 'content', 'topics.index.json'), 'utf8'))

if (!slug) {
  const offen = index.topics.filter(
    (t) => !fs.existsSync(path.join(root, 'content', 'topics', `${t.slug}.mdx`)),
  )
  console.error('\nAufruf: npm run neues-thema -- <slug>\n')
  console.error(`Noch offen (${offen.length} von ${index.topics.length}), wichtigste zuerst:\n`)
  for (const t of offen.slice(0, 15)) {
    const stat = [t.frequency !== undefined ? `${t.frequency}%` : null, t.points ? `${t.points} P.` : null]
      .filter(Boolean)
      .join(' / ')
    console.error(`  ${t.slug.padEnd(32)} ${t.priority.padEnd(11)} ${stat}`)
  }
  if (offen.length > 15) console.error(`  … und ${offen.length - 15} weitere`)
  process.exit(1)
}

const topic = index.topics.find((t) => t.slug === slug)
if (!topic) {
  console.error(`\nFEHLER: "${slug}" steht nicht in content/topics.index.json.`)
  console.error('Themen müssen zuerst dort eingetragen werden.\n')
  process.exit(1)
}

const ziel = path.join(root, 'content', 'topics', `${slug}.mdx`)
if (fs.existsSync(ziel)) {
  console.error(`\nFEHLER: content/topics/${slug}.mdx existiert bereits.\n`)
  process.exit(1)
}

/** Umfang je Priorität - siehe "Maßstab für neue Themen" in CLAUDE.md. */
const UMFANG = {
  essentiell: { woerter: 1600, uebungen: 5 },
  'sehr-hoch': { woerter: 1600, uebungen: 5 },
  hoch: { woerter: 1600, uebungen: 4 },
  mittel: { woerter: 700, uebungen: 3 },
  niedrig: { woerter: 400, uebungen: 2 },
}
const umfang = UMFANG[topic.priority] ?? UMFANG.mittel

// Verwandte Themen aus derselben Kategorie vorschlagen.
const verwandt = index.topics
  .filter((t) => t.category === topic.category && t.slug !== slug)
  .slice(0, 3)
  .map((t) => t.slug)

const stat = [
  topic.frequency !== undefined ? `${topic.frequency} % der 9 ausgewerteten Prüfungen` : null,
  topic.points ? `${topic.points} Punkte kumuliert` : null,
].filter(Boolean)

const vorlage = `---
slug: ${slug}
title: ${topic.title}
summary: >-
  TODO: ein bis zwei Sätze für Kacheln und Suchergebnisse.
learningGoals:
  - TODO
  - TODO
  - TODO
related:
${(verwandt.length ? verwandt : ['TODO']).map((s) => `  - ${s}`).join('\n')}
---

{/*
  Priorität: ${topic.priority}${stat.length ? ` · ${stat.join(' · ')}` : ' · keine Prüfungsdaten belegt'}
  Zielumfang: ~${umfang.woerter} Wörter, mindestens ${umfang.uebungen} Übungen.

  Maßstab (siehe CLAUDE.md):
  - Merksatz-Callout weit oben: warum bringt das Thema Punkte?
  - EIN tragender Gedanke statt einer Regelliste
  - genau sechs nummerierte Stolperfallen
  - jede MultipleChoice-Option begründet, auch die falschen
  - Checkliste am Ende
  Diesen Kommentar vor dem Committen löschen.
*/}

TODO: Einstieg – was ist das, und was verlangt die Prüfung konkret?

<Callout type="merksatz" title="TODO">
  TODO: der eine Gedanke, aus dem sich der Rest herleiten lässt.
</Callout>

## Kernbegriffe

<TermGrid>
  <TermCard term="TODO">TODO</TermCard>
  <TermCard term="TODO">TODO</TermCard>
</TermGrid>

## TODO: Erklärteil

TODO

## Stolperfallen

<Callout type="achtung" title="Die sechs teuersten Fehler">
  1. **TODO**
  2. **TODO**
  3. **TODO**
  4. **TODO**
  5. **TODO**
  6. **TODO**
</Callout>

## Übungen

<MultipleChoice
  title="Übung 1: TODO"
  question="TODO"
  options={[
    { text: 'TODO', correct: true, explanation: 'TODO' },
    { text: 'TODO', correct: false, explanation: 'TODO – warum ist das falsch?' },
  ]}
/>

<FreeText
  title="Übung 2: TODO"
  question="TODO"
  solution={<>TODO</>}
/>

<Checklist
  items={[
    'TODO',
    'TODO',
  ]}
/>
`

fs.writeFileSync(ziel, vorlage)

console.log(`\nAngelegt: content/topics/${slug}.mdx`)
console.log(`  ${topic.title} · ${topic.priority}${stat.length ? ` · ${stat.join(' · ')}` : ''}`)
console.log(`  Ziel: ~${umfang.woerter} Wörter, mindestens ${umfang.uebungen} Übungen`)
console.log(`\nDanach: npm test  (der Wächter prüft Struktur und führt jede Übung aus)\n`)
