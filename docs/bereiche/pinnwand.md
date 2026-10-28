# Pinnwand

Kurz: Die Kühlschranktür (Tafel 106/107, Vorlagen in `docs/tafeln/`). Zettel,
Fotos und Sprachnachrichten FÜR DIE ANDEREN im Haushalt; Notizen sind für
mich. Klar unterscheidbar von Notizen (die bleiben weiß und schlicht).
Ein Zettel bleibt, bis jemand ihn abhakt (wie Aufgaben und Einkauf: Häkchen
orange, 1 s stehen – nochmal tippen = zurück –, dann gleitet er weich ins
Archiv „Ältere“, nie durchgestrichen; „Erledigt · Rückgängig“ holt ihn
zurück), oder bis
er 7 Tage alt ist – dann liegt er leise im Archiv. „Bleibt hängen“ geht nie
von selbst. Im Archiv nach 30 Tagen still gelöscht, sonst nur von Hand
(A-024; die 24-Stunden-Wartezeit für Erledigtes ist weg). Tafel 123
(A-028 Teil 1): Fotos als kleines Polaroid (antippen = groß), die Wand so
hoch wie ihr Inhalt, Meta-Zeile kurz, „OBEN“ an Zetteln, die hängen bleiben.
Teil 2: Zettel klein oder groß, Reihenfolge selbst bestimmen (lange drücken,
ziehen) und unten die Ecke „Nur für mich“.

## Feste Regeln (aus CLAUDE.md)

- **Pinnwand (Kühlschranktür, Tafel 106/107):** Zettel und Sprachnachrichten
  FÜR DIE ANDEREN (geteilt im Haushalt); Notizen = für mich. Ein Zettel
  bleibt, bis jemand abhakt (wie Aufgaben und Einkauf: Häkchen orange,
  „erledigt von Lisa“, 1 s stehen – nochmal tippen = zurück –, dann 0,8 s
  weich ins Archiv „Ältere“, nie durchgestrichen; danach Toast „Erledigt ·
  Rückgängig“ 5 s – ausdrücklich gewünscht; Seite und Kachel gleich) oder bis er 7 Tage alt
  ist (leise ins Archiv); „Bleibt hängen“ (intern `pinned`) bleibt oben links
  und geht nie von selbst; im Archiv nach 30 Tagen still gelöscht (als
  Lösch-Markierung über den Abgleich), sonst nur von Hand mit Rückgängig;
  Dateien gelöschter Zettel räumt der Server weg, nie nach Alter (`tuer.ts`).
  Gilt für Zettel, Fotos und Sprachnachrichten gleich. Wörter überall gleich
  (`woerter.ts`): „Aufhängen“ → „Hängt.“, „Bleibt hängen“, „Nicht mehr
  festhalten“ – nie „Anpinnen/Anheften/Angepinnt“.
  Optik: helle Tür mit Griff (dunkel: Edelstahl), zwei Spalten, fest leicht
  schief (−3° bis +3°), Magnete (Punkt Zettel, Stern Karoblatt, Apfel
  Polaroid, Herz Kassenbon; „Bleibt hängen“ roter Pin), Farbe = Person (5 Pastell
  `--app-zettel-<n>`, Tür `--app-fridge-*`). Papiere: Haftnotiz, Karoblatt
  (Kinder-Profile), Kassenbon (Sprachnachricht), Polaroid (Foto, verkleinert
  auf 1600 px, Bucket „fotos“ nur für den Haushalt). Antippen/lange drücken =
  Menü (Erledigt, Antworten, In Notizen, Bleibt hängen, Löschen nur eigene); Mia
  fragt EINMAL je Zettel „Klingt nach Notiz …“. Kachel = Fächer (S drei,
  M drei nebeneinander, L bis 6; gerade Abgehaktes 1 s mit Häkchen, dann
  weich weg; leer gestrichelter Zettel). Seiten-Tipp: „Kurze Zettel für alle. Abhaken räumt auf, ‚Bleibt
  hängen‘ bleibt.“
