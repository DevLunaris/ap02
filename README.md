# AP2 Lernhub

Selbst gehostete Lernplattform für die **IHK-Abschlussprüfung Teil 2**,
Fachinformatiker/-in Anwendungsentwicklung.

89 Themen nach Prüfungsrelevanz sortiert – und, das ist der eigentliche Punkt,
**Übungen, die man wirklich ausführen kann**: Pseudocode Schritt für Schritt tracen,
SQL gegen eine echte Datenbank absetzen, C# kompilieren und gegen Testfälle prüfen.
Alles auf der eigenen Maschine, ohne Account, ohne Tracking, ohne Cloud.

> **Status: funktionsfähig.** Alle drei Engines laufen, die Lern-Features stehen,
> drei Themen sind ausgearbeitet. Was fehlt, ist Inhalt: 86 der 89 Themen sind im Index
> angelegt und warten darauf, geschrieben zu werden – [Beiträge willkommen](#eigene-themen-schreiben).

---

## Warum noch eine Lernseite?

Es gibt gute AP2-Übersichten im Netz. Was dort fehlt: Man liest über Pseudocode-Tracing,
aber man **macht** es nicht. Man liest über JOINs, aber tippt keine Query.

Hier ist jede Übung interaktiv:

| Engine | Was sie macht |
| --- | --- |
| `<PseudocodeTracer />` ✅ | Eigener Interpreter für den deutschen IHK-Pseudocode. Läuft schrittweise, baut die Wertetabelle automatisch mit, Schritt vor/zurück, Auto-Play. Eigenen Code eintippen möglich. |
| `<SqlExercise />` ✅ | SQLite im Browser (sql.js). Eigenes Seed-Schema pro Aufgabe, automatischer Abgleich mit der Musterlösung – Spaltenreihenfolge egal, Zeilenreihenfolge nur bei `ORDER BY`. Bei `INSERT`/`UPDATE`/`DELETE` wird der Tabellenzustand verglichen. |
| `<CSharpExercise />` ✅ | Echte Kompilierung über eine selbst gehostete [Piston](https://github.com/engineer-man/piston)-Instanz, Prüfung gegen Testfälle. Mit `hiddenTestHarness` übt man einzelne Methoden statt ganzer Programme. |

Dazu Multiple Choice mit Begründung **auch für die falschen Optionen**, Freitext mit
Selbstkontrolle, und Mermaid-Übungen für UML und BPMN.

Drumherum das, was man zum Durchhalten braucht:

- **Lernstand je Thema** – offen / gelesen / sitzt, plus eigene Notizen. Alles im Browser,
  als JSON-Datei sicherbar und wiederherstellbar.
- **Fokus-Liste** mit den Themen, die am meisten Punkte bringen, in Arbeitsreihenfolge.
- **Übungspool** – alle Aufgaben aller Themen gemischt, filterbar nach Prüfungsbereich und
  Typ. Für den Endspurt, wenn es nicht mehr ums Lesen geht.
- **Volltextsuche** über alle Themen, mit `/` erreichbar. Umlaute darfst du weglassen.
- **Countdown** auf deinen Prüfungstermin, Dark Mode, Tastaturkürzel.

Alle Inhalte sind **MDX-Dateien im Repo** – keine Datenbank, kein CMS. Du kannst Themen
per Pull Request beisteuern oder in deinem Fork einfach eigene schreiben.

---

## Selfhosting

Empfohlener Weg fürs Homelab: klonen, mit Docker Compose bauen, hinter den eigenen
Reverse Proxy hängen.

### Voraussetzungen

- Docker und Docker Compose (v2)
- ~2 GB Plattenplatz (das Piston-Image bringt die Sprach-Runtimes mit)
- Für die C#-Übungen: ein Host, auf dem Container `privileged` laufen dürfen –
  Piston braucht das für seine Sandbox (`isolate`)

### Installation

```bash
git clone https://github.com/DevLunaris/ap02.git
cd ap02

# Optional: Port anpassen, falls 3000 belegt ist
cp .env.example .env
# WEB_PORT=8080

docker compose up -d --build
```

Danach läuft die Seite auf `http://<host>:3000`.

### C#-Runtime nachinstallieren

Piston startet ohne Sprachen. Einmalig:

```bash
docker exec ap2-piston /piston/piston ppman install dotnet
```

Die Runtime landet im Volume `piston-packages` und überlebt Neustarts.
Was verfügbar ist, zeigt `docker exec ap2-piston /piston/piston ppman list`.

**Ohne diesen Schritt funktioniert alles andere trotzdem** – nur die C#-Übungen melden
dann, dass kein Runner erreichbar ist. Wer keine C#-Übungen braucht, kann den
`piston`-Service auch komplett aus der `docker-compose.yml` streichen.

### Reverse Proxy

Der `web`-Container spricht plain HTTP auf Port 3000. Beispiel für Caddy:

```caddyfile
ap2.deine-domain.de {
    reverse_proxy localhost:3000
}
```

Für Traefik, nginx oder NPM entsprechend – es sind keine WebSockets nötig und keine
besonderen Header.

**Zur Sicherheit:** Die Anwendung hat bewusst **keine Authentifizierung** (Vorgabe:
Single-User-Tool). Wenn du sie öffentlich erreichbar machst, setz eine Auth-Schicht davor
– Authelia, Basic Auth im Proxy oder ein Tailscale-/VPN-only-Zugang. Der
`piston`-Container ist bereits so konfiguriert, dass er **nicht** am Host hängt, sondern
nur im internen Compose-Netz erreichbar ist.

### Aktualisieren

```bash
git pull
docker compose up -d --build
```

Der Lernfortschritt liegt im `localStorage` deines Browsers und übersteht das Update.
(Ab Phase 5 gibt es zusätzlich Export/Import als JSON-Datei.)

### Was du anpassen willst

| Was | Wo |
| --- | --- |
| Prüfungstermin für den Countdown | [`config/exam.ts`](config/exam.ts) – eine Zeile |
| Welche Themen unter „Fokus" laufen | `focus`-Feld in [`content/topics.index.json`](content/topics.index.json) |
| Host-Port | `WEB_PORT` in `.env` |

---

## Lokal entwickeln

```bash
npm install
npm run dev          # http://localhost:3000
```

Unter Windows geht auch `start.bat` (doppelklicken): installiert bei Bedarf die
Abhängigkeiten, räumt einen alten Server auf Port 3000 weg und beendet den Server
zuverlässig, wenn du das Fenster schließt. `stop.bat` ist der Notausgang.

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktionsbuild inkl. Typ- und Lint-Prüfung |
| `npm run typecheck` | nur TypeScript |
| `npm test` | Vitest (221 Tests) |

Tastaturkürzel: `/` öffnet die Suche, `←` und `→` wechseln zum vorherigen bzw. nächsten
Thema derselben Kategorie.

---

## Eigene Themen schreiben

Ein Thema ist eine MDX-Datei unter `content/topics/<slug>.mdx`. Alle 89 Themen sind in
`content/topics.index.json` bereits erfasst – du legst nur die Inhaltsdatei an:

```mdx
---
slug: sql-joins
title: JOINs & Unterabfragen
summary: Tabellen verknüpfen - der Klassiker in GA2.
learningGoals:
  - INNER, LEFT und RIGHT JOIN sicher unterscheiden
related: [sql-select, relationales-datenmodell]
---

Fließtext mit **Markdown**.

<Callout type="achtung">Typische Falle …</Callout>

<SqlExercise
  task="Gib alle Kunden mit ihren Bestellungen aus."
  schema={`CREATE TABLE kunde (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO kunde VALUES (1, 'Meier');`}
  solution="SELECT k.name FROM kunde k JOIN bestellung b ON b.kunde_id = k.id;"
/>
```

Beim Start läuft eine Validierung, die dich vor den typischen Fehlern schützt: verwaiste
Dateien, Slug-Tippfehler, Verweise auf nicht existierende Themen und Widersprüche
zwischen Frontmatter und Index brechen mit einer klaren Meldung ab.

`npm test` geht noch weiter und **führt jede Übung aus deinen MDX-Dateien wirklich aus**:
Seed-Schema und Musterlösung müssen durchlaufen, eine SELECT-Lösung muss Zeilen liefern,
und eine hinterlegte `expectedOutput` muss exakt zur tatsächlichen Ausgabe passen. Damit
fällt eine kaputte Aufgabe beim Committen auf statt beim Lernen.

Die vollständige Props-API aller Komponenten steht in **[CLAUDE.md](CLAUDE.md)**, und
unter `/komponenten` rendert die laufende App jede Komponente einmal als lebenden
Styleguide.

**Beiträge sind willkommen.** Wenn du ein Thema ausarbeitest: Pull Request auf. Maßstab
ist immer „bringt das in einer 90-Minuten-Klausur Punkte?" – lieber knapp und
prüfungsnah als vollständig.

---

## Tech-Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 · MDX über
next-mdx-remote · Zod für Content-Validierung · Mermaid · Vitest · Docker (multi-stage,
standalone output)

Die Code-Ausführung liegt hinter einem Interface:

```ts
interface CodeRunner {
  run(lang, source, stdin): Promise<RunResult>
}
```

Der Browser spricht nie direkt mit Piston, sondern über `/api/run`. So bleibt die interne
Runner-URL serverseitig, und Timeout (10 s) sowie Ausgabegrenze (50 KB) werden
serverseitig erzwungen. Einen anderen Executor einzuhängen heißt: Interface
implementieren, fertig – keine UI-Komponente muss angefasst werden.

---

## Fahrplan

- [x] **Phase 1 – Gerüst:** Setup, MDX-Pipeline, Themen-Index, alle Seiten, Dark Mode,
      CodeRunner-Interface, Docker
- [x] **Phase 2 – Pseudocode-Engine:** Tokenizer, Parser und Step-Interpreter mit
      55 Tests, Tracer-UI mit Wertetabelle, Auto-Play und Übungsmodus
- [x] **Phase 3 – SQL- und C#-Engine:** sql.js und Monaco (beide selbst gehostet),
      Piston-Anbindung über `/api/run`
- [x] **Phase 4 – Musterthemen:** `pseudocode`, `sql-select` und `aktivitaetsdiagramm`
      als Qualitätsmaßstab für alle weiteren Themen
- [x] **Phase 5 – Lern-Features:** Fortschritt im localStorage mit Export/Import,
      Statusknöpfe und Notizen, Fokus-Modus, Übungspool, Volltextsuche, Tastaturkürzel
- [ ] **Laufend – Themen füllen:** 86 von 89 Themen warten noch auf Inhalt

---

## Herkunft der Daten

Die Häufigkeits- und Punktangaben in `content/topics.index.json` stammen aus der
öffentlichen [Themen-Datenbank von Stefan Macke](https://it-berufe-podcast.de/ThemenIHK)
– der Autor ist aktiver IHK-Prüfer und legt seine Methodik offen. Ausgewertet sind
9 Prüfungstermine (Winter 2021 – Winter 2025). Übernommen wurden nur die Fakten;
Zuordnung und Berechnung sind eigene Arbeit.

**Wichtig:** Erfasst sind nur die schriftlichen Teile GA1 und GA2. Die Projektarbeit
(50 % der Note) und WiSo (10 %) kommen darin nicht vor – ein fehlender Wert bedeutet
also nicht „unwichtig".

Vollständige Quellenangaben, Lizenzen und was bewusst **nicht** genutzt wurde:
**[CREDITS.md](CREDITS.md)**

Lerninhalte, Code und die interaktiven Engines sind eigenständig geschrieben.

Prüfungsstatistiken sind Erfahrungswerte, keine Zusagen der IHK. Wer sich vorbereitet,
sollte sich nicht allein auf Häufigkeitsangaben verlassen.

## Lizenz

[MIT](LICENSE) – forken, hosten, anpassen und weitergeben ausdrücklich erwünscht.
