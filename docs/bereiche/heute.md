# Heute

## Startseite und Jetzt-Karte (aus CLAUDE.md umgezogen)

- Startseite = Kacheln in EINER gespeicherten Anordnung, die sich nie von
  selbst ändert, im festen Raster XS · S · M (Tafel 118, siehe „Festes Raster“
  unten): 2 Spalten, XS = halb breit + halb hoch, S = halb breit +
  quadratisch, M = ganz breit + so hoch wie S; die Höhe hängt nie vom Inhalt
  ab – außer bei den Listen Termine, Aufgaben und Einkauf (A-048, Tafel 135:
  so hoch wie ihr Inhalt, siehe „Festes Raster“), der Rest steht als „+n“ im Kopf. Bearbeiten direkt auf der Startseite
  (lange drücken: wackeln, ziehen, „–“, XS · S · M, darunter die Farbe) –
  dasselbe Raster wie fertig. Lücke ohne Partner: ruhig leer, im Bearbeiten
  „＋ Kachel“; Essen + Einkauf sind ein Paar, solange beide S sind. Standard je
  Haushalt (Tafel 140, A-050): Familie / zu zweit Wetter XS über Notizen XS |
  Pinnwand S, Termine M, Aufgaben M, Essen S | Wundertüte S, Einkauf M; allein
  Wetter XS über Notizen XS | Wundertüte S, Termine M, Aufgaben M, Essen M,
  Einkauf M. Darüber die Mini-Kreise (siehe „Mini-Kreise oben“); ein laufender
  Timer steht im Timer-Kreis, nie als Kachel. Jede Kachel öffnet ihre Seite.
- Die Jetzt-Karte (A-054) zeigt nur, was man HEUTE braucht und die Kacheln
  nicht schon zeigen: EIN Thema, höchstens zwei zum Wischen, aus einer festen
  Rangliste; nichts dran = gar keine Karte (kein Platzhalter, kein „Alles
  ruhig“, keine Stimmungssätze). Antippen öffnet wie jede Kachel „Dein Tag“
  (laufender Timer: den Timer). Zeile 1 fett, Zeile 2 Hinweis oder Knopf,
  Texte brechen um, nie „…“. Themen-Symbol passend (Uhr, Wolke, Topf,
  Geschenk), nie Glitzer. Nie Temperatur. Freitags 12–20 Uhr „Wochenende
  planen?“. Tagesphasen ändern nur Inhalte, nie die Anordnung; Ruhe nach
  Feierabend ist ein eigener Schalter.

## Erster Start (aus CLAUDE.md umgezogen)

- Erster Start = höchstens 3 Bildschirme vor der App (A-027, „Erster Start
  rund für Testfreunde“):
  1. Hallo („Moin, ich bin Mia.“, „Erzähl einfach, was ansteht. Ich sortier
     das.“). Darunter klein die drei Sätze der Zustimmung („Deine Sachen
     bleiben auf diesem Handy. Mit Konto teilst du sie mit deinen Leuten.“ ·
     „Ich bin eine KI und kann mich auch mal irren.“ · „Deine Daten werden
     nie verkauft.“, `VOR_DEM_START` in `datenschutz/rechtstexte.ts`) und das
     Häkchen „Ich akzeptiere die Nutzungsbedingungen und hab die
     Datenschutzerklärung gelesen.“ (`BedingungenHaken`, speichert sofort
     Fassung und Zeit). „Los geht’s“ erst mit Häkchen. Unten „Gemacht in Eutin
     von KARAMBA Eis“, „Nutzungsbedingungen · Datenschutz · Impressum“.
  2. „Für wen soll ich sortieren?“ (`ZeigMalStep`, nur beim allerersten
     Start: drei gleichwertige Knöpfe „Nur für mich“ / „Für uns zwei“ / „Für
     die Familie“, nichts vorausgewählt).
  3. Nur wenn die KI einen Zugangscode braucht und keiner gemerkt ist:
     „Fast geschafft.“ (`CodeScreen`, `CodeGate`): „Gib deinen Zugangscode
     ein, dann kann ich zuhören und mitdenken.“, darunter „Groß/klein und
     Leerzeichen sind egal.“ (Prüfung nachsichtig,
     `normalisiereZugangscode`), Knopf „Fertig“, leise „Später“.

  Dann die Startseite mit Beispiel-Tag passend zur Antwort. Zurück-Geste =
  ein Schritt zurück. Ein eigener Schritt „Bevor’s losgeht“ steht nur noch
  für bestehende Nutzer ohne gültige Zustimmung (`ZustimmungGate`, Pflicht
  für alle). Keine Look-Frage: Standard „Farbig“, nach 3 Tagen einmal
  „Lieber schlicht?“ als Hinweis, sonst Einstellungen → Aussehen.
- Einladung (/e/…): E-Mail-Code (Häkchen dort) → Startseite; der
  Zugangscode kommt erst beim ersten KI-Versuch (`codeErstBeimKiVersuch`).
- Karte „Mia auf den Home-Bildschirm“ (`core/homeBildschirm.ts`,
  `heute/HomeBildschirmKarte.tsx`): nur im Browser (nie als
  Home-Bildschirm-App, nicht in der Zeit-Vorschau, nicht am Computer, nicht
  solange der Beispiel-Tag läuft), einmal oben auf der Startseite beim
  ersten Öffnen der echten (eigenen) Startseite, im Stil der Seiten-Tipps,
  belegt den einen Hinweis-Platz unter der Jetzt-Karte (nur „Ich heiße jetzt
  Mia“ geht vor; „Mia denkt mit“ wartet). iPhone/Safari: „Mia als App: unten
  auf Teilen [Teilen-Symbol] tippen, dann ‚Zum Home-Bildschirm‘.“ mit kleiner
  Skizze, „Zeig’s mir“ (Fenster mit 3 Schritten und eigenen Skizzen) und
  „Später“. iPhone in anderem Browser oder App-Vorschau (Chrome, Instagram,
  WhatsApp …): „Öffne mich in Safari, dann kann ich auf deinen
  Home-Bildschirm.“ + „Link kopieren“. Android: `beforeinstallprompt` wird
  einmal abgefangen und aufgehoben → „Mia installieren“; ohne Angebot „Mia
  als App: Menü [⋮] → ‚App installieren‘.“; Android-App-Vorschau: „Öffne
  mich in Chrome …“. „Später“ = nach 2 Tagen einmal wieder, danach nie
  mehr; installiert = nie mehr. Dauerhaft: Einstellungen → Daten & App „Mia
  auf den Home-Bildschirm“ (rechts „Ist drauf“ als App). Kein Badge, kein
  Druck.


## Feste Regeln (aus CLAUDE.md umgezogen)

- **Beispiel-Tag:** Beispiele liegen nie in den echten Speichern, nicht in
  Sicherung, Push oder KI. → `docs/bereiche/heute.md`
- **Mias Wundertüte (A-022, Tafel 116):** neue Funktion trotz Feature-Stopp
  für 1.0 – von Felix ausdrücklich gewollte Ausnahme. Baustein
  `wundertuete`, für neue Nutzer an als S-Kachel hinter Essen + Einkauf
  (`ersteStartseite`), bestehende behalten ihre Anordnung (Kachel aus, in
  der Auswahl mit „NEU“). Regeln und Pool → `docs/bereiche/wundertuete.md`.


Kurz: Die Startseite der App. Oben Begrüßung und die Jetzt-Karte (EIN Thema,
das man heute braucht – sonst keine), darunter die Kacheln in der einen gespeicherten Anordnung.
Links liegt der Kalender, rechts Essen – gewechselt wird per Tipp oder Wischen.

## Wo im Code

- Seiten-Pager: `src/components/heute/HomePager.tsx` (Kalender · Heute · Essen),
  Wischen in `usePagerSwipe.ts` (`swipeDecision`); Einstieg `HomeView.tsx`.
- Seite Heute: `TodayPage.tsx`; Kacheln `HomeBoard.tsx` (Raster), `EditFrame.tsx`,
  `EditHeader.tsx`, `EditLook.tsx`, `TilePicker.tsx`, `useHomeEditing.ts`, `Pressable.tsx`.
- Kachel-Inhalte: `MiniCards.tsx` (Termine, Aufgaben), `HomeTiles.tsx` (Essen,
  Einkauf, Notizen, Vorrat); andere Kacheln in ihren Bereichen
  (`wetter/WeatherTile`, `pinnwand/PinboardTile`, `timer/TimerTile`, …).
- Layout (rein + Speicher): `src/lib/core/homeLayout.ts` (`defaultHome` je
  Haushalt, `homeForHaushalt`, `fitSize`); Einheiten: `src/lib/core/homeUnits.ts`
  (`unitsOf`, `glowTile`); Raster (rein): `src/lib/heute/raster.ts` (`packe`,
  `rasterOf`, `fuelleLuecke`, `trennZeile`, `pfeilZu`, `mitLaufendemTimer`).
