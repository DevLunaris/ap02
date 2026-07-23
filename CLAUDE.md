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
npm run test       # Vitest (221 Tests, inkl. aller Übungen aus den Inhalten)
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
  editor/                 Monaco-Wrapper + Pseudocode-Grammatik
  pseudocode/             Code-Ansicht und Wertetabelle des Tracers
  sql/                    Ergebnis-Tabelle
  progress/               Statusknöpfe, Notizen, Fortschrittspanel
  search/                 Suchdialog und Auslöser im Header
config/exam.ts            Prüfungsdatum und Prüfungsbereiche
lib/
  content/schema.ts       Zod-Schemata + Typen (frei von Node-APIs)
  content/topics.ts       Content-Loader (server-only)
  content/mdx.tsx         MDX-Rendering
  content/exercises.ts    Übungs-Extraktion aus MDX (Pool + Wächter-Test)
  pseudocode/             Tokenizer, Parser, Step-Interpreter
  sql/                    sql.js-Runner + Vergleichslogik
  progress/               localStorage-Store hinter useProgress()
  search/                 Suchlogik (client) + Index-Bau (server)
  runner/                 CodeRunner-Interface, Piston, Client für /api/run
scripts/prepare-assets.mjs  kopiert sql.js und Monaco nach public/
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

## Maßstab für neue Themen

`pseudocode`, `sql-select` und `aktivitaetsdiagramm` sind die Referenz. Wer ein weiteres
Thema schreibt, orientiert sich daran:

- **Ein Merksatz-Callout weit oben**, der sagt, warum das Thema Punkte bringt und worauf
  es in der Prüfung wirklich ankommt.
- **Ein tragender Gedanke statt einer Regelliste.** Bei `sql-select` ist das die
  Auswertungsreihenfolge - aus ihr lassen sich drei Prüfungsantworten herleiten, statt sie
  einzeln auswendig zu lernen. Suche pro Thema nach diesem einen Hebel.
- **Genau sechs Stolperfallen** in einem `achtung`-Callout, nummeriert und mit dem
  konkreten Fehler, nicht dem abstrakten Prinzip.
