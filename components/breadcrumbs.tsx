import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export interface Crumb {
  label: string
  /** Ohne href wird der Eintrag als aktuelle Seite gerendert. */
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Brotkrümelnavigation">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        <li>
          <Link href="/" className="hover:text-ink">
            Start
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight size={13} className="shrink-0 opacity-60" />
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