- Jetzt-Karte: `src/lib/heute/jetztTopics.ts` (Rangliste `JETZT_RANG`,
  `jetztThemen`, `jetztTopics`), `wochenende.ts` (freitags), `abendDaten.ts`
  (Kita-Weg, Vorlauf), `abendThema.ts` (`abendLage` für die Kacheln),
  `jetztStore.ts` (Speicher), `jetztCommand.ts` (Satz an/aus); Oberfläche
  `src/components/heute/JetztCard.tsx`, Daten `useJetztTopics.ts`, Knöpfe
  `jetztAktionen.ts` („Auf die Liste“, Wochenende).
  Leises Angebot „Kurz durchatmen?“ (A-051): eigenes Thema `durchatmen`
  (Rang 70, nach „Morgen“, vor den Bausteinen; nie nachts) aus
  `durchatmen/angebot.ts` (`durchatmenAngebot`, `durchatmenThema`; höchstens
  2× am Tag, nach drei Terminen am Stück oder im Nachmittagstief,
  abschaltbar), Antippen öffnet das Fenster (`oeffneDurchatmen`). Nie als
  Mitteilung.
- „Dein Tag“: `src/lib/heute/deinTag.ts` (Symbole, Zeilen, Übersicht,
  Öffnen), `src/components/heute/DeinTag.tsx`; Mia-Knopf beim Scrollen
  `src/lib/begleitung/knopfScroll.ts`.
- Tagesphasen: `src/lib/heute/phases.ts`, Einstellungen `tagesablauf.ts`,
  Sofort-Wechsel `nudge.ts`, Push-Regeln (vorbereitet) `push.ts`;
  Hook `src/components/heute/useHomePhase.ts`.
- Beispiel-Tag: `src/lib/core/demo.ts`, `useDemoDay.ts`, `DemoBits.tsx`.
- Erster Start: `begleitung/HelloScreen.tsx`, `core/hello.ts`, `einstellungen/welcomeStore.ts`;
  Zugangscode `begleitung/CodeScreen.tsx`, `CodeGate.tsx`, `lib/begleitung/codeAbfrage.ts`;
  Home-Bildschirm-Karte `heute/HomeBildschirmKarte.tsx`, `HomeBildschirmAnleitung.tsx`,
  `lib/core/homeBildschirm.ts`, Einstellungen `einstellungen/settings/HomeBildschirmRow.tsx`.

## Daten und Speicher

- `wasgibts.startseite` v10 `{version, tiles: {id, visible, size, farbe?}[], tipSeen, kreise: {id, an}[]}`
  (`migrateHome`). v9 → v10 (A-050, Tafel 143): XS-Kacheln Sport/Timer werden
  Kreise (nur ausgeblendet), Im Haus kommt aus der Anordnung (ausgeblendet,
  wählbar S/M), die Kreise stehen in Standard-Reihenfolge; die übrige
  Anordnung bleibt. v8 → v9 (Tafel 118): Reihenfolge, Sichtbarkeit, Farben und
  Größen bleiben, L → M, nicht mehr erlaubte Größen die nächste erlaubte
  (`fitSize`: Timer/Im Haus M → S; Sport darf seit A-044 M); keine Kachel verschwindet. v1 →
  Aufgaben hinter Termine; v1/v2 → Größen S/M/L,
  Kachel „kladde“ wird „notizen“ an derselben Stelle; v3 → v4 hängt die
  Spendentopf-Kachel einmal hinter die letzte sichtbare (`withPotTile`);
  v7 → v8 (Tafel 108): `farbe` je Kachel, fehlt = automatisch (alle alten
  Anordnungen bleiben automatisch). `sanitizeHome` lässt nur Töne der Palette
  zu und nie bei Wetter/Essen.
  `sanitizeHome` wirft Unbekanntes raus, ergänzt fehlende Kacheln unsichtbar
  und hält Essen + Einkauf zusammen. In der Sicherung.
- `wasgibts.jetzt` v1 `{on, day, hidden, weights, weekOff?}` – an/aus und
  heute weggelegte Themen („Erledigt“, „Auf die Liste“, „Später“). `weights`
  und `weekOff` werden seit A-054 nicht mehr geschrieben, nur noch gelesen
  (alte Sicherungen). In der Sicherung.
- `wasgibts.tagesablauf` v1 `{routine}` – `ruhe`, `morgenBis` (10:00),
  `feierabendAb` (20:00), `nachArbeit`, `arbeitstage` (0 = Mo … 6 = So,
  Standard alle), `kochenAuto`, `kochenMin` (20, erlaubt 5–90). Ein altes
  `mode` wird still übergangen. In der Sicherung.
- `wasgibts.zeitvorschau` (Sitzung): „So tun, als wäre es …“, wirkt nur auf
  die Startseite (`setPreview`, `PreviewBanner`).
- Nur auf dem Gerät: `wasgibts.beispiel` v1 `{since, cleared, done, gone, asked}`,
  `wasgibts.einmalhinweise` („+ Kachel“), `wasgibts.dunkeltipp`, `wasgibts.willkommen`,
  `wasgibts.hinweise` v1 `{gezeigt: {id: Tag}}` (Hinweis-Warteschlange),
  `wasgibts.homebildschirm` v1 `{spaeter, am, fertig}` (Karte „Mia auf den
  Home-Bildschirm“; gehört zu diesem Browser, daher nicht in der Sicherung).

## So verhält es sich

### Hinweise (Launch 1.0, `core/hinweise.ts`)
- Höchstens EIN Hinweis unter der Jetzt-Karte und höchstens EINE schwebende
  Blase je Öffnen („Schreiben & sprechen“ am Mia-Knopf). Reihenfolge: „Ich heiße
  jetzt Mia“ → „Unten findest du jetzt …“ → Familie einladen → Spendentopf → „Halte die
  Startseite gedrückt“ → „Lieber schlicht?“ → „Abends lieber dunkel?“.
- Jeder Hinweis nur einmal: am ersten Tag bleibt er, ab dem nächsten ist er
  weg (auch ohne Antippen). In den ersten 3 Tagen nur Beispiel-Tag und
  „Schreiben & sprechen“; „Lieber schlicht?“ kommt damit frühestens am 4. Tag.
  Ausnahme „Ich heiße jetzt Mia“ (nur alte Installationen, schützt vor
  Datenverlust): steht immer zuerst, bis „Alles klar“.
- EIN Stil (v0.136, Tafel 101): jeder dieser Hinweise (auch „Unten findest
  du jetzt …“) ist ein `SeitenTipp` – warmer Verlauf, feiner oranger Rand,
  kleines Mia-Gesicht ohne Ring, „MIA“, 1–2 Sätze, „Alles klar“ und
  höchstens ein eigener zweiter Knopf (`aktion`: „Schlicht ansehen“,
  „Automatisch“, „Familie einladen“, „Zeig mir wie“, „Abstimmen“). Test
  `tests/heute/hinweisStil.test.ts`. „Mia denkt mit“ (`MiaKarte`) bleibt
  eine Frage-Karte ohne Gesicht.

### Kacheln
- Zwei Looks (Profil `look`, `data-look` am `<html>`, Regeln in
  `globals.css`): „Farbig“ = Pastell-Flächen eine Stufe kräftiger, alle mit
  gleicher Sättigung (`--app-tile-<id>`/`-ac`, Text ≥ 4,5:1), Überschriften in
  der dunklen Tonfarbe, Innen-Kärtchen weiß, Wetter als stiller Himmel je Wetterlage
  und Tag/Nacht (`kachelHimmel`, `--app-sky-<lage>[-nacht]-*`, siehe
  `wetter.md`); „Schlicht“ = weiße
  Kacheln mit feinem Rand, Innen-Kärtchen sehr hell, Farbe nur in Überschrift,
  Symbol, Uhrzeit und Termin-Strich. Termine: Uhrzeit fett in der Tonfarbe,
  Strich links in Raumfarbe. Hell/Dunkel gilt für beide.
- Kachel-Farben (Tafel 108, `src/lib/heute/kachelFarben.ts`): Termine
  Lavendel, Aufgaben Mint, Einkauf Salbei, Pinnwand Rosé, Notizen Vanille,
  Im Haus Aqua, Sport Flieder, Timer Sand (alle gleich hell, Schrift ≥ 4,5:1,
  dunkle Töne für Dunkel); Wetter = Himmel, Essen = Bild. Im Bearbeiten-Modus
  unter XS · S · M die Reihe `FarbWahl` („A“ gestrichelt + 8 Punkte, Ring in
  der Tonfarbe, ein Tipp = gespeichert); Wetter und Essen ohne Reihe. Die
  Wahl steht als `farbe` in der Startseiten-Anordnung (pro Person/Gerät, in
  der Sicherung), die Kachel trägt `data-farbe="<ton>"` – CSS nimmt Fläche und
  Schrift der Kachel, deren Standard der Ton ist. „Schlicht“: weiß, der Ton
  nur in Überschrift/Symbol. „Wie am Anfang“ setzt auch die Farben zurück.
  Beispiel-Tag nutzt dieselbe Anordnung, also dieselben Farben.
