# Begleitung

Kurz: Die Begleitung (Standard Mia, Name/Art/Stimme/Farbe wählt die Familie)
ist der Hauptweg in die App. Man spricht oder tippt, sie legt an, ändert und
räumt weg – mit KI über `/api/lotte`, ohne KI über feste Regeln.

## Wo im Code

- Chat-Oberfläche `src/components/begleitung/`:
  - `KitchenHelper.tsx` – im Layout: Leiste (`BegleitungBar`), öffnet das
    Gespräch, „Übernehmen“ (`apply` → `commitOps`), Meldung „Gelöscht ·
    Rückgängig“. Räumt beim Start auf (`removeRetiredKeys`,
    `adoptLegacySpeech`, `adoptSchnellnotiz`, `migrateOldTermine`).
  - `HelperPanel.tsx` – das Fenster (über `next/dynamic`, erst bei Bedarf
    geladen): Kopf, Verlauf, Eingabe, `submit` und `route`.
  - `useAskAssistant.ts` – KI-Anfrage, Streaming, Schleifenschutz, sofortige
    Kleinigkeiten, Vorschau.
  - `useChatRules.ts` + `localRules.ts` + `mailRules.ts` – feste Regeln.
  - `useSpontanChat.ts`, `useMarketChat.ts`, `SpontanBoard.tsx`,
    `MarketBoard.tsx`, `BakingBoard.tsx` – Spontan kochen, Supermarkt, Backen.
  - `ChatHistory.tsx`, `ChatTurnItem.tsx`, `ChatInputBar.tsx`,
    `HelperHeader.tsx`, `ChatBits.tsx` (`AccessCodeCard`, `SpeakButton`),
    `ProposalCard.tsx`, `MailCard.tsx`, `TipBubble.tsx`, `SuggestionChips.tsx`,
    `chatTypes.ts`.
  - `GuidedChat.tsx` – geführtes Gespräch „neue Person“.
  - `BegleitungAvatar.tsx` – das eine Gesicht für alle Stellen.
  - `BegleitungPicker.tsx` – Auswahl Mia/Theo/eigener Name, `ColorDots`.
  - `HelloScreen.tsx` – erster Start.
- Logik `src/lib/begleitung/`:
  - `client.ts` – App-Seite: `askAssistant`, `useAssistantStatus`,
    `aiUsable`, Zugangscode, `takeAiSlot`, `deviceId`, `runInstantOps`,
    `commitOps`, `unavailableText`.
  - `protocol.ts` – Typen (`AssistantRequest`, `StreamEvent`,
    `AssistantReply`, `AssistantUsage`), `ASSISTANT_ENDPOINT`,
    `ACCESS_HEADER` (`x-lotte-code`), `LIMITS`.
  - `engine.ts` – Server: `parseRequest`, `runAssistant`, `needsLargeModel`.
  - `guard.ts`, `rateLimit.ts` – Schutz.
  - `registry.ts`, `toolset.ts`, `tools.ts` + `*Tools.ts` – Werkzeuge.
  - `ops.ts` – `ChangeOp`, `applyOps`, `compactOps`, `INSTANT_OP_TYPES`.
  - `preview.ts` – Text der Vorschau.
  - `prompt.ts` – `identityPrompt`, `SYSTEM_PROMPT`, `contextText`.
  - `mock.ts`, `mockAlltag.ts`, `mockShared.ts` – Testmodus.
  - `usage.ts` – Verbrauch je Tag.
  - `useSpeechInput.ts`, `speech.ts`, `speechChat.ts` – Sprache.
  - `mail.ts`, `mailTools.ts`, `mailSettings.ts` – Mails.
  - Regeln ohne KI: `settingsChat.ts`, `homeChat.ts`, `dayChat.ts`,
    `bausteinChat.ts`, `localAnswers.ts`, `chatSuggestions.ts`.
  - `open.ts` – `openHelper(mode?, ask?, filters?)` von überall.
- Server-Routen `src/app/api/lotte/route.ts` und
  `src/app/api/kennenlernen/route.ts`.
- Neue Person: `src/lib/einstellungen/onboarding/` (`engine.ts`,
  `recognize.ts`, `recognizer.ts`, `ai.ts`, `names.ts`).
- Avatar-Zustand: `src/lib/core/avatarState.ts`.

## Daten und Speicher

- Die Begleitung selbst steht im Profil (`helper`, siehe
  `einstellungen.md`).
