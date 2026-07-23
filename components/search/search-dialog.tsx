'use client'

import { Search as SearchIcon, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PriorityBadge } from '@/components/topic-meta'
import { prepareIndex, search, type SearchDocument, type SearchHit } from '@/lib/search/search'
import { cn } from '@/lib/utils'

/**
 * Volltextsuche über alle Themen.
 *
 * Der Index wird erst beim ersten Öffnen geladen - so kostet die Suche auf
 * Seiten, auf denen sie nie benutzt wird, gar nichts.
 */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [documents, setDocuments] = useState<SearchDocument[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  // Index nachladen, sobald zum ersten Mal geöffnet wird.
  useEffect(() => {
    if (!open || documents || loadError) return

    let cancelled = false
    void fetch('/api/suche')
      .then((response) => response.json())
      .then((data: SearchDocument[]) => {
        if (!cancelled) setDocuments(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [open, documents, loadError])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const index = useMemo(() => (documents ? prepareIndex(documents) : null), [documents])
  const hits: SearchHit[] = useMemo(
    () => (index && query.trim() ? search(index, query) : []),
    [index, query],
  )

  useEffect(() => setActive(0), [query])

  // Tastatursteuerung innerhalb des Dialogs.
  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (hits.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((value) => (value + 1) % hits.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((value) => (value - 1 + hits.length) % hits.length)
      } else if (event.key === 'Enter') {
        const hit = hits[active]
        if (hit) {
          event.preventDefault()
          window.location.href = `/thema/${hit.document.slug}`
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hits, active, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Themen durchsuchen"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <SearchIcon size={17} className="shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Thema, Begriff oder Stichwort …"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[0.95rem] outline-none placeholder:text-ink-muted"
            aria-label="Suchbegriff"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Suche schließen"
            className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {loadError && (
            <p className="px-4 py-6 text-center text-sm text-rose-700 dark:text-rose-400">
              Der Suchindex konnte nicht geladen werden.
            </p>
          )}

          {!loadError && !documents && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Suchindex wird geladen …</p>
          )}

          {documents && query.trim() === '' && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Tippe los. Umlaute darfst du weglassen.
            </p>
          )}

          {documents && query.trim() !== '' && hits.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nichts gefunden für „{query}".
            </p>
          )}

          {hits.length > 0 && (
            <ul>
              {hits.map((hit, position) => (
                <li key={hit.document.slug}>
                  <Link
                    href={`/thema/${hit.document.slug}`}
                    onClick={onClose}
                    onMouseEnter={() => setActive(position)}
                    className={cn(
                      'block border-b border-line px-4 py-2.5 last:border-0',
                      position === active && 'bg-accent-soft',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{hit.document.title}</span>
                      <PriorityBadge priority={hit.document.priority} />
                      {!hit.document.hasContent && (
                        <span className="text-xs text-ink-muted">noch nicht erstellt</span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
                      {hit.document.summary ?? hit.snippet ?? hit.document.categoryTitle}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 border-t border-line bg-surface-sunken px-4 py-2 text-xs text-ink-muted">
          <Key>↑</Key>
          <Key>↓</Key>
          <span>wählen</span>
          <Key>Enter</Key>
          <span>öffnen</span>
          <Key>Esc</Key>
          <span>schließen</span>
        </div>
      </div>
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.7rem]">
      {children}
    </kbd>
  )
}