- Wasserzeichen (Tafel 124 A/125, A-036; seit A-048/Tafel 135 in ALLEN
  Größen): jede Kachel ohne eigenes Bild trägt ein großes, stilles
  Linien-Symbol unten rechts im Kachel-Akzent – in S/M bis 150 px (höchstens
  Kachelhöhe − 10 px, damit es bei Listen so hoch wie der Inhalt unten rechts
  bleibt), in XS 110 px, rechts 50 px/unten 34 px angeschnitten, 11 %
  (dunkel 10 %, `--app-wasserzeichen-xs`); nie sichtbar über Text: die
  XS-Zeile lässt ihm rechts Platz und Text in seiner Nähe ist freigestellt
  (`kachel-frei`, auch das Label im Kopf) (`ui/KachelWasserzeichen`, `.kachel-wasserzeichen`, Tokens
  `--app-wasserzeichen*`): Termine Calendar, Aufgaben CircleCheck, Einkauf
  ShoppingCart, Im Haus Refrigerator, Notizen StickyNote, Timer Timer, Tipps
  MapPin, Post (bald) Mail, Wundertüte Gift (nur Vorderseite, leise). Keins
  bei Wetter (Himmel), Essen (Foto), Pinnwand (Zettel), Spendentopf (Topf),
  Sport (die Stempel sind das Bild, A-044 – auch in XS: zwei kleine Stempel), der Jetzt-Karte und im Look „Schlicht“. Tabelle `WASSERZEICHEN_SYMBOL`
  (`Record` über alle Kachel-IDs, neue Kachel = Eintrag oder Grund in
  `OHNE_WASSERZEICHEN`, Test `tests/app/wasserzeichen.test.ts`). Freier Text
  ohne weißes Kärtchen → `frei` (9 %, dunkel 8 %), leiser Text dort mit
  `kachel-frei`. Kachel = `isolate`, ihre Fenster stehen neben der
  `<section>`. Kachel-Texte ohne „ – “ (Test `tests/app/kachelTexte.test.ts`).
- `HOME_TILES` in Standard-Reihenfolge (Tafel 140; erlaubte Größen, Standard
  im Code): Wetter XS/S/M, Notizen XS/S/M, Pinnwand S/M, Termine S/M, Aufgaben
  S/M, Essen S/M, Wundertüte S/M, Einkauf S/M (Standard M), Spendentopf nur M,
  Tipps nur M (Baustein), Timer XS/S, Sport XS/S/M (Stempelkarte, A-044,
  Standard S), Im Haus S/M (Baustein, nur wählbar – A-032), Post („bald“, nie
  sichtbar). Der Größen-Umschalter zeigt nur die erlaubten.
- Pinnwand ist ein Baustein (Kühlschranktür): Kachel nur mit Baustein
  (Filter in `TodayPage`); „Nur für mich“ startet ohne, sonst an. Kachel
  „Fächer“ siehe `pinnwand.md`.
- `DEFAULT_HOME` = `defaultHome("familie")` (Tafel 140, s. o.); Im Haus
  erscheint nur mit Baustein und eigener Wahl, Tipps nur mit Quelle und
  Baustein (Filter in `TodayPage`).
- Raster siehe „Festes Raster“. Startseite v6 (`lonelySToM`): eine einzelne
  S, die bisher breit war, wird einmal M.
- Notizen-Kachel (`heute/notizenKachel.ts`): XS = neueste bzw. angeheftete
  Notiz in bis zu 2 Zeilen, S und M = bis 3 Zeilen „Titel · Anfang“ (die
  erste ebenso in bis zu 2 Zeilen), Rest „+n“, Angeheftete zuerst. Vorschau
  (A-060, Tafel 144, `notizen/NotizVorschau.tsx`, `notizVorschau`): Umbruch
  nur an Wortgrenzen, die zweite Zeile läuft weich aus (Maske
  `.notiz-ausblenden`, blendet in genau die Kachelfarbe aus – Farbig und
  Schlicht, hell und dunkel), nie „…“; ein auf 80 Zeichen gekürzter Titel
  zeigt gleich den vollen Anfang. Markiert mit `data-ausblenden`; leer überall derselbe Text „Schnell notieren …“
  (A-048/Tafel 140, wie auf der Notizen-Seite; in XS 13 px, ohne Stift im Text – der Stift ist nur der Knopf oben rechts);
  Listen als „x von y erledigt“. Antippen der ganzen Kachel (Zeile, Leertext,
  freie Fläche) öffnet in allen Größen immer die Notizen-Seite, leer wie voll;
  nur der Stift öffnet die Schnelleingabe „Neue Notiz“ (A-059, Tafel 144).
  Leere Notizen-Seite: „Noch keine Notizen. Tipp aufs Plus oder sag Mia:
  „Notiz: …““ (`NOTIZEN_LEER`).
- Nichts abgeschnitten (A-045/A-046, Tafel 133/134): kein sichtbarer Text in
  einer Kachel endet auf „…“ oder wird weggeschnitten – Texte brechen um
  bzw. sind so kurz, dass sie in die feste Fläche des Rasters passen; was
  nicht mehr passt, steht als „+n“ im Kopf. Ausnahme nur frei Eingegebenes
  (Notiz, Aufgabe, Termin, Zettel, Timer- und Trainingsname, Sachen im
  Haus), markiert mit `data-freitext`. Bewusster Platzhalter, der auf „ …“
  endet („Schnell notieren …“, A-048 – bei Konflikten gilt der neuere
  Auftrag), ist mit `data-platzhalter-text` markiert und nur vom „…“
  ausgenommen (`abgeschnitteneTexte`, damit `nichtsAbgeschnitten`; `pruefen`
  prüft „…“ nicht); abgeschnitten werden darf auch er nicht. Weich
  ausgeblendete Vorschau (`data-ausblenden`, A-060) darf unten in ihren
  Verlauf laufen – nur mit Maske (sonst „ausblenden ohne Verlauf“), nie
  seitlich, und darüber zählt nur der sichtbare Teil (Gegenproben im
  Durchklick `notizVorschau`). Im Haus: Name vor Schild, Schild
  10,5 px. Essen-Kachel siehe `essen.md` („Essen-Kachel final“). Prüfung:
  Durchklick `nichtsAbgeschnitten` (Beispiel-Tag und Familie, iPhone SE/15
  Pro/Pixel 7, jede Kachel in XS/S/M, `abgeschnitteneTexte` in
  `e2e/regeln.mjs`).
- Essen + Einkauf sind ein Paar, solange beide S sind (`istPaar`): dann immer
  direkt hintereinander, Essen zuerst (`keepPair`), wandern zusammen und
  zählen als eine Einheit im Raster. Einkauf M (Standard seit Tafel 140)
  steht für sich.
- Die Anordnung ändert sich nie von selbst. „zeigen“ setzt eine Kachel in
  Standard-Größe hinter die nächste sichtbare, die laut Standard davor steht
  (Paar: neben den Partner). `standardLayout`: Reihenfolge und Größen wie am Anfang.
- Termine und Aufgaben im gleichen Listenstil (v0.67.1, Tafel 58/59): ein
  weißes Feld je Kachel, feine Trennlinien, Zeilen 30 px (`data-zeile`, die
  ganze Zeile ist tippbar), Titel 13,5 px, Uhrzeit 13,5 px fett in fester
  Breite (tabular-nums), Nebeninfo 11 px. S und M sind gleich hoch: je 3
  Zeilen (`ROW_COUNT`), mit „Arbeit · 5 für morgen“ 2; Rest „+N weitere“
  (halb breit „+N“). Kopf auf allen Kacheln gleich (26 px, Titel 11 px,
  „+N weitere“ 12,5 px neben dem Plus), unten nichts; Abstand der Kacheln 8 px.
- Termine (`lib/heute/termineKachel.ts`, `termineTile`): ganztägige oben, dann
  nach Uhrzeit; ein laufender Termin bleibt 30 Min nach Beginn („läuft“) bzw.
  bis zum Ende, wenn es eins gibt; der nächste Termin hat eine Pfirsich-Zeile
  mit kräftigerem Titel, in der nächsten Stunde dazu „gleich“. Alles vorbei →
  „Morgen · Sa“ mit den Terminen von morgen. Neu gerechnet jede halbe Minute
  und sofort beim Zurückkommen in die App (`useMinutes`, `visibilitychange`).
- Aufgaben (Tafel 103/104): gleiche Regeln wie die Aufgaben-Seite – alles
  heute, EINE Reihenfolge (dringend → neu → Erstellungszeit, ohne in Listen
  Geparktes), keine Etiketten pro Zeile; Kreis (Tippfläche 44 × 30), Titel,
  „!“ bei dringend, rechts nur „von Lisa“, das kleine graue Schloss („Ich“)
  bzw. das blaue Schild „Arbeit“ (A-034). Ruht die Arbeit (`view.hideWork`: Feierabend mit Ruhe, freie
  Tage), fehlt sie und unten steht leise „Arbeit · 5 für morgen“ (Link zur
  Seite). Abhaken:
  1,5 s durchgestrichen (`LEAVE_MS`, überall gleich), dann weich weg – auch am
  Beispiel-Tag.
