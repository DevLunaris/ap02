# AP2 Lernhub - Arbeitsanleitung

Private Lernplattform für die IHK-Abschlussprüfung Teil 2 (Fachinformatiker
Anwendungsentwicklung). Einzelnutzer, lokal im Homelab hinter einem Reverse Proxy.
Die fachlichen Vorgaben stehen in [PROJEKT.md](PROJEKT.md) - dieses Dokument
beschreibt, **wie** der Code aufgebaut ist und wie man ihn erweitert.

## Grundregeln

- **Deutsche Fachsprache** in allen Inhalten und UI-Texten. Code-Bezeichner englisch.
- **Prüfungsniveau statt Vollständigkeit.** Maßstab: Bringt es in einer 90-Minuten-Klausur
  Punkte? Wenn nein, weglassen.
- **Kein Content ohne Übung.** Jede Themenseite endet mit mindestens zwei Übungen.
- **Keine erfundenen Statistiken.** `frequency` und `points` kommen ausschließlich aus
  `content/topics.index.json`. Fehlt ein Wert, bleibt das Feld weg - nie schätzen.
- Keine Auth, keine Analytics, keine Cookie-Banner, keine externe API außer dem eigenen
  Code-Runner.

## Befehle

```bash
npm run dev        # Entwicklungsserver auf :3000
npm run build      # Produktionsbuild (prüft Typen + Lint + rendert alle Seiten)
npm run typecheck  # nur tsc
npm run test       # Vitest (ab Phase 2 relevant)
```

Unter Windows startet `start.bat` den Dev-Server komfortabler: Es installiert bei Bedarf
die Abhängigkeiten, räumt einen alten Server auf Port 3000 weg und startet über
[scripts/dev.ps1](scripts/dev.ps1). Dieses Skript hängt sich samt Kindprozessen in ein
Windows-Job-Objekt mit `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` – dadurch stirbt der
Node-Prozess zwingend mit dem Fenster, statt als Waise Port 3000 zu blockieren. Reines
Batch schafft das nicht, weil beim harten Schließen kein Aufräum-Code mehr läuft.
`stop.bat` beendet gezielt den Prozess auf Port 3000 (nicht pauschal alle `node.exe`).

## Verzeichnisstruktur

```
app/                      Routen (App Router)
  page.tsx                Startseite: Countdown, Fortschritt, Kategorien
  themen/                 Alle Themen mit Filter
  kategorie/[slug]/       Themen eines Gebiets
  thema/[slug]/           Themenseite
  fokus/                  Fokus-Reihenfolge
  uebung/                 Übungspool (Phase 5)
  komponenten/            Lebender Styleguide, rendert content/showcase.mdx
  api/run/                Proxy zum Code-Runner
components/
  mdx/                    Alle in MDX verwendbaren Komponenten
  topic-meta.tsx          Badges, TopicCard, TopicStats
  site-header.tsx, theme-*.tsx, breadcrumbs.tsx, exam-countdown.tsx
config/exam.ts            Prüfungsdatum und Prüfungsbereiche
content/
  topics.index.json       Themen-Index (maßgeblich)
  topics/<slug>.mdx       Themeninhalte
  showcase.mdx            Demo aller MDX-Komponenten
lib/
  content/schema.ts       Zod-Schemata + Typen (frei von Node-APIs)
  content/topics.ts       Content-Loader (server-only)
  content/mdx.tsx         MDX-Rendering
  runner/                 CodeRunner-Interface + Piston-Implementierung
```

## Datenfluss: Index und Frontmatter

`content/topics.index.json` ist die **einzige Wahrheit** für Kategorie, Priorität,
Häufigkeit, Punkte, `new2025` und `focus`. Das MDX-Frontmatter liefert nur, was der Index
nicht kennt: `summary`, `learningGoals`, `related`.

