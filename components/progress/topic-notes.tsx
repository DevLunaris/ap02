'use client'

import { Check, NotebookPen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useProgress } from '@/lib/progress'

/**
 * Eigene Notizen zu einem Thema.
 *
 * Wird entprellt gespeichert: Bei jedem Tastendruck in den localStorage zu
 * schreiben wäre unnötig, ein "Speichern"-Knopf dagegen leicht zu vergessen.
 */
const SAVE_DELAY_MS = 600

export function TopicNotes({ slug }: { slug: string }) {
  const { topic, setNotes } = useProgress()
  const stored = topic(slug).notes

  const [draft, setDraft] = useState(stored)
  const [saved, setSaved] = useState(false)
  /** Verhindert, dass der Store-Wert die eigene Eingabe überschreibt. */
  const editing = useRef(false)

  // Von außen geänderten Wert übernehmen (z. B. nach einem Import).
  useEffect(() => {
    if (!editing.current) setDraft(stored)
  }, [stored])

  useEffect(() => {
    if (draft === stored) return

    const timer = setTimeout(() => {
      setNotes(slug, draft)
      editing.current = false
      setSaved(true)
    }, SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [draft, stored, slug, setNotes])

  // Die Bestätigung wieder ausblenden.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 1800)
    return () => clearTimeout(timer)
  }, [saved])

  return (
    <section className="rounded-xl border border-line bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor={`notizen-${slug}`}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted"
        >
          <NotebookPen size={13} />
          Meine Notizen
        </label>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <Check size={12} strokeWidth={3} />
            gespeichert
          </span>
        )}
      </div>

      <textarea
        id={`notizen-${slug}`}
        value={draft}
        onChange={(event) => {
          editing.current = true
          setDraft(event.target.value)
        }}
        rows={4}
        placeholder="Was willst du dir für die Prüfung merken?"
        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[0.95rem] leading-relaxed outline-none focus:border-accent"
      />

      <p className="mt-1.5 text-xs text-ink-muted">
        Wird im Browser gespeichert. Über die Startseite kannst du alles als Datei sichern.
      </p>
    </section>
  )
}
