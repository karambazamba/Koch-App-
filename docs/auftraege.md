# Aufträge (Warteschlange)

Bei jedem Sitzungsstart zuerst lesen. Neue Aufträge hier eintragen, bevor die
Arbeit beginnt; nach jedem Merge den Status aktualisieren. Vorlagen-Bilder
liegen in `docs/tafeln/` (siehe dort, welche fehlen).

Status: offen · in Arbeit · fertig vX.Y · zurückgestellt (Grund)

## Stand 29.10. abends (nach Sortier-Auftrag)

- **Fertig:** v0.157 Mia hört von Anfang an (A-056) · v0.158 Startseite kompakter (A-048) · v0.159 Durchatmen (A-051) · v0.160 Rätsel + Wundertüte (A-052) · v0.161 Eingebaute Rezepte liefern Zutaten (A-057) · v0.162 Kaputt-Fixes: Notizen-Kachel, Wundertüte zum Umdrehen, Menü erstes Tippen, Wischen unten (A-059) · v0.163 Jetzt-Karte nur mit Nutzen (A-054) · v0.164 Durchatmen ohne Roboterstimme (A-061) · v0.165 Notizen-Vorschau + Mia-Zubehör (A-060/A-058) · v0.166 Startseite neu mit Mini-Kreisen (A-050) · v0.167 „Was los?“ (A-055, Parser wartet).
- **Zurückgestellt:** A-053 volle Prüfung (auf Zuruf) · Parser „Was los?“ (wartet, bis `www.kreis-oh.de` aus der Arbeitsumgebung erreichbar ist; bis dahin bleibt der Kreis ausgeblendet) · A-039 Wundertüte nachfüllen (monatlich).
- **Kleine offene Punkte:** Fenster mit ✕ schließen und binnen ~300 ms wieder öffnen → geht gleich wieder zu (Wettlauf in `fensterVerlauf`) · `tests/core/abfragen.test.ts` einmal uhrzeitabhängig rot · alte App-Stände kennen den Raum „Ich“ nicht.
- **5 Dinge zum Ausprobieren:**
  1. Mia antippen und sofort lossprechen: „Milch, Eier und Butter auf die Liste“ → drei Sachen.
  2. Sport-Kreis oben antippen → Tag wählen → „Sa 10:00 … planen“ → Termin im Kalender.
  3. Pause-Kreis → „Handy-Pause“ → „Los“: erst Erklärung, dann dunkel, am Ende Gong.
  4. Wundertüte-Kachel antippen: dreht sich und zeigt die Lösung; „Mehr ›“ öffnet die Seite.
  5. App frisch starten → „•••“ → Einstellungen öffnet beim ersten Tippen.

## Fragen an Felix

- ~~Darf `www.kreis-oh.de` in die erlaubten Domains der Cloud-Umgebung?~~ **Beantwortet (29.10.): freigegeben.**
- ~~Reicht für die Durchatmen-Ansagen erst einmal die Handy-Stimme?~~ **Beantwortet (29.10.): Lola-Ansagen über die Server-Route und Storage** (einmal erzeugen, Bucket `durchatmen-ansagen`).
- ~~A-032: Bleibt Im Haus nur unter Essen?~~ **Beantwortet (29.10.): Im Haus bleibt unter Essen, als Kachel nur wählbar (S/M)** – umgesetzt mit A-050.

## Sortier-Auftrag 29.10.: Pakete und Reihenfolge

Bei Widersprüchen gilt der neuere Auftrag. Gemergt wird in dieser Reihenfolge, gebaut parallel.

