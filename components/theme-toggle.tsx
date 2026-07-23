'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Hell', Icon: Sun },
  { value: 'dark', label: 'Dunkel', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Vor der Hydration ist das aktive Theme unbekannt; ein Platzhalter gleicher
  // Größe verhindert einen Layout-Sprung.
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-8 w-[6.5rem] rounded-lg border border-line" aria-hidden />
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-raised p-0.5"
      role="radiogroup"
      aria-label="Farbschema"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            theme === value
              ? 'bg-accent-soft text-accent-text'
              : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
          )}
        >
          <Icon size={15} strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}