- Jede Kachel öffnet ihre Seite – die ganze Kachel, nicht nur der Titel
  (`EditFrame` mit `TILE_PAGE` in `TodayPage`; Zeilen, Knöpfe und Links in der
  Kachel behalten ihr Ziel). Termine öffnet den Kalender (er steht auf
  „Heute“), Essen den Essen-Reiter; Timer bleibt ein Fenster. Auf dem iPhone 15 Pro (als App) ist
  bis einschließlich Essen + Einkauf alles ohne Scrollen ganz zu sehen
  (Tafel 119, `e2e/ablaeufe/raster.mjs`). Den Streifen „Ausblick morgen“ gibt es seit vX nicht mehr (Tafel 98, siehe
  „Abends: nichts doppelt“): Termine- und Essen-Kachel zeigen abends schon
  morgen, gespeicherte Anordnungen verlieren den Eintrag still (Speicher v7).

### Bearbeiten-Modus (direkt auf der Startseite)
- Öffnen: lange drücken, Link „Startseite bearbeiten“ unten, Einstellungen
  oder die Begleitung (`requestHomeEdit`). Seit Launch 1.0 genau EIN
  „＋ Kachel“ und EIN „Fertig“ (beide im Kopf); die frühere Leiste unten
  (`EditDoneBar`) und der gestrichelte „Kachel hinzufügen“ sind weg, Mia
  ruht solange (`data-edit-leiste`). Schließen: „Fertig“, Zurück (eigener
  Verlaufseintrag) oder ein Tipp auf freie Fläche – ein Tipp auf eine Kachel
  beendet NICHT. Beim Beenden kurz „✓ Gespeichert“. Unten im Board leise
  „Aussehen“ (`EditLook`: Farbig | Schlicht und Hell | Dunkel | Automatisch,
  wirkt sofort).
- Kopf (sticky): „+ Kachel“, „Fertig“, Titel und Hinweis. Beim ersten Mal
  der Tipp „Neue Kacheln holen“ (`heute/AddTileTip.tsx`, Vorlage Variante D):
  Abdunklung (`bg-tip-scrim`, Portal an `body`, z-50), der Kopf darüber
  (z-[55], durchlässig) mit dem ECHTEN „+ Kachel“ hervorgehoben (`bg-accent`,
  4 px Ring `--app-tip-ring`, oranger Schein), „Fertig“ gedämpft, Titel
  ausgeblendet; die Karte (`bg-surface`, 16 px Rand, `rounded-pair`, z-[60])
  mit Spitze zur gemessenen Knopf-Mitte (ResizeObserver, Größe, Drehen,
  Safe-Area). „Verstanden“, Abdunklung, Zurück und Escape schließen, der
  Bearbeiten-Modus bleibt; „+ Kachel“ schließt sofort und öffnet die Auswahl
  (übernimmt den Verlaufseintrag – deshalb lädt `HomeBoard` die Auswahl beim
  Bearbeiten vor und zeigt sie ohne Suspense). Solange offen: Seite scrollt
  nicht, Fokus bleibt zwischen „Verstanden“ (zuerst) und „+ Kachel“, danach
  zurück auf „+ Kachel“. Ein-/Ausblenden 200 ms, bei „Bewegung reduzieren“
  sofort. Merker „kachel-tipp“ in `wasgibts.einmalhinweise` (`core/hints.ts`,
  getrennt von der alten Sprechblase „kachel-hinzufuegen“), gespeichert beim
  Schließen; Daten & App → „Einmal-Hinweise zurücksetzen“ (nur Testmodus).
- Kacheln wackeln, Inhalte sind gesperrt; „–“ entfernt mit „Gelöscht ·
  Rückgängig“, „XS · S · M“ (nur die erlaubten) ändert die Größe sofort, die
  Nachbarn rücken weich nach (beides beendet NICHT). Umschalter und Farbe
  liegen IN der Kachel (unten rechts), die Kachel behält genau ihren Platz;
  bei XS öffnet ein Farb-Knopf die Farbreihe über der Kachel. Das
  frühere Kachel-Menü ist weg; Verschieben ohne Ziehen per Pfeiltasten auf der
  Kachel bzw. die Screenreader-Knöpfe „Nach oben/unten“ und über die
  Begleitung („Schieb das Wetter nach oben“).
- Ziehen per Touch-Events: Wischen scrollt (`touch-action: pan-y`), erst
  ruhiges Festhalten (`HOLD_MS` 350, Toleranz 8 px) hebt an. Antippen kurz nach
  dem Scrollen (`FLING_MS` 120) hält nur den Schwung an. Schwebende Kopie,
  gestrichelter Platzhalter an der Zielstelle im Raster (die Nachbarn rasten
  sofort ein), Auto-Scroll am Rand.
- Unten „Aussehen“ und „Standard-Anordnung wiederherstellen“ (mit
  Nachfrage). Hinzufügen ist still (kein Rückgängig); nach dem Schließen der
  Auswahl leuchtet die neue Kachel kurz auf. Kacheln eines Bausteins schalten
  ihn beim Hinzufügen ein.
- Statt der Jetzt-Karte steht oben ein gestrichelter Platz (`JetztPlaceholder`).

### Jetzt-Karte: nur Nutzen für heute (A-054, v0.163; vorher Tafel 60/98)
- EIN Thema, höchstens zwei (`JETZT_MAX`), aus EINER festen Rangliste
  (`JETZT_RANG` in `lib/heute/jetztTopics.ts`, kleiner = weiter vorn):
  0 Beispiel-Tag (erklärt sich) · 5 Erinnerung · 10 Gleich · 20 Wetter mit
  Folge · 30 Essen mit Folge (31 abends Vorlauf) · 40 Geburtstag/Jahrestag ·
  45 Neu vom Haushalt (nur mit Konto) · 50 Timer läuft / Kochmodus läuft
  (52 Pause) · 55 Wochenende planen · 60 abends „Morgen“ · 70 leise „Kurz
  durchatmen?“ (A-051) · ab 80 selbst
  eingeschaltete Bausteine (Mails, Tipps aus der Region, Spendentopf,
  Freizeit-Idee, kleiner Tipp – wer sie nutzt, behält sie). Gleicher Rang:
  das Dringendere zuerst. `jetztThemen(lage)` liefert die ganze Liste,
  `jetztTopics` das, was die Karte zeigt. Ein neues Thema = eine Art mit
  Rang + ein Baustein in `kandidaten` (so kam „Kurz durchatmen?“ dazu).
- Nichts davon dran = keine Karte. Weggefallen (A-054): Spruch des Tages
  (Satz-Pool `mia/denktmit/sprueche.ts` gelöscht), „Alles ruhig. Ich sag
  Bescheid.“, abends „Morgen ist ruhig.“/„Für morgen ist alles sortiert.“ ·
  „Schönen Abend.“, „Moin!“-Morgengruß und Morgen-Info, „Genießt die Zeit“,
  Pinnwand-Neu, Heimweg-Einkauf, Kochstart, Absprache, Aufgaben/Ideen,
  Überschneidung/Packen (die Fragen stehen weiter in „Dein Tag“),
  Wochencheck (weiter per Mia) und der Kurz-Check „Im Haus“ (jetzt als Karte
  von „Mia denkt mit“ unter der Jetzt-Karte, „Los geht’s“ / „Heute nicht“).
  Gelerntes Interesse je Art gibt es nicht mehr.
- Gleich: der nächste Termin in weniger als 60 Min (auch Training) –
  „Gleich 10:00 Klettergerüst.“; Zeile 2 die Vorbereitung aus der Notiz
  („Versichertenkarte einpacken?“), sonst mit Ort „Losgehen um 9:45.“ (fester
  Vorlauf 15 Min, `LOSGEH_VORLAUF` – Wegzeiten gibt es nicht; ohne Ort keine
  Losgehzeit), sonst beim Training die Packliste, sonst nichts.
- Wetter mit Folge: Regen zur Stunde eines Plans von heute (Termin außer
  Arbeit, Training) – „Ab 15 Uhr Regen.“ · „Schirm für Bastelkreis.“, draußen
  „Fußball: lieber drinnen?“; sonst Sturm (`stormForPlan`); abends Regen
  morgen früh mit Plan („Jacken für die Kita raus.“). Regen ohne Plan = nichts.
- Essen mit Folge: fürs Gericht von heute ist im Haus etwas nicht da (nur mit
  gepflegtem „Im Haus“, ohne was schon auf der Liste steht), bis zum
  Kochstart: „Pad Thai heute Abend.“ und als Zeile 2 der Knopf „Auf die
  Liste: Eier“ – setzt genau diese Zutaten still auf die Liste
  (`zutatenDraufsetzen` in `einkauf/angebot/nachNehmen.ts`, über das
  Wochenplan-Angebot, mit „für Pad Thai“), danach ist das Thema heute weg.
  Nie „fehlt“. Abends: „Morgen gibt’s Gulasch.“ · „Rindfleisch heute aus dem
  Gefrierfach.“ (`essen/vorlauf.ts`).