- **Größe, Ordnen, „Nur für mich“ (Tafel 123):** klein = halbe Breite
  (Standard, auch Fotos), groß = volle Breite. Lange drücken hebt an
  (Schatten, 1,06), loslassen = Fenster (Titel = Zettel in „…“, Klein |
  Groß, Nach oben, Nur für mich/Für alle, Erledigt, „Zum Verschieben: halten
  und ziehen“); halten und ziehen = verschieben, die anderen gleiten nach
  (0,8 s, nur transform, reduziert ohne Gleiten), `data-no-swipe` beim
  Anheben. Reihenfolge = „Bleibt hängen“ („OBEN“) vorn, dann `sort`, ohne
  `sort` die Zeit; geteilt mit der Familie. „Nur für mich“ (`privat`) unter
  einer gestrichelten Linie ganz unten, grau-weiß mit grauem Pin und
  Schloss, nur der Besitzer sieht sie (RLS wie „Arbeit“, Bilder bleiben auf
  dem Gerät), nie auf der Kachel, im Push oder als ungelesen; ohne private
  Zettel und im Haushalt „allein“ keine Linie; einklappbar, pro Gerät
  gemerkt (Standard auf, zu ohne Anzahl). Wörter in `woerter.ts`.
  → `docs/bereiche/pinnwand.md`

## Wo im Code

- Regeln der Tür (rein): `src/lib/pinnwand/tuer.ts` – `archivedSince`,
  `isArchived`/`onDoor` (Erledigt 1 s stehen + 0,8 s gleiten = `ABHAK_MS`
  aus `core/abhaken.ts` – `STEHEN_MS`/`GLEITEN_MS`, dieselben wie beim
  Einkauf –, dann Archiv; sonst
  7 Tage; „Bleibt hängen“ nie von selbst), `isForgotten` (30 Tage im Archiv =
  `VERGESSEN_MS`), `leavesIn`/`GLEIT_MS` (wann er hinausgleitet), `doneValue`/`doneLine` („erledigt von Lisa“), `personFarbe`/
  `farbeOf`/`zettelTon` (5 Töne), `tiltOf` (−3° bis +3°, fest aus der ID),
  `magnetOf`, `faecherOf`/`FAECHER`/`FAECHER_WINKEL` (Kachel), `twoColumns`/
  `guessHeight` (Masonry), `looksLikeNote` (Mia-Frage), `papierFor`
  (Karoblatt für Kinder).
- Zettel (rein): `src/lib/pinnwand/model.ts` (`createPin` mit Farbe, Papier,
  Bleibt hängen, Foto; `sanitizePin`, `visiblePins` = an der Tür, `activePins` =
  an der Tür und nicht erledigt, `archivedPins`, `forgetPins` (30 Tage), `updatePin`, `addPin`,
  `removePin`, `toggleReaction`, `setPinPinned`, `markPinsRead`,
  `hasUnread`, `pinMeta`, `pinWriteCommand`, `pinStays`, `isPinboardQuery`).
- Wörter (rein): `src/lib/pinnwand/woerter.ts` (`AUFHAENGEN`, `HAENGT`,
  `BLEIBT_HAENGEN`, `BLEIBT_HAENGEN_HINWEIS`, `NICHT_MEHR_FESTHALTEN`,
  `PINNWAND_TIPP`; Tafel 123: `OBEN`, `NACH_OBEN`, `NUR_FUER_MICH`,
  `FUER_ALLE`, `NUR_FUER_MICH_ZEILE`, `VERSCHIEBEN_HINWEIS`).
- Ordnen (rein): `src/lib/pinnwand/ordnen.ts` (`doorOrder`/`doorOrderBy`
  über `core/sort`, `sortForMove` – nur der gezogene Zettel bekommt einen
  Platz zwischen den Nachbarn, `sortForTop` = „Nach oben“, `moveInList`
  (Vorschau beim Ziehen), `wandBereiche` (für alle / „Nur für mich“, allein
  ohne Linie), `wandBlocks` (zwei Spalten, groß quer), `GROESSEN`,
  `zettelTitel` (Fenster-Titel in „…“, nur zwischen Wörtern gekürzt)).
