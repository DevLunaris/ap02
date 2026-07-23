import fs from 'node:fs'
import path from 'node:path'

import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { TopicContent } from '@/lib/content/mdx'

export const metadata: Metadata = {
  title: 'MDX-Komponenten',
}

/**
 * Lebender Styleguide: rendert content/showcase.mdx mit jeder verfügbaren
 * MDX-Komponente. Bewusst kein Eintrag unter content/topics/ - es ist kein
 * Prüfungsthema und hat im Themen-Index nichts verloren.
 */
export default function ComponentsPage() {
  const source = fs.readFileSync(path.join(process.cwd(), 'content', 'showcase.mdx'), 'utf8')

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: 'MDX-Komponenten' }]} />

      <h1 className="mt-4 text-3xl font-black tracking-tight">MDX-Komponenten</h1>

      <div className="mt-6">
        <TopicContent source={source} />
      </div>
    </div>
  )
}