- Geburtstag/Jahrestag heute oder morgen – nur aus dem Kalender (Stichwort
  oder Etikett, `kalender/anlass.ts`; das Profil kennt keine Geburtstage):
  „Heute hat Lisa Geburtstag.“ · „Vielleicht kurz anrufen?“, „Morgen hat Oma
  Geburtstag.“ · „Noch Zeit für eine Kleinigkeit.“, „Heute ist euer
  Hochzeitstag.“ (allein „dein“).
- Abends ab 18 Uhr: „Morgen · Fr: 8:00 Laufen“ · „2 Termine. Wecker auf 7?“
  (Wecker bei Terminen 5–9 Uhr); morgen nichts mit Uhrzeit = kein Thema.
- Wochenende planen (`lib/heute/wochenende.ts`): nur freitags 12:00–20:00
  (Zeit über `now()`). „Wochenende planen?“, Zeile 2 was schon steht („Sa
  10:00 Volleyball steht schon.“), 2–3 Chips aus den eigenen Daten in dieser
  Reihenfolge: Wetter („Sa sonnig: raus?“ bzw. „Sa Regen: was für drinnen?“ →
  Mia fragt nach einer Idee), Essen („Wochenplan Sa/So füllen“ → Essen, die
  nächsten 7 Tage), Einkauf („Großeinkauf Sa?“ ab 5 Sachen auf der Liste →
  still eine Aufgabe „Großeinkauf“ am Samstag). „Mit Mia planen“ öffnet die
  Bühne mit „Lass uns das Wochenende planen.“ (`openHelper`), „Später“ legt
  sie für heute weg (`wasgibts.jetzt`). Nie Tipps aus der Region, kein „du
  solltest“, keine Zähler. Steht Wichtigeres davor, wartet sie, bis das
  erledigt ist (sie steht immer allein).
- Bleibt: nachts (22–6) nur Erinnerung, Timer, Kochen, Pause und ab 22 Uhr
  „Morgen“; im Feierabend mit Ruhe und am Wochenende nichts zu Arbeit;
  höchstens EIN Hinweis darunter; nie Temperatur.
- Aussehen: mindestens 78 px hoch, wächst nur, wenn Text umbrechen muss;
  ganze Karte = EINE Fläche (Antippen), darüber nur der Knopf in Zeile 2;
  Wischen 1 → 2 und nicht weiter. Die Reihenfolge bleibt stehen
  (`useStableOrder`), bis die App zurückkehrt, 15 Min vergehen, ein Thema
  wegfällt oder Erinnerung/Gleich dazukommt.
- Tests: `tests/heute/jetztThemen.test.ts` (Rangliste mit überschriebenem
  `now()`: Do 8:47 ohne Thema → keine Karte, Regen am Nachmittag, Termin in
  40 Min zuerst, Fr 13 Uhr Wochenende, Fr 20:30 und Sa nie, abends „Morgen ·
  Fr“, nachts nur Erlaubtes, nie „…“), Durchklick `jetztKarte` (SE/15
  Pro/Pixel 7: ohne Thema weg, nie „…“, Wochenende „Später“).

### Weniger Mia + „Dein Tag“ (Tafel 66 B, 67, 68, v0.74.0)
- Auf der Startseite genau zwei Mias: das eckige Logo (`BrandMark`, nicht
  antippbar) und der runde Mia-Knopf. Die Jetzt-Karte zeigt statt Mias
  Gesicht ein Themen-Symbol (lucide, Orange im weißen 46-px-Kreis); die
  Zuordnung steht an EINER Stelle: `topicIcon` in `src/lib/heute/deinTag.ts`.
- Antippen öffnet „Dein Tag“ (`components/heute/DeinTag.tsx`, ein Sheet):
  Datum klein, Titel 30/800; TERMINE nach Uhrzeit mit „Jetzt · 10:30“-Linie
  (Vorbei grau mit ✓, `terminRows`), ESSEN (Abendessen mit „Kochen“ →
  Kochmodus, „Einkaufen · REWE“ mit „Liste“), neue PINNWAND-Nachrichten von
  heute, AUFGABEN zum Abhaken („von gestern“ leise; seit v0.107 wie überall:
  1,5 s durchgestrichen, weg, „Erledigt · Rückgängig“; Erledigtes steht
  nicht mehr da). Oben rechts ✕; schließt wie jedes Fenster (✕,
  Danebentippen, Runterwischen, Zurück). Das Thema der Karte ist
  hervorgehoben und in Sicht gescrollt (`topicSpot`), mit dem Hinweis der
  Karte; „Erledigt“ nur bei Vorbereiten/Packliste/Geburtstag/Erinnerung.
  Leerer Tag: „Heute ist nichts geplant. Genieß es.“ Ab 22 Uhr Umschalter
  „Morgen · Do“. Eintrag antippen = öffnen. „Ich“ trägt ein graues
  Schloss, „Arbeit“ ein blaues Schild, Uhrzeit und Strich in Raumfarbe (A-034;
  fremdes Ich und Arbeit kommt per RLS nie aufs Gerät, also auch nie zu Lisa). Ausnahme: laufender Timer
  öffnet den Timer.
- Mia: „Was steht heute an?“ / „Wie sieht mein Tag aus?“ (`isDayQuestion`)
  → 2 Sätze (`daySummary`), dann öffnet sich „Dein Tag“ (`openDeinTag`).
  Mit KI läuft es als App-Befehl wie der Wochencheck.
- Der Mia-Knopf gleitet beim Runterscrollen weg (`knopfAway`, nur
  transform/opacity) und kommt beim Hochscrollen bzw. nach 0,6 s Ruhe zurück.
- Tests: `tests/heute/deinTag.test.ts`, Durchklick `jetztKarte`.

### Tagesphasen
- Kochen (50) > Sport (40) > Feierabend (30) > Morgens (20) > Tagsüber (10).
  Sie ändern nur Inhalte, nie die Anordnung.
- Kochen: von Hand („Ich koche jetzt“), Timer läuft (bis 15 Min nach dem
  letzten) oder automatisch `kochenMin` vor bis 45 Min nach der Essenszeit.
  Bildschirm bleibt an. Die Essen-Kachel zeigt „Weiter kochen“, sobald heute
  gekocht wird (Kochmodus geöffnet bzw. „Ich koche jetzt“, Tafel 122 – siehe essen.md).
- Sport: 60 Min vor einem Training bis zu seinem Ende (nur mit Sport-Kachel).
- Feierabend (`istFeierabend`): ab `feierabendAb`, mit `nachArbeit` frühestens
  nach dem letzten Arbeit-Termin (`arbeitsEnde`), bis 5 Uhr. Mit Ruhe: Arbeit
  weg (`arbeitRuht` – gilt seit v0.137 auch beim Kochen und Sport am Abend und
  auf der Aufgaben-Seite), Termine nur Familie, die Jetzt-Karte nennt keine
  Aufgaben; Wetter zeigt morgen; der Avatar schläft.
- Nicht-Arbeitstag: Arbeit ganztags weg. Wechsel nur beim Öffnen/Zurückkehren
  oder nach 30 s ohne Berührung, nie beim Bearbeiten; `nudgePhase` wirkt sofort.
- `pushAllowed`: Timer immer, Pause nie, proaktiv höchstens 1×/Tag außerhalb
  20–7 Uhr, im Feierabend mit Ruhe nichts zu Arbeit und Aufgaben.

### Beispiel-Tag und erster Start
- Erster Start ohne Profil: Hallo-Bildschirm („Moin!“, früher „Hallo, ich bin Mia.“ aus
  `DEFAULT_HELPER`, „Ich behalte euren Alltag im Blick.“, Mikrofon-Hinweis,
  „Los geht’s“, „Ich habe eine Sicherung“). Seit v0.94: „Los geht’s“ →
  („Bevor’s losgeht“, seit A-027 als Häkchen im Hallo) → „Für wen soll ich sortieren?“ (Mia 110 px zwinkert
  einmal, Sprechblase „Kein Stress. Ich sortier deinen Alltag, Stück für
  Stück.“, drei Knöpfe, Texte `ERSTER_START` in `mia/persona.ts`, seit
  v0.120) → `startFresh("farbig", haushalt)`: Standardwerte,
  `ersteStartseite(haushalt)` (Standard + Wundertüte), `startDemo()`; Mia
  fliegt von „Zeig mal“ zum Mia-Knopf, der
  beim ersten Erscheinen einmal zwinkert; „Schreiben & sprechen“ erst nach 4 s.
  Jeder Schritt ist ein Verlaufseintrag (Zurück = ein Schritt), nach „Zeig
  mal“ werden die Schritte aus dem Verlauf genommen.
