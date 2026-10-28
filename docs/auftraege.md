# Aufträge (Warteschlange)

Bei jedem Sitzungsstart zuerst lesen. Neue Aufträge hier eintragen, bevor die
Arbeit beginnt; nach jedem Merge den Status aktualisieren. Vorlagen-Bilder
liegen in `docs/tafeln/` (siehe dort, welche fehlen).

Status: offen · in Arbeit · fertig vX.Y · zurückgestellt (Grund)

## Zusammenfassung (Paket 28.10.)

- **Fertig:** Im Haus reinsprechen (v0.135), Windsack/Hinweis-Stil/Jetzt-Karte
  morgens (v0.136), Aufgaben „alles ist heute“ (v0.137), Arbeitsweise,
  Pinnwand als Kühlschranktür (v0.138), Kachel-Farben (v0.139), Adresse
  mia.karamba-eis.de (v0.140), Mia-Zubehör Sonne (v0.140), Erster Start rund +
  Zugangscode nachsichtig (v0.141), Einkauf neu mit Nachtrag (v0.142), Mia schneller + Live-Zuhören + Stimme bleibt
  (v0.143), Fenster-Zurück ohne Wettlauf (v0.144, Fehler hinter dem
  schwankenden Ablauf `erinnerungFrage`), Pinnwand-Nachtrag (v0.145), Essen-Kachel „Rezept“ + Vorschau vor „Nehmen“ (v0.146), Erledigte Aufgaben nur
  12 Stunden (v0.147), Familie verbinden + Namen statt Mail (v0.148), Einladungsseite ohne Leiste (v0.149,
  Ursache des roten Konto-Durchklicks), Essen-Kachel final + nichts
  abgeschnitten (A-045/A-046, v0.150), Neue Aufgabe & Termin mit Räumen
  Familie · Ich · Arbeit und Ergebnis-Karten (A-020, A-021, A-034, A-037, v0.151),
  Pinnwand aufgeräumt, Größe, Ordnen, Ecke „Nur für mich“ (A-028 Teil 1 und 2,
  Tafel 123, v0.152; ausprobieren: Zettel lange drücken → Groß / Nach oben /
  Nur für mich, halten und ziehen).
- **Merge-Reihenfolge (Sortier-Auftrag 28.10., je bauen → testen → PR → mergen,
  dann der nächste auf dem neuesten `main`):**
  1. A-027 Erster Start rund (mit A-031 Zugangscode nachsichtig, 10 Versuche)
  2. A-030 Neue Adresse mia.karamba-eis.de
  2a. A-033 Mia-Zubehör: Sonne das ganze Jahr (klein, unabhängig)
  (A-027 hängt an Durchklick-Fehlern → A-030 und A-033 vorgezogen)
  3. A-018 Einkauf neu + Nachtrag (Laden leer, „Schon im Wagen“, Doppelte, Rezeptmengen)
  4. A-019 Mia schneller + A-026 Live-Zuhören (Scribe Realtime) + A-035 Mias Stimme bleibt
  5. A-020 Neue Aufgabe & Termin + A-021 + A-034 (gleiche Räume Familie · Ich · Arbeit, RaumChips, Mia rät und lernt)
  5a. A-037 Ergebnis-Karten + Aufleuchten (Tafel 126)
  6. A-025 Essen-Kachel „Rezept“ / Kochmodus / Schnellanleitung + A-038 Vorschau vor „Nehmen“
  7. A-024 Pinnwand-Nachtrag + A-028 Teil 1 (Polaroid, Wand = Inhalt, Meta, „OBEN“)
  8. A-023 Raster XS · S · M, Standard je Haushalt, Wetter mit Himmel
  9. A-029 Sport-Kachel mit Wasserzeichen + Reparaturen + A-036 Wasserzeichen für alle Kacheln
  9a. A-022 Mias Wundertüte (Baustein, für neue Nutzer an als S-Kachel; Ausnahme vom Feature-Stopp, von Felix gewollt)
  10. A-028 Teil 2 (Klein/Groß, Halten und Ziehen, „Nur für mich“, einklappbar)
  11. Volle Prüfung (bilder, bilder:vergleich, pruefen, kompletter Durchklick, Prüfstand)
