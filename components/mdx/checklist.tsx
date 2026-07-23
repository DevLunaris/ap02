'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Kurz-Checkliste am Seitenende. Die Haken sind bewusst flüchtig (nur State):
 * Es geht ums Durchgehen vor der Prüfung, nicht um dauerhaften Fortschritt -
 * dafür sind die Statusknöpfe am Thema zuständig.
 */
export function Checklist({ items, title = 'Prüfungs-Checkliste' }: { items: string[]; title?: string }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = (index: number) =>
    setChecked((previous) => {
      const next = new Set(previous)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })

  return (
    <section className="rounded-xl border border-line bg-surface-raised p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-bold tracking-tight">{title}</h3>
        <span className="text-xs tabular-nums text-ink-muted">
          {checked.size} / {items.length}
        </span>
      </div>

      <ul className="space-y-1">
        {items.map((item, index) => {
          const isChecked = checked.has(index)
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isChecked}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[0.95rem] transition-colors hover:bg-surface-sunken"
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded border transition-colors',
                    isChecked
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-line-strong',
                  )}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </span>
                <span className={cn(isChecked && 'text-ink-muted line-through')}>{item}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
