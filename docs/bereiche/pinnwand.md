# Pinnwand

Kurz: Der Zettel am Kühlschrank. Kurze Nachrichten und Sprachnachrichten
(Memos) an alle im Haushalt. Alles verschwindet nach spätestens 3 Tagen,
außer dauerhaft angeheftete Nachrichten.

## Wo im Code

- Nachrichten (rein): `src/lib/pinnwand/model.ts` (`createPin`, `sanitizePin`,
  `visiblePins`, `prunePins`, `addPin`, `removePin`, `toggleReaction`,
  `setPinPinned`, `markPinsRead`, `hasUnread`, `pinMeta`, `personTone`,
  `pinWriteCommand`, `isPinboardQuery`, `PIN_MAX`, `REACTIONS`).
- Memos (rein): `src/lib/pinnwand/memo.ts` (`createMemo`, `sanitizeMemo`,
  `memoAlive`, `visibleMemos`, `pruneMemos`, `setMemoHeard`,
  `toggleMemoReaction`, `memoUnheard`, `formatDauer`, `pickMemoMime`,
  `memoPlayRequest`, `memoToPlay`, `householdNames`).
- Speicher: `src/lib/pinnwand/store.ts` (`migratePinStore`, `changePins`,
  `changeMemos`, `usePins`, `useMemos`).
- Ton: `src/lib/pinnwand/memoAudio.ts` (`MemoAudioStore`, `memoAudio`,
  `tidyMemos`), Abspielen `memoPlayer.ts` (`playMemo`, nur eins gleichzeitig).
- Oberfläche `src/components/pinnwand/`: `PinboardTile.tsx` (Kachel),
  `PinboardView.tsx` (/pinnwand), `PinSheets.tsx` (`PinWriteSheet`,
  `PinSheet`), `MemoRow.tsx` (`MemoItem`, `MemoSheet`), `MemoParts.tsx`
  (`MemoMic`, `RecordingRow`, `MemoNote`), `useMemoRecorder.ts`, `useBoard.ts`.

## Daten und Speicher

- `wasgibts.pinnwand` v2 `{version: 2, messages, memos}`
  (`migratePinStore`): v1 behält die Nachrichten und bekommt leere `memos`.
  Beim Speichern räumen `prunePins` und `pruneMemos` Abgelaufenes weg.
- Nachricht (typ „pinnwand“, Raum immer Familie): `text` (bis 140),
  `author` (bis zu den Konten der eigene Name, sonst „Ich“), `reactions`
  (👍/❤️ → Namen), `readBy`, `pinned`.
- Memo (typ „memo“, Raum Familie): `author`, `dauer` (Sekunden, max. 60),
  `mime`, `wave` (28 Werte 0..1), `gehoertVon` (Autor zählt als gehört),
  `alleGehoertAm`, `reactions`, `storagePath` (null bis zu den Konten).
- Ton in IndexedDB `wasgibts-memos` v1 (Tabelle „audio“, Schlüssel = Memo-ID),
  nur auf diesem Gerät, nicht in der Sicherung.
- In „Daten sichern“ steht die Pinnwand, die Memos aber nicht:
  `src/lib/core/backup.ts` leert `memos` und merkt nur die Zahl
  (`memosNichtGesichert`).

## So verhält es sich

### Nachrichten
- Sichtbar: dauerhaft angeheftet oder jünger als 3 Tage (`visiblePins`).
  Ältere verschwinden leise.
- Sortierung der gemischten Liste (`useBoard`): angeheftete zuerst, dann
  neueste (`PINS` in `src/lib/core/sort.ts`). Text und Memos sind nach Zeit
  gemischt.
- Ungelesen = von jemand anderem und noch nicht in `readBy`. Die Kachel zeigt
  dann einen Punkt in der Kachel-Akzentfarbe (Rosé). Öffnet man eine
  Nachricht, gilt alles als gelesen (`markPinsRead`).
- Antippen einer Nachricht (`PinSheet`): 👍/❤️ (je Person einmal),
  „Dauerhaft anheften“ / „Nicht mehr dauerhaft – nach 3 Tagen weg“, Löschen nur
  bei eigenen (Gelöscht · Rückgängig).
- Autor-Kreis mit Anfangsbuchstabe in fester Farbe je Person (`personTone`),
  Zeile „Lisa · 7:48“, „Du · gestern“ oder „21.10.“ (`pinMeta`).

### Kachel und Seite
- Kachel (Rosé): Kopf „PINNWAND“ (+ Punkt) mit dem „+“ oben rechts (wie jede
  Kachel, neue Nachricht: Textfeld bis 140 mit Mikrofon, „Anheften“), das rosé
  Mikro für Memos steht getrennt unten rechts – Tippflächen überlappen nie
  (e2e `kachelKnoepfe`). S/M/L = 1/2/4 neueste Einträge. Das Label öffnet
  /pinnwand.
- Mikrofon (v0.66.1): immer nur EIN Nutzer (`core/mic`: `claimMic`/`releaseMic`).
  Vor der Aufnahme endet Mias Zuhören sauber (abort, Tracks stop); nach jeder
  Aufnahme werden Tracks, Analyser und AudioContext freigegeben – auch bei
  Abbruch, Fehler, Seitenwechsel (kommt „stop“ vom Recorder nicht, nach 1,5 s
  trotzdem). AudioContext entsteht im Tipp (iPhone), getUserMedia hat 4 s
  Zeitlimit („Das Mikrofon hängt gerade – nochmal antippen?“, dann wieder
  bereit). „Das war sehr kurz“ nur, wenn wirklich Ton kam. Der nachgeschobene
  Klick vom Antippen trifft nicht die Aufnahme-Zeile (450 ms Sperre).
