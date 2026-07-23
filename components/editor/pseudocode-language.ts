import type { Monaco } from '@monaco-editor/react'

/**
 * Monarch-Grammatik für den deutschen IHK-Pseudocode.
 *
 * Monaco kennt die Sprache nicht - deshalb definieren wir sie selbst. Bewusst
 * dieselben Schlüsselwörter wie der Tokenizer in lib/pseudocode/tokenizer.ts:
 * Was der Interpreter versteht, soll auch farbig sein.
 */

export const PSEUDOCODE_LANGUAGE_ID = 'ihk-pseudocode'

const KEYWORDS = [
  'WENN', 'DANN', 'SONST', 'ENDE',
  'SOLANGE', 'TUE', 'WIEDERHOLE', 'BIS',
  'FÜR', 'FUER', 'VON', 'SCHRITT',
  'FUNKTION', 'GIB', 'ZURÜCK', 'ZURUECK', 'AUS', 'AUSGABE',
  'wenn', 'dann', 'sonst', 'ende',
  'solange', 'tue', 'wiederhole', 'bis',
  'für', 'fuer', 'von', 'schritt',
  'funktion', 'gib', 'zurück', 'zurueck', 'aus', 'ausgabe',
  'if', 'then', 'else', 'end', 'while', 'do', 'repeat', 'until',
  'for', 'from', 'to', 'step', 'function', 'return', 'print',
]

const OPERATOR_WORDS = ['MOD', 'DIV', 'UND', 'ODER', 'NICHT', 'mod', 'div', 'und', 'oder', 'nicht', 'and', 'or', 'not']

const CONSTANTS = ['WAHR', 'FALSCH', 'wahr', 'falsch', 'true', 'false']

let registered = false

/** Registriert Sprache, Grammatik und Themes. Mehrfachaufrufe sind unschädlich. */
export function registerPseudocodeLanguage(monaco: Monaco): void {
  if (registered) return
  registered = true

  monaco.languages.register({ id: PSEUDOCODE_LANGUAGE_ID })

  monaco.languages.setMonarchTokensProvider(PSEUDOCODE_LANGUAGE_ID, {
    ignoreCase: false,
    keywords: KEYWORDS,
    operatorWords: OPERATOR_WORDS,
    constants: CONSTANTS,

    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/#.*$/, 'comment'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/\d+\.\d+/, 'number.float'],
        [/\d+/, 'number'],
        [
          /[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@operatorWords': 'keyword.operator',
              '@constants': 'constant',
              '@default': 'identifier',
            },
          },
        ],
        [/←|<-|:=/, 'keyword.operator'],
        [/[<>]=?|<>|!=|=/, 'operator'],
        [/[+\-*/]/, 'operator'],
        [/[()[\],:]/, 'delimiter'],
      ],
    },
  })

  // Einrückung nach einem Blockanfang beibehalten - Monaco kann das nicht raten.
  monaco.languages.setLanguageConfiguration(PSEUDOCODE_LANGUAGE_ID, {
    comments: { lineComment: '//' },
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  })

  registerThemes(monaco)
}

/**
 * Themes passend zur Seite. Die Farben orientieren sich an den Rollen aus
 * globals.css, sind hier aber als Hex nötig - Monaco kennt keine CSS-Variablen.
 */
function registerThemes(monaco: Monaco): void {
  monaco.editor.defineTheme('ap2-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '1d4ed8', fontStyle: 'bold' },
      { token: 'keyword.operator', foreground: '7c3aed' },
      { token: 'constant', foreground: '047857' },
      { token: 'string', foreground: 'b45309' },
      { token: 'number', foreground: '0e7490' },
    ],
    colors: {
      'editor.background': '#f4f5f8',
      'editor.lineHighlightBackground': '#e6e9f0',
    },
  })

  monaco.editor.defineTheme('ap2-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b93a5', fontStyle: 'italic' },
      { token: 'keyword', foreground: '93b4ff', fontStyle: 'bold' },
      { token: 'keyword.operator', foreground: 'c4a7ff' },
      { token: 'constant', foreground: '6ee7b7' },
      { token: 'string', foreground: 'fbbf24' },
      { token: 'number', foreground: '67e8f9' },
    ],
    colors: {
      'editor.background': '#1b1e27',
      'editor.lineHighlightBackground': '#252936',
    },
  })
}
