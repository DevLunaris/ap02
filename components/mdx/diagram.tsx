'use client'

import dynamic from 'next/dynamic'

const MermaidRender = dynamic(
  () => import('./mermaid-render').then((module) => module.MermaidRender),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-24 place-items-center text-sm text-ink-muted">
        Diagramm wird geladen …
      </div>
    ),
  },
)

/** Statisches Mermaid-Diagramm im Fließtext (UML, BPMN, ER). */
export function Diagram({ code, caption }: { code: string; caption?: string }) {
  return (
    <figure className="rounded-xl border border-line bg-surface-raised p-4">
      <MermaidRender code={code.trim()} />
      {caption && (
        <figcaption className="mt-3 border-t border-line pt-2.5 text-center text-sm text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
