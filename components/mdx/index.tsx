import type { MDXComponents } from 'mdx/types'

import { Callout } from './callout'
import { Checklist } from './checklist'
import { CSharpExercise } from './csharp-exercise'
import { Diagram } from './diagram'
import { DiagramExercise } from './diagram-exercise'
import { FreeText } from './free-text'
import { MultipleChoice } from './multiple-choice'
import { PseudocodeTracer } from './pseudocode-tracer'
import { SqlExerciseMdx } from './sql-exercise-server'
import { TermCard, TermGrid } from './term-card'

/**
 * Alle Komponenten, die in content/topics/*.mdx ohne Import verwendbar sind.
 *
 * Neue Komponenten hier eintragen UND in CLAUDE.md dokumentieren - sonst weiß
 * eine spätere Session nicht, dass es sie gibt.
 */
export const mdxComponents: MDXComponents = {
  Callout,
  Checklist,
  CSharpExercise,
  Diagram,
  DiagramExercise,
  FreeText,
  MultipleChoice,
  PseudocodeTracer,
  // Die Server-Hülle löst schemaId auf und reicht an die Client-Komponente weiter.
  SqlExercise: SqlExerciseMdx,
  TermCard,
  TermGrid,
}

export {
  Callout,
  Checklist,
  CSharpExercise,
  Diagram,
  DiagramExercise,
  FreeText,
  MultipleChoice,
  PseudocodeTracer,
  SqlExerciseMdx,
  TermCard,
  TermGrid,
}
