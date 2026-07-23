import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Übungspool',
}

export default function ExercisePoolPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-black tracking-tight">Übungspool</h1>
      <p className="text-ink-muted">
        Hier kommen später alle Übungen aller Themen gemischt zusammen, filterbar nach
        Prüfungsbereich und Übungstyp – gedacht für den Endspurt.
      </p>
      <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-ink-muted">
        Folgt in Phase 5. Solange die Engines noch entstehen, wäre ein Pool ohne ausführbare
        Übungen wenig wert.
      </p>
      <Link href="/themen" className="inline-block text-sm font-semibold text-accent-text hover:underline">
        Zu allen Themen
      </Link>
    </div>
  )
}
