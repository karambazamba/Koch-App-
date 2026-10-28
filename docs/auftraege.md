# Aufträge (Warteschlange)

Bei jedem Sitzungsstart zuerst lesen. Neue Aufträge hier eintragen, bevor die
Arbeit beginnt; nach jedem Merge den Status aktualisieren. Vorlagen-Bilder
liegen in `docs/tafeln/` (siehe dort, welche fehlen).

Status: offen · in Arbeit · fertig vX.Y · zurückgestellt (Grund)

## Zusammenfassung (Paket 28.10.)

- **Fertig:** Im Haus reinsprechen (v0.135), Windsack/Hinweis-Stil/Jetzt-Karte
  morgens (v0.136), Aufgaben „alles ist heute“ (v0.137), Arbeitsweise,
  Pinnwand als Kühlschranktür (v0.138).
- **In Arbeit:** Kachel-Farben (A-017),
  Einkauf neu (A-018), Mia schneller (A-019), Neue Aufgabe & Termin (A-020) – werden nacheinander auf dem neuesten `main` gemergt.
- **Ausprobieren:** „Im Haus“ → „Was ist da?“ einen Satz sagen („Milch ist da,
  Thunfisch ist alle“); Aufgaben-Seite abends (Arbeit ausgeblendet, „Arbeit ·
  n für morgen“); Wetter bei wenig Wind ohne Windsack.
- **Volle Prüfung:** läuft am Ende des Pakets (nach A-018), Ergebnis hier.

## Liste

| Nr. | Titel | Vorlage | Status |
|---|---|---|---|
| A-001 | Abends nichts doppelt | Tafel 98 (kein Bild) | fertig v0.124 |
| A-002 | Navigation neu – Leiste unten | Tafel 96 (kein Bild) | fertig v0.125 |
| A-003 | Essen – die nächsten 7 Tage + 150 Gerichte | Tafel 97 (kein Bild) | fertig v0.126 |
| A-004 | „Im Haus“ gehört zu 1.0 – mit Spontan kochen | – | fertig v0.127 |
| A-005 | Wetter-Kachel neu, Wind in Worten | Tafel 87 (kein Bild) | fertig v0.128 |
| A-006 | Werbeclip-Abgleich + Härtetest „Familie teilen“ | – | fertig v0.129 |
| A-007 | Einkauf: erst einsortieren, dann einkaufen | Tafel 99 (kein Bild) | fertig v0.130 |
| A-008 | Auf der Bühne nur eine Mia | Tafel 100 (kein Bild) | fertig v0.131 |
| A-009 | Offene Aufgaben wandern abends mit | – | fertig v0.132 (abgelöst durch A-014) |
| A-010 | Seiten-Tipps oben statt unten | Tafel 101 (kein Bild) | fertig v0.133 |
| A-011 | Mia lockerer und kürzer im Chat | – | fertig v0.134 |
| A-012 | Im Haus – reinsprechen statt pflegen | Tafel 102 (kein Bild) | fertig v0.135 |
| A-013 | Windsack nur bei Wind, ein Hinweis-Stil, Jetzt-Karte morgens | – | fertig v0.136 |
| A-014 | Aufgaben – alles ist heute, eine Liste, Arbeit als Schild | Tafel 103/104 (kein Bild) | fertig v0.137 |
| A-015 | Arbeitsweise: Warteschlange, Tafeln, Pakete, gestaffelte Tests, CLAUDE.md schlank | – | fertig (dieser PR) |
| A-016 | Pinnwand als Kühlschranktür – Zettel, die bleiben, Kachel als Fächer (ersetzt „Pinnwand – nichts verschwindet ungefragt“; nebenbei Einkauf-Kachel-Kopf) | `tafel-106.png`, `tafel-107.png` | fertig v0.138 |
| A-017 | Kachel-Farben neu + einfach wählbar | `tafel-108.png` | in Arbeit (gebaut, wartet auf A-016) |
| A-018 | Einkauf neu – einsprechen oder aussuchen, Läden wie die Kachel, Ohne-Laden reinziehen (+ Nachtrag Aussuchen in Abschnitten; ersetzt „Einkauf so einfach wie die Kachel“ und „Einkaufs-Diktat“) | `tafel-111.png`, Tafel 110 (kein Bild) | in Arbeit (gebaut, wartet) |
| A-019 | Mia im Gespräch deutlich schneller und flüssiger (Messen, Stille 1,2 s, Sofort-Weg, eine Runde, sofort sprechen, „Mhm“, schlanker Kontext, ElevenLabs schnell; Nachtrag: Sofort-Regeln für Kurzsätze ≥ 40 Prüfstand-Sätze/98 %, Mikro-Wachhund höchstens ein Neustart + „Mikro ist gerade belegt“) | – | in Arbeit |
| A-020 | Neue Aufgabe & Termin – ein Feld, Familie · Ich · Arbeit (neuer Raum „Ich“; ersetzt „Neue Aufgabe / neuer Termin – ein Feld, fertig“ und beide Nachträge) | `tafel-114.png` | in Arbeit |

## Offene Punkte (ohne eigenen Auftrag)

- Jetzt-Karte nennt tagsüber einen neuen Pinnwand-Zettel, den auch die
  Pinnwand-Kachel zeigt (Regel „nur was die Kacheln nicht zeigen“) – mit A-016
  prüfen.
- Durchklick `konten`/`abgleich` (Test-Backend) war nach dem Neustart der
  Arbeitsumgebung zeitweise rot, auch auf `main`; zuletzt (v0.136) wieder grün.
- Prüfstand „Ton“ mit der echten KI noch nicht gemessen (Testmodus 28/30).