| Paket | Inhalt | Aufträge | Stand |
|---|---|---|---|
| P1 | Sofort-Fixes | A-056 Mia hört von Anfang an + mehrere Sachen (Vorrang), A-045/A-046 Essen-Kachel final (Tafel 134), A-048 Startseite kompakter + Höhe nach Anzahl (Tafel 135), A-043 Erledigte 12 h, A-042 Familie verbinden, A-038 Vorschau vor „Nehmen“, A-054 Jetzt-Karte nur Nützliches | A-056 fertig v0.157 (Vorrang), A-048 fertig v0.158; A-054 fertig v0.163 |
| P2 | Gebaut, wartet | A-020/A-034 Räume, A-024 Pinnwand abhaken, A-028 Pinnwand Teil 1 + 2, A-029/A-036 Wasserzeichen | fertig (v0.145–v0.153) |
| P3 | Einkauf | A-040/A-041 (Tafel 127/128), Einkauf M Läden nebeneinander (Tafel 140, mit P4) | A-040/A-041 fertig v0.154, Einkauf M kommt mit P4 |
| P4 | Startseite neu | A-050: Mini-Kreise final (Tafel 143, keine Schilder), Fenster Sport/Timer/Rätsel (Tafel 137), Beispiel-Startseite (Tafel 140), Korkrahmen (Tafel 141), Einkauf M, Im Haus von der Startseite | fertig v0.166 |
| P5 | Essen/Kochen | A-025 Rezeptseite, Kochmodus, Schnellanleitung (Tafel 122) | fertig v0.146 |
| P6 | Ergebnis-Karten | A-037 (Tafel 126) | fertig v0.151 |
| P7 | Sport-Seite | A-044 Stempelkarte (Tafel 132) | fertig v0.153 |
| P8 | Durchatmen, Rätsel, Wundertüte | A-051 Durchatmen + Stimme/Klang (Tafel 138/139), A-052 Rätsel + Wundertüte | A-051 fertig v0.159; A-052 fertig v0.160 |
| P9 | Was los? | A-055 (Tafel 142) | fertig v0.167, Parser wartet (www.kreis-oh.de aus der Arbeitsumgebung nicht erreichbar; Beispielseiten unter tests/fixtures/kreis-oh/ fehlen) |
| P10 | Volle Prüfung | A-053 | zurückgestellt (später, auf Zuruf) |

Ersetzt und nicht mehr gebaut: Essen-Kachel Tafel 121/122/133 → Tafel 134 (Rezeptseite/Kochmodus aus 122 bleiben); Sport Tafel 129/130/131 → Tafel 132 + Mini-Kreis Sport; Startseite Tafel 136 und Teil 1–2 von Tafel 137 → Tafel 143 (Fenster aus 137 bleiben); A-049 → A-052; „Tipps aus der Region“ → „Was los?“ (A-055); Füllsätze der Jetzt-Karte → A-054.

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
  - A-032 Im-Haus-/Essen-Kachel: entschieden (29.10.) – Im Haus bleibt unter Essen, als Kachel nur wählbar (S/M)
  - Text/Tafel nie angekommen: Auftragstext A-040 (nach Tafel 127 gebaut), Bilder 1/2 zu A-042, Tafeln 129/130 (durch 132 ersetzt)
