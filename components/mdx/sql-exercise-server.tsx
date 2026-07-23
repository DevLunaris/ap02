import { getSchema } from '@/lib/content/schemas'

import { SqlExercise, type SqlExerciseProps } from './sql-exercise'

/**
 * Server-Hülle um <SqlExercise />.
 *
 * Löst `schemaId` gegen content/schemas/<id>.sql auf, damit sich mehrere Übungen
 * dieselbe Übungsdatenbank teilen können. Die eigentliche Komponente bleibt ein
 * Client Component und sieht am Ende immer ein fertiges `schema`.
 *
 * Registriert ist diese Hülle in components/mdx/index.tsx - die Komponenten-Map
 * wird serverseitig zusammengebaut, deshalb funktioniert der Dateizugriff hier.
 */
export type SqlExerciseMdxProps = Omit<SqlExerciseProps, 'schema'> &
  (
    | { schema: string; schemaId?: never }
    | { schemaId: string; schema?: never }
  )

export function SqlExerciseMdx({ schema, schemaId, ...rest }: SqlExerciseMdxProps) {
  if (!schema && !schemaId) {
    throw new Error(
      `<SqlExercise title="${rest.title ?? ''}"> braucht entweder schema={\`…\`} oder schemaId="…".`,
    )
  }

  return <SqlExercise {...rest} schema={schema ?? getSchema(schemaId as string)} />
}
