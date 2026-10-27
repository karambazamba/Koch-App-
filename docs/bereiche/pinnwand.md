# Pinnwand

Kurz: Der Zettel am Kühlschrank. Kurze Nachrichten und Sprachnachrichten
(Memos) an alle im Haushalt. Alles verschwindet nach 24 Stunden (ab dem
Schreiben bzw. der Aufnahme, Tafel 72) – außer dauerhaft angeheftete
Nachrichten. Kein Countdown; einmal steht im Seitenkopf „Nachrichten
verschwinden nach 24 Stunden“ (`pinnwand-24h`).

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

- `wasgibts.pinnwand` v3 `{version: 3, messages, memos}`
  (`migratePinStore`): v1 behält die Nachrichten und bekommt leere `memos`;
  v2 → v3 dreht die Reaktionen um (Emoji → Personen wird Person → Emoji,
  `readReactions`, auch in alten Sicherungen) und ergänzt `replyTo: null`.
  Der Abgleich (`konten/sync/docs.ts`, Übersetzer v3) trägt Reaktionen und
  Antworten mit; Löschen geht als Markierung.
  Beim Speichern räumen `prunePins` und `pruneMemos` Abgelaufenes weg.
- Nachricht (typ „pinnwand“, Raum immer Familie): `text` (bis 140),
  `author` (bis zu den Konten der eigene Name, sonst „Ich“), `reactions`
  (Person → 👍 ❤️ 😂 😮 🙏, eine je Person, `reactions.ts`), `replyTo`
  (Zitat `{id, author, text}` oder null), `readBy`, `pinned`.
- Memo (typ „memo“, Raum Familie): `author`, `dauer` (Sekunden, max. 60),
  `mime`, `wave` (28 Werte 0..1), `gehoertVon` (Autor zählt als gehört),
  `alleGehoertAm`, `reactions`, `storagePath` (null = nur auf diesem Gerät; mit
  Konto der Pfad in Supabase Storage, siehe `konten.md` „Sprachnachrichten teilen“).
- Ton in IndexedDB `wasgibts-memos` v1 (Tabelle „audio“, Schlüssel = Memo-ID),
  nicht in der Sicherung; mit Konto zusätzlich im Haushalt (Etappe 3c). Seit v0.67.2 als ArrayBuffer +
  `mime` (Safari/iOS lehnt Blobs in IndexedDB teils ab, im privaten Tab
  immer); alte Zeilen mit `blob` werden weiter gelesen (`blobFromRow`).
  Klappt IndexedDB nicht, bleibt der Ton im Arbeitsspeicher und die
  Nachricht steht trotzdem in der Pinnwand – abspielbar, bis die App
  geschlossen wird (einmal leise: „Diese Sprachnachricht bleibt nur, bis du
  Mia schließt.“, Hinweis `memo-nur-sitzung`). Der Eintrag kommt erst nach
  dem Ablegen des Tons; scheitert Senden trotzdem, bleibt die Aufnahme und
  es gibt „Nochmal senden“ (ein Tipp aufs Mikro sendet dann auch erst diese).
- In „Daten sichern“ steht die Pinnwand, die Memos aber nicht:
  `src/lib/core/backup.ts` leert `memos` und merkt nur die Zahl
  (`memosNichtGesichert`).

## So verhält es sich

- **Absätze (v0.112)**: Die Schnelleingabe der Pinnwand ist mehrzeilig
  (`ui/MehrzeilenFeld`, wächst bis 6 Zeilen, dann scrollt sie), Return = neue
  Zeile, gespeichert wird nur mit ➤. `cleanPinText` behält Zeilen (höchstens
  eine Leerzeile), Anzeige mit `whitespace-pre-line`; Kachel-Zeilen bleiben
  einzeilig gekürzt. Push nennt nie den Text (nur „… hat etwas an die
  Pinnwand gehängt“). Alte Nachrichten bleiben unverändert.

### Nachrichten
- Sichtbar: dauerhaft angeheftet oder jünger als 24 Std. ab `erstellt`
  (`visiblePins`, `withinDay`, `PIN_HOURS`). Ältere verschwinden leise.
  „Dauerhaft anheften“ (nur Text, im Lange-Drücken-Menü) – angeheftete stehen
  oben, mit kleiner Nadel (13 px) auf der Seite und in der Kachel.
- Sortierung der gemischten Liste (`useBoard`): angeheftete zuerst, dann
  neueste (`PINS` in `src/lib/core/sort.ts`). Text und Memos sind nach Zeit
  gemischt.