Metadaten dürfen im Frontmatter wiederholt werden, müssen dann aber **identisch** sein -
sonst bricht der Build mit einer Fehlermeldung ab (`assertFrontmatterMatchesIndex` in
[lib/content/schema.ts](lib/content/schema.ts)).

Drei weitere Prüfungen laufen beim Laden und brechen bei Verstoß hart ab:

| Prüfung | Wann sie zuschlägt |
| --- | --- |
| Verwaiste Dateien | `content/topics/x.mdx` ohne Eintrag im Index |
| Slug-Konsistenz | Dateiname ≠ `slug` im Frontmatter |
| Verwandte Themen | `related` verweist auf einen unbekannten Slug |

Themen, die im Index stehen, aber noch keine MDX-Datei haben, sind **kein Fehler**: Sie
erscheinen überall mit dem Badge „noch nicht erstellt" und zeigen auf `/thema/<slug>` eine
Stub-Seite.

### Wichtig: Client-/Server-Grenze

[lib/content/topics.ts](lib/content/topics.ts) liest Dateien und ist mit `server-only`
markiert. **Client-Komponenten importieren Typen aus
[lib/content/schema.ts](lib/content/schema.ts)**, nie aus `topics.ts` - sonst landet
`node:fs` im Browser-Bundle und der Build bricht.

## Neues Thema anlegen

1. Eintrag in `content/topics.index.json` prüfen (alle 89 Themen sind bereits erfasst).
2. `content/topics/<slug>.mdx` anlegen, Dateiname = Slug.
3. Frontmatter:

```yaml
---
slug: pseudocode          # Pflicht, = Dateiname
title: Pseudocode         # Pflicht, muss dem Index entsprechen
summary: >-               # optional, 1-2 Sätze für Kacheln
  Sprachunabhängige Notation für Algorithmen.
learningGoals:            # optional, erscheint als Kasten oben
  - Einen Algorithmus in Pseudocode formulieren
related:                  # optional, müssen existierende Slugs sein
  - kontrollstrukturen
---
```

4. Aufbau des Textteils (an ap2-fiae.de angelehnt):
   Einleitung → `## Kernbegriffe` (TermGrid) → Erklärteil → Stolperfallen (Callout) →
   `## Übungen` (mindestens zwei) → `<Checklist />`.

## MDX-Komponenten-API

Alle Komponenten sind ohne Import verfügbar. Registriert in
[components/mdx/index.tsx](components/mdx/index.tsx) - **neue Komponenten dort eintragen
und hier dokumentieren.** `content/showcase.mdx` zeigt jede Komponente in Aktion,
gerendert unter `/komponenten`.

### `<Callout type="achtung|tipp|merksatz" title?>`
Hervorgehobener Kasten. `title` überschreibt die Standardüberschrift.

### `<TermGrid>` / `<TermCard term="...">`
Kernbegriffe als zweispaltiges Raster. `TermCard` immer in `TermGrid` schachteln.

### `<Checklist items={string[]} title?>`
Abhakbare Kurz-Checkliste. Haken sind flüchtig (kein localStorage).

### `<MultipleChoice question options title? hint?>`
```ts
options: Array<{
  text: string
  correct: boolean
  explanation: string   // Pflicht - auch für falsche Optionen!
}>
```
Mehr als ein `correct: true` schaltet automatisch auf Mehrfachauswahl. Nach dem Prüfen
wird **jede** Option eingefärbt und begründet, auch die nicht gewählten richtigen.

### `<FreeText question solution rows? placeholder? title?>`
Selbstkontrolle. `question` und `solution` nehmen beliebiges JSX. Nach dem Aufklappen
bewertet man sich selbst (Saß / Teilweise / Daneben).

### `<Diagram code caption?>`
Statisches Mermaid-Diagramm. `code` als Template-Literal.

### `<DiagramExercise task starter? solution title?>`
Mermaid links tippen, rechts Live-Vorschau. Bewusst ohne automatische Bewertung -
Diagramme haben mehrere richtige Darstellungen.

