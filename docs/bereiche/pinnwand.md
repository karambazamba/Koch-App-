# Pinnwand

Kurz: Die Kühlschranktür (Tafel 106/107, Vorlagen in `docs/tafeln/`). Zettel,
Fotos und Sprachnachrichten FÜR DIE ANDEREN im Haushalt; Notizen sind für
mich. Klar unterscheidbar von Notizen (die bleiben weiß und schlicht).
Nichts verschwindet ungefragt: ein Zettel bleibt, bis jemand „Erledigt“
tippt, oder bis er 7 Tage alt ist – dann liegt er leise im Archiv „Ältere“.
Gelöscht wird nur von Hand. Die frühere 24-Stunden-Regel ist weg.

## Feste Regeln (aus CLAUDE.md)

- **Pinnwand (Kühlschranktür, Tafel 106/107):** Zettel und Sprachnachrichten
  FÜR DIE ANDEREN (geteilt im Haushalt); Notizen = für mich. Nichts
  verschwindet ungefragt – keine 24-Std.-Regel: ein Zettel bleibt, bis jemand
  „Erledigt“ tippt (24 Std. blass + durchgestrichen, „erledigt von Lisa“,
  dann Archiv „Ältere“) oder bis er 7 Tage alt ist (leise ins Archiv);
  Angeheftete bleiben oben links; gelöscht wird nur von Hand (Rückgängig),
  Dateien gelöschter Zettel räumt der Server weg, nie nach Alter (`tuer.ts`).
  Optik: helle Tür mit Griff (dunkel: Edelstahl), zwei Spalten, fest leicht
  schief (−3° bis +3°), Magnete (Punkt Zettel, Stern Karoblatt, Apfel
  Polaroid, Herz Kassenbon; angeheftet roter Pin), Farbe = Person (5 Pastell
  `--app-zettel-<n>`, Tür `--app-fridge-*`). Papiere: Haftnotiz, Karoblatt
  (Kinder-Profile), Kassenbon (Sprachnachricht), Polaroid (Foto, verkleinert
  auf 1600 px, Bucket „fotos“ nur für den Haushalt). Antippen/lange drücken =
  Menü (Erledigt, Antworten, In Notizen, Anheften, Löschen nur eigene); Mia
  fragt EINMAL je Zettel „Klingt nach Notiz …“. Kachel = Fächer (S drei,
  M drei nebeneinander, L bis 6; leer gestrichelter Zettel). Seiten-Tipp:
  „Kurze Zettel für alle. Bleiben, bis jemand ‚Erledigt‘ tippt.“
  → `docs/bereiche/pinnwand.md`

## Wo im Code

- Regeln der Tür (rein): `src/lib/pinnwand/tuer.ts` – `isArchived`/`onDoor`
  (Erledigt 24 Std. blass, dann Archiv; sonst 7 Tage; Angeheftetes nie von
  selbst), `doneValue`/`doneLine` („erledigt von Lisa“), `personFarbe`/
  `farbeOf`/`zettelTon` (5 Töne), `tiltOf` (−3° bis +3°, fest aus der ID),
  `magnetOf`, `faecherOf`/`FAECHER`/`FAECHER_WINKEL` (Kachel), `twoColumns`/
  `guessHeight` (Masonry), `looksLikeNote` (Mia-Frage), `papierFor`
  (Karoblatt für Kinder).
- Zettel (rein): `src/lib/pinnwand/model.ts` (`createPin` mit Farbe, Papier,
  Anheften, Foto; `sanitizePin`, `visiblePins` = an der Tür, `activePins` =
  an der Tür und nicht erledigt, `archivedPins`, `updatePin`, `addPin`,
  `removePin`, `toggleReaction`, `setPinPinned`, `markPinsRead`,
  `hasUnread`, `pinMeta`, `pinWriteCommand`, `isPinboardQuery`).
- Sprachnachrichten (rein): `src/lib/pinnwand/memo.ts` (gleiche Tür-Regeln:
  `memoAlive`, `visibleMemos`, `activeMemos`, `archivedMemos`, `updateMemo`).
- Fotos: `src/lib/pinnwand/foto.ts` (rein: `fitFoto` 1600 px, `fotoPath`,
  `uploadPendingFotos`), `fotoStore.ts` (IndexedDB `wasgibts-fotos`, Tabelle
  „bilder“, gleiche Technik wie der Ton), verkleinert wird im Browser
  (`components/pinnwand/fotoVerkleinern.ts`, JPEG 0,82).
- Brücke zu Notizen: `src/lib/pinnwand/notizBruecke.ts` (`noteOfPin`,
  `archivePin`, `noteQuestionFor`, `markNoteAsked`, `NOTIZ_FRAGE`).