- Beispiele liegen nie in echten Speichern. Demo-Startseite nach Tafel 150
  (`core/demo.ts`):
  - **Einfach:** Termine und Aufgaben in 1–3 Wörtern, alltäglich, keine
    Adressen (Schwimmen, Zahnarzt, Blumen gießen).
  - **Immer zur echten Uhrzeit** (beim Öffnen und bei jedem Wechsel zurück
    in die App, `useMinutes`): vorbei = weg, gerade dran bleibt 30 Min
    („läuft“), ab 20 Uhr (oder wenn heute nichts mehr kommt) der Plan von
    morgen („Morgen · Mi“). Essen = nächste Mahlzeit (`demoDishAt`: vor 13
    Uhr Mittag 12:30, dann Abend 18:30 bis 20 Uhr, danach Mittag von morgen).
    Jetzt-Karte = der nächste Termin („15 Uhr Schwimmen.“ · vorbereitender
    Satz, `demoJetzt`), Sport-Ring nach Wochentag (`demoSportRing`: Mo 0,
    Di/Mi 1, Do/Fr 2, Sa/So geschafft).
  - **Wochentag passt** (`demoArt`, Feiertage wie Sonntag): Mo–Fr Kita,
    Schwimmen, Elternabend …; Sa/So Familie, Ausflug, Laternenumzug – nie Kita
    oder Elternabend am Wochenende. Je Art drei Varianten (`variante` nach
    Datum), zu zweit/allein eigene Pläne. Aufgaben werktags drei, am
    Wochenende zwei („diese Woche“, nie dringend).
  - Wetter echt vom Ort (sonst Eutin), Pinnwand/Notizen/Einkauf/Wundertüte
    wie bisher.
- **Streifen oben** (`DemoRow`, unter dem Kopf): „Beispiel · tipp überall
  rein“ · „Hinweise aus“ (danach „Eigenen starten“). Je Kachel verschwinden
  die Beispiele beim ersten Eigenen (`clearDemoTile`), alle nach 3 Tagen oder
  per „Eigenen starten“; danach einmal „Alle Beispiele entfernen?“.
- **Graue Erklärsätze** (Tafel 150, `heute/demoHinweise.ts`): unter
  Jetzt-Karte, Kreisen und jeder Kachel, die gerade Beispiele zeigt (Wetter
  immer), Wortlaut wie Tafel 150. Im Raster als eigene Zeile (Höhe = Inhalt,
  `hinweisZeilen`) an der ersten Grenze unter der Kachel, über die keine
  andere reicht – die Kacheln behalten ihre Größe; Wetter und Notizen
  übereinander teilen sich einen Satz. „Hinweise aus“ (`hinweiseAus` in
  `wasgibts.beispiel`) blendet sie aus; nie im Bearbeiten.
  entfernen?“ (`askRemoveAll`).

### Seiten-Pager
- Wischen ohne Wackeln (v0.106): Richtung früh und fest (`swipeAxis`: ab 6 px,
  waagerecht nur bei |dx| > 1,2 · |dy|, dann für die ganze Geste). Waagerecht
  steht die Seite senkrecht still (html `overflow: hidden` + gemerkte
  Scrollhöhe, beim Loslassen frei), senkrecht kein seitliches Wischen. Pager
  `touch-action: pan-y` (Zoomen bleibt), html/body `overscroll-behavior-y:
  none` (kein Gummiband, kein Ziehen zum Neuladen). Durchklick `wischen.mjs`.
- Wechsel ab 25 % Breite oder
  > 0,35 px/ms, sonst zurückfedern; Gummiband am Rand. Nicht in Feldern,
  Fenstern und `[data-no-swipe]`.
- Nur klare Seitenwische (A-059, `heute/seitenWisch.ts`, rein): Start nicht in
  den untersten 48 px + Safe-Area unten (dort schließt man auf dem iPhone die
  App) und nicht am linken Rand (`RAND_PX`, Zurück), |dx| ≥ 2 · |dy|,
  mindestens 60 px. `touchcancel` federt immer zurück. Geht die App binnen
  500 ms nach einem Wisch-Wechsel in den Hintergrund (`visibilitychange`),
  wird der Wechsel zurückgenommen (läuft die Animation noch: gar nicht erst
  gewechselt). Die Heimkehr-Regel (> 5 Min → Startseite) bleibt. Tests
  `seitenWisch.test.ts`, Durchklick `kaputt.mjs` `wischenNurKlar`.
- Menü „•••“ (`ui/MoreMenu`): Zeilen, die zu einer anderen Seite führen,
  haben `href`; erst schließt das Fenster samt Verlaufseintrag, nach dessen
  `popstate` geht es weiter (`nachDemFenster`, `core/fensterVerlauf.ts`
  `danach`). Vorher kam beim Kaltstart das verspätete Entfernen des
  Menü-Eintrags (300 ms) der noch ladenden Seite zuvor und brach sie ab
  (A-059). Durchklick `menueErstesTippen` (gedrosselt, Browser und als App).
- Unten frei: Die Seite hat unten `FAB_CLEARANCE` (Leiste + herausragende
  Mia + Luft) – nach unten gescrollt liegt keine Kachel unter Leiste oder
  Mia-Knopf (Durchklick `untenFrei`, auch mit umgedrehter Wundertüte).
- Verlauf: Heute → Kalender/Essen ein Eintrag, Kalender ↔ Essen ersetzt; Zurück
  führt immer zu Heute. `?seite=woche` gilt weiter als Kalender.

## Begleitung (Mia)

- `startseite_anpassen` (Op `home`, Vorschau + Übernehmen): zeigen,
  ausblenden, klein/mittel/gross, hoch/runter/nach_oben/nach_unten, standard,
  farbe + `farbe` („Mach die Notizen blau“ → nächster Ton: blau → Lavendel,
  hellblau/türkis → Aqua, grün → Mint, oliv/hellgrün → Salbei, gelb → Vanille,
  rosa/pink/rot → Rosé, lila/violett → Flieder, beige/braun/grau → Sand,
  automatisch/Standard → A; `farbeAusWort`). Wetter/Essen: ehrlich ablehnen.
- `jetzt_karte` (Op `set_jetzt`): Jetzt-Karte an/aus.
- „Startseite bearbeiten“ → `app_befehl` mit diesem Satz → `requestHomeEdit`.
- Ohne KI: `parseHomeCommand` in `src/lib/begleitung/homeChat.ts` („Mach die
  Einkaufsliste wieder klein“, „Nimm das Wetter weg“, „Mach die Notizen blau“ –
  Farbe nur als letztes Wort, höchstens 7 Wörter) und `jetztCommand` in
  `dayChat.ts` („Blende die Jetzt-Karte aus“, auch „Lass die Startseite immer
  gleich“).
- Nutzt die Begleitung eine Kachel, die fehlt, kommt sie dazu (`unlockHomeTile`).
- Aufleuchten in der Kachel (A-037, Tafel 126): Was Mia eingetragen hat
  (sofort oder per „Übernehmen“), leuchtet nach dem Schließen der Bühne bzw.
  bei der Rückkehr zur Startseite EINMAL 1,5 s weich orange – die Zeile, wenn
  sie in der Kachel steht (`data-leuchte`: Termine/Aufgaben `eintrag:<id>`,
  Einkauf `einkauf:<name>` an der Laden- bzw. „ohne Laden“-Zeile, Notizen
  `notiz:<id>`), sonst die Kachel als Ganzes (z. B. Termin nächste Woche,
  Pinnwand, Im Haus). Merker nur im Arbeitsspeicher (`lib/heute/aufleuchten.ts`:
  `leuchtenMerken` in `noteMiaDone`/Übernehmen, `buehneGeoeffnet` aus
  KitchenHelper, `geleuchtet` = nie wieder; Rückgängig vergisst es), nichts
  gespeichert. Auslösen in `components/heute/useAufleuchten.ts` (HomeBoard,
  nie im Bearbeiten): setzt nur `data-leuchtet`, das Leuchten ist CSS
  (`::after` mit Ring `--app-leuchten` und Fläche `--app-leuchten-flaeche`,
  nur opacity, `cubic-bezier(.16,1,.3,1)`); reduzierte Bewegung = nur kurz
  hervorgehoben (`leuchten-still`). Durchklick `ergebniskarten.mjs` (`miaAufleuchten`).

## Tests

- `tests/heute/`: `kachelFarben.test.ts` (Palette, Kontrast hell/dunkel/Schlicht,
  Wahl/„A“, Migration v8, Sicherung, Mia), `jetztKarte.test.ts`, `jetztThemen.test.ts`, `deinTag.test.ts`,
  `phasen.test.ts`, `tagesphasen.test.ts`, `tagesablaufSpeicher.test.ts`.
- `tests/core/`: `kachelAnordnung.test.ts`, `startseite.test.ts`,
  `beispielTag.test.ts`, `beispielTagSpeicher.test.ts`, `wischen.test.ts`.
- `tests/einstellungen/ersterStart.test.ts`, `tests/begleitung/werkzeugeStartseite.test.ts`.
- Durchklick `e2e/ablaeufe/start.mjs`: `hallo`, `ersterStart`, `dreiBildschirme` (höchstens 3 Bildschirme, allein/zu zweit/Familie, mit und ohne Zugangscode), `homeKarte` (nur im Browser, nicht als App, nicht im Beispiel-Tag, „Später“-Regel, Android-Angebot), `bearbeiten`, `wischen`; `testcode.mjs` (Zugangscode falsch/richtig/nachsichtig/später), `datenschutz.mjs` `vorDemStart` (Häkchen im Hallo), `konten.mjs` (Einladung: Zugangscode erst beim KI-Versuch).
- Unit: `tests/heute/homeBildschirm.test.ts`, `tests/begleitung/ersterStart.test.ts`, `tests/begleitung/codeAbfrage.test.ts`, `tests/begleitung/kiOk.test.ts`.