- Pro Gerät (alle im Speicher-Verzeichnis `core/storage.ts`):
  - `wasgibts.vorlesen` v1 – Modus `auto`/`an`/`aus`, Stimme (`voiceURI`,
    leer = passend), Tempo. Alter Schalter `wasgibts.kuechenhelfer.vorlesen`
    wird von `adoptLegacySpeech` übernommen.
  - `wasgibts.mails` v1 – Grußformel, Signatur, gemerkte Anrede je Empfänger.
  - `wasgibts.verbrauch` v1 – KI-Verbrauch je Tag (nur Zahlen, 62 Tage, nicht
    angezeigt, nicht in der Sicherung).
  - `wasgibts.zugangscode`, `wasgibts.lotte.anfragen` (Tageszähler),
    `wasgibts.geraet` (zufällige Kennung) – nie in der Sicherung.
  - `wasgibts.chatnutzung` (Beispiel-Chips), `wasgibts.avatargruss`,
    `wasgibts.stimmenhinweis`.
- Der Chatverlauf lebt nur im Speicher der Seite (`ChatState`: `turns`,
  `proposal`, `spontan`). Eingefügte Mails werden nirgends gespeichert.
- Rückgängig: `core/undo.ts` (nur diese Sitzung).

## So verhält es sich

### Reihenfolge im Chat (KI zuerst)

- `HelperPanel.route`: Ist die KI bereit (`status.ready`), geht JEDE
  Nachricht an `ask` – die festen Regeln (`rules`) sind nur der Ersatz,
  falls die KI-Anfrage scheitert. Ohne KI greifen sofort die Regeln, sonst
  „Hm, das hab ich nicht verstanden.“ bzw. offline „Ich bin gerade offline –
  was du einträgst, speichere ich trotzdem.“ (`unavailableText`).
- Ausnahme: ein selbst geöffneter Spontan-Modus nimmt Zutaten direkt an; ein
  Satz ohne Zutaten (oder eine eingefügte Mail) beendet ihn.
- Feste Regeln in fester Reihenfolge (`useChatRules.rules`): Mail, Pinnwand,
  Tag, Schnellnotiz, Notizen, neue Person, Spontan-Ideen, Bausteine, Seiten
  (Rezepte/Vorrat), Pause, Snacks/Produkte, dann `localFirst` (Startseite und
  „Mach das rückgängig“, Einkaufsmodus, Memo abspielen, Vorlesen, Planen
  freischalten, Einstellungen, Supermarkt/Backen, „Wir lieben …“) und
  `localFallback` (Kochideen, Einkaufsliste, Termine, Wünsche).
- `app_befehl` (Op `app_command`): Die KI schlägt einen Satz vor; nach
  „Übernehmen“ führt `ChatHistory` ihn mit `rules()` aus. Klappt das nicht:
  „… kann ich in der App so nicht umsetzen – sag’s mir gern anders.“
- Schleifenschutz: Antwortet die KI genauso wie zuletzt (`isSameReply`),
  wird die Frage ohne Verlauf und ohne offenen Vorschlag neu geschickt.
- Stift links im Kopf = „Neues Gespräch“ (Verlauf, Vorschlag, Modus weg;
  gespeicherte Daten bleiben).
- Beispiel-Chips über dem Feld (`chatSuggestions`), höchstens 3; weg nach der
  ersten eigenen Nachricht, nach 10 eigenen Nachrichten nie mehr.

### Server `/api/lotte`

- `GET` meldet `{configured, mock, needsCode, access?}`. `POST` stellt die
  Frage.
- Schutz (`guard.ts`, gilt auch für `/api/kennenlernen`): KI nur mit
  `ANTHROPIC_API_KEY` UND `APP_ACCESS_CODE` (oder Testmodus). Code im Header
  `x-lotte-code`, Vergleich in konstanter Zeit (`timingSafeEqual`), höchstens
  10 falsche Versuche pro Stunde und Adresse. Kurzzeit-Grenzen je Gerät und
  IP (`allowRequest`: 10/Min, 60/Std), Tageslimit 100 je Gerät
  (`takeDailySlot`, IP ×3). Die App zählt zusätzlich selbst (`takeAiSlot`).
  Falscher Code → App vergisst ihn und fragt neu (`AccessCodeCard`).
- Anfrage: höchstens 400 000 Byte, Verlauf die letzten 10 Nachrichten, je
  Nachricht bis 6000 Zeichen. Die App schickt nur das Nötige (`trimmed`:
  Profil, diese/nächste Woche, Kochbuch ohne Schritte, Vorrat, Termine …).
