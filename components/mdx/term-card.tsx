import type { ReactNode } from 'react'

/** Kernbegriff mit Definition. Mehrere davon dürfen in <TermGrid> stehen. */
export function TermCard({
  term,
  children,
}: {
  term: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-4">
      <dt className="font-bold tracking-tight">{term}</dt>
      <dd className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted [&>*+*]:mt-2">
        {children}
      </dd>
    </div>
  )
}

export function TermGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
}