- Ansicht pro Gerät: `src/lib/pinnwand/ansicht.ts`
  (`wasgibts.pinnwandansicht` v1: Ecke „Nur für mich“ zugeklappt).
- Sprachnachrichten (rein): `src/lib/pinnwand/memo.ts` (gleiche Tür-Regeln:
  `memoAlive`, `visibleMemos`, `activeMemos`, `archivedMemos`, `forgetMemos`,
  `updateMemo`).
- Fotos: `src/lib/pinnwand/foto.ts` (rein: `fitFoto` 1600 px, `fotoPath`,
  `uploadPendingFotos`), `fotoStore.ts` (IndexedDB `wasgibts-fotos`, Tabelle
  „bilder“, gleiche Technik wie der Ton), verkleinert wird im Browser
  (`components/pinnwand/fotoVerkleinern.ts`, JPEG 0,82).
- Brücke zu Notizen: `src/lib/pinnwand/notizBruecke.ts` (`noteOfPin`,
  `archivePin`, `noteQuestionFor`, `markNoteAsked`, `NOTIZ_FRAGE`).
- Beispiel-Tag: `src/lib/pinnwand/beispiel.ts` (`demoBoard`).
- Speicher: `store.ts` (`changePins`, `changeMemos`, `usePins`, `useMemos`,
  `forgetOldArchive` – beim Start über `tidyPinboard`),
  Migration rein in `migration.ts` (`migratePinStore`, auch für den Abgleich).
- Oberfläche `src/components/pinnwand/`: `PinboardView.tsx` (Tür, Archiv,
  Mia-Frage, Ecke „Nur für mich“), `Wand.tsx` (Spalten und große Zettel),
  `useWandGesten.ts` (lange drücken, ziehen, Nachrutschen), `ZettelFenster.tsx`
  (Tafel 123 C), `FotoFenster.tsx` (Foto groß), `Zettel.tsx` (ein Zettel je Papier), `Magnet.tsx` (eigene
  SVGs), `NeuerZettel.tsx` (Sheet), `ReactionMenu.tsx` (Menü), `Faecher.tsx`
  + `PinboardTile.tsx` (Kachel), `boardActions.ts`, `useBoard.ts`,
  `MemoRow.tsx` (`PlayButton`), `MemoParts.tsx`, `useMemoRecorder.ts`.
- CSS: `.kuehlschrank`, `.zettel`, `.zettel-karo`, `.zettel-bon`,
  `.zettel-leer` in `globals.css`; Tokens `--app-fridge-*` (Tür, Griff, Pin,
  Papier, Karo, Schrift, Schatten) und `--app-zettel-<0..4>` /
  `-<n>-mag` / `--app-zettel-mia` – hell, dunkel (Edelstahl) und
  „Automatisch“.

## Daten und Speicher

- `wasgibts.pinnwand` v5 `{version: 5, messages, memos}`. v4 → v5 (Tafel
  123): `groesse` „klein“, `sort` null (= nach der Zeit, also genau die
  bisherige Reihenfolge), `privat` false (Memos: `groesse`, `sort`). v1 → v2 (Memos),
  v2 → v3 (Reaktionen Person → Emoji, Antworten), v3 → v4 (Kühlschranktür):
  jeder Zettel bekommt `farbe: null` (= Farbe der Person), `papier`,
  `foto: null`, `erledigt: null`, `archiv: null`, `notizFrage: false`;
  Memos `farbe`, `erledigt`, `archiv`. Nichts geht verloren; Speichern
  räumt nichts weg. A-024 ändert das Format nicht: 30 Tage im Archiv
  entfernt `forgetOldArchive` beim Start (der Abgleich macht daraus eine
  Lösch-Markierung), alte Sicherungen laden unverändert.
- Zettel (typ „pinnwand“, Raum immer Familie): `text` (bis 140, beim Foto
  darf er leer sein), `author`, `reactions`, `replyTo`, `readBy`, `pinned`,
  `farbe` (0–4 oder null), `papier` („zettel“ | „karo“ | „foto“), `foto`
  (`{path, w, h}`, `path` = Bucket-Pfad oder null = nur auf dem Gerät),
  `erledigt` (`{von, am}`), `archiv` (Zeitpunkt, z. B. nach „In Notizen“),
  `notizFrage`.