- Ungelesen = von jemand anderem und noch nicht in `readBy`; die Kachel zeigt
  dafür keinen Punkt mehr (Tafel 71). Öffnen der Seite gilt als gelesen
  (`markPinsRead`).
- Gesten auf der Seite wie bei WhatsApp (Tafel 70, `SwipeRow.tsx`):
  nach LINKS wischen = löschen, nur eigene (`canDelete`) – rote Fläche
  „Löschen“, ganz durchwischen oder antippen, „Gelöscht · Rückgängig“;
  fremde federn nur zurück. Nach RECHTS wischen = antworten (blaue Fläche):
  Schnelleingabe „NACHRICHT AN ALLE“, die neue Nachricht trägt das Zitat
  (`boardActions.replyTo`, `quoteOf`).
  LANGE DRÜCKEN (0,4 s, Vibrieren; auf Android auch „contextmenu“) =
  `ReactionMenu.tsx`: Nachricht angehoben, Rest abgedunkelt, darüber 👍 ❤️ 😂
  😮 🙏 (setzen, tauschen, entfernen), darunter „Antworten“, „Weiterleiten an
  Mia“ (macht daraus eine Vorschau mit „Übernehmen“), „Anheften“, „Löschen“
  (nur eigene), bei der eigenen Sprachnachricht „Gehört von“. Das Loslassen
  des langen Drückens schließt das Menü nicht (erst eine neue Berührung
  zählt). Unter der Nachricht klein „❤️ 👍 Lisa, Felix“ (`reactionLine`,
  keine Zahlen). Für VoiceOver dieselben Aktionen als unsichtbare Knöpfe.
  Die Zeilen tragen `data-no-swipe` (kein Seitenwechsel).
- Autor-Kreis mit Anfangsbuchstabe in fester Farbe je Person (`personTone`),
  Zeile „Lisa · 7:48“, „Du · gestern“ oder „21.10.“ (`pinMeta`).

### Kachel und Seite
- Aufnahme in der Kachel (Tafel 80): EINE weiße Pille (44 px) statt der
  Zeilen – links Mülleimer, roter Punkt, Zeit, Tonwelle (`MemoWave fit`: wird
  schmaler, nie abgeschnitten), rechts ➤ (38 px, Tippfläche 44 px). ＋ und
  Mikro sind währenddessen weg; gesendet wird nur über ➤ (in der Kachel nur
  antippen, kein Halten: `MemoMic tapOnly`). Darunter „Aufnahme läuft – sprich
  einfach“ und klein „➤ senden · 🗑 verwerfen“ (Linien-Symbole). Passt in S
  (SE) und M. In Ruhe unten links nur „Sprachnachricht“, rechts das Mikro;
  beim ersten Mal ein kleines Schild „schreiben“ unter dem ＋ (weg nach dem
  ersten Tipp auf ＋ oder nach 2 Besuchen: `pinnwand-kachel-1`,
  `pinnwand-kachel`). Nach dem Senden steht die Sprachnachricht oben (zart
  hervorgehoben), unten 1,5 s „✓ Gesendet“.
- Kachel (Rosé, Tafel 71 B): feste Höhe 156 px (wie die Wetter-Kachel
  daneben, auch breit nie höher), genau 2 Zeilen à 30 px: Angeheftetes
  zuerst, dann die neuesten Einträge der letzten 24 Std. (`tileEntries`): Text = Bild 22 px + eine
  Zeile …, Sprachnachricht = ▶ + kleine Tonwelle + Länge. „+N“ neben dem ＋,
  wenn es mehr gibt. Kein roter
  Punkt. Leer: „Hinterlasst euch hier Nachrichten“. ＋ oben rechts =
  Schnelleingabe, Mikro (34 px, Tippfläche 44 px) unten rechts = Sprachnachricht
  – deutlich getrennt. Antippen einer Zeile öffnet /pinnwand an dieser
  Nachricht (`?n=<id>`, kurz hervorgehoben). Keine Wisch-/Lange-Drücken-
  Gesten in der Kachel. Hinweis siehe Aufnahme (Tafel 80).