- Beispiel-Tag: `src/lib/pinnwand/beispiel.ts` (`demoBoard`).
- Speicher: `store.ts` (`changePins`, `changeMemos`, `usePins`, `useMemos`),
  Migration rein in `migration.ts` (`migratePinStore`, auch für den Abgleich).
- Oberfläche `src/components/pinnwand/`: `PinboardView.tsx` (Tür, Archiv,
  Mia-Frage), `Zettel.tsx` (ein Zettel je Papier), `Magnet.tsx` (eigene
  SVGs), `NeuerZettel.tsx` (Sheet), `ReactionMenu.tsx` (Menü), `Faecher.tsx`
  + `PinboardTile.tsx` (Kachel), `boardActions.ts`, `useBoard.ts`,
  `MemoRow.tsx` (`PlayButton`), `MemoParts.tsx`, `useMemoRecorder.ts`.
- CSS: `.kuehlschrank`, `.zettel`, `.zettel-karo`, `.zettel-bon`,
  `.zettel-leer` in `globals.css`; Tokens `--app-fridge-*` (Tür, Griff, Pin,
  Papier, Karo, Schrift, Schatten) und `--app-zettel-<0..4>` /
  `-<n>-mag` / `--app-zettel-mia` – hell, dunkel (Edelstahl) und
  „Automatisch“.

## Daten und Speicher

- `wasgibts.pinnwand` v4 `{version: 4, messages, memos}`. v1 → v2 (Memos),
  v2 → v3 (Reaktionen Person → Emoji, Antworten), v3 → v4 (Kühlschranktür):
  jeder Zettel bekommt `farbe: null` (= Farbe der Person), `papier`,
  `foto: null`, `erledigt: null`, `archiv: null`, `notizFrage: false`;
  Memos `farbe`, `erledigt`, `archiv`. Nichts geht verloren; Speichern
  räumt nichts mehr weg.
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
  Verwaistes (von Hand gelöscht) räumt der Start auf dem Gerät und der
  Server-Cron weg – nie nach Alter.

## So verhält es sich

### Die Tür (Tafel 106/1)
- Kopf „‹ Heute“, rechts das orange Seiten-Plus (= „Neuer Zettel“), großer
  Titel. Darunter die Tür: heller Verlauf, feiner Rand, Griff rechts als
  schmale Leiste (dunkel: Edelstahl).
- Zettel in zwei Spalten (`twoColumns`: das Erste oben links, dann in die
  kürzere Spalte), fest leicht schief, weicher Schatten, Ecke unten rechts
  gerundet. Angeheftete stehen oben links und hängen am roten Pin, Zeile
  „Lisa · angeheftet“.
- Papiere: Haftnotiz in Personenfarbe (Magnet Punkt), Karoblatt für
  Kinder-Profile (Stern), Polaroid für Fotos (weißer Rahmen, Bild, Zeile
  darunter; Apfel), Kassenbon für Sprachnachrichten (gezackte Oberkante,
  „SPRACHNACHRICHT“, ▶, Tonwelle in Personenfarbe, Dauer; Herz). Unten
  Avatar-Kreis mit Initiale, Name, Zeit.
- Haken-Kreis unten rechts = Erledigt: Zettel blass, Text durchgestrichen,
  „erledigt von Lisa“; nochmal tippen nimmt es zurück; nach 24 Std. ins
  Archiv. Erledigte zählen nie als ungelesen, Mia liest sie nicht vor.
- Antippen oder lange drücken (Android: „contextmenu“) = Menü: Reaktionen
  👍 ❤️ 😂 😮 🙏, „Erledigt“, „Antworten“ (neuer Zettel mit Bezug „↪ Lisa“),
  „In Notizen“ (Text wird eigene Notiz, Zettel ins Archiv, Rückgängig nimmt
  beides zurück), „Anheften“, „Löschen“ (nur eigene, „Gelöscht ·
  Rückgängig“); bei der eigenen Sprachnachricht „Gehört von“. Keine
  Wisch-Gesten mehr an den Zetteln (Wischen wechselt die Seite).
- Unter der Tür „Ältere · n ›“: das Archiv in einem Fenster, gleiche Zettel
  (Menü ohne Erledigt/Anheften).
- Mia fragt EINMAL je eigenem Zettel, wenn er nach Notiz aussieht (Liste mit
  3+ Zeilen, Passwort/PIN/WLAN, Telefonnummer, Adresse): „Klingt nach
  Notiz. Soll ich’s bei deinen Notizen ablegen?“ [Ja] [Bleibt hier].
- Aus der Kachel geöffnet (`?n=<id>`) springt die Seite zum Zettel und hebt
  ihn kurz hervor. Öffnen der Seite gilt als gelesen.
- Seiten-Tipp: „Kurze Zettel für alle. Bleiben, bis jemand ‚Erledigt‘ tippt.“

