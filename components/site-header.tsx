'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Start' },
  { href: '/themen', label: 'Themen' },
  { href: '/fokus', label: 'Fokus' },
  { href: '/uebung', label: 'Übung' },
] as const

export function SiteHeader() {
  const pathname = usePathname()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-[0.7rem] font-black text-white">
            AP2
          </span>
          <span className="hidden sm:inline">Lernhub</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                isActive(item.href)
                  ? 'bg-accent-soft font-semibold text-accent-text'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  )
}
