# Projekt: AP2 Lernhub (persönliche Lernplattform)

## Kontext
Ich bereite mich auf die IHK-Abschlussprüfung Teil 2 (AP2), Fachinformatiker
Anwendungsentwicklung, vor. Ich baue mir eine eigene Lern-Website – nur für mich,
lokal und selbst gehostet in meinem Homelab (Docker hinter einem Reverse Proxy).
Kein Multi-User, keine Registrierung, keine Datenschutzerklärung, kein SEO.

Vorbild ist ap2-fiae.de: pro Thema eine Seite mit Priorität, Lernzielen,
Kernbegriffen, Erklärteil, Stolperfallen, Übungen, Checkliste, verwandten Themen.
Der entscheidende Unterschied zu meinem Vorbild: Bei mir sollen die Übungen
**wirklich ausführbar** sein – ich will C#-Code und SQL direkt auf der Seite
schreiben, ausführen und automatisch prüfen lassen.

## Prüfungsstruktur (bestimmt die Navigation)
- Projektarbeit (50 %) – Doku, Präsentation, Fachgespräch
- "Planen eines Softwareproduktes" (10 %, 90 min): UML, ERM/Normalisierung,
  Architektur & Design Patterns, Vorgehensmodelle, BPMN 2.0
- "Entwicklung und Umsetzung von Algorithmen" (10 %, 90 min): Pseudocode + Tracing,
  SQL (SELECT/JOIN/INSERT/UPDATE/DELETE), OOP, Testverfahren & Coverage,
  Sortieralgorithmen
- WiSo (10 %, 60 min, ~30 MC-Fragen): Arbeits-/Ausbildungsrecht, Sozialversicherung,
  BGB & Vertragsarten, Rechtsformen, Nachhaltigkeit

## Tech-Stack (bitte genau so)
- Next.js 15, App Router, TypeScript strict, Tailwind CSS
- Inhalte als MDX-Dateien unter `content/topics/<slug>.mdx` (kein CMS, keine DB
  für Content) – ich will Themen als Textdateien versionieren
- Fortschritt/Notizen: `localStorage`, gekapselt hinter einem `useProgress()`-Hook,
  plus Export/Import als JSON-Datei (damit ich nichts verliere)
- Monaco Editor für alle Code-Eingaben
- SQL-Ausführung: `sql.js` (SQLite-WASM), komplett clientseitig
- C#-Ausführung: HTTP-Call an eine selbst gehostete Piston-Instanz
  (`CODE_RUNNER_URL` als Env-Var). Die Ausführung MUSS hinter einem Interface
  `CodeRunner { run(lang, source, stdin): Promise<RunResult> }` liegen, damit ich
  den Executor später austauschen kann. Wenn `CODE_RUNNER_URL` nicht gesetzt ist,
  zeigt der Editor einen deutlichen Hinweis statt zu crashen.
- Diagramme: Mermaid (clientseitig gerendert) für UML/BPMN/ER
- Deployment: `Dockerfile` (multi-stage, standalone output) + `docker-compose.yml`
  mit den Services `web` und `piston`

## Datenmodell für Themen
Frontmatter jeder MDX-Datei:
```yaml
slug: pseudocode
title: Pseudocode
category: algorithmen           # eines von 13 Gebieten
examArea: algorithmen           # projekt | planung | algorithmen | wiso
priority: essentiell            # essentiell | sehr-hoch | hoch | mittel | niedrig
frequency: 100                  # % der letzten 12 Prüfungen, optional
points: 317                     # kumulierte Punkte, optional
new2025: false
learningGoals: [...]
related: [kontrollstrukturen, rekursion, suchen-sortieren]
```
Kategorien und Prioritäten kommen aus `content/topics.index.json` – die Datei
lege ich selbst an, sie enthält alle 89 Themen. Baue die Seiten
`/`, `/themen`, `/fokus`, `/kategorie/[slug]`, `/thema/[slug]` daraus.

## Die drei interaktiven Engines (Herzstück – hier liegt der Aufwand)

### 1. `<PseudocodeTracer />` — der wichtigste Baustein
Ein eigener Interpreter (Tokenizer + Parser + Step-Interpreter) in TypeScript für
den deutschen IHK-Pseudocode-Dialekt:
- Zuweisung `←` / `:=` / `=`
- `WENN … DANN / SONST WENN / SONST / ENDE WENN`
- `SOLANGE … TUE / ENDE SOLANGE`
- `WIEDERHOLE … BIS`
- `FÜR i VON a BIS b [SCHRITT s] TUE / ENDE FÜR`
- `FUNKTION name(p: TYP) → TYP … GIB x ZURÜCK / ENDE FUNKTION`
- `GIB x AUS`, Arrays, `MOD`, `DIV`, `UND`, `ODER`, `NICHT`
- Englische Keywords (`if`, `while`, `for`, `return`) als Alias akzeptieren