- **Offen, klein (notiert, nicht gebaut):**
  - ~~Die Jetzt-Karte kürzt noch mit „…“ („Neu auf der Pinnwand · …“).~~ Erledigt mit A-054 (v0.163): nie mehr „…“, die Karte bricht um (Test lange Titel + Durchklick iPhone SE).
  - ~~Eingebaute Rezepte (Wok-Nudeln usw.) liefern der Einkaufsliste keine Plan-Zutaten; „Nehmen“ nimmt ersatzweise die Vorschau.~~ Erledigt mit A-057 (v0.161).
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
- **Entschieden (29.10.):** A-032 Im Haus bleibt unter Essen, als Kachel nur wählbar (S/M)
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
| A-032 | Im-Haus-Kachel / Essen-Kachel – Entscheidung | – | entschieden: Im Haus bleibt unter Essen, als Kachel nur wählbar (S/M) – umgesetzt mit A-050 (v0.166) |
| A-033 | Mia-Zubehör: Sonne das ganze Jahr (Sonnenbrille ab 18 °C, sonst kleine Sonne tagsüber; nie nachts; nicht am Logo; Wortlaut `docs/auftraege/A-033-zubehoer-sonne.md`) | – | fertig v0.140 |
| A-034 | Nachtrag A-020: gleiche Räume Familie · Ich · Arbeit für Termine und Aufgaben, Vorauswahl (Termin = Familie, Aufgabe = Ich), Familien-Aufgaben für alle („erledigt von …“), RLS Ich/Arbeit nur Besitzer, `ui/RaumChips` überall, Mia rät und lernt, Raum per Lang-Drücken ändern, Prüfstand ≥ 30 Sätze (ersetzt A-021 teilweise; Wortlaut `docs/auftraege/A-034-raeume.md`) | – | fertig v0.151 |
| A-035 | Nachtrag A-019: Mias Stimme bleibt Mias Stimme (Status einmal holen und merken, erste Silbe 2,5 s mit „Mhm“, nie im Gespräch springen, erst nach 2 Fehlern Handy-Stimme mit Hinweis, Vorwärmen, Ersatz mit Grund im Mikro-Protokoll) | – | fertig v0.143 |
| A-036 | Wasserzeichen für alle Kacheln ohne eigenes Bild (eine Komponente, Zuordnung je Kachel, nicht bei Wetter/Essen/Pinnwand/Jetzt-Karte, nicht im Look „Schlicht“) | Tafel 124 A (kein Bild), `tafel-125.png` | fertig v0.153 |
| A-037 | Mias Ergebnis-Karten wie im Clip + Aufleuchten in der Kachel (Wortlaut `docs/auftraege/A-037-ergebniskarten.md`) | `tafel-126.png` | fertig v0.151 |
| A-038 | SOFORT: Vorschläge erst anschauen, dann nehmen (Rezept-Vorschau als Fenster, überall wo Gerichte zur Auswahl stehen; Wortlaut `docs/auftraege/A-038-vorschau.md`) | `tafel-122-essen-rezept.png` | fertig v0.146 |
| A-039 | Monatlich: Mias Wundertüte nachfüllen (Pool von 459 Richtung ~845, nur geprüfte Fakten, Quellen gegenprüfen; danach Durchklick `wundertueteAlle`). Seit A-052 als neues Paket `content/wundertuete/paket-NNN.json` bzw. `content/raetsel/paket-NNN.json` (je bis zu 500, + eine Zeile in `pakete.ts`). Plattdeutsch und Angeberwissen nur geprüft (Witze/Rätsel legt Mia per KI nach): spätestens fällig, wenn „Für Entwickler“ „Plattdeutsch: Paket nötig (n übrig)“ bzw. „Angeberwissen: Paket nötig (n übrig)“ zeigt (unter 50 ungesehene; Stand Paket 001: 90 Platt, 180 Angeberwissen) | – | wartet (nach A-022) |
| A-040 | Einkaufsliste nur mit Namen: Wochenplan-Zutaten als Angebot oben auf der Laden-Seite („Für deinen Wochenplan“, Chips, „Alle dazu“, Grundsachen blass), Liste nur Symbol + Name (Menge nur selbst gesagt), Zeile antippen = Fenster mit „wofür“, Menge, Laden, „Von der Liste nehmen“ (Auftragstext nicht angekommen, nur Tafel; `docs/auftraege/A-040-041-einkauf-namen.md`) | `tafel-127.png` | fertig v0.154 |
| A-041 | Abhaken wie Aufgaben (1 s, zurück, „Im Wagen ⌄“ unter der Liste), Mia merkt sich den Laden (Sache → Laden, Zähler, Datum; „Rewe · wie immer ⌄“, „Oft bei Rewe“, 90-Tage-Regel, „Was ich mir gemerkt hab“) + Ergänzung „Einkaufsliste stellt sich beim ersten Mal vor“ (Wortlaut `docs/auftraege/A-040-041-einkauf-namen.md`) | `tafel-128.png` | fertig v0.154 |
| A-042 | SOFORT: „Familie verbinden“ klarer + Namen statt Mail-Adresse + Einladungslink verständlich (Bilder 1/2 nicht angekommen) | – | fertig v0.148 |
| A-043 | SOFORT: Erledigte Aufgaben nur 12 Stunden („Erledigt ⌄“ zugeklappt ohne Zahl, danach still weg per Lösch-Markierung auf allen Geräten, Serien nur die Runde, Mia nur die letzten 12 h; Wortlaut `docs/auftraege/A-043-erledigt-12h.md`) | – | fertig v0.147 |
| A-044 | Sport als Stempelkarte: Sport-Seite (Diese Woche, zwei Sätze, „Training eintragen“, „Planen“, Letzte Wochen), Menü „•••“ (Wochenziel, Packlisten, Meine Sportarten, Erinnerung am Vorabend), Kachel ohne Wasserzeichen, Mia „gestempelt“ und „Wie läuft’s?“ (ersetzt Tafel 129/130 und den Wochen-Kreis-Teil von 124; Wortlaut `docs/auftraege/A-044-sport-stempel.md`) | `tafel-132.png` | fertig v0.153 |
| A-045 | SOFORT: Essen-Kachel S – nichts abgeschnitten (Knöpfe ohne „…“, Stufen Symbol → 13 px → Kurzform, „Idee“ als Pille, Im-Haus-Namen ganz, Zutaten 2 + „+N“, Prüf-Ablauf `nichtsAbgeschnitten`; Wortlaut `docs/auftraege/A-045-kachel-ganz.md`) | `tafel-133.png` | fertig v0.150 (Essen-Teil durch A-046 ersetzt, Grundregel bleibt) |
| A-046 | Essen-Kachel final – Bild antippen = Rezept (keine großen Knöpfe, „Was anderes?“ oben, „Wochenplan ›“ unten, Statuszeile, Antippen je Zustand; Wortlaut `docs/auftraege/A-046-essen-kachel-final.md`) | `tafel-134.png` | fertig v0.150 (mit A-045; „Nehmen“ bietet seit v0.154 die Zutaten an, Wochenplan-Angebot aus Tafel 127 mit A-040) |
| A-047 | `pruefen` grün im Raster: Wasserzeichen nicht mitmessen, Mindest-Zeile auf dem SE 1, Essen-Bildfläche ohne Überquellen, XS-Zeile 30 px, Einkauf „+N“ nicht unter dem Plus, Wetter-XS „Morgen“ | – | fertig v0.155 |
| A-048 | SOFORT: Startseite kompakter – Termine/Aufgaben/Einkauf S/Notizen Höhe = Inhalt (0/1/2/3, ab 4 „+n weitere“, 14 px Rand, Paare gleich hoch), Einkauf 3 Läden, Wasserzeichen in allen Größen, Notizen-Leertext „Schnell notieren …“ (Wortlaut `docs/auftraege/A-048-startseite-kompakter.md`) | `tafel-135.png` | fertig v0.158 (v0.157 = Vorrang-Fix „Mia hört sofort“) |
| A-049 | SOFORT: Wundertüte – keine Punkte, nie wiederholen | – | ersetzt durch A-052 |
| A-050 | Startseite neu (P4): Mini-Kreise final (Sport · Pause · Was los? · Rätsel · Timer, 56/64 px, ein Wort, keine Schilder), Fenster Sport/Timer/Rätsel, Beispiel-Startseite neu geordnet, Wasserzeichen in allen XS, Pinnwand-Korkrahmen, Einkauf M Läden nebeneinander, Im Haus von der Startseite (Wortlaut `docs/auftraege/A-050-minikreise-durchatmen.md`) | `tafel-137.png`, `tafel-140.png`, `tafel-141.png`, `tafel-143.png` | fertig v0.166 (Kreise oben, Sport-/Timer-Fenster, Pause → Durchatmen, Rätsel → Rätsel-Fenster, „Was los?“ wartet ausgeblendet auf A-055 über `wasLosVerfuegbar()`; Startseite v10). Geprüft: npm test 3758/3758, tsc, eslint, knip, Build; Durchklick Kreise + nichtsAbgeschnitten ok (vorher 42 betroffene Abläufe und der komplette Durchklick auf v0.161/v0.163 grün). Volle Prüfung (bilder, pruefen) nach Felix’ Vorgabe zurückgestellt |
| A-051 | Durchatmen (12 Übungen, Vorschlag nach Tageszeit, Lieblinge, kein Zähler) + Mia leitet an (Stimme + Klang / Nur Klang / Still, Bildschirm dunkel, Wake Lock) | `tafel-138.png`, `tafel-139.png` | fertig v0.159 (Lola-Ansagen: einmal auf dem Server erzeugen – Für Entwickler → „Ansagen erzeugen“ → Bucket `durchatmen-ansagen`; bis dahin Handy-Stimme; `docs/bereiche/durchatmen.md`) |
| A-052 | Rätsel als eigener Bereich + Wundertüte (Witze, „Platt för Plietsche“, Angeberwissen), „Noch eine ›“, nie doppelt im Haushalt, KI-Nachschub nur Witze/Rätsel | `tafel-137.png` (Bild 4), `tafel-140.png` | fertig v0.160 (Rätsel-Paket 001: 91 Rätsel; Mini-Kreis bindet das Fenster an) |
| A-053 | Gesamtauftrag Teil 7: Tests gesamt + volle Prüfung | – | zurückgestellt (später, auf Zuruf) |
| A-054 | SOFORT: Jetzt-Karte nur mit Nutzen für heute (Rangliste, keine Füllsätze, sonst ausblenden), Wochenende planen nur freitags 12–20 Uhr | – | fertig v0.163 |
| A-055 | „Was los?“ – Veranstaltungen Kreis Ostholstein (Tabelle region_events, Cron 5:00, Fenster Heute · Wochenende · 2 Wochen, Kalender/Pinnwand, Quelle sichtbar; ersetzt „Tipps aus der Region“) | `tafel-142.png` | fertig v0.167, Parser wartet (Wortlaut `docs/auftraege/A-055-was-los.md`). Parser wartet auf Freigabe von www.kreis-oh.de in der Netz-Regel der Arbeitsumgebung bzw. auf gespeicherte Beispielseiten unter tests/fixtures/kreis-oh/; bis dahin liefert der Kreis nichts, „Was los?: Quelle liefert nichts“ in „Für Entwickler“, Mini-Kreis bleibt aus. Kreis oben über `useWasLosSichtbar`, Freitags-Karte über `wochenendTipps` |
| A-056 | SOFORT (Vorrang): „Mia hört von Anfang an und versteht mehrere Sachen“ – Mikro sofort beim Antippen mit Ringpuffer (≥ 5 s), Schlüssel vorgewärmt, Ring erst bei echtem Ton, Zeiten im Mikro-Protokoll; Sofort-Weg nur bei genau EINER Sache, Füllwörter weg, Aufzählungen getrennt (KI und Regel-Notlösung), ein Rückgängig für alle; „Nur für dich. Tippen zum Ändern.“; ≥ 30 Prüfstand-Sätze (Wortlaut `docs/auftraege/A-056-mia-hoert-sofort.md`) | – | fertig v0.157 |
| A-057 | Kleinkram von Felix: Die eingebauten Rezepte („k:…“) liefern der Einkaufsliste ihre Zutaten – Wochenplan-Angebot „Für deinen Wochenplan“ und „Nehmen“ (Namen, Mengen nur als Hinweis, Grundsachen blass/ausgenommen, „im Haus“ nicht, gleiche Zutat aus zwei Gerichten = eine Zeile mit „wofür“; `einkauf/angebot/rezeptZutaten.ts`) | – | fertig v0.162 |