- Seite /pinnwand: Feld „Nachricht an alle …“ mit Mikrofon/Senden und dem
  Memo-Mikro, darunter alle Einträge als Karten.
- Beispiel-Tag: ein Gruß der Begleitung; die erste eigene Nachricht oder das
  erste Memo lässt ihn für immer verschwinden (`clearDemoTile("pinnwand")`).

### Sprachnachrichten (Memos)
- Kein KI-Anteil, keine Abschrift. Das Mikro ist rosé (nie Orange – Orange ist
  das Mikro der Begleitung) und trägt `data-no-swipe` / `data-no-longpress`.
- Aufnehmen (`useMemoRecorder`, Ablauf rein in `lib/pinnwand/recorderState.ts`):
  EINMAL antippen = Aufnahme startet sofort und läuft frei (wie WhatsApp).
  Aufnahme-Leiste (`RecordingRow`, gleiche Stelle): links Mülleimer
  „Verwerfen“, Mitte roter Punkt + Zeit + Tonwelle, rechts großer
  Senden-Knopf (48 px). „Gesendet“ als kurze Meldung; Verwerfen unter 3 s
  still, sonst „Verworfen · Rückgängig“ (holt die fertige Aufnahme zurück).
  Höchstens 60 s: ab 50 s Zeit in Akzent, bei 60 s hält sie an und wartet
  (nie automatisch senden). Halten bleibt als Abkürzung: loslassen = senden
  (ab 0,3 s), beim Halten 60 px nach oben schieben = frei sprechen (Schloss).
  Unter 1 s = nichts. Format nach `pickMemoMime` (iPhone audio/mp4 AAC, sonst
  webm/Opus).
- Während der Aufnahme: Bildschirm bleibt an (Wake Lock), Seite scrollt nicht
  und wechselt nicht per Wischen (`data-no-swipe` am Dokument). App/Seite
  verlassen hält an – beim Zurückkommen „Memo fertig aufgenommen – Senden oder
  Verwerfen?“. Zurück (Pfeil/Geste/Android) fragt „Sprachnachricht
  verwerfen?“ (Verwerfen/Behalten), nie still verlieren.
- Mikrofon-Freigabe beim ersten Antippen; abgelehnt = ein freundlicher Satz,
  wo man es erlaubt. Knöpfe heißen „Aufnahme starten“, „Senden“, „Verwerfen“;
  VoiceOver sagt die Zeit alle 10 s an.
- Abspielen: nur eins gleichzeitig, der Ton liegt vorab als Adresse bereit
  (sonst spielt das iPhone nicht). Abspielen = gehört.
- Fenster (`MemoSheet`): 👍/❤️; beim eigenen Memo „Gehört von“ (Häkchen je
  Person, antippbar) und „Memo löschen“ (Gelöscht · Rückgängig). Kein Anheften.
- Verschwinden (`memoAlive`): 24 Std., nachdem alle im Haushalt es gehört
  haben (`alleGehoertAm`, Haushalt = Personen im Profil, `householdNames`),
  spätestens nach 3 Tagen.
- Beim Start räumt `tidyMemos` (aus `KitchenHelper`) Abgelaufenes aus und
  löscht verwaiste Töne, die älter als 10 Min sind.

### Jetzt-Karte
- Die neueste ungelesene Nachricht bzw. das neueste ungehörte Memo wird ein
  Thema: „Lisa: …“ bzw. „Felix: Sprachnachricht · 0:12“ (nie ein Inhalt).

## Begleitung (Mia)

- `pinnwand_schreiben` (`src/lib/begleitung/noteTools.ts`, Op `add_pin`,
  Vorschau + Übernehmen). Beim Übernehmen kommt die Pinnwand-Kachel auf die
  Startseite, falls sie fehlt.
- Kontext je Anfrage: „Pinnwand: …“; Memos nur als „[Sprachnachricht 0:12]“.
  Die Begleitung schreibt nur Text, nie Memos.
- Ohne KI (`src/components/begleitung/localRules.ts`):
  - `pinWriteCommand`: „Schreib an die Pinnwand: Bin um 20 Uhr da“ → sofort,
    mit Rückgängig; die Kachel wird bei Bedarf eingeblendet (`unlockHomeTile`).
  - `isPinboardQuery`: „Was steht auf der Pinnwand?“ nennt Nachrichten und
    Sprachnachrichten mit Dauer.
  - `memoPlayRule`: „Spiel das Memo von Lisa ab“ spielt das neueste der Person
    ab, ungehörte zuerst (`memoToPlay`). Läuft vor der KI, damit das iPhone
    direkt im Antippen abspielt; mit KI kommt der Satz per `app_befehl`.

## Tests

- `tests/pinnwand/pinnwand.test.ts` (Nachrichten, Memos, Speicher v2),
  `tests/pinnwand/memos.test.ts` (Verschwinden, Daten, Kleinigkeiten),
  `tests/pinnwand/pinnwandHooks.test.ts` (`usePins`, `useMemos`).
- `tests/begleitung/werkzeugeNotizen.test.ts` („Aufgaben-Übersicht und
  Pinnwand“), `tests/core/sortierung.test.ts`, `tests/core/sicherung.test.ts`.
- Durchklick `e2e/ablaeufe/alltag.mjs`: `pinnwand`.
