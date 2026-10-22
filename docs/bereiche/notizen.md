# Notizen

Kurz: Notizen sind nur zum Festhalten – kein Termin, keine Aufgabe. Eine
Notiz ist Text oder Liste. Die Schnellnotiz (früher „Kladde“) ist eine
angeheftete Text-Notiz für schnelle Gedanken.

## Wo im Code

- Modell (rein): `src/lib/notizen/model.ts` (`createNote`, `upsertNote`,
  `removeNote`, `setPinned`, `addListItems`, `findNote`, `sortNotes`,
  `notePreview`, `sanitizeNote`, `noteEmoji`, `leisureIdea`).
- Speicher: `src/lib/notizen/store.ts` (`loadNotes`, `changeNotes`,
  `replaceNotes`, `useNotes`).
- Schnellnotiz: `src/lib/notizen/schnellnotiz.ts` (`adoptSchnellnotiz`,
  `loadSchnellnotiz`, `saveSchnellnotiz`, `changeSchnellnotiz`,
  `useSchnellnotiz`, `appendLine`, `schnellnotizCommand`,
  `isSchnellnotizTidyRequest`, `tidySchnellnotiz`, `withoutLines`).
- Sprache ohne KI: `src/lib/notizen/chat.ts` (`parseNoteCommand`,
  `noteAnswer`, `noteFor`).
- Oberfläche `src/components/notizen/`: `NotesView.tsx` (/notizen),
  `NoteEditor.tsx` (/notizen/bearbeiten), `Schnellnotiz.tsx`
  (`QuickNoteCard`, `SchnellnotizSheet`, `SchnellnotizActions`).
- Kachel: `NotesTile` in `src/components/heute/HomeTiles.tsx`.

## Daten und Speicher

- `wasgibts.notizen` v1 `{version: 1, notes}` – Einträge mit `typ: "notiz"`
  im einheitlichen Modell. Beim Laden prüft `sanitizeNote` jede Notiz.
  In der Sicherung.
- `NotizData`: `title` (bis 80), `emoji?`, `kind` (text/liste), `text?` (bis
  4000, Schnellnotiz bis 20000), `items?` (bis 200 Einträge à 200 Zeichen,
  `done?`), `pinned`, `freizeit?` (nur Listen), `schnell?` (nur Text).
- `wasgibts.kladde` v1 – alter gelber Zettel bis v0.31. `adoptSchnellnotiz()`
  (beim Start in `KitchenHelper`) übernimmt seinen Text einmal in die
  angeheftete Notiz „Schnellnotiz“ (gibt es sie schon, wird angehängt) und
  leert den alten Speicher.

## So verhält es sich

### Notizen
- Text ODER Liste. Listen-Einträge sind abhakbar. Hängt man Einträge an eine
  Text-Notiz, wird sie zur Liste; der Text bleibt erster Eintrag
  (`addListItems`, doppelte werden übergangen).
- Ohne eigenes Emoji gibt es eines passend zum Titel (🎁 Geschenk, 🧳 Pack,
  🔑 WLAN/Passwort …), sonst 📋 für Listen und 📝 für Text.
- Raum Familie oder Arbeit (Wahl nur, wenn es Arbeit gibt). Ohne Angabe Familie.
- Sortierung: angeheftet zuerst, dann zuletzt geändert (`NOTES` in
  `src/lib/core/sort.ts`).
- Freizeit-Liste („Als Freizeit markieren“ im Editor): Im Feierabend kommt
  daraus eine Idee für die Jetzt-Karte, stabil über den Tag (`leisureIdea`).

### Seite /notizen
- Oben weiße Karte „Schnell was notieren …“ (`QuickNoteCard`): Enter hängt
  eine Zeile an die Schnellnotiz.
- Filter Alle · Familie · Arbeit, Abschnitt „Angeheftet“ mit Pin in voller
  Breite, darunter Kärtchen im 2er-Raster. Keine Zähler.
- Antippen öffnet den Editor (`/notizen/bearbeiten?id=…`, neu `?neu=text|liste`).
  Er speichert jede Änderung sofort: Titel, Text oder Liste, Raum, oben
  anheften, Freizeit, Löschen mit „Gelöscht · Rückgängig“.

### Schnellnotiz
- Eine angeheftete Text-Notiz „Schnellnotiz“ (📝, `schnell: true`). Sie wird
  bei Bedarf angelegt (`withText`).
- Von der Startseite über den Stift an der Notizen-Kachel als Fenster
  (`SchnellnotizSheet`). Dort und im Editor: „<Name>, räum auf“ und „Leeren“
  (Gelöscht · Rückgängig).
- Aufräumen ohne KI (`tidySchnellnotiz`): Zeilen mit Tag/Uhrzeit werden
  Termin bzw. Aufgabe, „Merk dir …“/„Idee: …“ wird Notiz, Zeilen mit
  Tätigkeitswort („Geschenkpapier kaufen“) werden Aufgabe ohne Tag. Übernommene
  Zeilen verschwinden aus der Schnellnotiz (`withoutLines`), der Rest bleibt.

### Notizen-Kachel
- Gelblich. S: zwei Zeilen der Schnellnotiz; M: drei Zeilen plus angeheftete
  Notizen als Chips (bis 6); L: dazu die drei neuesten anderen. Die
  Schnellnotiz erscheint nicht doppelt als Chip.
- Kachel-Label öffnet /notizen, der Stift die Schnellnotiz.

## Begleitung (Mia)

- Werkzeuge in `src/lib/begleitung/noteTools.ts`: `notiz_anlegen`,
  `notiz_aendern`, `notiz_loeschen`, `liste_eintrag_hinzufuegen`,
  `notiz_anheften`, `notizen_anzeigen`, `schnellnotiz_schreiben`,
  `schnellnotiz_aufraeumen`. Ops `upsert_note`, `remove_note`,
  `set_schnellnotiz` – immer als Vorschau mit „Übernehmen“.
- Die Begleitung versteht weiter „Kladde“.
- Ohne KI (`src/components/begleitung/localRules.ts`):
  - `schnellnotizCommand`: „Schreib in die Schnellnotiz/Kladde: …“, „Notier
    mir schnell …“ → Zeile anhängen, „Steht in der Schnellnotiz ✓“.
  - `isSchnellnotizTidyRequest`: „Räum meine Schnellnotiz auf“ → Vorschlag mit
    Knöpfen, danach Rückgängig.
  - `parseNoteCommand`: „Merk dir das WLAN-Passwort: …“, „Idee fürs Café: …“
    (Liste „Ideen Café“), „Mathis wünscht sich …“ (Liste „Geschenkideen“,
    nicht bei Essen), „Was steht auf der Packliste?“, „Häng das WLAN oben an“,
    „Zeig mir meine Notizen“, „Was muss ich heute noch erledigen?“.

## Tests

- `tests/notizen/notizen.test.ts` (Modell, Gespräch ohne KI, Schnellnotiz,
  Speicher), `tests/notizen/schnellnotiz.test.ts` (Übernahme der Kladde).
- `tests/begleitung/werkzeugeNotizen.test.ts`, `tests/core/sortierung.test.ts`
  („Notizen, Pinnwand, Tipps“).
- Kein eigener Durchklick-Ablauf in `e2e/ablaeufe/`.
