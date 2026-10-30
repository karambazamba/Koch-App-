# Design-Details (aus CLAUDE.md umgezogen)

Grundregeln stehen in CLAUDE.md, Abschnitt 7.

- Nichts abgeschnitten (A-045/A-046, Tafel 133/134): in Kacheln endet kein
  sichtbarer Text auf „…“, kein `truncate`/`line-clamp`/`text-ellipsis` außer
  bei frei eingegebenem Text (`data-freitext`). Knopf- und Pillentexte nie
  gekürzt: passt es nicht, erst Symbol weg, dann 12–13 px, dann die kurze
  Form aus `KURZ_LABEL`, zuletzt weniger Innenabstand (`lib/heute/kachelKnopf.ts`,
  gemessen in `ui/KachelKnopf`). Pillen auf Bild-Kacheln: weiß, oben links
  `ui/KachelPille` (12 px, 30 px hoch), unten rechts `ui/KachelKnopf`
  (12,5 px, 32 px hoch), Tippfläche immer 44 px; nie ein oranger Kreis neben
  dem Mia-Knopf. Zutatenlisten: höchstens 2 Namen + „+N“ (`zutatenKurz`).

- Kachel-Farben (Tafel 108, `heute/kachelFarben.ts`): Termine Lavendel,
  Aufgaben Mint, Einkauf Salbei, Pinnwand Rosé, Notizen Vanille, Im Haus Aqua,
  Sport Flieder, Timer Sand; im Bearbeiten unter XS · S · M „A“ (bei XS hinter dem Farb-Knopf) (automatisch) +
  diese 8 Töne, ein Tipp = übernommen, keine freie Farbwahl, Schrift kommt mit
  dem Ton; Wetter und Essen ohne Auswahl (die Wundertüte hat seit A-071 eine Farbe für alle Sorten); gespeichert pro Person in der
  Startseiten-Anordnung (`farbe`, `data-farbe`), bei „Schlicht“ nur für
  Überschrift/Symbol.
- Wasserzeichen (Tafel 124 A/125, `ui/KachelWasserzeichen`; A-048/Tafel 135:
  alle Größen): jede Kachel ohne eigenes Bild, lucide-Linie (Strich 1,3) im
  Kachel-Akzent der gewählten Farbe, S/M 150 px (höchstens Kachelhöhe − 10 px),
  XS 110 px (rechts 50/unten 34 px angeschnitten, 11 %, dunkel 10 %, nie über
  Text), unten rechts 30 px angeschnitten, −8° gedreht,
  hinter Inhalt und weißen Kärtchen (Kachel `isolate`, Zeichen z −1),
  `aria-hidden`, nicht antippbar. Deckkraft hell 12,5 %, dunkel 10 %; mit
  freiem Text (nicht auf weißem Kärtchen) 9 %/8 %. Nie bei Wetter, Essen,
  Pinnwand, Spendentopf, Sport (Stempel), Jetzt-Karte und „Schlicht“. Neue Kachel braucht
  ein Symbol (Tabelle + Test).

- Startseiten-Raster (Tafel 118, A-023): 2 Spalten, Abstand 8 px, Grund-Zeile
  = halbe S-Höhe aus der Board-Breite (`ZEILE_CSS`, `container-type:
  inline-size`), XS = halb breit + halb hoch, S = halb breit + quadratisch,
  M = ganz breit + so hoch wie S; Höhe nie vom Inhalt – außer Listen-Reihen
  (Termine, Aufgaben, Einkauf, Notizen: Kopf + 1–3 Zeilen bzw. ein Satz + 14 px, A-048); Bearbeiten = gleiche
  Flächen (Knöpfe in der Kachel). Details `docs/bereiche/heute.md`.
- Mini-Kreise oben (A-050, Tafel 143): bis zu 5 runde Kreise unter Kopf bzw.
  Jetzt-Karte, gleich verteilt (14 px Rand), 5 = 56 px, sonst 64 px; Fläche =
  Kachelfarbe (`data-tone`/`data-farbe`, `bg-tile`), Linien-Symbol im Akzent
  (23/26 px), darunter EIN Wort (12,5/13 px fett). Schlicht: weiß mit feinem
  Rand. Einzige Zeichen: Sport-Ring (`.kreis-ring-*`, geschafft grün) und
  die Timer-Restzeit (orange, Ring `.kreis-ring-timer`); angetippt = oranger
  Rand (`.kreis-aktiv`). Keine Schilder, Zahlen, Plaketten. Die Fenster haben
  einen gemeinsamen Kopf (`heute/kreise/FensterKopf`: rundes Symbol, Titel
  fett, Unterzeile grau, ✕).
- Pinnwand flach wie alle Kacheln (Tafel 147 B, ersetzt den Korkrahmen aus
  Tafel 141 A): kein innerer Rahmen, `.korkpunkte` über die ganze Fläche
  (zwei versetzte Punkt-Raster, `--app-kork-punkt` 9 %, dunkel 6 %), Ecken
  wie die Kachel; Schlicht ohne Punkte. Zettel und Pins sind ihr Bild. Die
  Pinnwand-Seite zeigt dieselbe Wand (`.korkwand`). Statt Wasserzeichen.
