# Großes Aufräumen – Ergebnis (nach Etappe 9)

Stand: v0.48.0, gemessen am 22.10.2026. Ausgangslage in
`docs/aufraeumen-vorher.md` (v0.47.0).

## Zahlen vorher → nachher

| | vorher | nachher |
|---|---|---|
| Dateien in `src/` (.ts/.tsx) | 391 | 428 |
| Zeilen in `src/` | 47 651 | 48 593 |
| größte Datei | HelperPanel.tsx (1 190) | `lib/begleitung/client.ts` (580) |
| Komponenten > 400 Zeilen | 7 | 0 (größte: TodayPage 388) |
| Logik > 600 Zeilen | 4 | 0 |
| knip (Befunde) | 16 + 1 Hinweis | 0 |
| direkte `localStorage`/`sessionStorage` außerhalb `localStore.ts` | 29 | 1 (Boot-Skript gegen Flackern in `theme.ts`, läuft vor React) |
| `new Date()` für „jetzt“ außerhalb `now.ts` | 1 | 0 |
| Testdateien / Tests | 21 / 231 | 98 / 1 398 |
| Abdeckung `src/lib` (Zeilen) | 33,7 % | 98,5 % (Untergrenze 80 % in `test:abdeckung`) |
| `npm test` | ≈ 3 s | ≈ 9 s |
| CLAUDE.md | 2 001 Zeilen | 252 Zeilen (+ 15 Bereichs-Dokus, Verlauf) |

Mehr Dateien und Zeilen, weil große Dateien geteilt wurden (Etappe 2), die
Sortierung und Regeln je eine eigene Stelle haben und nachgeladene Teile
eigene kleine Dateien brauchen (Etappe 7). Nichts wurde dafür doppelt
geschrieben.

## JavaScript beim ersten Aufruf (Next-Bundle-Statistik, unkomprimiert)

| Seite | vorher | nachher |
|---|---|---|
| / | 1 458 KB | 643 KB |
| /pinnwand | 1 183 KB | 664 KB |
| /wetter | 1 191 KB | 659 KB |
| /einkaufsliste | 1 204 KB | 682 KB |
| /kochbuch/rezept | 1 285 KB | 722 KB |
| /profil | 1 343 KB | 743 KB |
| gemeinsam für alle Seiten | 1 032 KB | 621 KB |

`npm run messen` zählt alles bis die Seite ruht (inklusive des im Leerlauf
vorgeholten Gesprächs):

| Seite | vorher | nachher |
|---|---|---|
| / | 1 453 KB | 1 914 KB |
| /einkaufsliste | 1 199 KB | 959 KB |
| /vorrat | 1 188 KB | 956 KB |
| /pinnwand | 1 178 KB | 941 KB |
| /wetter | 1 186 KB | 947 KB |
| /tipps | 1 209 KB | 1 024 KB |
| /kochbuch/rezept | 1 281 KB | 1 051 KB |
| /profil | 1 338 KB | 1 331 KB |

Auf „/“ ist es bis zur Ruhe mehr geworden: Seit das Layout nicht mehr die
ganze Startseite lädt, bringt das vorgeholte Gespräch Startseiten-Module ein
zweites Mal mit (Turbopack teilt Module nur mit übergeordneten Teilen). Der
erste Aufruf und Lighthouse sind deutlich besser; danach liegt alles im
Service-Worker-Cache. Siehe Vorschläge.

## Lighthouse (mobil, 12.2.1)

| Seite | Leistung vorher → nachher | Barrierefreiheit | Best Practices |
|---|---|---|---|
| / (Hallo-Bildschirm) | 74 → 85 | 95 | 100 |
| /pinnwand | 90 → 93 | 95 | 100 |
| /wetter | 88 → 93 | 96 | 96 |
| /einkaufsliste | – → 94 | 95 | 100 |
| /kochbuch | – → 100 | 95 | 100 |
| /profil | – → 99 | 95 | 100 |
| /tipps | – → 94 | 95 | 100 |

„/“ erreicht die 90 nicht, weil sich die Begrüßung des Hallo-Bildschirms
gewollt eintippt (der größte Text erscheint spät); die Wartezeit durch
JavaScript (TBT) ist mit 90 ms gering.

## Was die Etappen gemacht haben

- **0 – Sicherheitsnetz:** Durchklick (16 Abläufe × iPhone 15 Pro/Pixel 7),
  96 Vergleichsbilder, Messung, Sicherungs-Fixture (`tests/fixtures/`).
- **1 – Ungenutztes:** knip 17 → 0; 8 alte Seiten durch Weiterleitungen
  (`OLD_PAGES` in `next.config.ts`) ersetzt.