- Farbe = Person: Reihenfolge im Haushalt (Person 1 Gelb, 2 Rosa, 3 Grün,
  4 Blau, 5 Lila), sonst aus dem Namen; beim Schreiben wählbar, dann am
  Zettel gespeichert. Mias Orange gibt es nur im Beispiel.
- Ton in IndexedDB `wasgibts-memos`, Bilder in `wasgibts-fotos` – beide nicht
  in „Daten sichern“ (Fotos aus einer Sicherung zeigen einen leisen
  Platzhalter). Mit Konto liegen Ton und Bilder zusätzlich im Haushalt
  (Buckets „memos“ und „fotos“, RLS nur für Mitglieder, siehe `konten.md`).
  Verwaistes (gelöscht, von Hand oder nach 30 Tagen im Archiv) räumt der
  Start auf dem Gerät und der Server-Cron weg – der Server nie nach Alter,
  nur über die Lösch-Markierung.

## So verhält es sich

### Die Tür (Tafel 106/1)
- Kopf „‹ Heute“, rechts das orange Seiten-Plus (= „Neuer Zettel“), großer
  Titel. Darunter die Tür: heller Verlauf, feiner Rand, Griff rechts als
  schmale Leiste (dunkel: Edelstahl).
- Zettel in zwei Spalten (`twoColumns`: das Erste oben links, dann in die
  kürzere Spalte), fest leicht schief, weicher Schatten, Ecke unten rechts
  gerundet. „Bleibt hängen“ steht oben links und hängt am roten Pin, Zeile
  „Lisa · bleibt hängen“. Die Tür ist so hoch wie ihr Inhalt (Tafel 123: keine
  Mindesthöhe, kein innerer Scrollbereich); der Griff ist ein kurzer, kräftiger
  Bügel (sah als schmale Leiste wie ein Scrollbalken aus).
- Papiere: Haftnotiz in Personenfarbe (Magnet Punkt), Karoblatt für
  Kinder-Profile (Stern), Polaroid für Fotos (weißer Rahmen, Bild, Zeile
  darunter; Apfel), Kassenbon für Sprachnachrichten (gezackte Oberkante,
  „SPRACHNACHRICHT“, ▶, Tonwelle in Personenfarbe, Dauer; Herz). Unten
  Avatar-Kreis mit Initiale, Name, Zeit – nie abgeschnitten, lieber
  zweizeilig (rechts Platz für den Haken-Kreis).
- Haken-Kreis unten rechts = Erledigt, wie Aufgaben und Einkauf (A-024,
  v0.145): Häkchen orange (`bg-accent`, kurzes „check-pop“), „erledigt von
  Lisa“, Zettel weder blass noch durchgestrichen. 1 s stehen – nochmal
  tippen nimmt es still zurück –, dann gleitet er 0,8 s weich von der Tür
  ins Archiv (`cubic-bezier(.16,1,.3,1)`, nur transform/opacity, reduziert
  nur Überblenden; `useGehtIn` in `Zettel.tsx`, `useBoard` rechnet genau
  dann neu). Liegt er im Archiv, kommt der Toast „Erledigt · Rückgängig“
  (5 s, nur wenn er noch so abgehakt ist); Rückgängig holt ihn zurück an
  die Tür. Erledigte zählen nie als ungelesen, Mia liest sie
  nicht vor.
- Tafel 123 (A-028 Teil 1): Foto-Zettel als Polaroid in Zettelgröße (halbe
  Breite, quadratischer Ausschnitt, `object-fit: cover`, Zeile darunter
  freiwillig); antippen = Foto groß im Fenster (`FotoFenster`: ganzes Bild,
  Text, wer/wann, „Erledigt“, „Mehr“ = Menü). „Bleibt hängen“ zeigt rechts
  oben „OBEN“ (klein, Großbuchstaben, Zettelfarbe dunkel; `OBEN` in
  `woerter.ts`), der Text hat rechts Platz – nicht mehr „· bleibt hängen“ in
  der Meta-Zeile. Meta-Zeile EINE Zeile (`MetaZeile`): Zeit zuerst im DOM,
  rückwärts umbrechend – passt der Name nicht, bleibt nur die Zeit; heute die
  Uhrzeit, die letzten sechs Tage der Wochentag („Lisa · Mo“, `pinMetaParts`
  mit `kurz`), sonst das Datum. Nie mitten im Wort mit „…“.
