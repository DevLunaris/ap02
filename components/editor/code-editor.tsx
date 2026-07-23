'use client'

import Editor, { loader, type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import { PSEUDOCODE_LANGUAGE_ID, registerPseudocodeLanguage } from './pseudocode-language'

/**
 * Monaco-Editor für alle Code-Eingaben.
 *
 * Wichtig: @monaco-editor/react lädt Monaco standardmäßig von einem CDN. Das
 * widerspricht der Vorgabe "keine externe API" - deshalb zeigen wir den Loader
 * auf public/monaco, das scripts/prepare-assets.mjs aus node_modules befüllt.
 */
loader.config({ paths: { vs: '/monaco/vs' } })

export type EditorLanguage = 'sql' | 'csharp' | typeof PSEUDOCODE_LANGUAGE_ID

export function CodeEditor({
  value,
  onChange,
  language,
  height = '14rem',
  readOnly = false,
  /** Wird bei Strg+Enter bzw. Cmd+Enter ausgelöst - der Ausführen-Shortcut. */
  onRun,
  /** 1-basierte Zeile, die hervorgehoben wird (Tracer). */
  highlightLine,
  ariaLabel,
}: {
  value: string
  onChange?: (value: string) => void
  language: EditorLanguage
  height?: string
  readOnly?: boolean
  onRun?: () => void
  highlightLine?: number
  ariaLabel?: string
}) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorations = useRef<editor.IEditorDecorationsCollection | null>(null)
  const [ready, setReady] = useState(false)

  // onRun über eine Ref, damit die Tastenbindung nicht bei jedem Render neu muss.
  const runRef = useRef(onRun)
  runRef.current = onRun

  const handleMount = (instance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = instance
    monacoRef.current = monaco

    registerPseudocodeLanguage(monaco)
    monaco.editor.setTheme(resolvedTheme === 'dark' ? 'ap2-dark' : 'ap2-light')

    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current?.()
    })

    decorations.current = instance.createDecorationsCollection()
    setReady(true)
  }

  // Theme-Wechsel nachziehen.
  useEffect(() => {
    if (!ready || !monacoRef.current) return
    monacoRef.current.editor.setTheme(resolvedTheme === 'dark' ? 'ap2-dark' : 'ap2-light')
  }, [resolvedTheme, ready])

  // Zeilenhervorhebung für den Tracer.
  useEffect(() => {
    if (!ready || !monacoRef.current || !decorations.current) return

    if (highlightLine === undefined) {
      decorations.current.clear()
      return
    }

    const monaco = monacoRef.current
    decorations.current.set([
      {
        range: new monaco.Range(highlightLine, 1, highlightLine, 1),
        options: {
          isWholeLine: true,
          className: 'ap2-active-line',
          linesDecorationsClassName: 'ap2-active-line-margin',
        },
      },
    ])

    editorRef.current?.revealLineInCenterIfOutsideViewport(highlightLine)
  }, [highlightLine, ready])

  return (
    <div className="overflow-hidden rounded-lg border border-line" style={{ height }}>
      <Editor
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        language={language}
        onMount={handleMount}
        loading={
          <span className="grid h-full place-items-center text-sm text-ink-muted">
            Editor wird geladen …
          </span>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 22,
          fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: readOnly ? 'none' : 'line',
          // Ohne Sprachdienste gibt es nichts vorzuschlagen - das spart Rechenzeit
          // und verhindert irreführende Vorschläge.
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: 'currentDocument',
          scrollbar: { alwaysConsumeMouseWheel: false },
          padding: { top: 8, bottom: 8 },
          ariaLabel,
        }}
      />
    </div>
  )
}