- Modellwahl (`CHOICE` in `route.ts`, `needsLargeModel` in `engine.ts`):
  klein für Alltägliches, groß gleich bei offenem Vorschlag, langen Texten
  (> 280 Zeichen), Mails oder Planen/Rezepten (`LARGE_TOPICS`). Will das
  kleine Modell ein großes Werkzeug (`LARGE_TOOLS`), lehnt es ab oder läuft
  über, übernimmt das große (Ereignis `round`). `LOTTE_MODEL` (alt
  `KUECHENHELFER_MODEL`) = festes Modell; `LOTTE_SMALL_MODEL` /
  `LOTTE_LARGE_MODEL` ändern die beiden.
- Tool-Schleife (`runAssistant`): `max_tokens` 8000, höchstens 6 Runden,
  Aufwand „low“ außer beim kleinen Modell, serverseitiges Ausweichen bei
  Ablehnungen nur für Modelle aus `FALLBACK_MODELS`. Systemanweisung in zwei
  Teilen: Identität + Arbeitsweise mit `cache_control` (Prompt-Caching),
  dahinter der Kontext je Anfrage (`contextText`) und ein offener Vorschlag
  (`pendingSummary`). Wetter und Tipps aus der Region werden vorab geholt,
  wenn die Frage danach klingt.
- Streaming: NDJSON, eine Zeile je Ereignis – `text`, `round`, `done`
  (Antwort, Ops, Mail, Chips, Tipps, Verbrauch), `error`. Die App zeigt den
  Text Wort für Wort; nach `round` beginnt er neu.
- Verbrauch: Server-Log „Lotte Tokens“ nur mit Zahlen (Preise in `PRICES`);
  die App speichert `usage` still (`recordUsage`).
- Fehler: nie Technik-Texte; Codes `zugangscode`/`limit`/`aus`/`fehler`.

### Werkzeuge und Vorschläge

- Register (`registry.ts`): `registerTool`, `toolDefinitions` (feste
  Reihenfolge fürs Caching, `enabled` blendet aus), `runRegisteredTool`
  (Fehler werden freundlich gemeldet, nie geworfen). Angemeldet in
  `toolset.ts`: Essen, Einkauf, Vorrat, Kalender (`calendarTools.ts`),
  Notizen/Pinnwand/Wetter (`noteTools.ts`), Startseite/Plan/Liste/Pause/
  `app_befehl`/Bausteine (`homeTools.ts`), Mails, Tag (Timer, Kochen, Sport,
  Jetzt-Karte – `dayTools.ts`), `assistent_anpassen` (`helperTools.ts`),
  `tipps_suchen` (`tipTools.ts`, nur mit Quelle).
- Schreib-Werkzeuge ändern nichts, sie legen `ChangeOp`s an. Die App zeigt
  sie als Vorschau („Übernehmen“/„Ändern“, einzeln abwählbar); „Ändern“
  schickt den offenen Vorschlag als `pending` mit.
- Sofort ohne „Übernehmen“ (`INSTANT_OP_TYPES`, `runInstantOps`): Timer
  stellen/stoppen, Stoppuhr, Kochschritt, „Ich koche jetzt“. Ein neuer Timer
  blendet die Timer-Kachel ein.
- `commitOps`: speichert, schaltet Benutztes frei und sagt, wo es steht
  (Wochenplan → Baustein + Essen-Kachel, Vorrat/Rezepte → Baustein, Pinnwand
  und Sport → Kachel), schaltet `set_feature`, merkt Läden, passt bei neuer
  Art die Stimme an. Jede Übernahme legt ihr Zurücknehmen mit `pushUndo` ab
  („Mach das rückgängig“ = Op `undo_last` bzw. Regel).
- Sichtbares „Gelöscht · Rückgängig“ nur bei echtem Löschen (Eintrag, Notiz,
  Einkauf entfernen/leeren, Woche leeren, Kachel ausblenden), 3 Sekunden
  (`UNDO_SECONDS`).

### Testmodus

- `KUECHENHELFER_MOCK=1`: `createMockModel()` statt Claude – versteht
  einfache Alltags-Sätze, ruft dieselben Werkzeuge auf, streamt Wort für Wort
  (40 ms). Keine Mengengrenzen, kein Tageslimit, kein Verbrauch.
  `/api/kennenlernen` liefert dann das Regel-Ergebnis.

### Sprache

- Spracheingabe nur über `useSpeechInput` (Web Speech API, Deutsch): jede
  Aufnahme eine frische Sitzung, geliefert wird immer der ganze Text dieser
  Aufnahme; `cancel`/`reset` verwerfen. `HelperPanel.submit` ruft immer
  `speech.reset()`; nach dem Ende wird genau das Gesprochene abgeschickt.