- Teil 2: lange drücken = Fenster „Größe und Platz“ (auch im Menü als
  Zeile, für VoiceOver), halten und ziehen = verschieben (siehe Feste
  Regeln); im Archiv öffnet lange drücken weiter das Menü.
- Antippen (im Archiv auch lange drücken) = Menü: Reaktionen
  👍 ❤️ 😂 😮 🙏, „Erledigt“, „Antworten“ (neuer Zettel mit Bezug „↪ Lisa“),
  „In Notizen“ (Text wird eigene Notiz, Zettel ins Archiv, Rückgängig nimmt
  beides zurück), „Bleibt hängen“ bzw. „Nicht mehr festhalten“, „Löschen“
  (nur eigene, sofort ganz weg, „Gelöscht · Rückgängig“); bei der eigenen
  Sprachnachricht „Gehört von“. Keine
  Wisch-Gesten mehr an den Zetteln (Wischen wechselt die Seite).
- Unter der Tür „Ältere · n ›“: das Archiv in einem Fenster, gleiche Zettel
  (Menü ohne Erledigt/Bleibt hängen; „Löschen“ = sofort ganz weg mit
  Rückgängig). Nach 30 Tagen im Archiv still gelöscht.
- Mia fragt EINMAL je eigenem Zettel, wenn er nach Notiz aussieht (Liste mit
  3+ Zeilen, Passwort/PIN/WLAN, Telefonnummer, Adresse): „Klingt nach
  Notiz. Soll ich’s bei deinen Notizen ablegen?“ [Ja] [Bleibt hier].
- Aus der Kachel geöffnet (`?n=<id>`) springt die Seite zum Zettel und hebt
  ihn kurz hervor. Öffnen der Seite gilt als gelesen.
- Seiten-Tipp und leere Tür: „Kurze Zettel für alle. Abhaken räumt auf,
  ‚Bleibt hängen‘ bleibt.“

### Neuer Zettel (Tafel 106/3)
- Ein Fenster: oben die Vorschau als echter Zettel (Personenfarbe, Magnet),
  der Text wird direkt darauf geschrieben (mehrzeilig, Return = neue Zeile,
  Tastatur sofort). Darunter die Art „Zettel / Sprachnachricht / Foto“
  (Umschalter im App-Stil – auf der Tafel schwarz, das ist nach Leitbild
  verboten), „Farbe“ mit 5 Kreisen (eigene vorgewählt), der Schalter „Bleibt
  hängen“ (lucide Pin, darunter leise „Verschwindet nicht von selbst, z. B.
  fürs WLAN.“; an = roter Pin in der Vorschau) und der große Knopf
  „Aufhängen“ → „Hängt. · Rückgängig“.
- Foto: Kamera oder Galerie, vor dem Speichern verkleinert, Zeile darunter
  freiwillig. Sprachnachricht: Mikro antippen (oder halten), ➤ sendet, das
  Fenster schließt. Beim Halten bleibt das Mikro unter dem Finger stehen
  (`holdsMic`), bis losgelassen (= senden) oder hochgeschoben wird.
- Der „Für alle“-Knopf der Tafel fehlt bewusst: an der Pinnwand ist jeder
  Zettel für alle im Haushalt.

### Kachel (Tafel 107, Variante 1 „Fächer“)
- Bleibt rosa (`--app-tile-pinnwand`), Kopf „PINNWAND“ + ＋ (= „Neuer
  Zettel“); Look „Schlicht“: Kachel weiß, die Zettel behalten ihre Farbe.
