import type { Metadata } from 'next'

import { FocusList } from '@/components/focus-list'
import { getFocusTopics } from '@/lib/content/topics'
import { plural } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Fokus-Lernen',
}

export default function FocusPage() {
  const topics = getFocusTopics()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Fokus-Lernen</h1>
        <p className="mt-1.5 text-ink-muted">
          Die Themen mit dem besten Verhältnis aus Aufwand und Prüfungspunkten – in dieser
          Reihenfolge durcharbeiten. Der Knopf rechts schaltet den Status weiter:
          offen → gelesen → sitzt.
        </p>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {plural(topics.length, 'Thema', 'Themen')} · gesteuert über das Feld{' '}
          <code className="font-mono text-xs">focus</code> in{' '}
          <code className="font-mono text-xs">content/topics.index.json</code>
        </p>
      </header>

      <FocusList topics={topics} />
    </div>
  )
}
