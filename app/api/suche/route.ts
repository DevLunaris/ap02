import { NextResponse } from 'next/server'

import { buildSearchIndex } from '@/lib/search/index-builder'

/**
 * Liefert den Suchindex an den Client.
 *
 * Als eigene Route statt eingebettet ins Layout, damit der Fließtext aller Themen
 * nicht auf jeder Seite mitgeladen wird - der Client holt ihn erst, wenn die Suche
 * das erste Mal geöffnet wird.
 */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(buildSearchIndex(), {
    headers: {
      // Der Index ändert sich nur beim Build.
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
