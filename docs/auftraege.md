# Aufträge (Warteschlange)

Bei jedem Sitzungsstart zuerst lesen. Neue Aufträge hier eintragen, bevor die
Arbeit beginnt; nach jedem Merge den Status aktualisieren. Vorlagen-Bilder
liegen in `docs/tafeln/` (siehe dort, welche fehlen).

Status: offen · in Arbeit · fertig vX.Y · zurückgestellt (Grund)

## Morgen früh (Nachtschicht 28./29.10.)

- **Fertig und auf `main` (in Merge-Reihenfolge):**
  - v0.147 Erledigte Aufgaben nur 12 h (A-043)
  - v0.148 Familie verbinden + Namen statt Mail (A-042)
  - v0.149 Einladungsseite ohne Leiste (Ursache des roten Konto-Durchklicks)
  - v0.150 Essen-Kachel final + nichts abgeschnitten (A-045, A-046, Tafel 133/134)
  - v0.151 Familie · Ich · Arbeit, Termin-Räume, Ergebnis-Karten + Aufleuchten (A-020, A-021, A-034, A-037)
  - v0.152 Pinnwand Teil 1 + 2 (A-028, Tafel 123 neu)
  - v0.153 Raster XS · S · M, Wasserzeichen, Sport-Stempelkarte (A-023, A-029, A-036, A-044, Tafel 118–120/124/125/132)
  - v0.154 Einkaufsliste nur mit Namen + Wochenplan-Angebot + Abhaken/Merken (A-040, A-041, Tafel 127/128)
  - v0.155 Prüfen-Fehler im Raster (A-047)
  - v0.156 Mias Wundertüte (A-022, Tafel 116)
- **Volle Prüfung auf v0.156:**
  - grün: `npm test` (3508), tsc, eslint, knip, Datenbank, Build, Schlüssel-Suche
  - kompletter Durchklick: 145 Abläufe × 2 Geräte, alles ok
  - `pruefen`: 708 Seiten, alles ok
  - Bilder: Das Skript war seit v0.151 kaputt (verwaister Import) und ist repariert. 119 von 234 Bildern weichen ab, alle durch die gewollten Änderungen der Nacht (Raster, Essen-Kachel, Räume, Pinnwand, Wundertüte). Stichprobe angesehen, neue Basis gesetzt.
  - Prüfstand: braucht die KI, deshalb nur über „Für Entwickler“ in der App
- **Vercel:** Die Production-Deployments kann ich von hier nicht prüfen (kein Zugriff auf Vercel). Bitte im Vercel-Dashboard nachsehen, ob „Production“ auf v0.156 steht.
- **Wartet, und warum:**
  - A-039 Wundertüte nachfüllen: Monatsauftrag, erst nach A-022
  - A-032 Im-Haus-/Essen-Kachel: Entscheidung liegt bei Felix
  - Text/Tafel nie angekommen: Auftragstext A-040 (nach Tafel 127 gebaut), Bilder 1/2 zu A-042, Tafeln 129/130 (durch 132 ersetzt)
- **Offen, klein (notiert, nicht gebaut):**
  - Die Jetzt-Karte kürzt noch mit „…“ („Neu auf der Pinnwand · …“).
  - Eingebaute Rezepte (Wok-Nudeln usw.) liefern der Einkaufsliste keine Plan-Zutaten; „Nehmen“ nimmt ersatzweise die Vorschau.
  - `tests/core/abfragen.test.ts` war einmal um 00:41 UTC rot, später wieder grün (hängt wohl an der Uhrzeit).
  - Alte App-Stände kennen den Raum „Ich“ nicht. Prüfen, dass sie nichts falsch hochladen.