## Kopf und „neu hinzufügen“ (v0.67)

- Kopf (Tafel 55): links BrandMark (30 px), rechts „Fr, 23. Okt“
  (`headerDate`, `lib/heute/kopfDatum.ts`); „Guten Morgen, Lisa.“ bleibt als
  Überschrift für VoiceOver (unsichtbar).
- iPhone/iPad als Web-App, vor v0.67 installiert (`miaHomeHint`): einmal der
  Hinweis „Ich heiße jetzt Mia …“ (`MiaNameHint`, Vorrang vor den anderen
  Hinweisen) mit „Zeig mir wie“: sichern → Icon entfernen → Safari → Zum
  Home-Bildschirm → wiederherstellen (`miaHomeSteps`). Sichern zuerst, weil
  iOS beim Entfernen die Daten der Web-App löscht.


## Essen-Kachel immer mit Bild, Koch-Kachel, Einkauf-Symbole (Sofort-Kachel)

- Essen-Kachel: JEDER Zustand ist eine Bild-Kachel (`DishTile`) – geplant,
  Vorschlag, morgen, kocht gerade, gegessen (zeigt dann morgen), „Noch frei“
  und „Kein Kochtag“. Ohne Gericht ein gezeichneter leerer Teller mit Besteck
  (`DishPicture leer`). Das Bild je Zustand kommt rein aus `kachelBild`
  (`lib/heute/essenKachel.ts`). „3 Ideen ansehen“ steht bei „Noch frei“ als
  Zeile unter dem Namen; die frühere L-Zeile „Ideen für morgen“ entfällt.
- Kopfzeile einzeilig und nie umbrochen (`truncate whitespace-nowrap`,
  `data-kopf`): „ESSEN · 18:30“, ohne Personen (Tafel 122).
- Seit Tafel 122 (A-025): Name groß in der Mitte, unten „Rezept“ |
  „Wochenplan“ (S: „Woche“), beim Kochen „Weiter kochen“ mit „Schritt 3 von 6“;
  die eigene Koch-Kachel (`CookingTile`) ist weg. Einzelheiten in
  `docs/bereiche/essen.md`.
  Die Schritte-Liste zum Abhaken gibt es nur noch im Kochmodus und bei Mia.
- Einkauf-Kachel: Artikel ohne eigene Zeichnung zeigen das Linien-Symbol
  ihrer Abteilung (`abteilungSymbol`, `lib/einkauf/kacheln/abteilung.ts`),
  nie einen Buchstaben. Gibt es nur „Egal wo“, zeigt die Kachel bis zu 6
  runde Symbole der ersten Sachen, „+N“ und die Zahl (Variante A,
  `tileArt`/`symbolReihe`); sobald Läden da sind, die Zeilen je Laden (C2).
  Seit „Einkauf neu“ (vX, Tafel 110): Laden-Zeile = Laden-Seite
  (`/einkaufsliste/laden?name=…`, `ladenHref`), „n noch ohne Laden ·
  Sortieren ›“ = Seite „Einkauf“ am Bereich „Noch ohne Laden“
  (`/einkaufsliste#ohne-laden`), Kopf und Rest = Seite „Einkauf“ (die frühere
  Jetzt-Karte „Auf dem Heimweg bei REWE?“ gibt es seit A-054 nicht mehr).
- Tests: `tests/heute/essenKachel.test.ts` (sieben Zustände mit Bild,
  Kopfzeile, Schritt-Zeile), `tests/einkauf/kachelSymbole.test.ts` (nie ein
  Buchstabe, Variante A/C2, Kochmodus-Schritt).


## Mini-Kreise oben (A-050, Tafel 143 + Nachtrag „kein Schild“)

- Reihe direkt unter dem Kopf (Logo + Datum) bzw. unter der Jetzt-Karte, über
  allen Kacheln und Hinweisen (`components/heute/kreise/KreisReihe.tsx`, rein
  `lib/heute/kreise.ts`). Nicht wischbar: kein seitliches Scrollen, Wischen
  wechselt weiter die Seite (Kalender · Heute · Essen).
- Bis zu 4 Kreise gleich verteilt über die ganze Breite (14 px Rand, A-064;
  bis v0.171 waren es 5 mit Rätsel): 64 px (Symbol 26, Wort 13 px) –
  `kreisMasse`. Unter jedem Kreis genau EIN Wort, fett, nie zweite Zeile, nie
  „…“. Fläche = Kachelfarbe des Bereichs (`data-tone`: Sport Flieder bzw. die
  Farbe der Sport-Kachel, Pause Mint, Was los? Lavendel-Blau, Timer Sand), Symbol im Akzent; Schlicht: weiß mit feinem Rand.
- Standard (`STANDARD_KREISE`): Sport (Laufschuh bzw. Symbol der nächsten
  Sportart; Ring = Wochenziel, Stücke füllen sich, geschafft grün; im
  Beispiel-Tag 2 von 3) · Pause (Wind, öffnet Durchatmen über
  `oeffneDurchatmen`) · Was los? (Fahne; mit `useWasLosSichtbar()` – Quelle
  an und Baustein an, A-063 auch ohne Einträge –, öffnet `WasLosFenster`) ·
  Timer (Stoppuhr, `TimerFenster`). Rätsel ist seit A-064 kein Kreis mehr,
  sondern eine Sorte der Wundertüte; ein gespeicherter Rätsel-Kreis fällt
  beim Laden still weg (`sanitizeKreise`), die übrige Reihenfolge bleibt.
- Läuft ein Timer: Restzeit des kürzesten groß im Kreis (orange), oranger
  Fortschritts-Ring, Position 1 (`timerImKreis`, `sichtbareKreise`); danach
  zurück an seinen Platz. Ist der Timer-Kreis aus, steht er nur, solange einer
  läuft. Mehr als 4: hinten fällt weg, der laufende Timer nie.
- Nur Kreise eingeschalteter Bausteine (Sport, Durchatmen). Kein Schild, keine
  Zahl, keine Plakette – einziges Zeichen sind Sport-Ring und Timer-Restzeit.
- Antippen = Fenster von unten (`ui/Sheet`), der Kreis hat solange einen orangen
  Rand (`kreis-aktiv`); man bleibt auf der Startseite. Lange drücken =
  Startseite bearbeiten.
- Bearbeiten: statt der Reihe der Abschnitt „Kreise oben“ (`KreiseBearbeiten`):
  an/aus je Kreis (einschalten schaltet den Baustein mit ein), Reihenfolge
  ziehen am Griff (Knöpfe „Nach oben/unten“ für Screenreader, Pfeile mit Maus),
  Hinweis „Höchstens 4 Kreise“. „Was los?“ erscheint erst mit Quelle.
- Speicher: Feld `kreise` in `wasgibts.startseite` (v10, in der Sicherung),
  `loadKreise`/`saveKreise`/`changeKreise`/`useKreise` in `core/homeLayout.ts`.
- Mia: Werkzeug `kreise_anpassen` (Vorschau „Kreis Timer – ist oben raus“ mit
  Übernehmen, Op `kreise`), ohne KI `parseKreisCommand` in
  `begleitung/homeChat.ts` („Nimm Was los oben raus“, „Timer nach vorn“, „Hol
  die Pause wieder nach oben“ – nur mit „oben/vorn/hinten/Kreis“ im Satz).
  Nutzt Mia Sport, kommt der Sport-Kreis (`heute/sportKreis.ts`), keine Kachel.
- Fenster: Sport und Timer siehe `sport.md`/`timer.md`; Durchatmen
  `durchatmen.md`; Rätsel (Sorte der Wundertüte) `wundertuete.md`.
- Tests: `tests/heute/kreise.test.ts`, `tests/heute/kreisFenster.test.ts`,
  Durchklick `e2e/ablaeufe/kreise.mjs` (`kreiseOben` SE/15 Pro/Pixel 7,
  `kreisFenster`, `kreiseBearbeiten`, `kreiseMigration`), `raster.mjs`
  (`timerKreis`, `standardJeHaushalt`).


## Festes Raster XS · S · M, Standard je Haushalt, Wetter mit Himmel (Tafel 118–120, A-023)

- Raster (`lib/heute/raster.ts`, rein): 2 Spalten, Grund-Zeile = halbe
  S-Höhe aus der Board-Breite (`ZEILE_CSS` = `max(80px, (100cqw − 24px) / 4)`,
  Board mit `container-type: inline-size`, Abstand 8 px) – S ist ab 375 px
  quadratisch; ganz schmal (iPhone SE 1, 320 px) mindestens 168 px hoch,
  damit nichts abgeschnitten wird (A-045), die Einkauf-Kachel lässt dort die
  Symbole weg. XS = 1 × 1, S = 1 × 2, M = 2 × 2, Essen + Einkauf (beide S) =
  EINE Einheit 2 × 2. `packe`: jede Einheit an den ersten freien Platz, an den
  sie passt (oben vor unten, links vor rechts). Zwei XS hintereinander sind
  ein Paar: übereinander (= ein S-Platz) – nebeneinander als halbe Zeile nur,
  wenn danach etwas Breites kommt (sonst bliebe eine Lücke). Einzelne S/XS
  ziehen die nächste passende Kachel nach oben. Freie Zellen = Lücken
  (`luecken`, 1 × 1 oder 1 × 2): ruhig leer, im Bearbeiten „＋ Kachel“
  (`data-luecke`, Auswahl nur passender Kacheln, `fuelleLuecke` stellt sie
  genau in die Lücke, möglichst ohne dass eine andere rückt).
