# Notizen

Kurz: Notizen sind nur zum Festhalten – kein Termin, keine Aufgabe. Eine
Notiz ist Text (mit Absätzen) oder Liste. Jede Schnellnotiz wird eine eigene
Notiz; die erste Zeile ist der Titel.

**Launch 1.0 (seit v0.110.0):** Notizen gehören zu 1.0. Der Baustein ist
standardmäßig an (`DEFAULT_ON` in `core/features.ts`, Speicher v4 schaltet
ihn beim Update einmal ein, danach selbst abschaltbar), die Kachel steht für
alle auf der Startseite (Startseite v5 setzt sie einmal ans Ende der
sichtbaren). Mia legt mit „Schreib dir auf …“ / „Notiz: …“ Notizen an;
ist der Baustein aus, schaltet ihn das Anlegen wieder ein und Mia sagt, wo
die Kachel steht.

**Notizen neu (v0.112.0, Tafel 93):** Schnellfeld oben, Karten in 2 Spalten,
Bearbeiten im Vollbild mit Werkzeugleiste, Autosave. Die alte
Sammel-Schnellnotiz wird in einzelne Notizen geteilt.

## Wo im Code

- Modell (rein): `src/lib/notizen/model.ts` (`createNote`, `noteFromText`,
  `plainTitle`, `upsertNote`, `removeNote`, `setPinned`, `addListItems`,
  `findNote`, `sortNotes`, `notePreview`, `sanitizeNote`, `noteEmoji`,
  `leisureIdea`, `splitSchnellnotiz`, `migrateNotes`; Bearbeiten:
  `isEmptyNote`, `persistNote`, `toggleList`, `itemEnter`, `noteShareText`).
- Autosave: `src/lib/notizen/autosave.ts` (`createAutosave`: gebündelt nach
  400 ms, `flush` beim Schließen).
- Speicher: `src/lib/notizen/store.ts` (`loadNotes`, `changeNotes`,
  `replaceNotes`, `useNotes`, `persistNotes`).
- Schnellnotiz: `src/lib/notizen/schnellnotiz.ts` (`adoptSchnellnotiz`,
  `kladdeNotes`, `schnellnotizCommand`).
- Sprache ohne KI: `src/lib/notizen/chat.ts` (`parseNoteCommand`,
  `noteAnswer`, `noteFor`).
- Oberfläche `src/components/notizen/`: `NotesView.tsx` (/notizen),
  `NoteEditor.tsx` (/notizen/bearbeiten, Vollbild), `Schnellnotiz.tsx`
  (`QuickNoteCard`, `shortClock`). Mehrzeilen-Feld: `ui/MehrzeilenFeld.tsx`.
- Kachel: `NotesTile` in `src/components/heute/HomeTiles.tsx`, Zeilen aus
  `src/lib/heute/notizenKachel.ts`.

## Daten und Speicher

- `wasgibts.notizen` v2 `{version: 2, notes}` – Einträge mit `typ: "notiz"`
  im einheitlichen Modell. Beim Laden prüft `sanitizeNote` jede Notiz. In der
  Sicherung und im Abgleich (Übersetzer v2, `upgrade` hebt v1 an).
- v1 → v2 (`migrateNotes`): die alte Sammel-Schnellnotiz (`schnell: true`,
  eine Zeile je Gedanke) wird zu einzelnen Notizen, eine je Zeile (Titel =
  Zeile, zu lange Zeilen bleiben ganz im Text). Ids hängen am Inhalt
  (`<alte id>-<Prüfsumme der Zeile>`), damit zwei Geräte dieselben Notizen
  erzeugen; die Reihenfolge bleibt. Das Teilen passiert bei jedem Laden
  (auch bei alten Sicherungen und Daten älterer Geräte); `persistNotes` beim
  Start speichert es, damit der Abgleich es sieht. Nichts geht verloren.
- `NotizData`: `title` (bis 80, ohne Emojis), `emoji?` (nur noch Daten, wird
  nicht angezeigt), `kind` (text/liste), `text?` (bis 4000, auch unter einer
  Liste), `items?` (bis 200 Einträge à 200 Zeichen, `done?`), `pinned`,
  `freizeit?` (nur Listen), `schnell?` (nur noch beim Lesen alter Stände).
- `wasgibts.kladde` v1 – alter gelber Zettel bis v0.31. `adoptSchnellnotiz()`
  (beim Start in `KitchenHelper`) macht daraus einmal eine Notiz je Zeile und
  leert den alten Speicher.

## So verhält es sich

### Notizen
- Text mit Absätzen ODER Liste. Listen-Einträge sind abhakbar. Hängt man
  Einträge an eine Text-Notiz, wird sie zur Liste; der Text bleibt erster
  Eintrag (`addListItems`, doppelte werden übergangen).
- Raum Familie oder Arbeit (Wahl nur, wenn es Arbeit gibt). Ohne Angabe Familie.
- Sortierung: angeheftet zuerst, dann zuletzt geändert (`NOTES` in
  `src/lib/core/sort.ts`).
- Freizeit-Liste („Als Freizeit markieren“ unter einer Liste): Im Feierabend
  kommt daraus eine Idee für die Jetzt-Karte, stabil über den Tag (`leisureIdea`).