### Neuer Zettel (Tafel 106/3)
- Ein Fenster: oben die Vorschau als echter Zettel (Personenfarbe, Magnet),
  der Text wird direkt darauf geschrieben (mehrzeilig, Return = neue Zeile,
  Tastatur sofort). Darunter die Art „Zettel / Sprachnachricht / Foto“
  (Umschalter im App-Stil – auf der Tafel schwarz, das ist nach Leitbild
  verboten), „Farbe“ mit 5 Kreisen (eigene vorgewählt), „Anheften“ (lucide
  Pin) und der große Knopf „Anpinnen“ → „Angepinnt · Rückgängig“.
- Foto: Kamera oder Galerie, vor dem Speichern verkleinert, Zeile darunter
  freiwillig. Sprachnachricht: Mikro antippen (oder halten), ➤ sendet, das
  Fenster schließt.
- Der „Für alle“-Knopf der Tafel fehlt bewusst: an der Pinnwand ist jeder
  Zettel für alle im Haushalt.

### Kachel (Tafel 107, Variante 1 „Fächer“)
- Bleibt rosa (`--app-tile-pinnwand`), Kopf „PINNWAND“ + ＋ (= „Neuer
  Zettel“); Look „Schlicht“: Kachel weiß, die Zettel behalten ihre Farbe.
- S (156 px, so hoch wie das Wetter): die drei neuesten nicht erledigten
  Zettel aufgefächert (−10°, −2°, +7°), der neueste vorn gut lesbar (bis 3
  Zeilen), darunter klein der Name; Sprachnachricht als „▶ 0:12“, Foto als
  Mini-Polaroid. Angehefteter zählt nur, wenn weniger als 3 neue da sind.
  M: drei nebeneinander. L: bis 6 im Raster.
- Leer (Variante 4): gestrichelter Zettel mit Magnet und ＋, darunter
  „Erster Zettel?“ und „Oder 🎙 Sprachnachricht“ (lucide Mikro: nimmt gleich
  auf – EINE Aufnahme-Leiste, gesendet nur über ➤).
- Tipp auf einen Zettel = Pinnwand mit diesem Zettel hervorgehoben.

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
- An der Tür als Kassenbon; bleiben, bis angehört + Erledigt, sonst nach 7
  Tagen ins Archiv – der Ton bleibt dabei.

### Jetzt-Karte und Push
- Neueste ungelesene, nicht erledigte Nachricht bzw. ungehörtes Memo wird
  ein Thema (nie ein Inhalt). Push nennt nie den Text.

## Begleitung (Mia)

- `pinnwand_schreiben` (Op `add_pin`): „Schreib an die Pinnwand …“ → Zettel
  in der eigenen Farbe; die Beschreibung trennt Pinnwand (für die anderen)
  und Notiz (für mich).
- Kontext „Pinnwand: …“ enthält nur nicht erledigte Zettel an der Tür (Fotos
  als „[Foto]“, Memos als „[Sprachnachricht 0:12]“) – „Was steht auf der
  Pinnwand?“ liest also nur nicht Erledigtes vor (mit und ohne KI).
- Ohne KI (`localRules.ts`): `pinWriteCommand`, `isPinboardQuery`,
  `memoPlayRule`. Prüfstand-Sätze „Häng an die Pinnwand: …“, „Was steht auf
  der Pinnwand?“, „Merk dir für mich die PIN …“ (= Notiz).

## Tests

- `tests/pinnwand/kuehlschrank.test.ts` (kein Verschwinden nach 24 Std.,
  Erledigt → blass → Archiv, 7 Tage, Anheften, Personenfarben, Tokens hell/
  dunkel, Papiere, Schiefe, Spalten, In Notizen, Mia-Frage einmal, Fächer
  1/2/3+/leer, M/L, Schlicht, Beispiel, allein = aus, Migration v3 → v4).
- `tests/pinnwand/fotos.test.ts` (verkleinern, Pfad = DB-Regel, Hochladen,
  geteilt erst mit Bild, nicht in der Sicherung),
  `tests/datenbank/fotos.test.sql` (RLS Bucket „fotos“).
- `tests/pinnwand/senden.test.ts` (Neuer Zettel), `gesten.test.ts`,
  `aufnahmeleiste.test.ts`, `pinnwand.test.ts`, `memos.test.ts`,
  `pinnwandHooks.test.ts`, `tests/konten/memosTeilen.test.ts` (Aufräumen
  nur ohne Eintrag).
- Durchklick: `e2e/ablaeufe/pinnwandgesten.mjs`, `alltag.mjs` (`pinnwand`),
  `notizen.mjs` (Return, Notiz-Frage), `sprachnachricht.mjs`
  (`aufnahmeLeiste` in der leeren Kachel, Aufnahme über „Neuer Zettel“),
  `vorfuehren.mjs` (`memoAntippen`), `start.mjs` (Beispiel im Fächer).