Der Interpreter läuft **schrittweise** und liefert pro Schritt
`{ line, variables, output, condition? }`. Die UI zeigt links den Code mit
Zeilen-Highlight, rechts die automatisch mitwachsende **Wertetabelle**
(eine Spalte pro Variable + Spalte „Ausgabe"), dazu Buttons
Schritt vor / zurück / Auto-Play / Reset. Endlosschleifen nach 10.000 Schritten
abbrechen mit klarer Meldung.
Übungsmodus: Ich tippe die erwartete Ausgabe ein, drücke „Prüfen", und bekomme
bei falscher Antwort den ersten Schritt gezeigt, ab dem meine Erwartung abweicht.

### 2. `<SqlExercise />`
- Pro Übung ein Seed-Schema (`CREATE TABLE` + `INSERT`) im MDX definiert
- sql.js lädt lazy, eine In-Memory-DB pro Übung
- Monaco mit SQL-Highlighting, Ausführen per Strg+Enter
- Ergebnis als Tabelle, Fehler von SQLite lesbar anzeigen
- Automatische Prüfung: Vergleich meines Result-Sets mit dem Result-Set der
  hinterlegten Musterlösung. Spaltenreihenfolge und -namen egal,
  Zeilenreihenfolge nur relevant, wenn die Musterlösung `ORDER BY` enthält.
  Bei INSERT/UPDATE/DELETE stattdessen den Tabellenzustand nach der Ausführung
  vergleichen.
- Buttons: „Schema anzeigen", „DB zurücksetzen", „Tipp", „Lösung zeigen"
  (Lösung erst nach mind. einem Ausführversuch freischalten)

### 3. `<CSharpExercise />`
- Monaco mit C#-Highlighting, Starter-Code aus dem MDX
- Ausführung über den `CodeRunner`, stdout/stderr/Exit-Code anzeigen
- Prüfmodus über hinterlegte Testfälle: Liste von `{ stdin, expectedStdout }`,
  Ergebnis als grüne/rote Testliste
- Optional: `hiddenTestHarness` im MDX, das um meinen Code herum eine
  `Main`-Methode mit Assertions legt – damit ich auch einzelne Methoden
  (z. B. `BubbleSort(int[] arr)`) üben kann, ohne jedes Mal ein ganzes Programm
  zu schreiben
- Timeout 10 s, Ausgabe auf 50 KB begrenzen

## Weitere MDX-Komponenten
- `<MultipleChoice />` – eine oder mehrere richtige Antworten, mit Begründung
  je Option (auch für die falschen! Das ist der Lerneffekt)
- `<FreeText />` – Selbstkontrolle: ich schreibe meine Antwort, klappe die
  Musterlösung auf und bewerte mich selbst (richtig/teilweise/falsch)
- `<TermCard />` – Kernbegriff mit Definition
- `<Callout type="achtung|tipp|merksatz" />`
- `<Checklist />` – Prüfungs-Kurz-Checkliste am Seitenende
- `<Diagram />` – Mermaid-Wrapper
- `<DiagramExercise />` – ich tippe Mermaid-Code, sehe live das gerenderte
  Diagramm daneben, Musterlösung ein-/ausblendbar (für UML- und BPMN-Übungen)

## Lern-Features (nach den Engines)
- Startseite: Countdown auf mein Prüfungsdatum (aus `config/exam.ts`, leicht
  änderbar), Fortschrittsbalken, „Weiterlernen"-Button zum letzten Thema
- `/fokus`: die als `focus: true` markierten Themen in Reihenfolge, mit
  Status pro Thema (offen / in Arbeit / sitzt)
- Pro Thema drei Statusknöpfe: „noch nicht angeschaut" / „gelesen" / „sitzt"
- `/uebung`: alle Übungen aller Themen gemischt, filterbar nach Prüfungsbereich
  und Typ – für den Endspurt
- Volltextsuche über alle Themen (clientseitig, z. B. FlexSearch)
- Dark Mode, Tastaturkürzel (`/` Suche, `←/→` Thema wechseln)

## Vorgehen (bitte in dieser Reihenfolge, mit Zwischenstopps)
**Phase 1 – Gerüst:** Next.js-Setup, MDX-Pipeline, Layout, Navigation,
Themen-Index, Theme-System, Dockerfile. Ein Dummy-Thema als Beweis, dass MDX
mit Custom-Komponenten rendert. → Hier anhalten und mir zeigen.

**Phase 2 – Pseudocode-Engine:** Interpreter inkl. Unit-Tests (Vitest) für alle
Kontrollstrukturen, dann die Tracer-UI. → Anhalten.

**Phase 3 – SQL- und C#-Engine** inkl. Piston-Compose-Service. → Anhalten.

**Phase 4 – drei vollständige Musterthemen:** `pseudocode`, `select-abfragen`,
`aktivitaetsdiagramm`. Diese drei setzen den Qualitätsmaßstab für alle
weiteren Themen. → Anhalten.

**Phase 5 – Lern-Features** (Fortschritt, Fokus-Modus, Übungspool, Suche).

Erst danach befülle ich zusammen mit dir die restlichen Themen.

## Regeln
- Deutsche Fachsprache in allen Inhalten und UI-Texten; Code-Bezeichner englisch
- Prüfungsniveau statt Vollständigkeit: Alles wird daran gemessen, ob es mir in
  einer 90-Minuten-Klausur Punkte bringt
- Keine Auth, keine externe API außer meinem eigenen Code-Runner, keine Analytics,
  keine Cookie-Banner
- Kein Content ohne Übung: Jede Themenseite endet mit mindestens zwei Übungen
- Erfinde keine Prüfungsstatistiken – Häufigkeits- und Punktangaben kommen
  ausschließlich aus `topics.index.json`
- Schreibe eine `CLAUDE.md`, in der Struktur, MDX-Komponenten-API und die
  Konvention für neue Themen dokumentiert sind, damit spätere Sessions ohne
  Kontextverlust weiterarbeiten können