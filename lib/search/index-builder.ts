import 'server-only'

import { cache } from 'react'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { getCategories, getAllTopics } from '@/lib/content/topics'

import type { SearchDocument } from './search'

/**
 * Baut den Suchindex aus den Themen. Läuft serverseitig zur Build-Zeit; der
 * Client bekommt das fertige Ergebnis über /api/suche.
 */

const parser = unified().use(remarkParse).use(remarkMdx)

/**
 * Zieht den durchsuchbaren Text aus einem MDX-Body.
 *
 * Bewusst über den Syntaxbaum statt per Regex: Nur so kommt der Text aus
 * Attributen wie `term="Kohäsion"` oder `task="..."` sicher mit, ohne dass
 * Codeblöcke und Schemata den Index mit Rauschen fluten.
 */
export function mdxToPlainText(body: string): string {
  const tree = parser.parse(body)
  const parts: string[] = []

  visit(tree, (node) => {
    const element = node as {
      type?: string
      value?: string
      name?: string
      attributes?: Array<{ type?: string; name?: string; value?: unknown }>
    }

    // Fließtext und Inline-Code.
    if (element.type === 'text' || element.type === 'inlineCode') {
      if (element.value) parts.push(element.value)
      return
    }

    // Codeblöcke bewusst überspringen - sie helfen beim Suchen kaum und
    // verwässern die Bewertung.
    if (element.type === 'code') return

    if (element.type === 'mdxJsxFlowElement' || element.type === 'mdxJsxTextElement') {
      for (const attribute of element.attributes ?? []) {
        if (attribute.type !== 'mdxJsxAttribute') continue
        // Nur einfache Zeichenketten: `title="…"`, `term="…"`, `task="…"`.
        // Ausdrücke enthalten meist Quelltext und Schemata.
        if (typeof attribute.value === 'string') parts.push(attribute.value)
      }
    }
  })

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** Alle Themen als Suchdokumente. Themen ohne Inhalt sind über Titel auffindbar. */
export const buildSearchIndex = cache((): SearchDocument[] => {
  const categories = new Map(getCategories().map((category) => [category.slug, category.title]))

  return getAllTopics().map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    category: topic.category,
    categoryTitle: categories.get(topic.category) ?? topic.category,
    examArea: topic.examArea,
    priority: topic.priority,
    summary: topic.summary,
    keywords: topic.learningGoals,
    body: topic.body ? mdxToPlainText(topic.body) : '',
    hasContent: topic.hasContent,
  }))
})
