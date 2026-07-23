-- Übungsdatenbank "Handel"
--
-- Gemeinsames Seed-Schema für die SQL-Themen. Bewusst klein genug, um es im Kopf
-- zu behalten, aber groß genug für JOINs, Gruppierung, NULL-Werte und
-- Normalisierungs-Diskussionen.
--
-- Enthaltene Fallen für Übungen:
--   - kunde.newsletter ist bei zwei Kunden NULL (nicht 0!)
--   - ein Kunde ohne Bestellung (Aydin) -> Unterschied INNER/LEFT JOIN sichtbar
--   - ein Artikel ohne Bestellposition (Locher) -> dito
--   - unterschiedliche Mengen je Position -> Summen sind nicht die Zeilenanzahl

CREATE TABLE kunde (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  ort        TEXT    NOT NULL,
  newsletter INTEGER
);

CREATE TABLE artikel (
  id    INTEGER PRIMARY KEY,
  bez   TEXT    NOT NULL,
  preis REAL    NOT NULL,
  lager INTEGER NOT NULL
);

CREATE TABLE bestellung (
  id       INTEGER PRIMARY KEY,
  kunde_id INTEGER NOT NULL REFERENCES kunde(id),
  datum    TEXT    NOT NULL
);

CREATE TABLE position (
  bestellung_id INTEGER NOT NULL REFERENCES bestellung(id),
  artikel_id    INTEGER NOT NULL REFERENCES artikel(id),
  menge         INTEGER NOT NULL,
  PRIMARY KEY (bestellung_id, artikel_id)
);

INSERT INTO kunde VALUES
  (1, 'Meier',  'Köln',      1),
  (2, 'Schulz', 'Hamburg',   0),
  (3, 'Yildiz', 'Köln',   NULL),
  (4, 'Brandt', 'Berlin',    1),
  (5, 'Aydin',  'Hamburg', NULL);

INSERT INTO artikel VALUES
  (10, 'Notizbuch',   4.50,  120),
  (11, 'Kugelschreiber', 1.20, 500),
  (12, 'Aktenordner', 3.80,   60),
  (13, 'Locher',      9.90,   15);

INSERT INTO bestellung VALUES
  (100, 1, '2025-03-04'),
  (101, 1, '2025-05-19'),
  (102, 2, '2025-05-21'),
  (103, 4, '2025-06-02');

INSERT INTO position VALUES
  (100, 10,  3),
  (100, 11, 10),
  (101, 12,  2),
  (102, 10,  1),
  (102, 12,  5),
  (103, 11, 25);