- **2 – Große Dateien geteilt:** HelperPanel 1 190 → 342, Einkaufsliste in 9
  Module, Backstube-Daten, Profil, Werkzeuge der Begleitung, sechs Komponenten.
- **3 – Ordner nach Bereichen:** gleiche Namen in `lib`, `components`, `tests`;
  neutrale Namen für die Begleitung.
- **4 – Einheitliche Regeln:** Speicher nur über das Verzeichnis, Zeit nur über
  `now()`, Regeln als Tests (`tests/app/`), Texte ohne Druck-Wörter.
- **5 – Sortieren:** eine Datei `src/lib/core/sort.ts`, deutsche Sortierung,
  Einkauf im Laufweg.
- **6 – Tests:** je Bereich ein Ordner, gemeinsame Hilfen, Abdeckung 98,5 %.
- **7 – Schneller:** Layout ohne Startseite, Fenster und Zeichnen erst bei
  Bedarf, Service Worker lädt nur echte Seiten vor.
- **8 – Dokumentation:** CLAUDE.md kompakt, `docs/bereiche/`, `docs/verlauf.md`.

## Entfernt

- 8 Seiten-Dateien alter Adressen (jetzt Weiterleitungen), ungenutzte Exporte
  und Typen (knip), `sortRecipes`, doppelte Hilfen in den Tests, veraltete
  Abhängigkeits-Ausnahme, alte Einträge der Service-Worker-Vorladeliste.

## Gefundene Fehler (alle behoben, je mit Test)

- Termin-Formular verlor Link und Notiz beim Sichern (v0.46).
- Wortgrenzen an Umlauten (`\b` vor/nach ä/ö/ü/ß): „übermorgen“ in Kalender,
  Wetter, Testmodus und Urlaub; „Melde dich öfter“; „Öffne …“; Mail an „die
  Ärztin“ geduzt; „Gruß“ als Schluss; Erdnuss-Allergie als „Nüsse“/„Sse“;
  Etikett „Ärztin“; „Miete überweisen“; „überhaupt“ in „mag nicht“; Grieß-Tipp.
- Rückgängig nach „Übernehmen“ in falscher Reihenfolge.
- „Hoch“ auf der Kachel hinter dem Essen-Paar wirkungslos.
- Ohne KI nicht erkannt: „in einer halben Stunde“, „5 km gelaufen“, „Was ist
  heute in Malente?“; Essensplan-Sätze wurden im Testmodus Aufgaben.
- Texte: „Können du …“, doppelte Leerzeichen bei „Kürzer“, falsche
  Wetter-Quelle, „Neu beginnen“ versprach mehr, als es löscht.
- Einordnen: Apfelsaft unter Obst, „Erbsen TK“ im Schrank, „2 Pck. Hefe“,
  „was da ist“ als Zutat, Seelachs als Lachs gezeichnet.
- Timer-Kachel kam nur bei Timern der Begleitung; Löschen ohne Rückgängig
  (Einkaufsartikel, Stammartikel, Vorrat); Zähler/Emojis in der Timer-Kachel,
  Anzahlen in den Einstellungen.

## Vorschläge

1. **Hallo-Bildschirm schneller sichtbar:** Überschrift sofort zeigen, nur die
   Begleitung animieren → Lighthouse „/“ über 90.
2. **Doppelten Code im Leerlauf vermeiden:** das Gespräch erst bei der ersten
   Berührung der Leiste vorladen oder als eigene Route laden.
3. **Sport-Sätze der Begleitung** ohne „N Wochen in Folge 🔥“ und „3× – Ziel
   sind 4“ (Leitbild 4) – braucht eine Entscheidung (Leitbild 1 erlaubt Serien
   in Wochen).
4. **Toter Zustand aufräumen:** Profil-Einstellung „Tipps“ (gespeichert, nie
   gelesen), `mixSuggest`, `wasgibts.ideen` (nur gelesen), `IdeaFilter`,
   `CookedDay.leftovers` – entweder anschließen oder mit Migration entfernen.
5. **Wochenend-Stil:** wirkt noch („locker“: Wochenend-Zutaten optional,
   Wochenende zählt nie als gekocht), ist aber nicht mehr einstellbar.
6. **Wünsche** verschwinden nie von selbst – beim Kochen oder Übernehmen
   austragen.
7. **26 eigene Mehrzahl-Formen und 23 Uhrzeit-Formatierer** auf `plural()` und
   eine Uhrzeit-Hilfe umstellen.
8. **TLDB-Anbindung** (`tipps/sources/tldb.ts`, 2 TODOs) – wartet auf den
   Zugang der TA.SH.
9. Restliche eigene Sortierungen (Spontan-Ideen, „Oft gekauft“, Einkaufsmodus,
   Rezepte nach Kochzahl) auf `sort.ts` umstellen.