- **5 Dinge zuerst am Handy ausprobieren:**
  1. Neue Aufgabe mit ＋: Chips „Familie · Ich · Arbeit“ wählen. Danach lange auf die Zeile drücken: „Nur ich“ zeigt ein Schloss.
  2. Startseite lange drücken: Größen XS · S · M probieren. Nichts darf abgeschnitten sein, nirgends „…“.
  3. Essen-Kachel antippen: Vorschau → „Nehmen“ → unten „Auf die Liste: …?“ → „Alle dazu“. Danach auf der Einkaufsliste abhaken: erscheint „Im Wagen ⌄“?
  4. Pinnwand-Zettel lange drücken: Groß / Nach oben / Nur für mich. Dann abhaken: steht er 1 s, bevor er ins Archiv geht?
  5. Familie einladen: Link schicken. Auf dem zweiten Handy ohne Leiste beitreten. Steht der Name statt der Mail bei „erledigt von …“?

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
  Nur für mich, halten und ziehen), Startseite im festen Raster XS · S · M
  mit Standard je Haushalt und Wetter mit Himmel, Wasserzeichen für alle
  Kacheln, Sport als Stempelkarte (A-023, A-029, A-036, A-044, v0.153;
  ausprobieren: Startseite bearbeiten → Größen XS · S · M, Sport-Kachel
  „Training eintragen“), Einkaufsliste nur mit Namen + Abhaken wie Aufgaben,
  Mia merkt sich den Laden, „Nehmen“ bietet die Zutaten an (A-040/A-041,
  Tafel 127/128, v0.154; ausprobieren: Laden-Seite „Für deinen Wochenplan“ →
  „Alle dazu“, Zeile antippen, abhaken → „Im Wagen ⌄“, Essen-Kachel → Rezept →
  „Nehmen“ → „Alle dazu“), Mias Wundertüte (A-022, Tafel 116, v0.156;
  ausprobieren: frisch starten → Wundertüte S hinter Essen + Einkauf,
  antippen = Antwort, nochmal = andere Sorte, ab 17 Uhr Tischrunde).
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
| A-022 | Mias Wundertüte – eine Kachel, die jeden Tag anders heißt (ersetzt „Kachel Angeberwissen“; Wortlaut in `docs/auftraege/A-022-wundertuete.md`) | `tafel-116.png` | fertig v0.156 (Punkt 9a; neu auf v0.155 aufgesetzt, Pool 459 Einträge, alle Karten ganz in S/M) |
| A-023 | Startseite im festen Raster XS · S · M + Standard-Anordnung je Haushalt + Wetter mit Himmel (ersetzt „Raster S/M/L“, „… XS · S · M“ und Nachträge) | `tafel-118.png`, `tafel-119.png`, `tafel-120.png` | fertig v0.153 |
| A-024 | Pinnwand-Nachtrag: Wörter klarer („Aufhängen“, „Bleibt hängen“), abhaken wie Aufgaben/Einkauf (Häkchen, 1 s stehen, dann weich ins Archiv), Archiv 30 Tage | – | fertig v0.145 |
| A-025 | Essen-Kachel „Rezept“ / „Wochenplan“, Rezeptseite, Kochmodus + Nachtrag Schnellanleitung „Kurz \| Ausführlich“ (ersetzt Tafel-121-Nachtrag „Ich koche jetzt“) | `tafel-122-essen-rezept.png` | fertig v0.146 |
| A-026 | Nachtrag zu A-019 (VORRANG): Mia hört live über ElevenLabs (Scribe Realtime) – Text beim Sprechen, Ende von selbst | – | fertig v0.143 |
| A-027 | Erster Start rund für Testfreunde (höchstens 3 Bildschirme, „Zugangscode“, Karte „Auf den Home-Bildschirm“, KI-OK aufräumen) | – | fertig v0.141 |
| A-028 | Pinnwand: aufgeräumt, Größe, Ordnen, Ecke „Nur für mich“ (+ 7a einklappbar) – Teil 1 und Teil 2 | `tafel-123.png` | fertig v0.152 |
| A-029 | Sport-Kachel mit Wasserzeichen + kleine Reparaturen (Im-Haus-Namen, Sport leer, Gedankenstriche) | Tafel 124 A (kein Bild) | fertig v0.153 (Sport-Teil ersetzt durch A-044) |
| A-030 | Neue Adresse mia.karamba-eis.de (keine Weiterleitung, feste Adressen ersetzen; Supabase-Redirects von Hand) | – | fertig v0.140 |
| A-031 | SOFORT: Zugangscode nachsichtig prüfen (Groß/klein, Leerzeichen egal; 10 Versuche je Adresse) | – | fertig v0.141 (mit A-027) |
| A-032 | Im-Haus-Kachel / Essen-Kachel – Entscheidung | – | zurückgestellt (offen bei Felix, nach Launch) |
| A-033 | Mia-Zubehör: Sonne das ganze Jahr (Sonnenbrille ab 18 °C, sonst kleine Sonne tagsüber; nie nachts; nicht am Logo; Wortlaut `docs/auftraege/A-033-zubehoer-sonne.md`) | – | fertig v0.140 |
| A-034 | Nachtrag A-020: gleiche Räume Familie · Ich · Arbeit für Termine und Aufgaben, Vorauswahl (Termin = Familie, Aufgabe = Ich), Familien-Aufgaben für alle („erledigt von …“), RLS Ich/Arbeit nur Besitzer, `ui/RaumChips` überall, Mia rät und lernt, Raum per Lang-Drücken ändern, Prüfstand ≥ 30 Sätze (ersetzt A-021 teilweise; Wortlaut `docs/auftraege/A-034-raeume.md`) | – | fertig v0.151 |
| A-035 | Nachtrag A-019: Mias Stimme bleibt Mias Stimme (Status einmal holen und merken, erste Silbe 2,5 s mit „Mhm“, nie im Gespräch springen, erst nach 2 Fehlern Handy-Stimme mit Hinweis, Vorwärmen, Ersatz mit Grund im Mikro-Protokoll) | – | fertig v0.143 |
| A-036 | Wasserzeichen für alle Kacheln ohne eigenes Bild (eine Komponente, Zuordnung je Kachel, nicht bei Wetter/Essen/Pinnwand/Jetzt-Karte, nicht im Look „Schlicht“) | Tafel 124 A (kein Bild), `tafel-125.png` | fertig v0.153 |
| A-037 | Mias Ergebnis-Karten wie im Clip + Aufleuchten in der Kachel (Wortlaut `docs/auftraege/A-037-ergebniskarten.md`) | `tafel-126.png` | fertig v0.151 |
| A-038 | SOFORT: Vorschläge erst anschauen, dann nehmen (Rezept-Vorschau als Fenster, überall wo Gerichte zur Auswahl stehen; Wortlaut `docs/auftraege/A-038-vorschau.md`) | `tafel-122-essen-rezept.png` | fertig v0.146 |
| A-039 | Monatlich: Mias Wundertüte nachfüllen (Pool von 459 Richtung ~845, nur geprüfte Fakten, Quellen gegenprüfen; danach Durchklick `wundertueteAlle`) | – | wartet (nach A-022) |
| A-040 | Einkaufsliste nur mit Namen: Wochenplan-Zutaten als Angebot oben auf der Laden-Seite („Für deinen Wochenplan“, Chips, „Alle dazu“, Grundsachen blass), Liste nur Symbol + Name (Menge nur selbst gesagt), Zeile antippen = Fenster mit „wofür“, Menge, Laden, „Von der Liste nehmen“ (Auftragstext nicht angekommen, nur Tafel; `docs/auftraege/A-040-041-einkauf-namen.md`) | `tafel-127.png` | fertig v0.154 |
| A-041 | Abhaken wie Aufgaben (1 s, zurück, „Im Wagen ⌄“ unter der Liste), Mia merkt sich den Laden (Sache → Laden, Zähler, Datum; „Rewe · wie immer ⌄“, „Oft bei Rewe“, 90-Tage-Regel, „Was ich mir gemerkt hab“) + Ergänzung „Einkaufsliste stellt sich beim ersten Mal vor“ (Wortlaut `docs/auftraege/A-040-041-einkauf-namen.md`) | `tafel-128.png` | fertig v0.154 |
| A-042 | SOFORT: „Familie verbinden“ klarer + Namen statt Mail-Adresse + Einladungslink verständlich (Bilder 1/2 nicht angekommen) | – | fertig v0.148 |
| A-043 | SOFORT: Erledigte Aufgaben nur 12 Stunden („Erledigt ⌄“ zugeklappt ohne Zahl, danach still weg per Lösch-Markierung auf allen Geräten, Serien nur die Runde, Mia nur die letzten 12 h; Wortlaut `docs/auftraege/A-043-erledigt-12h.md`) | – | fertig v0.147 |
| A-044 | Sport als Stempelkarte: Sport-Seite (Diese Woche, zwei Sätze, „Training eintragen“, „Planen“, Letzte Wochen), Menü „•••“ (Wochenziel, Packlisten, Meine Sportarten, Erinnerung am Vorabend), Kachel ohne Wasserzeichen, Mia „gestempelt“ und „Wie läuft’s?“ (ersetzt Tafel 129/130 und den Wochen-Kreis-Teil von 124; Wortlaut `docs/auftraege/A-044-sport-stempel.md`) | `tafel-132.png` | fertig v0.153 |
| A-045 | SOFORT: Essen-Kachel S – nichts abgeschnitten (Knöpfe ohne „…“, Stufen Symbol → 13 px → Kurzform, „Idee“ als Pille, Im-Haus-Namen ganz, Zutaten 2 + „+N“, Prüf-Ablauf `nichtsAbgeschnitten`; Wortlaut `docs/auftraege/A-045-kachel-ganz.md`) | `tafel-133.png` | fertig v0.150 (Essen-Teil durch A-046 ersetzt, Grundregel bleibt) |
| A-046 | Essen-Kachel final – Bild antippen = Rezept (keine großen Knöpfe, „Was anderes?“ oben, „Wochenplan ›“ unten, Statuszeile, Antippen je Zustand; Wortlaut `docs/auftraege/A-046-essen-kachel-final.md`) | `tafel-134.png` | fertig v0.150 (mit A-045; „Nehmen“ bietet seit v0.154 die Zutaten an, Wochenplan-Angebot aus Tafel 127 mit A-040) |
| A-047 | `pruefen` grün im Raster: Wasserzeichen nicht mitmessen, Mindest-Zeile auf dem SE 1, Essen-Bildfläche ohne Überquellen, XS-Zeile 30 px, Einkauf „+N“ nicht unter dem Plus, Wetter-XS „Morgen“ | – | fertig v0.155 |

## Offene Punkte (ohne eigenen Auftrag)

- Jetzt-Karte nennt tagsüber einen neuen Pinnwand-Zettel, den auch die
  Pinnwand-Kachel zeigt (Regel „nur was die Kacheln nicht zeigen“) – mit A-016
  prüfen.
- Durchklick `konten`/`abgleich` (Test-Backend) war nach dem Neustart der
  Arbeitsumgebung zeitweise rot, auch auf `main`; zuletzt (v0.136) wieder grün.
- Prüfstand „Ton“ mit der echten KI noch nicht gemessen (Testmodus 28/30).