- **Zurückgestellt (nach Launch):** A-032 Im-Haus-Kachel/Essen-Kachel-Entscheidung
  (offen bei Felix).
- **Ausprobieren:** Einladungslink teilen → zeigt auf mia.karamba-eis.de;
  Mia-Knopf an einem sonnigen, kühlen Tag mittags (kleine Sonne, dreht sich
  einmal), ab 18 °C Sonnenbrille, abends nichts. Erster Start auf einem
  frischen Handy: Hallo mit Häkchen, „Für wen“, Zugangscode („Fast geschafft.“,
  Groß/klein egal), danach die Karte „Mia auf den Home-Bildschirm“. Einkauf: leerer Laden
  („Oft bei Edeka“), Abhaken im Laden → „Schon im Wagen“ → „Einkauf fertig“,
  Lasagne einplanen (Packungen statt 250 ml), „Zucchini“ zweimal = eine Zeile. Mia: kurze Befehle („Milch auf die Liste“)
  kommen sofort, beim Sprechen erscheint der Text live, Mias Stimme bleibt im
  Gespräch (bei wackeligem Netz erst nach 2 Fehlern die Handy-Stimme).
  Pinnwand: Zettel abhaken → 1 s stehen, dann ins Archiv. Räume: „Zahnarzt Freitag 10 Uhr“
  (wird Ich), „Elternabend Dienstag“ (Familie), Chip antippen zum Ändern, Mia
  merkt sich die Korrektur; „Freitag 16 Uhr Zahnarzt mit Jonne. Und wir
  brauchen Milch.“ → zwei Karten, nach dem Schließen leuchten die Kacheln kurz.

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
| A-015 | Arbeitsweise: Warteschlange, Tafeln, Pakete, gestaffelte Tests, CLAUDE.md schlank | – | fertig |
| A-016 | Pinnwand als Kühlschranktür – Zettel, die bleiben, Kachel als Fächer (ersetzt „Pinnwand – nichts verschwindet ungefragt“; nebenbei Einkauf-Kachel-Kopf) | `tafel-106.png`, `tafel-107.png` | fertig v0.138 |
| A-017 | Kachel-Farben neu + einfach wählbar | `tafel-108.png` | fertig v0.139 |
| A-018 | Einkauf neu – einsprechen oder aussuchen, Läden wie die Kachel, Ohne-Laden reinziehen (+ Nachtrag Aussuchen in Abschnitten; + Nachtrag Laden leer, „Schon im Wagen“, Doppelte zusammenfassen, Rezeptmengen; ersetzt „Einkauf so einfach wie die Kachel“ und „Einkaufs-Diktat“) | `tafel-111.png`, Tafel 110 (kein Bild) | fertig v0.142 |
| A-019 | Mia im Gespräch deutlich schneller und flüssiger (Messen, Stille 1,2 s, Sofort-Weg, eine Runde, sofort sprechen, „Mhm“, schlanker Kontext, ElevenLabs schnell; Nachtrag: Sofort-Regeln für Kurzsätze ≥ 40 Prüfstand-Sätze/98 %, Mikro-Wachhund höchstens ein Neustart + „Mikro ist gerade belegt“) | – | fertig v0.143 |
| A-020 | Neue Aufgabe & Termin – ein Feld, ein Fenster je Art (Raum „Ich“ durch A-021 ersetzt; ersetzt „Neue Aufgabe / neuer Termin – ein Feld, fertig“ und beide Nachträge) | `tafel-114.png` | fertig v0.151 |
| A-021 | Termine – Raumauswahl Familie / Geschäftlich wie bei Aufgaben (ersetzt Raum „Ich“ aus A-020; selbst wieder ersetzt durch A-034: „Ich“ kommt zurück, „Arbeit“ statt „Geschäftlich“) | – | fertig v0.151 (Räume durch A-034 ersetzt) |
| A-022 | Mias Wundertüte – eine Kachel, die jeden Tag anders heißt (ersetzt „Kachel Angeberwissen“; Wortlaut in `docs/auftraege/A-022-wundertuete.md`) | `tafel-116.png` | gebaut, wartet (Punkt 9a; Pool 459 Einträge) |
| A-023 | Startseite im festen Raster XS · S · M + Standard-Anordnung je Haushalt + Wetter mit Himmel (ersetzt „Raster S/M/L“, „… XS · S · M“ und Nachträge) | `tafel-118.png`, `tafel-119.png`, `tafel-120.png` | gebaut, wartet |
| A-024 | Pinnwand-Nachtrag: Wörter klarer („Aufhängen“, „Bleibt hängen“), abhaken wie Aufgaben/Einkauf (Häkchen, 1 s stehen, dann weich ins Archiv), Archiv 30 Tage | – | fertig v0.145 |
| A-025 | Essen-Kachel „Rezept“ / „Wochenplan“, Rezeptseite, Kochmodus + Nachtrag Schnellanleitung „Kurz \| Ausführlich“ (ersetzt Tafel-121-Nachtrag „Ich koche jetzt“) | `tafel-122-essen-rezept.png` | fertig v0.146 |
| A-026 | Nachtrag zu A-019 (VORRANG): Mia hört live über ElevenLabs (Scribe Realtime) – Text beim Sprechen, Ende von selbst | – | fertig v0.143 |
| A-027 | Erster Start rund für Testfreunde (höchstens 3 Bildschirme, „Zugangscode“, Karte „Auf den Home-Bildschirm“, KI-OK aufräumen) | – | fertig v0.141 |
| A-028 | Pinnwand: aufgeräumt, Größe, Ordnen, Ecke „Nur für mich“ (+ 7a einklappbar) – Teil 1 und Teil 2 | `tafel-123.png` | fertig v0.152 |
| A-029 | Sport-Kachel mit Wasserzeichen + kleine Reparaturen (Im-Haus-Namen, Sport leer, Gedankenstriche) | Tafel 124 A (kein Bild) | gebaut, wartet |
| A-030 | Neue Adresse mia.karamba-eis.de (keine Weiterleitung, feste Adressen ersetzen; Supabase-Redirects von Hand) | – | fertig v0.140 |
| A-031 | SOFORT: Zugangscode nachsichtig prüfen (Groß/klein, Leerzeichen egal; 10 Versuche je Adresse) | – | fertig v0.141 (mit A-027) |
| A-032 | Im-Haus-Kachel / Essen-Kachel – Entscheidung | – | zurückgestellt (offen bei Felix, nach Launch) |
| A-033 | Mia-Zubehör: Sonne das ganze Jahr (Sonnenbrille ab 18 °C, sonst kleine Sonne tagsüber; nie nachts; nicht am Logo; Wortlaut `docs/auftraege/A-033-zubehoer-sonne.md`) | – | fertig v0.140 |
| A-034 | Nachtrag A-020: gleiche Räume Familie · Ich · Arbeit für Termine und Aufgaben, Vorauswahl (Termin = Familie, Aufgabe = Ich), Familien-Aufgaben für alle („erledigt von …“), RLS Ich/Arbeit nur Besitzer, `ui/RaumChips` überall, Mia rät und lernt, Raum per Lang-Drücken ändern, Prüfstand ≥ 30 Sätze (ersetzt A-021 teilweise; Wortlaut `docs/auftraege/A-034-raeume.md`) | – | fertig v0.151 |
| A-035 | Nachtrag A-019: Mias Stimme bleibt Mias Stimme (Status einmal holen und merken, erste Silbe 2,5 s mit „Mhm“, nie im Gespräch springen, erst nach 2 Fehlern Handy-Stimme mit Hinweis, Vorwärmen, Ersatz mit Grund im Mikro-Protokoll) | – | fertig v0.143 |
| A-036 | Wasserzeichen für alle Kacheln ohne eigenes Bild (eine Komponente, Zuordnung je Kachel, nicht bei Wetter/Essen/Pinnwand/Jetzt-Karte, nicht im Look „Schlicht“) | Tafel 124 A (kein Bild), Tafel 125 (kein Bild) | gebaut, wartet (mit A-029) |
| A-037 | Mias Ergebnis-Karten wie im Clip + Aufleuchten in der Kachel (Wortlaut `docs/auftraege/A-037-ergebniskarten.md`) | `tafel-126.png` | fertig v0.151 |
| A-038 | SOFORT: Vorschläge erst anschauen, dann nehmen (Rezept-Vorschau als Fenster, überall wo Gerichte zur Auswahl stehen; Wortlaut `docs/auftraege/A-038-vorschau.md`) | `tafel-122-essen-rezept.png` | fertig v0.146 |
| A-039 | Monatlich: Mias Wundertüte nachfüllen (Pool von 459 Richtung ~845, nur geprüfte Fakten, Quellen gegenprüfen) | – | offen (nach A-022) |
| A-040 | Einkaufsliste nur mit Namen: Wochenplan als Angebot oben, Liste nur Symbol + Name, „wofür“ erst im Fenster (nur Tafel, Auftragstext nicht angekommen) | `tafel-127.png` | gebaut, wartet (nach A-037) |
| A-041 | Abhaken wie Aufgaben, Mia merkt sich den Laden („wie immer ⌄“, „Oft bei …“, „Was ich mir gemerkt hab“) + Ergänzung „Einkaufsliste stellt sich vor“ | `tafel-128.png` | gebaut, wartet (mit A-040) |
| A-042 | SOFORT: „Familie verbinden“ klarer + Namen statt Mail-Adresse + Einladungslink verständlich (Bilder 1/2 nicht angekommen) | – | fertig v0.148 |
| A-043 | SOFORT: Erledigte Aufgaben nur 12 Stunden („Erledigt ⌄“ zugeklappt ohne Zahl, danach still weg per Lösch-Markierung auf allen Geräten, Serien nur die Runde, Mia nur die letzten 12 h; Wortlaut `docs/auftraege/A-043-erledigt-12h.md`) | – | fertig v0.147 |
| A-045 | SOFORT: Essen-Kachel S – nichts abgeschnitten (Knöpfe ohne „…“, Stufen Symbol → 13 px → Kurzform, „Idee“ als Pille, Im-Haus-Namen ganz, Zutaten 2 + „+N“, Prüf-Ablauf `nichtsAbgeschnitten`; Wortlaut `docs/auftraege/A-045-kachel-ganz.md`) | `tafel-133.png` | fertig v0.150 (Essen-Teil durch A-046 ersetzt, Grundregel bleibt) |
| A-046 | Essen-Kachel final – Bild antippen = Rezept (keine großen Knöpfe, „Was anderes?“ oben, „Wochenplan ›“ unten, Statuszeile, Antippen je Zustand; Wortlaut `docs/auftraege/A-046-essen-kachel-final.md`) | `tafel-134.png` | fertig v0.150 (mit A-045; „Nehmen“ ohne Wochenplan-Angebot aus Tafel 127, das kommt mit A-040) |

## Offene Punkte (ohne eigenen Auftrag)

- Jetzt-Karte nennt tagsüber einen neuen Pinnwand-Zettel, den auch die
  Pinnwand-Kachel zeigt (Regel „nur was die Kacheln nicht zeigen“) – mit A-016
  prüfen.
- Durchklick `konten`/`abgleich` (Test-Backend) war nach dem Neustart der
  Arbeitsumgebung zeitweise rot, auch auf `main`; zuletzt (v0.136) wieder grün.
- Prüfstand „Ton“ mit der echten KI noch nicht gemessen (Testmodus 28/30).