| A-057 | Kleinkram von Felix: Die eingebauten Rezepte („k:…“) liefern der Einkaufsliste ihre Zutaten – Wochenplan-Angebot „Für deinen Wochenplan“ und „Nehmen“ (Namen, Mengen nur als Hinweis, Grundsachen blass/ausgenommen, „im Haus“ nicht, gleiche Zutat aus zwei Gerichten = eine Zeile mit „wofür“; `einkauf/angebot/rezeptZutaten.ts`) | – | fertig v0.161 |
| A-059 | Kaputt (Sammel-Auftrag 29.10. mittags, Block A + D): Notizen-Kachel öffnet immer die Notizen-Seite (Stift = neue Notiz), Wundertüte ohne Silbentrennung und frei vom Mia-Knopf, Lösung erst nach Antippen (Punkt 8, Tafel 145: Kachel dreht sich um, Seite über „Mehr ›“, Seite und Rätsel verdeckt, Filter Alles · Witze · Platt · Wissen), ••• → Einstellungen beim ersten Tippen, Wischen nur klar waagerecht und nicht vom unteren Rand (Wortlaut `docs/auftraege/A-059-sammel-mittags.md`) | `tafel-144.png`, `tafel-145.png` | fertig v0.162 |
| A-060 | Notizen-Vorschau + Mia-Zubehör (Block B): Punkt 3 Notizen-Kachel XS/S – neueste Notiz in bis zu 2 Zeilen, zweite läuft weich aus (Verlauf in Kachelfarbe, auch dunkel/Schlicht), Umbruch an Wortgrenzen, leer „Schnell notieren …“ grau, `nichtsAbgeschnitten` erlaubt `data-ausblenden`; Punkt 4 Mia-Zubehör (darin aufgegangen: A-058, Wortlaut `docs/auftraege/A-058-zubehoer-sonne-blaetter.md`): Sonne den ganzen Tag (Code ≤ 2 oder ≥ 30 Sonnenminuten, Tagesentscheidung ab der Hälfte der hellen Stunden, gemerkt pro Tag; Regen bald → Schirm, danach Sonne), Herbstblätter nur bei Wind (Sep–Nov, Wind ≥ 25 / Böen ≥ 35 km/h, 7 Blätter, Mia kneift die Augen, Öffnen 30 Min / Antippen 5 Min, Sturm = Wackeln + Blätter, das einzelne Blatt entfällt) | `tafel-144.png` | fertig v0.165 |
| A-061 | SOFORT: Durchatmen verständlich + keine Roboterstimme – heller Start-Bildschirm mit 3 Schritten und „Wofür?“ für alle 12, erst nach „Los“ und 3 s dunkel mit großer Anweisung unter dem Ring, Ende hell; nie Handy-Stimme (ohne Datei nur Klang), Mias Ansagen entstehen beim ersten Abruf und nachts per Cron, kein Knopf nötig (Wortlaut `docs/auftraege/A-061-durchatmen-fix.md`) | `tafel-146.png` | fertig v0.164 |


## Offene Punkte (ohne eigenen Auftrag)

- Sammel-Auftrag 29.10. mittags, Block C (Jetzt-Karte ohne Füllsätze, „Wochenende planen?“ nur freitags, nie „…“) ist A-054 und läuft dort.

- Jetzt-Karte nennt tagsüber einen neuen Pinnwand-Zettel, den auch die
  Pinnwand-Kachel zeigt (Regel „nur was die Kacheln nicht zeigen“) – mit A-016
  prüfen.
- Durchklick `konten`/`abgleich` (Test-Backend) war nach dem Neustart der
  Arbeitsumgebung zeitweise rot, auch auf `main`; zuletzt (v0.136) wieder grün.
- Prüfstand „Ton“ mit der echten KI noch nicht gemessen (Testmodus 28/30).