### `<PseudocodeTracer code task? expectedOutput? variables? initialVariables? editable? title?>`

- `code` - Pseudocode im deutschen IHK-Dialekt
- `expectedOutput: string[]` - je Eintrag eine Ausgabezeile. Gesetzt = Übungsmodus.
- `variables?: string[]` - erzwingt Spaltenreihenfolge der Wertetabelle
- `initialVariables?` - Startzustand, z. B. Funktionsparameter
- `editable?` - eigenen Code eintippen erlauben (Standard: `true`)

Siehe [Die Pseudocode-Engine](#die-pseudocode-engine).

### `<SqlExercise schema solution task starter? hint? compareTables? title?>`
> Engine folgt in **Phase 3** (sql.js, clientseitig).

- `schema` - `CREATE TABLE` + `INSERT` für die In-Memory-DB dieser Übung
- `solution` - Musterlösung, Grundlage der automatischen Prüfung
- `compareTables?: string[]` - bei INSERT/UPDATE/DELETE wird der Zustand dieser Tabellen
  verglichen statt eines Result-Sets

### `<CSharpExercise starter task tests? hiddenTestHarness? solution? title?>`
> Engine folgt in **Phase 3** (Piston über `/api/run`).

- `tests: Array<{ stdin, expectedStdout, label? }>`
- `hiddenTestHarness?` - Rahmenprogramm; `{{CODE}}` wird durch die Eingabe ersetzt.
  Damit lassen sich einzelne Methoden üben, ohne ein ganzes Programm zu schreiben.

## Fallstrick: MDX und `{…}`-Ausdrücke

`next-mdx-remote` v6 entfernt per Default **jeden** JavaScript-Ausdruck aus MDX - auch in
Attributen. Ohne Gegenmaßnahme kämen `code={…}`, `options={[…]}` und `items={[…]}` still
als `undefined` an. Deshalb steht in [lib/content/mdx.tsx](lib/content/mdx.tsx)
`blockJS: false`. Die Härtung zielt auf fremde, hochgeladene Inhalte; unsere MDX-Dateien
liegen im Repo. `blockDangerousJS` bleibt aktiv und sperrt `eval`, `process`, `fs` & Co.

## Die Pseudocode-Engine

Liegt unter [lib/pseudocode/](lib/pseudocode/) und ist frei von React und Node-APIs -
dadurch vollständig als reine Funktion testbar.

```
tokenize(quelltext) → Token[]      tokenizer.ts
parse(quelltext)    → AST          parser.ts
run(quelltext)      → RunResult    interpreter.ts
```

### Die tragende Entscheidung: vorberechnete Spur

Das Programm läuft **einmal komplett durch**, die vollständige Schrittfolge landet in
einem Array. Die UI navigiert danach nur noch per Index.

Der naheliegende Weg - ein pausierbarer Interpreter mit Generatoren - scheitert an der
Anforderung „Schritt zurück": Generatoren können nicht rückwärts, man müsste für jeden
Klick von vorn rechnen. Der Vorab-Durchlauf ist möglich, weil der Dialekt **keine
Eingabe-Anweisung** kennt - es gibt nichts, worauf gewartet werden müsste.

Drei Dinge werden dadurch trivial: Vor/Zurück/Springen/Auto-Play, der Übungsmodus
(erste Abweichung finden = Array-Vergleich) und das Testen.

Bei einer Zuweisung an ein Array-Element wird **kopiert statt mutiert**
(copy-on-write) - sonst würden ältere Schritte in der Spur nachträglich ihren Zustand
ändern.

### Toleranz gegenüber dem Dialekt

Der IHK-Pseudocode ist nicht normiert. Der Tokenizer normalisiert deshalb auf eine
kanonische Form; welche Varianten akzeptiert werden, legen die Tests fest:

| Kanonisch | Wird auch akzeptiert |
| --- | --- |
| `←` | `<-`, `:=`, `=` (nur am Anweisungsanfang) |
| `WENN` … `ENDE WENN` | `if`/`then`/`end if`, `ENDEWENN`, `DANN` weglassbar |
| `FÜR` | `FUER`, `for`, `VON`/`from`, `BIS`/`to`, `SCHRITT`/`step` |
| `SOLANGE` / `WIEDERHOLE` | `while` / `repeat`, `TUE`/`do` weglassbar |
| `GIB x AUS` | `AUSGABE x`, `print x`, `schreibe x` |
| `GIB x ZURÜCK` | `return x` |
| `UND` / `ODER` / `NICHT` | `and` / `or` / `not` |

`=` ist doppeldeutig: am Anfang einer Anweisung Zuweisung, im Ausdruck Vergleich. Der
Parser setzt dafür einen Rücksetzpunkt - siehe `parseAssignOrExpression`.

Eingebaut sind `Länge()`/`length()`, `abs()` und `ganzzahl()`.

### Grenzen

10.000 Schritte und Aufruftiefe 200. Beides bricht mit einer Meldung ab, die den
wahrscheinlichen Grund nennt (Endlosschleife, Rekursion ohne Abbruch) - und die
**Teilspur bleibt erhalten**, man sieht also, wie weit das Programm kam.

### Fehlermeldungen

Sie richten sich an Lernende, nicht an Compilerbauer: „Der Block `WENN` aus Zeile 1
wurde nie geschlossen - es fehlt `ENDE WENN`." Wer eine Bedingung mit einer Zahl statt
eines Wahrheitswerts füttert, bekommt zusätzlich den Hinweis auf die Verwechslung von
`=` und `←`. Beim Erweitern des Parsers bitte in diesem Stil bleiben.

## Code-Ausführung

```
Browser → POST /api/run → createCodeRunner() → PistonRunner → Piston
```

Der Browser spricht **nie** direkt mit Piston: So bleibt `CODE_RUNNER_URL` serverseitig,
und Timeout (10 s) sowie Ausgabegrenze (50 KB) werden serverseitig erzwungen.

Ist `CODE_RUNNER_URL` nicht gesetzt, liefert der `UnavailableRunner` ein sauberes
`{ ok: false, reason: 'no-runner-configured' }` - die UI zeigt einen Hinweis statt zu
crashen. Einen anderen Executor einzuhängen heißt: `CodeRunner` implementieren und in
`createCodeRunner()` zurückgeben. Keine UI-Komponente muss angefasst werden.

## Deployment

```bash
docker compose up -d --build
docker exec ap2-piston /piston/piston ppman install dotnet   # einmalig
```

`Dockerfile` ist multi-stage mit `output: 'standalone'`. Piston läuft `privileged`
(braucht isolate) und ist nur im internen Compose-Netz erreichbar, nicht am Host.

## Stand und nächste Schritte

- **Phase 1 - Gerüst: fertig.** Setup, MDX-Pipeline, Themen-Index (89 Themen), alle Seiten,
  Theme-System, CodeRunner-Interface, Docker.
- **Phase 2 - Pseudocode-Engine: fertig.** Tokenizer, Parser und Step-Interpreter in
  `lib/pseudocode/` mit 55 Tests, dazu die Tracer-UI mit Wertetabelle, Auto-Play und
  Übungsmodus. Code ist im Tracer editierbar (derzeit Textfeld).
- **Phase 3 - SQL- und C#-Engine:** sql.js + Monaco, Piston-Anbindung.
  Dabei den Tracer von der Textarea auf Monaco umstellen - inklusive einer eigenen
  Syntax-Definition für den IHK-Dialekt.
- **Phase 4 - drei Musterthemen:** `pseudocode`, `sql-select`, `aktivitaetsdiagramm`.
- **Phase 5 - Lern-Features:** `useProgress()` auf localStorage mit JSON-Export/Import,
  Statusknöpfe, Übungspool, FlexSearch, Tastaturkürzel.
