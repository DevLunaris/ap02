'use client'

import { Search as SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { SearchDialog } from './search-dialog'

/** Erkennt, ob gerade in ein Feld getippt wird - dann kein Kürzel abfangen. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  // Monaco rendert ein verstecktes Textfeld innerhalb .monaco-editor.
  return target.closest('.monaco-editor') !== null
}

/**
 * Suchknopf im Header samt Dialog und dem Kürzel "/".
 *
 * Das Kürzel wird bewusst nicht ausgelöst, während jemand schreibt - sonst
 * öffnet ein "/" in einer SQL-Abfrage oder in den Notizen die Suche.
 */
export function SearchTrigger() {
  const [open, setOpen] = useState(false)
  const onOpen = useCallback(() => setOpen(true), [])
  const onClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Themen durchsuchen"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <SearchIcon size={15} />
        <span className="hidden sm:inline">Suchen</span>
        <kbd className="hidden rounded border border-line bg-surface-sunken px-1 font-mono text-[0.7rem] sm:inline">
          /
        </kbd>
      </button>

      <SearchDialog open={open} onClose={onClose} />
    </>
  )
}