- ＋ = Schnelleingabe (Tafel 76, v0.72.0): Kopf „NACHRICHT AN ALLE“, ein
  Feld, ➤ pinnt sofort an („Angepinnt: … · Rückgängig“), das Feld bleibt für
  die nächste offen. Text kommt 1:1 an. Sprechen geht über den Mia-Knopf
  („Schreib an die Pinnwand: …“, `localRules`) – die frühere Pinnwand-Bühne
  ist weg. Das Textfenster (`PinWriteSheet`, mehrzeilig, 140 Zeichen) gibt es
  nur über „Mehr Details“.
- Mikrofon (v0.66.1): immer nur EIN Nutzer (`core/mic`: `claimMic`/`releaseMic`).
  Vor der Aufnahme endet Mias Zuhören sauber (abort, Tracks stop); nach jeder
  Aufnahme werden Tracks, Analyser und AudioContext freigegeben – auch bei
  Abbruch, Fehler, Seitenwechsel (kommt „stop“ vom Recorder nicht, nach 1,5 s
  trotzdem). AudioContext entsteht im Tipp (iPhone), getUserMedia hat 4 s
  Zeitlimit („Das Mikrofon hängt gerade – nochmal antippen?“, dann wieder
  bereit; seit v0.67.2 erst nach einem stillen zweiten Versuch). Erster Tipp
  in einer Sitzung startet beim Loslassen (Klick) im Modus „tippen“ – auf dem
  iPhone erscheint die Mikro-Frage nur bei einem echten Antippen; „Halten“
  beim Aufsetzen erst, wenn das Mikro in dieser Sitzung schon lief
  (`micRanThisSession`). Im Safari-Tab einmal: „Tipp: Über das Mia-Icon auf
  dem Homescreen fragt das iPhone nicht jedes Mal nach dem Mikrofon.“
  Mikro-Protokoll (`core/micLog.ts`, `wasgibts.mikroprotokoll`, nicht in der
  Sicherung, nie an die KI): Einstellungen → Daten & App → 5× auf die
  Version tippen; die letzten 20 Ereignisse. „Das war sehr kurz“ nur, wenn wirklich Ton kam. Der nachgeschobene
  Klick vom Antippen trifft nicht die Aufnahme-Zeile (450 ms Sperre).
- Seite /pinnwand: oben rechts ＋ (Schnelleingabe), darunter „Sprachnachricht
  an alle“ mit dem Mikro, dann alle Einträge als Karten (Antworten mit Zitat).
  Einmal: „Wischen: ← löschen · → antworten · Lange drücken: reagieren“
  (`pinnwand-gesten`).
- Beispiel-Tag: eine Familien-Nachricht (Lisa: „Bringe Brot mit 🥖“) statt
  eines Grußes von Mia; die erste eigene Nachricht oder das erste Memo lässt
  sie für immer verschwinden (`clearDemoTile("pinnwand")`).

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
- Verschwinden (`memoAlive`): 24 Std. nach der Aufnahme – gehört oder nicht
  (`alleGehoertAm` bleibt nur für „Gehört von“).
- Beim Start räumt `tidyPinboard` (aus `KitchenHelper`) alles älter als 24
  Std. aus (außer Angeheftetem; damit auch Altes aus der früheren
  3-Tage-Regel) und löscht verwaiste Töne, die älter als 10 Min sind – der Ton
  einer abgelaufenen Sprachnachricht geht also mit.

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

- `tests/notizen/notizenNeu.test.ts` („Absätze überall“: Zeilen bleiben, alte Nachrichten gleich, Feld mehrzeilig); Durchklick `e2e/ablaeufe/notizen.mjs`.
- `tests/pinnwand/vierundzwanzig.test.ts` (24 Std., Angeheftetes bleibt,
  Aufräumen beim Start samt Ton), `tests/pinnwand/gesten.test.ts` (Kachel,
  Reaktionen, Antworten, Pixel-Fehler).
- `tests/pinnwand/pinnwand.test.ts` (Nachrichten, Memos, Speicher v2),
  `tests/pinnwand/memos.test.ts` (Verschwinden, Daten, Kleinigkeiten),
  `tests/pinnwand/pinnwandHooks.test.ts` (`usePins`, `useMemos`).
- `tests/begleitung/werkzeugeNotizen.test.ts` („Aufgaben-Übersicht und
  Pinnwand“), `tests/core/sortierung.test.ts`, `tests/core/sicherung.test.ts`.
- Durchklick `e2e/ablaeufe/alltag.mjs`: `pinnwand`; `pinnwandgesten.mjs`;
  `aufnahmeLeiste` (`sprachnachricht.mjs`, auch iPhone SE);
  `tests/pinnwand/aufnahmeleiste.test.ts`.