- `HomeBoard` setzt jede Einheit mit `grid-column`/`grid-row` an ihren
  Platz; jede Kachel füllt genau ihre Fläche (`h-full`).
- Höhe = Inhalt für Listen (A-048, Tafel 135 mit Klarstellung, `zeilenPlan`):
  Termine, Aufgaben, Einkauf S und Notizen S/M (`INHALT_KACHELN`, Einkauf
  auch im Paar mit Essen) wachsen und schrumpfen mit dem Inhalt: 1 Eintrag =
  Kopf + 1 Zeile, 2 = 2, 3 = 3, mehr = 3 Zeilen + „+n weitere“ (halb breit
  „+n“) im Kopf, leer = Kopf + EIN freundlicher Satz in einer 30-px-Zeile
  („Termin eintragen“, „Aufgabe eintragen“, „Schnell notieren …“, „Was braucht
  ihr?“) – so hoch wie mit einem Eintrag; darunter immer 14 px
  (`pb-3.5`), kein Leerraum bis zu einer festen Rasterhöhe. Ein Band aus zwei
  Grund-Zeilen, in dem jede Einheit genau dieses Band füllt und eine Liste
  ist (Lücke daneben bleibt leer), wird EINE Zeile `auto`; die Einheit trägt
  `data-hoehe="inhalt"` und `render(…, inhalt)`. Feste Höhen nur für Kacheln
  mit Bild bzw. eigener Fläche (Essen allein, Wetter, Pinnwand, Notizen,
  Sport, Im Haus, Wundertüte …): steht eine Liste neben so einer Kachel oder
  einem XS-Paar, bekommen beide die Höhe der größeren – das ist die feste
  Reihe (die Liste passt mit 3 Zeilen immer hinein). Zwei Kacheln in einer Reihe sind
  immer gleich hoch, aber nur so hoch, wie die höhere braucht (Essen im Paar
  = so hoch wie Einkauf bzw. sein eigener Inhalt). Die Plätze (Raster XS · S ·
  M, Tafel 118/119) ändern sich dadurch nicht. Das Wasserzeichen liegt
  absolut und macht die Kachel nie höher. Prüfungen: `rasterHoehen` und
  `pruefen` messen bei `data-hoehe="inhalt"` die Breite und Kopf + 1 Zeile
  statt der festen Höhe (die feste Höhe ist bei Listen gerade der Fehler aus
  Tafel 135), `rasterBuendig` erwartet Termine/Aufgaben niedriger als die
  Pinnwand; Durchklick `startseiteKompakt` (Familie-Beispiel auf SE, 15 Pro,
  Pixel 7: unter der letzten Listenzeile ≤ 20 px, Einkauf M mit Edeka · Rewe ·
  Lidl in einer Reihe, Essen | Wundertüte gleich hoch, XS-Wasserzeichen
  sichtbar und nie über Text; „Nur für mich“: Sport als Kreis oben), `einkaufChips`
  (Einkauf M mit 3 bzw. 5 Läden und langen Namen) und `listenHoehen`
  (Termine, Aufgaben, Notizen, Einkauf S mit 0, 1, 2, 3, 5 Einträgen auf SE,
  15 Pro, Pixel 7), Tests `tests/heute/hoeheInhalt.test.ts` und
  `tests/heute/hoeheZeilen.test.ts`. Bearbeiten nutzt dasselbe Raster (Knöpfe IN der Kachel, kein
  Einzug, das Paar ohne Innenabstand) – nach „Fertig“ exakt dieselbe Ansicht
  (Fehler „Pinnwand-S schrumpft nach Fertig auf einen Streifen“, Video 28.10.,
  behoben: feste Höhe statt `h-[156px]`/`min-h` und Nachbar-Strecken).
- Mias Tipp zu einer Kachel bekommt eine eigene Zeile (`auto`) an der ersten
  Grenze unter ihr, über die keine Kachel reicht (`trennZeile`), Pfeil
  links/rechts/mittig nach Platz (`pfeilZu`).
- Inhalt je Größe: XS = Kopf + EINE Zeile (Wetter: Temperatur + kurzer
  Satz; Sport XS – nur noch, wer sie selbst wählt – zwei kleine Stempel + „Heute“/„8:00 · Laufen“), S/M = feste
  Mengen (Termine/Aufgaben höchstens 3, Einkauf S 3 Läden untereinander – die mit den meisten
  Sachen zuerst – und darunter „n ohne Laden · Sortieren ›“, „+n“ erst ab dem
  4. Laden, A-048; nur in einer festen Reihe mit „ohne Laden“ 2; Einkauf M
  1–3 Läden in EINER Reihe, ab 4 Läden 2 × 2, siehe `einkauf.md`; Notizen 3,
  Im Haus 2 + „Was koch ich daraus?“), Rest als „+n“ im Kopf; nichts gestaucht. Pinnwand S = Fächer, M = drei nebeneinander.
- Timer ohne festen Platz (A-050): ein laufender Timer steht im Timer-Kreis
  oben (Restzeit, Position 1), keine Kachel schiebt sich dazu; `startTimer`
  blendet nichts mehr ein.
- Standard je Haushalt (`defaultHome` = `ersteStartseite`, Tafel 140, für neue
  Nutzer und den Beispiel-Tag; `startFresh` schaltet Sport für alle ein, bei
  „allein“ die Pinnwand aus, und setzt die Kreise zurück). Die Wundertüte
  gehört zum Standard, kommt beim Haushaltswechsel aber nie von selbst dazu
  (`NUR_NEU`). „Startseite bearbeiten“ → „Neue Standard-Ordnung übernehmen“
  (`neueStandardOrdnung`, nur solange sie nicht dasteht, mit Nachfrage und
  Rückgängig): Standard-Kacheln in Reihenfolge und Größe der Tafel, eigene
  Kacheln dahinter, Farben bleiben, Kacheln ausgeschalteter Bausteine kommen
  nicht dazu. Bestehende Nutzer behalten sonst ihre Anordnung. Haushalt
  wechseln (`homeForHaushalt`, aus `saveProfile`): steht noch genau der
  Standard des alten Haushalts da, kommt der neue; sonst bleibt die eigene
  Anordnung, nur fehlende Standard-Kacheln kommen dazu, bei „allein“ wird die
  Pinnwand ausgeblendet (nie gelöscht).
- Mia: „Mach das Wetter ganz klein“ → `mini` (XS); „groß“ = M.
- Tests: `tests/heute/raster.test.ts` (Größen, dichtes Füllen, Paare,
  Lücken, Bearbeiten = Fertig, Timer, Standard je Haushalt, Haushaltswechsel,
  Migration v9), `tests/wetter/kachel.test.ts` (Szenen, Satz, XS/S/M ×
  Tag/Nacht × Farbig/Schlicht), Durchklick `e2e/ablaeufe/raster.mjs`.

### Mias Wundertüte (A-022, Tafel 116)

- Kachel `wundertuete` (S/M, Baustein `wundertuete`, keine Farbwahl): jeden
  Tag was Neues, sieben Sorten mit eigenem Kopf und Farbe, Antippen dreht um
  (Antwort hinten, Teilen), nochmal = Neues; nach 3 Anzeigen von selbst die
  nächste. Tagsüber Wissen, Platt, Rätsel; ab 17 Uhr zu zweit/Familie
  Tischrunde, Schätz mal, Wer zuerst. Inhalte geprüft mit Quelle.
- Neu an für neue Nutzer (S hinter Essen + Einkauf), bestehende: aus, in der
  Auswahl „NEU“; Einschalten in „Mehr Funktionen“ stellt die Kachel auf die
  Startseite. Ausnahme vom Feature-Stopp für 1.0, von Felix gewollt.
- Beispiel-Tag: feste Karte Angeberwissen, „Beispiel“ nur für VoiceOver
  (kein zweites Schild neben dem an der Pinnwand, Tafel 119).
- Raster (A-023): nur S und M; seit Tafel 140 im Standard (Familie neben
  Essen, allein neben Wetter/Notizen), beim Haushaltswechsel nie von selbst.
  Nichts abgeschnitten: Schrift passt sich der Fläche an, Kopf mit
  Kurzform (`useEinpassen`); geprüft in `nichtsAbgeschnitten` und
  `wundertueteAlle`.
- Alles Weitere (Sorten, Wechsel, Pool, Nachfüllen, Speicher, Tests):
  `docs/bereiche/wundertuete.md`; Oberfläche
  `src/components/wundertuete/WundertueteTile.tsx`, im Board über
  `TodayPage.renderTile`.