- **Vier bis sechs Übungen**, gemischt: ausführbar (Tracer/SQL/C#), Multiple Choice mit
  Begründung für **jede** Option, mindestens ein Freitext.
- **Begründungen für falsche Antworten sind der eigentliche Inhalt.** „Das ist falsch"
  bringt nichts; „das wäre COUNT(*) - das zählt Zeilen und ignoriert NULL nicht" schon.
- **Checkliste am Ende** als Abhakliste für die letzten Minuten vor der Abgabe.
- **Ehrlich sein, wo das Werkzeug an Grenzen stößt.** Beispiel: Mermaid kennt keine echten
  UML-Symbole - das steht so im Aktivitätsdiagramm-Thema, damit niemand die Mermaid-Form
  auf den Prüfungsbogen malt.

### Übungen werden automatisch geprüft

[lib/content/exercises.test.ts](lib/content/exercises.test.ts) liest alle MDX-Dateien,
zieht die Aufgaben heraus und lässt sie **wirklich laufen**:

| Prüfung | Was auffällt |
| --- | --- |
| Seed-Schema wird ausgeführt | Tippfehler im `CREATE TABLE` |
| Musterlösung wird ausgeführt | fehlerhafte Musterlösung |
| SELECT-Lösung liefert > 0 Zeilen | Aufgabe, deren Lösung leer ist |
| Pseudocode läuft fehlerfrei | Endlosschleife, Syntaxfehler |
| `expectedOutput` stimmt exakt | richtige Antwort würde als falsch gewertet |

Ein Inhaltsfehler fällt sonst erst auf, wenn jemand davorsitzt und lernt - also im
ungünstigsten Moment. **Nach jeder Inhaltsänderung `npm test` laufen lassen.**

Grenze: Aufgaben ohne `expectedOutput` (z. B. absichtlich fehlerhafter Code zum Suchen)
werden nur auf „läuft durch" geprüft. Ob der eingebaute Fehler sich auch zeigt, musst du
selbst nachrechnen.

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

- `schema` - `CREATE TABLE` + `INSERT` für die In-Memory-DB dieser Übung
- `solution` - Musterlösung, Grundlage der automatischen Prüfung
- `compareTables?: string[]` - bei INSERT/UPDATE/DELETE wird der Zustand dieser Tabellen
  verglichen statt eines Result-Sets. Ohne Angabe werden alle Tabellen verglichen.

Siehe [Die SQL-Engine](#die-sql-engine).

### `<CSharpExercise starter task tests? hiddenTestHarness? solution? title?>`

- `tests: Array<{ stdin, expectedStdout, label? }>` - Testfälle laufen nacheinander
- `hiddenTestHarness?` - Rahmenprogramm; `{{CODE}}` wird durch die Eingabe ersetzt.
  Damit lassen sich einzelne Methoden üben, ohne ein ganzes Programm zu schreiben.
  Fehlt der Platzhalter, wird der Code angehängt statt still das Falsche auszuführen.

Der Ausgabevergleich toleriert Windows-Zeilenenden, Leerraum am Zeilenende und
führende bzw. abschließende Leerzeilen. **Einrückung am Zeilenanfang zählt** - sie
kann Teil der Aufgabe sein.

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

## Die SQL-Engine

[lib/sql/](lib/sql/) - läuft vollständig im Browser über sql.js (SQLite als
WebAssembly). Kein Datenbankserver, keine Netzwerkanfrage außer dem einmaligen Laden
der WASM-Datei von der eigenen Domain.

Jede Übung bekommt eine eigene In-Memory-Datenbank. Die Musterlösung läuft in einer
**zweiten, frischen** Datenbank - sonst würde eine Musterlösung mit `INSERT` die Daten
der lernenden Person verändern.

### Prüfregeln

Die Vergleichslogik in [lib/sql/compare.ts](lib/sql/compare.ts) ist frei von sql.js und
React, damit sie ohne WebAssembly testbar ist.

| Fall | Wie geprüft wird |
| --- | --- |
| Musterlösung ist `SELECT` | Result-Sets vergleichen |
| Musterlösung ändert Daten | Tabellenzustand nach der Ausführung vergleichen |
| Spaltenreihenfolge und -namen | egal - jede Zeile wird kanonisiert |
| Zeilenreihenfolge | zählt nur, wenn die Musterlösung `ORDER BY` enthält |
| `5` und `"5"` | gelten als gleich; `NULL` ist von `""` verschieden |

Beim Erkennen von `ORDER BY` und der Anweisungsart werden Kommentare und Zeichenketten
vorher entfernt - `WHERE name = 'ORDER BY'` darf nicht als Sortierung durchgehen.

SQLite-Meldungen werden übersetzt (`explainSqliteError`): „no such column: k.name" wird
zu „Die Spalte "k.name" gibt es nicht. Tippfehler, oder fehlt ein JOIN?". Die
Originalmeldung bleibt zusätzlich sichtbar.

## Monaco

[components/editor/code-editor.tsx](components/editor/code-editor.tsx) kapselt den
Editor für alle Code-Eingaben. Strg+Enter löst `onRun` aus.

**Selbst gehostet, nicht vom CDN.** `@monaco-editor/react` lädt Monaco per Default von
jsdelivr - das widerspricht der Vorgabe „keine externe API". Deshalb zeigt der Loader auf
`public/monaco`, das [scripts/prepare-assets.mjs](scripts/prepare-assets.mjs) vor jedem
`dev` und `build` aus `node_modules` befüllt. Dabei fliegen die vollständigen
Sprachdienste für TypeScript, CSS, HTML und JSON raus (23,3 → 6,9 MB) - wir brauchen nur
die Monarch-Grammatiken für SQL und C#.

Für den IHK-Pseudocode gibt es keine fertige Grammatik; sie steht in
[components/editor/pseudocode-language.ts](components/editor/pseudocode-language.ts) und
nutzt bewusst dieselben Schlüsselwörter wie der Tokenizer - was der Interpreter versteht,
soll auch farbig sein.

`public/monaco/` und `public/sql-wasm.wasm` sind erzeugte Artefakte und stehen in
.gitignore.

## Lern-Features

### Fortschritt

[lib/progress/](lib/progress/) - ein externer Store auf `localStorage`, angesprochen
über `useProgress()`. **Nie direkt an localStorage gehen**, damit Speicherformat und
Schema an einer Stelle bleiben.

Warum kein React-Context: Header, Themenseite, Fokus-Liste und Startseite lesen denselben
Zustand. Mit `useSyncExternalStore` rendern nur die Komponenten neu, die ihn wirklich
abonniert haben.

**Hydration ist der kritische Punkt.** `getSnapshot` liefert vor dem ersten `subscribe`
denselben leeren Zustand wie der Server. Erst wenn React im Effekt abonniert, wird
localStorage gelesen. Würde man direkt beim Rendern lesen, gäbe es auf jeder Seite einen
Hydration-Mismatch.

Statusmodell: `offen` → `gelesen` → `sitzt`. In der Prozentrechnung zählt `gelesen` nur
**halb** - einmal durchlesen ist nicht dasselbe wie können.

Beim Erweitern des gespeicherten Formats `PROGRESS_VERSION` erhöhen **und** `migrate()`
einen Übergang geben - sonst verliert jemand beim Update seinen Fortschritt.

### Übungspool

`/uebung` sammelt alle Aufgaben aller Themen. Die Extraktion in
[lib/content/exercises.ts](lib/content/exercises.ts) schneidet den **MDX-Quelltext** jeder
Übung heraus (über die Positionsangaben im Syntaxbaum) und rendert ihn erneut durch
dieselbe Pipeline. Dadurch verhält sich eine Aufgabe im Pool exakt wie auf der Themenseite,
ohne dass Props von Hand nachgebaut werden müssten.

Dasselbe Modul nutzt der Wächter-Test - der Test prüft also wirklich das, was im Pool
landet.

### Suche

Zwei Teile, bewusst getrennt:

- [lib/search/search.ts](lib/search/search.ts) - reine Suchlogik, läuft im Client
- [lib/search/index-builder.ts](lib/search/index-builder.ts) - `server-only`, baut den
  Index aus den Themen und zieht den Fließtext über den MDX-Syntaxbaum

**Kein FlexSearch:** Bei 89 Dokumenten bringt eine Suchbibliothek keinen spürbaren
Vorteil, kostet aber Bundle-Größe und nimmt die Kontrolle über die deutsche
Normalisierung aus der Hand. Die ~70 Zeilen sind dafür vollständig getestet.

Die Normalisierung führt **drei** Schreibweisen auf eine Form zusammen:
`Aktivitätsdiagramm`, `aktivitaetsdiagramm` und `aktivitatsdiagramm`. Wer schnell tippt,
lässt Umlaute weg - und zwar meist als `a`, nicht als `ae`.

Der Index kommt über `/api/suche` und wird erst beim ersten Öffnen der Suche geladen
(aktuell ~35 KB). Auf Seiten, auf denen nie gesucht wird, kostet er nichts.

### Tastaturkürzel

| Taste | Wirkung |
| --- | --- |
| `/` | Suche öffnen |
| `←` `→` | vorheriges / nächstes Thema derselben Kategorie |
| `↑` `↓` `Enter` `Esc` | innerhalb der Suche |

`isTypingTarget()` in [components/search/search-trigger.tsx](components/search/search-trigger.tsx)
verhindert, dass Kürzel während einer Eingabe greifen - inklusive Monaco, das ein
verstecktes Textfeld rendert. Ohne das würde ein `/` in einer SQL-Abfrage die Suche öffnen.

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
  Übungsmodus.
- **Phase 3 - SQL- und C#-Engine: fertig.** sql.js clientseitig mit automatischer
  Prüfung, C# über Piston hinter `/api/run`, Monaco selbst gehostet für alle
  Code-Eingaben inklusive eigener Grammatik für den IHK-Dialekt.
  *Offen:* Der `piston`-Service ist geschrieben, aber nie gegen eine laufende Instanz
  getestet worden - auf dem Entwicklungsrechner gibt es kein Docker. Vor Phase 4
  einmal `docker compose up` und eine C#-Übung ausführen.
- **Phase 4 - drei Musterthemen: fertig.** `pseudocode`, `sql-select` und
  `aktivitaetsdiagramm` sind ausgearbeitet und setzen den Qualitätsmaßstab - siehe
  [Maßstab für neue Themen](#massstab-fuer-neue-themen).
- **Phase 5 - Lern-Features: fertig.** `useProgress()` auf localStorage mit
  Export/Import, Statusknöpfe und Notizen je Thema, Fokus-Liste mit Status,
  Übungspool und Volltextsuche mit Tastaturkürzeln.

Damit steht das Gerüst. Was bleibt: die **86 noch nicht ausgearbeiteten Themen** -
Maßstab siehe oben - und ein Testlauf gegen eine echte Piston-Instanz.