- Mikrofon-Freigabe (Tafel 27) für ALLE Mikro-Stellen über `src/lib/core/mic.ts`
  (Zustand geräteweit, nur im Speicher) und `src/components/ui/MicPermission.tsx`
  (`MicSheetHost` im Layout, `MicStrip`, `useMicBlocked`, `MIC_BLOCKED`) +
  `MicSheets.tsx` (bei Bedarf geladen):
  - Allererster Tipp (Freigabe unbekannt, Einmal-Hinweis `mikro-gefragt` nicht
    gesehen): „Darf ich zuhören?“ mit nachgebautem System-Dialog; erst „Okay,
    frag mich“ startet Erkennung bzw. `getUserMedia`. „Lieber tippen“ = Fokus
    ins Feld neben dem Mikro. iPhone: „dein iPhone“/„Erlauben“, sonst „dein
    Handy“/„Zulassen“.
  - Gesperrt (`NotAllowedError`, „not-allowed“, Freigabe „denied“) bzw.
    Diktieren aus („service-not-allowed“ auf dem iPhone): Hilfe-Fenster „Ich
    kann dich gerade nicht hören“ mit vier Schritten (`micSteps`: iOS ab 18
    „Apps → Safari → Mikrofon“, bis 17 „Safari → Mikrofon“; Android/Chrome
    Symbol neben der Adresse → Berechtigungen → Mikrofon → Zulassen; Diktieren
    Einstellungen → Allgemein → Tastatur → Diktierfunktion), „Zeig’s mir“
    (wischbar, nachgebaute Bildschirme, markierte Zeile + Fingerkreis),
    „Nochmal versuchen“ (fragt erneut; noch aus → „Hm, noch aus.“).
  - Danach: gelber Streifen „Mikro aus – tippen geht immer. Anmachen ›“,
    Mikro-Knopf grau + durchgestrichen (nie der Stopp-Knopf), Tipp darauf =
    Hilfe. Zurück in der App (`visibilitychange`) wird `navigator.permissions`
    neu gefragt; erlaubt → Streifen weg, kurz „✓ Mikro ist an“.
  - Bugfix: Bei jedem Mikro-Fehler wird die Aufnahme sofort zurückgesetzt
    (kein hängender Stopp-Knopf, keine laufenden Tracks).
- Vorlesen (`speech.ts`): `shouldRead` – `auto` nur, wenn per Mikrofon
  gefragt. Tempo 0,8 / 0,95 / 1,2. `pickVoice` wählt eine deutsche Stimme
  passend zur Art, natürlichere zuerst (`isNaturalVoice`); fehlt eine
  passende, einmal `VOICE_HINT`. `unlockSpeech` beim ersten Tippen (iPhone).
  Klappt es nicht, passiert einfach nichts.
- Per Satz ohne KI: „Lies mir vor“, „Nicht mehr vorlesen“, „Sprich langsamer“
  (`readingChange`).

### Mails

- Nie automatisch senden, kein Postfach. Werkzeuge `mail_entwurf` und
  `antwort_knoepfe`; ohne KI `localReply`, `localNewMail`, `reviseDraft`
  (`mailRules.ts`). Karte `MailCard`: „In Mail öffnen“ (`mailtoHref`),
  Kopieren, Ändern (Kürzer, förmlicher, Du/Sie, lockerer). Du/Sie wird je
  Empfänger gemerkt (`rememberTone`). Termine in der Mail (`eventsIn`) werden
  als Vorschlag angeboten.

### Gesicht und Zustände

- `BegleitungAvatar` (Kreis in der Lieblingsfarbe, Sprechblase mit Gesicht;
  dunkle Farben mit feinem Rand). Zustände setzt nur die App
  (`avatarState.ts`): zuhören > sprechen > denken > verwirrt >
  freuen/begrüßen > schlafen > ruhig. Mikrofon → zuhören, KI lädt → denken,
  Fehler-Antwort → verwirrt, Vorlesen → sprechen, einmal am Tag begrüßen
  (`greetOncePerDay`), Feierabend mit Ruhe → schlafen (Leiste antippen weckt).
- Leiste unten (`BegleitungBar`): hell, schwebend, Avatar links, oranges
  Mikrofon rechts; auf der Startseite zeichnet sie der Pager.

### Erster Start und neue Person