- S (156 px, so hoch wie das Wetter): die drei neuesten
  Zettel aufgefächert (−10°, −2°, +7°), der neueste vorn gut lesbar (bis 3
  Zeilen), darunter klein der Name; Sprachnachricht als „▶ 0:12“, Foto als
  Mini-Polaroid. „Bleibt hängen“ zählt nur, wenn weniger als 3 neue da
  sind. Gerade Abgehaktes (Seite, Mia, Familie) steht wie an der Tür 1 s
  mit orangem Häkchen und gleitet dann weich weg, der nächste rückt nach.
  M: drei nebeneinander. L: bis 6 im Raster.
- Leer (Variante 4): gestrichelter Zettel mit Magnet und ＋, darunter
  „Erster Zettel?“ und „Oder 🎙 Sprachnachricht“ (lucide Mikro: nimmt gleich
  auf – EINE Aufnahme-Leiste, gesendet nur über ➤).
- Tipp auf einen Zettel = Pinnwand mit diesem Zettel hervorgehoben.
  Im Fächer (S) liegen die Zettel übereinander: der ganze Fächer ist EIN
  Link (`faecherLabel`, vorderster zuerst), der Zettel unter dem Finger
  bestimmt das Ziel (`faecherZiel`) – verdeckte Zettel sind keine Knöpfe.

### Baustein
- Pinnwand ist ein Baustein (`features.ts`, „Mehr Funktionen“): bei „Nur für
  mich“ aus (Kachel und Baustein), bei „Für uns zwei“/„Für die Familie“ an.
  Wer sie vor dem Update hatte, behält sie (Bausteine v6). Schreibt Mia an
  die Pinnwand, schaltet sie sie frei.

### Beispiel-Tag
- Kachel und Seite zeigen vorne Mias orangen Zettel „Moin! Hier hängen eure
  Zettel.“, dahinter „Ole: Gummistiefel!“ (grün) und eine
  Beispiel-Sprachnachricht (rosa, 0:08), klein „Beispiel“. Nichts davon in
  echten Speichern, Push, KI oder Sicherung; der erste echte Zettel ersetzt
  das Beispiel (`clearDemoTile("pinnwand")`).

### Sprachnachrichten (Memos)
- Aufnahme, Mikrofon, Abspielen wie bisher (`useMemoRecorder`,
  `recorderState.ts`, `core/mic`, `memoPlayer.ts`): antippen = frei sprechen,
  halten = loslassen sendet, höchstens 60 s, Wake Lock, Zurück fragt,
  Mikro-Protokoll. Kein KI-Anteil, keine Abschrift, nie an ElevenLabs.
- An der Tür als Kassenbon; abgehakt wie Zettel (1 s Häkchen, dann weich ins Archiv), sonst nach 7
  Tagen – der Ton bleibt dabei, bis sie nach 30 Tagen im Archiv gelöscht
  werden.

### Jetzt-Karte und Push
- Neueste ungelesene, nicht erledigte Nachricht bzw. ungehörtes Memo wird
  ein Thema (nie ein Inhalt). Push nennt nie den Text.

## Begleitung (Mia)

- `pinnwand_schreiben` (Op `add_pin`): „Schreib an die Pinnwand …“ → Zettel
  in der eigenen Farbe; die Beschreibung trennt Pinnwand (für die anderen)
  und Notiz (für mich). `bleibt_haengen` (Op `pinned`) = „Bleibt hängen“
  („Häng dauerhaft an die Pinnwand: …“, ohne KI `pinStays`).
- „Nur für mich“ (Tafel 123): `nur_fuer_mich` (Op `add_pin` mit `privat`),
  „Häng nur für mich an die Pinnwand: …“ (ohne KI `pinPrivate`), Bestätigung
  „Hängt, sieht nur du.“; „Mach den Zettel mit dem Geschenk für alle
  sichtbar“ → `app_befehl` → lokale Regel (`pinForAllCommand`, `pinToShare`;
  ohne Treffer fragt Mia nach). Im Kontext steht „(nur für mich)“ dahinter.
- Kontext „Pinnwand: …“ enthält nur nicht erledigte Zettel an der Tür (Fotos
  als „[Foto]“, Memos als „[Sprachnachricht 0:12]“) – „Was steht auf der
  Pinnwand?“ liest also nur nicht Erledigtes vor (mit und ohne KI).
