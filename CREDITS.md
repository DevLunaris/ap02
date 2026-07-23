# Quellen und Nachweise

Code und Lerntexte dieses Projekts sind eigenständig geschrieben und stehen unter der
[MIT-Lizenz](LICENSE). Diese Datei nennt die Quellen, aus denen **Fakten** stammen.

Bei CC-BY-Material ist die Namensnennung Wirksamkeitsvoraussetzung der Lizenz — ohne sie
entfällt das Nutzungsrecht automatisch. Deshalb steht sie hier und nicht im Kleingedruckten.

---

## Prüfungsstatistik im Themen-Index

**[Themen der bisherigen IHK-Prüfungen](https://it-berufe-podcast.de/ThemenIHK)**
· Stefan Macke · abgerufen 2026-07-23

Grundlage der Felder `frequency` und `points` in
[`content/topics.index.json`](content/topics.index.json). Der Autor ist aktiver
IHK-Prüfer und legt seine Methodik offen: alle Prüfungen seit 2020 durchgesehen, je
Aufgabe Themengebiet und vergebene Punkte erfasst.

Ausgewertet wurden 9 Prüfungstermine (Winter 2021 – Winter 2025) für Fachinformatiker
Anwendungsentwicklung. Übernommen wurden ausschließlich die **Fakten** (welches Thema in
welcher Prüfung, mit wie vielen Punkten) — keine Formulierungen, keine Tabellenstruktur.
Die Zuordnung auf unsere Themen-Slugs und die Berechnung der Prozentwerte sind eigene
Arbeit.

**Grenzen dieser Datenbasis** stehen im `$comment` des Index und sind wichtig: Erfasst
sind nur die schriftlichen Teile GA1 und GA2 — die Projektarbeit (50 % der Note) und WiSo
(10 %) kommen darin nicht vor. Ein fehlender Wert bedeutet also nicht „unwichtig".

## Themenstruktur

Die ursprüngliche Gliederung in 13 Kategorien und 89 Themen orientierte sich an
[ap2-fiae.de](https://www.ap2-fiae.de). Die dort ausgewiesenen Häufigkeits- und
Punktangaben wurden inzwischen **ersetzt**: Die Seite nennt keinen Autor, keine Lizenz
und keine Methodik und weist selbst darauf hin, dass ihre Inhalte KI-gestützt entstanden
sind. Für eine Prüfungsvorbereitung ist das keine tragfähige Grundlage.

## Verbindlicher Prüfungsstoff

- **[FIAusbV](https://www.gesetze-im-internet.de/fiausbv/BJNR025000020.html)** —
  Verordnung über die Berufsausbildung zum Fachinformatiker, amtliches Werk
  (§ 5 Abs. 1 UrhG, gemeinfrei). §§ 13/14 definieren die Prüfungsbereiche.
- **[KMK-Rahmenlehrplan](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Fachinformatiker_19-12-13_EL.pdf)**
  — Kultusministerkonferenz, Beschluss vom 13.12.2019
- **[Ausbildung gestalten: Fachinformatiker/-in](https://www.bibb.de/dienst/publikationen/de/16661)**
  — BIBB-Umsetzungshilfe
- **Prüfungskatalog FIAE**, 2. Auflage (gültig ab AP2 Sommer 2025) — Fachausschüsse der
  IHK-Organisation, Vertrieb U-Form Verlag. Kostenpflichtig, **nicht** in dieses Projekt
  eingeflossen; nur als Abgleichsraster empfohlen.

## Fachliche Referenzen

- **[oer-informatik.de](https://oer-informatik.de)** · Hannes Stein · **CC BY 4.0**
  — insbesondere [Pseudocode](https://oer-informatik.de/pseudocode) zur Notation des
  deutschen „Pseudo-Pascal"
- **[Fachinformatiker-Prüfungsvorbereitung](https://github.com/Fachinformatiker-Prufungsvorbereitung/Fachinformatiker-Pruefungsvorbereitung)**
  · Community-Projekt · **MIT**

## Bewusst nicht genutzt

| Quelle | Grund |
| --- | --- |
| inf-schule.de, Wikibooks | CC BY-SA — das Copyleft würde auf dieses Repository übergreifen |
| GitHub-Repos ohne LICENSE-Datei | Ohne Lizenz gilt striktes Urheberrecht |
| Kommerzielle Prüfungsportale | Kein Scraping (§ 87b UrhG, Datenbankherstellerrecht) |
| Original-Prüfungsaufgaben (U-Form, AkA) | Urheberrechtlich geschützt; § 5 Abs. 2 UrhG greift nicht |

---

## Haftungsausschluss

Dieses Projekt steht in keiner Verbindung zur IHK, zur AkA oder zu einem Prüfungsverlag.
Häufigkeits- und Punktangaben sind Auswertungen vergangener Prüfungen — **Erfahrungswerte,
keine Zusagen**. Was in der nächsten Prüfung drankommt, weiß niemand vorher.

Verwendete Bibliotheken und ihre Lizenzen: siehe `package.json` und `package-lock.json`.
