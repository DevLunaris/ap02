'use client'

import { useTheme } from 'next-themes'
import { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Rendert Mermaid-Quelltext zu SVG. Rein clientseitig - mermaid greift auf DOM
 * und getComputedStyle zu und kann nicht serverseitig laufen.
 *
 * Wird von <Diagram /> und <DiagramExercise /> gemeinsam genutzt.
 */
export function MermaidRender({
  code,
  className,
  /** Bei Live-Eingabe: Fehler dezent anzeigen statt als roter Block. */
  quietErrors = false,
}: {
  code: string
  className?: string
  quietErrors?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const reactId = useId()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Verhindert, dass ein langsam aufgelöster Render einen neueren überschreibt.
  const renderToken = useRef(0)

  useEffect(() => {
    const token = ++renderToken.current
    let cancelled = false

    if (code.trim().length === 0) {
      setSvg(null)
      setError(null)
      return
    }

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        })

        // Die ID muss ein gültiger CSS-Selektor sein; useId() liefert Doppelpunkte.
        const domId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}-${token}`
        const { svg: rendered } = await mermaid.render(domId, code)

        if (!cancelled && token === renderToken.current) {
          setSvg(rendered)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled && token === renderToken.current) {
          setSvg(null)
          setError(caught instanceof Error ? caught.message : 'Diagramm konnte nicht gerendert werden.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code, resolvedTheme, reactId])

  if (error) {
    return (
      <div
        className={cn(
          'rounded-lg border px-3 py-2 text-sm',
          quietErrors
            ? 'border-line bg-surface-sunken text-ink-muted'
            : 'border-rose-500/40 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300',
          className,
        )}
      >
        <p className="font-semibold">Mermaid-Syntaxfehler</p>
        <p className="mt-0.5 font-mono text-xs leading-relaxed break-words">{error}</p>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={cn('grid min-h-24 place-items-center text-sm text-ink-muted', className)}>
        Diagramm wird gerendert …
      </div>
    )
  }

  return (
    <div
      className={cn('flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full', className)}
      // mermaid rendert mit securityLevel 'strict' und bereinigt die Ausgabe selbst.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
