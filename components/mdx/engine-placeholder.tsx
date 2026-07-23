import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Platzhalter für die drei interaktiven Engines, solange sie noch nicht gebaut sind.
 *
 * Zeigt bewusst den echten, bereits geparsten Inhalt (Code, Schema, Testfälle) an:
 * So steht die MDX-Props-API fest und Inhalte lassen sich schon schreiben, bevor
 * die Engine existiert. Wird in Phase 2/3 ersatzlos durch die echte UI abgelöst.
 */
export function EnginePlaceholder({
  phase,
  what,
  children,
}: {
  /** z. B. "Phase 2" - macht im UI sichtbar, wann es kommt. */
  phase: string
  what: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
        <Construction size={15} className="shrink-0" />
        <span>
          <strong className="font-semibold text-ink">{what}</strong> folgt in {phase}. Die
          Aufgabendaten unten sind bereits vollständig eingelesen.
        </span>
      </p>
      {children}
    </div>
  )
}

/** Read-only-Codeblock für die Platzhalter - später ersetzt durch Monaco. */
export function StaticCode({ code, label }: { code: string; label?: string }) {
  return (
    <div>
      {label && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      )}
      <pre className="overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-[0.8rem] leading-relaxed">
        {code.trim()}
      </pre>
    </div>
  )
}