### Seite /notizen
- Oben das Schnellfeld (`QuickNoteCard`, `MehrzeilenFeld`): wächst bis 6
  Zeilen, Return = neue Zeile, darunter leise „Return = neue Zeile“; „Sichern“
  erscheint, sobald Text drin ist. Jede Schnellnotiz wird eine eigene Notiz
  (`noteFromText`: erste Zeile = Titel, der Rest = Text).
- Filter Alle · Familie · Arbeit (nur mit Arbeit), Abschnitte „Angeheftet“
  und „Zuletzt“: weiße Karten in 2 Spalten, fetter Titel, 3–4 Zeilen Vorschau
  (`whitespace-pre-line`), Listen mit Häkchen, unten Farbpunkt Familie
  (Orange) / Arbeit (Blau) + Datum. Keine Emojis im Titel, keine Zähler.
- Leer: „Hier landet, was du dir merken willst. Sag einfach: ‚Merk dir …‘“
- Seiten-Plus öffnet direkt eine neue leere Notiz im Bearbeiten
  (`/notizen/bearbeiten?neu=text`) – Ausnahme von „jedes ＋ = Schnelleingabe“.

### Notiz bearbeiten (Vollbild)
- Oben „‹ Notizen“ links und „Fertig“ rechts, darunter großer Titel (30/800)
  und Text mit Absätzen (`MehrzeilenFeld voll`). Kein Mia-Knopf
  (`knopfVersteckt`), unten sitzt die Werkzeugleiste.
- Listen: Return = neuer Eintrag darunter, leerer Eintrag + Return beendet die
  Liste (weiter im Text darunter, `itemEnter`), Löschtaste im leeren Eintrag
  nimmt ihn weg; „＋ Eintrag“ am Ende.
- Werkzeugleiste über der Tastatur (`useKeyboardInset`): Liste (Text ↔ Liste,
  `toggleList`) · Anheften · Familie/Arbeit (nur mit Arbeit) · Teilen
  (Teilen-Menü, sonst kopieren; `noteShareText` behält Absätze) · Löschen
  („Gelöscht · Rückgängig“).
- Sichert von selbst (`createAutosave`, 400 ms) und sofort beim Verlassen;
  „Fertig“ schließt nur. Eine leere Notiz fällt beim Schließen weg
  (`persistNote`); ohne Titel nimmt sie die erste Textzeile.

### Notizen-Kachel
- XS = neueste bzw. angeheftete Notiz, S und M = bis 3 Zeilen
  „Titel · Anfang“; Listen als „1 von 3 erledigt“. Antippen der Kachel
  öffnet immer die Notizen-Seite (A-059), der Stift die
  Schnelleingabe „Neue Notiz“ (mehrzeilig, erste Zeile = Titel). Leer:
  „Schnell notieren …“ in Grau. Die neueste Notiz steht in bis zu 2 Zeilen,
  die zweite läuft weich aus statt mit „…“ (A-060, Tafel 144; Einzelheiten
  in `heute.md`).

## Begleitung (Mia)

- Werkzeuge in `src/lib/begleitung/noteTools.ts`: `notiz_anlegen` (jede
  Notiz eigen, bei mehreren Zeilen die erste als Titel, kein Emoji im Titel),
  `notiz_aendern`, `notiz_loeschen`, `liste_eintrag_hinzufuegen`,
  `notiz_anheften`, `notizen_anzeigen`. Ops `upsert_note`, `remove_note`.
  `schnellnotiz_schreiben`/`schnellnotiz_aufraeumen` und `set_schnellnotiz`
  gibt es seit v0.112 nicht mehr; „Schreib in die Schnellnotiz/Kladde …“ ist
  jetzt `notiz_anlegen`.
- Ohne KI (`src/components/begleitung/localRules.ts`):
  - `schnellnotizCommand`: „Schreib in die Schnellnotiz/Kladde: …“, „Notier
    mir schnell …“ → eigene Notiz, „Steht in den Notizen.“ mit Rückgängig.
  - `parseNoteCommand`: „Merk dir …“, „Schreib auf …“ (mehrzeilig: erste
    Zeile = Titel), „Setz Laufrad auf die Geschenkideen“ (Eintrag an die Liste,
    nie die Einkaufsliste), „Idee fürs Café: …“ (Liste „Ideen Café“), „Mathis
    wünscht sich …“ (Liste „Geschenkideen“, nicht bei Essen), „Was steht auf
    der Packliste?“, „Häng das WLAN oben an“, „Zeig mir meine Notizen“.
- Prüfstand: „Schreib auf: …“, „Schreib in die Schnellnotiz: …“, „Setz
  Laufrad auf die Geschenkideen“ (148 Sätze).

## Tests

- `tests/notizen/notizenNeu.test.ts` (eigene Notiz aus Text, Migration der
  Sammel-Schnellnotiz samt Sicherung und Abgleich, Autosave, Leeres fällt weg,
  Listen, Teilen, Mehrzeilen-Feld, Pinnwand-Absätze, Mia).
- `tests/notizen/notizen.test.ts` (Modell, Gespräch ohne KI, Schnellnotiz,
  Speicher), `tests/heute/raster.test.ts` (Kachel XS/S/M).
- `tests/begleitung/werkzeugeNotizen.test.ts`, `tests/core/sortierung.test.ts`
  („Notizen, Pinnwand, Tipps“).
- Durchklick `e2e/ablaeufe/notizen.mjs`: Schnellfeld (Return = neue Zeile,
  Sichern), Vollbild mit Werkzeugleiste, Liste, leere Notiz fällt weg,
  Pinnwand mit Zeilen.
