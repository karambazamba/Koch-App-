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
  Sport Flieder, Timer Sand; im Bearbeiten unter S · M · L „A“ (automatisch) +
  diese 8 Töne, ein Tipp = übernommen, keine freie Farbwahl, Schrift kommt mit
  dem Ton; Wetter und Essen ohne Auswahl; gespeichert pro Person in der
  Startseiten-Anordnung (`farbe`, `data-farbe`), bei „Schlicht“ nur für
  Überschrift/Symbol.

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