- Termin-Zeile nie mit „…“ gekürzt (Tafel 147): Ort nach Komma bzw. „ · “
  klein in der zweiten Zeile (`titelUndOrt`), sonst bricht der Titel um;
  passt es nicht in die Kachel, eine Zeile weniger (zählt bei „+N“).
- Wetter-Kachel mit Himmel (Tafel 120): Hintergrund wie bisher
  `--app-sky-*`, rechts oben eine kleine, leicht angeschnittene, stille
  Szene (`WetterSzene`: Sonne, leicht bewölkt, bewölkt, Regen, Gewitter,
  Schnee, Wind, Nacht); Hauptmotiv in `--sky-motiv`, Wolken/Wind/Sterne
  `--app-szene-*` (hell/dunkel/auto); Schlicht: weiß, Szene kleiner
  (`scale-75`) und blasser (0,6). Text links, nie unter der Zeichnung.

- Leiste unten (Stil B1): schwebend, weiß (dunkel: Kartenfarbe), 12 px Rand,
  rounded-card, ca. 66 px, Reiter mit Linien-Icon + 12 px Text (aktiv Orange),
  Mia rechts IN der Leiste (60 px, ragt 30 px heraus, atmet leicht), auf allen
  Seiten gleich. Weg bei Tastatur, Fenstern, Kochmodus, Notiz-Editor, erstem
  Start/Zustimmung/Testcode, Rechtsseiten (nur transform/opacity; bei der Bühne
  nur unsichtbar). Unten genug Platz (`FAB_CLEARANCE`), Schwebendes über der
  Leiste (`UEBER_LEISTE`). Jedes Gespräch auf EINER Bühne (`MiaStage`): Seite verschwommen
  dahinter, Gespräch oben, Mia groß im unteren Drittel (antippen = zuhören ↔
  fertig, „Lieber schreiben“), fliegt vom Knopf ein und dorthin zurück.
  Auf der Bühne GENAU EINE antippbare Mia (die große); neben Mias Sätzen nur
  das kleine Gesicht ohne Ring, ohne Pulsieren, nicht antippbar. Ring nur
  beim Zuhören bzw. „Gleich schick ich’s ab“, nie im Warten, nie zwei
  zugleich (`stageRing`, Test `begleitung/eineMia`). Vorschläge als Knöpfe
  (weiß, Rand und Text Orange), nie als zweite Mia-Karte.
- Avatar: EINE Komponente `BegleitungAvatar` (Sprechblase mit mittiger Spitze,
  senkrechte Augen, dezentes Lächeln) immer in Orange; Zustände setzt die
  App automatisch. App-Icon: einzige Quelle `scripts/generate-icons.mjs`
  (`npm run icons`; angeboten wird nur Orange, die übrigen Farbsätze bleiben
  nur für ältere Installationen); Dateien tragen `ICON_VERSION` im Namen
  (Pfade nur über `icon()`/`iconFor()`); neues Icon = Version erhöhen, Liste in
  `public/sw.js` und `CACHE_VERSION` anpassen. Manifest-Farbe `BRAND_COLOR`.
- Marke Mia: Logo nur über `BrandMark` (`ui/`) bzw. die Dateien in
  `public/brand/` (Quelle `src/lib/core/brand.ts`, `npm run brand`), Farben
  `--app-brand*`; Regeln (Schutzzone, Mindestgröße, nie Orange auf Orange)
  in `docs/brand.md`. Startseiten-Kopf: links BrandMark (30 px), rechts das
  Datum („Fr, 23. Okt“) und „···“ (Einstellungen, Startseite bearbeiten), kein
  Zahnrad; die Begrüßung steht nur noch für VoiceOver da.
- Mias Ergebnis-Karten (A-037, Tafel 126): weiße Karte `CARD` (`rounded-card`),
  Symbol in der Kachelfarbe (`--app-tile-<id>`/`-ac`), grüne Pille nur über
  `bg-good-pill`/`text-on-good-pill` (≥ 4,5:1), „Übernehmen“ = Akzent (Orange).
  Aufleuchten in der Kachel nur über `data-leuchtet` (Ring `--app-leuchten`,
  Fläche `--app-leuchten-flaeche`, nur opacity). Details `docs/bereiche/begleitung.md`.
- Durchatmen (A-051, Tafel 138/139): eigene ruhige Welt wie der Kochmodus –
  Mint `--app-atem`, Schrift `--app-atem-ink`, Knöpfe Petrol
  `--app-atem-tief` (weiß ≥ 4,5:1, so auf der Tafel; bewusst nicht Orange),
  dunkler Bildschirm `--app-atem-dunkel`. Vollbild `z-[55]` über Leiste und
  Mia, Herz in Orange. Details `docs/bereiche/durchatmen.md`.