- `HelloScreen` (Tafel 19, seit v0.49): drei Pastell-Kacheln als Deko
  (`HelloTiles`, Termine/Essen/Einkauf, gedreht, aria-hidden), die Begleitung
  (92 px, überlappt die Einkauf-Kachel), „Hallo, ich bin <Name>.“
  (`helperName`), „Euer Alltag an einem Ort.“, „Los geht’s“ (`startFresh`),
  „Schon mal genutzt? Daten wiederherstellen“ (`/profil/daten`) und ganz unten
  die Leiste der Begleitung wie auf jeder Seite (Mikro „Mit <Name> sprechen“;
  der frühere Sprech-Chip in der Mitte hakte und ist weg). Kein
  Anmelden-Link, bis „Anmelden wie man es kennt“ (Tafel 22) fertig ist.
  Ablauf: 0 s Begleitung, 0,3 s Kacheln (je 120 ms), 0,95 s Überschrift
  tippt, 1,8 s Zeile, 2,2 s Knopf, Link und Leiste. Beim Start fliegt
  die Begleitung in die Jetzt-Karte, die Kacheln blenden als Kopie aus
  (`fadeOutGhost`). Bewegung reduzieren = alles sofort, kein Puls.
- Mikro unten: im selben Tipp `primeMicrophone` (Freigabe über
  `getUserMedia`, in `useSpeechInput.ts`), dann `startFresh` und
  `openHelper("voice")` – die Leiste hört zu. Abgelehnt: Leiste zum Tippen und
  das Hilfe-Fenster (`core/mic`); kein Sprechen im Browser: freundlicher Satz
  (Toast), nie ein Fehler.
- Erster Satz wie jede Nachricht (KI zuerst): „Ich bin Felix, wir sind Lisa
  und drei Kinder“ → Op `set_household` (Werkzeug `haushalt_vorstellen`, ohne
  KI `parseHouseholdIntro` in `einstellungen/householdIntro.ts`) mit Vorschau
  „Felix · Lisa · 3 Kinder · Familie“ und „Übernehmen“: Name, Personen,
  Haushaltstyp; eingetragene Personen bleiben, leere Platzhalter werden
  ersetzt.
- „X wohnt jetzt bei uns“ (`isAddPersonRequest`) startet `GuidedChat` mit
  `startAddPerson`: Namen bestätigen, Rolle, bei Kindern Gruppe. Freie
  Antworten erkennt `recognizer.ts` – mit KI über `/api/kennenlernen`
  (Modell `MODEL`, änderbar per `KENNENLERNEN_MODEL`), sonst Regeln.

### Bausteine im Gespräch

- Mit KI: `baustein_an`/`baustein_aus` (Op `set_feature`, Vorschau). Ohne
  KI: `parseBausteinCommand` („Zeig mir den Vorrat“, „Ich brauche die Tipps
  nicht“, „Was kannst du noch?“). Eingeschaltet sagt sie, wo er steht
  (`Baustein.where`).

## Begleitung (Mia)

- Kann alles, was man selbst kann: Termine, Aufgaben, Notizen, Pinnwand,
  Wochenplan, Einkauf, Vorrat, Rezepte, Startseite, Timer, Sport,
  Jetzt-Karte, Pause, Portionen, Mails, Tipps, Bausteine – und sich selbst
  umbenennen/umfärben (`assistent_anpassen`, ohne KI `parseHelperCommand`).
- Texte immer über `helperName()`/`helperTitle()`/`helperMessage()`, nie mit
  festem Namen.

## Tests

- `tests/begleitung/`: `engine.test.ts`, `modellwahl.test.ts`,
  `schutz.test.ts`, `client.test.ts`, `prompt.test.ts`, `vorschau.test.ts`,
  `uebernehmen.test.ts`, `werkzeuge*.test.ts` (Essen, Kalender, Notizen,
  Startseite, Tag), `testmodus.test.ts`, `testmodusRunden.test.ts`,
  `regelnOhneKi.test.ts`, `tagesChat.test.ts`, `mails.test.ts`,
  `diktat.test.ts`.
- `tests/core/mikrofon.test.ts` – Gerät, Fehlerarten, Schritte je Gerät und
  iOS-Version, Vorab-Frage, Sperre/Freigabe.
- Durchklick `mikrofon` (`e2e/ablaeufe/mikrofon.mjs`, Schein-Fehler über
  `FAKE_MIC` in `e2e/lib.mjs`): Vorab-Frage, Hilfe, „Zeig’s mir“ 4 Schritte,
  Streifen + grauer Knopf, Diktieren aus; iPhone- bzw. Android-Texte. Bilder:
  Szenen `mikro-fragen`, `mikro-hilfe`, `mikro-zeigen`. Testgeräte haben das
  Mikrofon sonst erlaubt (`newPage`).
- `tests/einstellungen/neuePerson.test.ts`, `erkennung.test.ts`,
  `kiErkennungApp.test.ts`.
- `tests/app/regeln.test.ts`: kein fest eingebauter Name der Begleitung in
  sichtbaren Texten.
