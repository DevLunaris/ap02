import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

import { mdxComponents } from '@/components/mdx'

/**
 * Rendert den MDX-Body eines Themas als React Server Component.
 *
 * next-mdx-remote/rsc statt @next/mdx, weil der Content unter content/topics/
 * außerhalb von app/ liegt und über einen dynamischen Slug geladen wird.
 * Interaktive Komponenten aus mdxComponents sind Client Components - das
 * funktioniert, weil MDXRemote sie als fertige Referenzen übergeben bekommt.
 */
export function TopicContent({ source }: { source: string }) {
  return (
    <div className="mdx">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          parseFrontmatter: false, // Frontmatter wird bereits in topics.ts gelesen.
          /*
           * next-mdx-remote v6 entfernt per Default JEDEN {…}-Ausdruck aus MDX -
           * auch in Attributen. Damit wären `code={`…`}`, `options={[…]}` und
           * `items={[…]}` still weg, und die Komponenten bekämen undefined.
           * Die Härtung zielt auf fremde, hochgeladene Inhalte; unsere MDX-Dateien
           * liegen im Repo und sind vertrauenswürdig, also aus.
           *
           * blockDangerousJS bleibt an (Default): eval, process, fs & Co. haben
           * in einer Themenseite ohnehin nichts zu suchen.
           */
          blockJS: false,
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  )
}
