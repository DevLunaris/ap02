'use client'

import { ArrowRight, Download, RotateCcw, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'

import { useProgress } from '@/lib/progress'
import { cn, plural } from '@/lib/utils'

/**
 * Fortschrittsübersicht auf der Startseite, inklusive Sicherung als Datei.
 *
 * Der Export ist kein Extra: Der gesamte Lernstand liegt im localStorage eines
 * Browsers und wäre mit dem Leeren des Verlaufs weg.
 */
export function ProgressPanel({
  slugs,
  topicTitles,
}: {
  /** Alle Themen-Slugs - Grundlage der Prozentrechnung. */
  slugs: string[]
  /** Slug -> Titel, um das zuletzt besuchte Thema benennen zu können. */
  topicTitles: Record<string, string>
}) {
  const { state, summary, reset, exportJson, importJson } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const stats = summary(slugs)
  const last = state.lastTopic
  const lastTitle = last ? topicTitles[last] : undefined

  const onExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    // Datum im Dateinamen, damit sich mehrere Sicherungen unterscheiden.
    anchor.download = `ap2-lernstand-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: 'Lernstand als Datei gesichert.' })
  }

  const onImport = async (file: File) => {
    const outcome = importJson(await file.text())
    setMessage(
      outcome.ok
        ? { ok: true, text: `${plural(outcome.topics, 'Thema', 'Themen')} ${outcome.mode}.` }
        : { ok: false, text: outcome.message },
    )
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">Dein Lernstand</h2>
        <span className="text-sm tabular-nums text-ink-muted">{stats.percent} %</span>
      </div>

      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lernfortschritt"
      >
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${(stats.sitzt / Math.max(1, stats.total)) * 100}%` }}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${(stats.gelesen / Math.max(1, stats.total)) * 100}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
        <Legend className="bg-emerald-500" label="sitzt" value={stats.sitzt} />
        <Legend className="bg-amber-500" label="gelesen" value={stats.gelesen} />
        <Legend className="bg-surface-sunken border border-line" label="offen" value={stats.offen} />
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        „Gelesen" zählt halb, „sitzt" voll – einmal durchlesen ist nicht dasselbe wie können.
      </p>

      {last && lastTitle && (
        <Link
          href={`/thema/${last}`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Weiterlernen: {lastTitle}
          <ArrowRight size={15} />
        </Link>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        <SmallButton onClick={onExport}>
          <Download size={13} />
          Sichern
        </SmallButton>

        <SmallButton onClick={() => fileInput.current?.click()}>
          <Upload size={13} />
          Wiederherstellen
        </SmallButton>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onImport(file)
            event.target.value = ''
          }}
        />

        <SmallButton
          onClick={() => {
            if (window.confirm('Wirklich den gesamten Lernstand und alle Notizen löschen?')) {
              reset()
              setMessage({ ok: true, text: 'Lernstand zurückgesetzt.' })
            }
          }}
        >
          <RotateCcw size={13} />
          Zurücksetzen
        </SmallButton>
      </div>

      {message && (
        <p
          className={cn(
            'mt-2 text-sm',
            message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
          )}
        >
          {message.text}
        </p>
      )}
    </section>
  )
}

function Legend({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2.5 shrink-0 rounded-full', className)} />
      <span className="tabular-nums">{value}</span> {label}
    </span>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      {children}
    </button>
  )
}