- Ohne KI (`localRules.ts`): `pinWriteCommand`, `isPinboardQuery`,
  `memoPlayRule`. Prüfstand-Sätze „Häng an die Pinnwand: …“, „Häng dauerhaft
  an die Pinnwand: …“, „Was steht auf der Pinnwand?“, „Merk dir für mich die
  PIN …“ (= Notiz). Bestätigung „Hängt an der Pinnwand.“

## Tests

- `tests/pinnwand/abhaken.test.ts` (v0.145: 1 s stehen, nochmal tippen =
  zurück ohne Toast, nach 1,8 s im Archiv, dann „Erledigt · Rückgängig“,
  Archiv 30 Tage, Kachel gleich, Häkchen orange, nie durchgestrichen,
  gleiche Zeiten wie der Einkauf).
- `tests/pinnwand/ordnen.test.ts` (A-028 Teil 2: alte Reihenfolge bleibt,
  Ziehen ändert nur den gezogenen Zettel, „Bleibt hängen“ bleibt vorn, „Nach
  oben“, nach Neuladen und im Abgleich gleich, klein/groß, Fenster-Titel,
  Ecke mit/ohne Linie, allein ohne Linie, einklappbar und gemerkt,
  Kachel/Push/ungelesen ohne private, neue ID beim Privatmachen, Bilder
  privater Zettel nie hochgeladen, Mia-Sätze), `nurFuerMichTeilen.test.ts`
  (zwei Konten: Platz/Größe kommen an, private nie, auch nicht nachträglich
  privat gemachte; Partner kann nichts privat machen),
  `tests/datenbank/sicherheit.test.sql` Abschnitt 5 (RLS).

- `tests/pinnwand/aufgeraeumt.test.ts` (A-028 Teil 1: Polaroid quadratisch,
  Foto groß im Fenster, Wand ohne Mindesthöhe, OBEN, Meta-Zeile kurz).
- `tests/pinnwand/nachtrag.test.ts` (A-024: Abhaken → nach 1,8 s im Archiv,
  Rückgängig holt zurück, Archiv nach 30 Tagen leer, „Bleibt hängen“ nie im
  Archiv, Fächer wie die Tür, Wörter überall gleich, Tür wächst mit,
  Name · Zeit nie abgeschnitten).
- `tests/pinnwand/kuehlschrank.test.ts` (kein Verschwinden nach 24 Std.,
  Erledigt → Häkchen → Archiv, 7 Tage, Bleibt hängen, Personenfarben, Tokens hell/
  dunkel, Papiere, Schiefe, Spalten, In Notizen, Mia-Frage einmal, Fächer
  1/2/3+/leer, M/L, Schlicht, Beispiel, allein = aus, Migration v3 → v4).
- `tests/pinnwand/fotos.test.ts` (verkleinern, Pfad = DB-Regel, Hochladen,
  geteilt erst mit Bild, nicht in der Sicherung),
  `tests/datenbank/fotos.test.sql` (RLS Bucket „fotos“).
- `tests/pinnwand/senden.test.ts` (Neuer Zettel), `gesten.test.ts`,
  `aufnahmeleiste.test.ts`, `pinnwand.test.ts`, `memos.test.ts`,
  `pinnwandHooks.test.ts`, `tests/konten/memosTeilen.test.ts` (Aufräumen
  nur ohne Eintrag).
- Durchklick: `e2e/ablaeufe/pinnwandgesten.mjs` (auch „Bleibt hängen“,
  „Hängt.“, Abhaken: Häkchen orange, nicht durchgestrichen, nochmal tippen =
  zurück, sonst ins Archiv, Rückgängig), `alltag.mjs` (`pinnwand`),
  `notizen.mjs` (Return, Notiz-Frage), `sprachnachricht.mjs`
  (`aufnahmeLeiste` in der leeren Kachel, Aufnahme über „Neuer Zettel“),
  `vorfuehren.mjs` (`memoAntippen`), `start.mjs` (Beispiel im Fächer).
