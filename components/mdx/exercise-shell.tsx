import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Einheitlicher Rahmen für jede Übung - Multiple Choice, Freitext, Pseudocode,
 * SQL, C#, Diagramm. Sorgt dafür, dass Übungen im Fließtext sofort als solche
 * erkennbar sind und später im Übungspool gleich aussehen.
 */
export function ExerciseShell({
  title,
  kind,
  hint,
  children,
  footer,
}: {
  title: string
  /** Kurzes Label oben rechts, z. B. "Multiple Choice" oder "SQL". */
  kind: string
  /** Aufgabenstellung über dem interaktiven Teil. */
  hint?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface-raised">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-sunken px-4 py-2.5">
        <h3 className="text-[0.95rem] font-bold tracking-tight">{title}</h3>
        <span className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
          {kind}
        </span>
      </header>

      <div className="space-y-3 p-4">
        {hint && <div className="text-[0.95rem] leading-relaxed [&>*+*]:mt-2">{hint}</div>}
        {children}
      </div>

      {footer && <div className="border-t border-line px-4 py-2.5 text-sm">{footer}</div>}
    </section>
  )
}

/** Einheitlicher Button-Look innerhalb von Übungen. */
export function ExerciseButton({
  variant = 'secondary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary'
          ? 'bg-accent text-white hover:opacity-90'
          : 'border border-line-strong text-ink hover:bg-surface-sunken',
        className,
      )}
      {...props}
    />
  )
}
