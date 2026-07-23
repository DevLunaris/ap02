/**
 * Kopiert die clientseitigen Laufzeit-Assets nach public/.
 *
 * Betrifft sql.js (SQLite als WebAssembly) und den Monaco-Editor. Beide werden
 * bewusst selbst gehostet statt von einem CDN geladen - die Anwendung soll ohne
 * externe Abhängigkeiten laufen.
 *
 * Läuft automatisch vor `npm run dev` und `npm run build`. Die Zielverzeichnisse
 * sind erzeugte Artefakte und stehen in .gitignore.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')

/**
 * Monaco bringt vollständige Sprachdienste für TypeScript, CSS, HTML und JSON mit -
 * zusammen rund 16 MB, die wir nie anfassen. Wir nutzen nur die Monarch-Grammatiken
 * für SQL und C#, deshalb fliegt der Rest raus.
 */
const MONACO_SKIP = [
  // Vollständige Sprachdienste
  (relative) => relative.startsWith(`language${path.sep}`) || relative.startsWith('language/'),
  // Deren Worker
  (relative) => /assets[\\/](ts|css|html|json)\.worker-/.test(relative),
]

function copyDirectory(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true })

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    const relative = path.relative(fromRoot, source)

    if (skip.some((matches) => matches(relative))) continue

    if (entry.isDirectory()) {
      copyDirectory(source, target, skip)
    } else {
      fs.copyFileSync(source, target)
    }
  }
}

let fromRoot = ''

function copyTree(from, to, skip = []) {
  fromRoot = from
  copyDirectory(from, to, skip)
}

function directorySize(directory) {
  let total = 0
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    total += entry.isDirectory() ? directorySize(full) : fs.statSync(full).size
  }
  return total
}

function requirePath(target, hint) {
  if (!fs.existsSync(target)) {
    console.error(`\nFEHLER: ${target} fehlt.\n${hint}\n`)
    process.exit(1)
  }
  return target
}

// --------------------------------------------------------------------- sql.js
const wasmSource = requirePath(
  path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  'Bitte "npm install" ausführen.',
)
fs.mkdirSync(publicDir, { recursive: true })
fs.copyFileSync(wasmSource, path.join(publicDir, 'sql-wasm.wasm'))
console.log(`sql.js   → public/sql-wasm.wasm (${(fs.statSync(wasmSource).size / 1024).toFixed(0)} KB)`)

// --------------------------------------------------------------------- Monaco
const monacoSource = requirePath(
  path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs'),
  'Bitte "npm install" ausführen.',
)
const monacoTarget = path.join(publicDir, 'monaco', 'vs')

fs.rmSync(monacoTarget, { recursive: true, force: true })
copyTree(monacoSource, monacoTarget, MONACO_SKIP)

const before = directorySize(monacoSource) / 1024 / 1024
const after = directorySize(monacoTarget) / 1024 / 1024
console.log(
  `Monaco   → public/monaco/vs (${after.toFixed(1)} MB statt ${before.toFixed(1)} MB - ` +
    'Sprachdienste für TS/CSS/HTML/JSON weggelassen)',
)
