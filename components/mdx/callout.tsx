import { AlertTriangle, BookmarkCheck, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type CalloutType = 'achtung' | 'tipp' | 'merksatz'

const VARIANTS: Record<
  CalloutType,
  { label: string; Icon: typeof AlertTriangle; frame: string; accent: string }
> = {
  achtung: {
    label: 'Achtung',
    Icon: AlertTriangle,
    frame: 'border-rose-500/30 bg-rose-500/[0.06]',
    accent: 'text-rose-700 dark:text-rose-300',
  },
  tipp: {
    label: 'Tipp',
    Icon: Lightbulb,
    frame: 'border-sky-500/30 bg-sky-500/[0.06]',
    accent: 'text-sky-700 dark:text-sky-300',
  },
  merksatz: {
    label: 'Merksatz',
    Icon: BookmarkCheck,
    frame: 'border-emerald-500/30 bg-emerald-500/[0.06]',
    accent: 'text-emerald-700 dark:text-emerald-300',
  },
}

export function Callout({
  type = 'tipp',
  title,
  children,
}: {
  type?: CalloutType
  title?: string
  children: ReactNode
}) {
  const variant = VARIANTS[type] ?? VARIANTS.tipp
  const { Icon } = variant

  return (
    <aside className={cn('rounded-xl border px-4 py-3.5', variant.frame)}>
      <p className={cn('mb-1.5 flex items-center gap-2 text-sm font-bold', variant.accent)}>
        <Icon size={16} strokeWidth={2.25} />
        {title ?? variant.label}
      </p>
      <div className="text-[0.95rem] leading-relaxed [&>*+*]:mt-2">{children}</div>
    </aside>
  )
}
