# Begleitung

Kurz: Die Begleitung heißt fest Mia – wie die App (seit v0.67, `APP_NAME`;
nur die Stimme ist wählbar) – und ist der Hauptweg in die App. Man spricht oder tippt, sie legt an, ändert und
räumt weg – mit KI über `/api/lotte`, ohne KI über feste Regeln.

## Wo im Code

- Chat-Oberfläche `src/components/begleitung/`:
  - `KitchenHelper.tsx` – im Layout: Mia-Knopf (`MiaButton`), öffnet das
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

### Mia spricht knapp (seit v0.77)
- Norddeutsch, kurz, nie vorstellen: Begrüßung im Chat „Was steht an?“
  (5–11 Uhr „Moin! Was steht an?“, `greetingText`), Hallo-Bildschirm
  „Moin, ich bin Mia.“ (einzige Vorstellung), Stimm- und Vorlese-Probe „Moin! So klinge ich.“ bzw. „Moin!
  Heute gibt’s Spaghetti. Um 18:30 ist alles fertig.“ Auf „Wer bist du?“
  antwortet die KI „Mia. Ich organisier euren Alltag.“
- `tidyMiaText()` (`lib/begleitung/tidy.ts`) für jede KI-Antwort vor Anzeige
  (Stream und fertige Antwort in `client.ts`) und Vorlesen (`speak`):
  Gedankenstrich zwischen Satzteilen → Punkt (Großbuchstabe danach) bzw.
  Komma, Zahlen-Spannen bleiben („9–11 Uhr“), Spiegelstriche/Nummern am
  Zeilenanfang weg, „!!“ → „!“, höchstens ein „!“ pro Nachricht.
- Prompt: höchstens 2 kurze Sätze, Bestätigungen 1–3 Wörter, keine
  Gedankenstriche/Aufzählungszeichen/Floskeln, höchstens ein „!“ und ein
  Emoji, drei Beispiele gut/schlecht.
- Alle festen Mia-Sätze (Begleitung, Jetzt-Karte, Kochidee, Pinnwand,
  Wetter, Testmodus) ohne Gedankenstrich als Satzverbindung, ohne
  Spiegelstriche, höchstens ein „!“ – geprüft in `tests/begleitung/knapp.test.ts`
  (Werkzeug-Beschreibungen und Prompt liest nur die KI, sie zählen nicht).

### Mia auf Claude-Niveau – nie halbgar (seit v0.78)
- Nie „nicht verstanden“: Ist die KI erreichbar, bekommt sie jede Eingabe.
  Fehler → einmal still nochmal, dann „Hat grad nicht geklappt. Nochmal?“.
  Offline → „Bin grad offline. Ich mach’s, sobald wieder Netz da ist.“, der
  Satz kommt in `wasgibts.lotte.nachholen` (`nachholen.ts`, max. 5, 24 Std.)
  und wird beim nächsten „online“ auf der Bühne nachgeholt (KitchenHelper).
  Tageslimit: „Für heute hab ich genug geredet. Listen und Termine gehen
  natürlich weiter.“ (`UNAVAILABLE_TEXT` in `client.ts`).
- Modell (`engine.ts`): Haiku nur für klare Kurzbefehle (`isShortCommand`:
  kurz, keine Frage, eindeutige Aktion wie Liste/Timer/Termin mit Zeit),
  sonst Sonnet. Zweite Chance: antwortet Haiku ohne Aktion unsicher oder gar
  nicht (`HEDGE`), übernimmt Sonnet. Sonnet mit effort „medium“ bei Fragen,
  „low“ bei Aktionen. Kosten je Anfrage wie bisher; Übersicht „KI-Kosten
  letzte 7 Tage“ unter Einstellungen → Daten & App → „Für Entwickler“
  (`/profil/admin`).
- Machen statt fragen: Sind alle Vorschläge einer Antwort klein und sicher
  (`isSafeOp`: Einkauf, neuer Termin/Aufgabe/Notiz, Pinnwand, Im Haus,
  Wunsch, Abhaken), führt die App sie sofort aus (`commitOps`), zeigt
  „Rückgängig“ 10 s in der Blase und merkt sie in „Mia hat schon …“
  (`miaDone.ts`, `wasgibts.mia.erledigt`, oben in „Dein Tag“, antippbar,
  Rückgängig solange die App offen ist, > 2 → „Ansehen“). Alles andere bleibt
  Vorschau mit „Übernehmen“.
- Ehrlich: Der Prompt bekommt „Das kannst du …“ automatisch aus den
  angemeldeten Werkzeugen (`capabilities` in `wishTools.ts`). Allgemeine
  Fragen beantwortet Mia selbst. Geht etwas nicht: Werkzeug
  `kann_ich_noch_nicht` → „Kann ich noch nicht.“; der Server zählt den Wunsch
  anonym in `mia_wuensche` (nur Text + Datum, RLS ohne Policies, nur der
  geheime Schlüssel schreibt; `wishStore.ts`). Wünsche gehen nie an die App.
- Prüfstand (`pruefstand/`): 124 Alltagssätze mit erwarteter Aktion, Bewertung
  (Aktion, Datum/Uhrzeit/Person, max. 2 Sätze, Floskeln/Striche, Zeit),
  Route `/api/pruefstand` (nur mit `PRUEFSTAND_SECRET` bzw. `CRON_SECRET`,
  3 Sätze je Aufruf – länger bricht Vercel ab, „Load failed“), Bericht unter
  „Für Entwickler“. Ziel ≥ 95 %. Der Lauf (`pruefstand/lauf.ts`) ruft der
  Reihe nach auf und zeigt „Läuft … 12 von 124“; jeder Aufruf wird einmal
  still wiederholt, Server-Fehler zählen als „Fehler beim Aufruf“ und es geht
  weiter; bricht die Verbindung ab: „Verbindung abgebrochen bei Satz 13.
  Nochmal ab hier?“ mit „Weiter“. Hinweis „Bildschirm anlassen, dauert ca. 5
  Minuten.“ Am Ende Quote + Fehlschläge (Satz, erwartet, bekommen) mit
  „Kopieren“.
- Beim Nachdenken bewegen sich Mias Augen (Zustand „denken“), kein Spinner;
  erste Worte kommen gestreamt.

### Versprechen offen halten (seit v0.65.1)

- Mia verspricht nur, was die App halten kann: Erinnerungen erscheinen in der
  App (Jetzt-Karte oben auf „Heute“), Push gibt es noch nicht. Regel im
  Prompt („Versprich nur, was die App halten kann …“) und Textregel in
  `tests/app/regeln.test.ts` (kein „Ich erinnere dich“, „Ich schick dir eine
  Nachricht“, „Ich melde mich morgen“ …). Sport-Formular: „30 Min vorher steht
  es oben auf Heute.“ statt „Ich erinnere dich 30 Min vorher.“

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
- Seit v0.96 (zuverlässig zuhören): Mitschrift in `mitschrift.ts` (rein):
  neu begonnene Ergebnisliste (Position 0 mit anderem Text) wird gesichert
  statt überschrieben, beim Neustart nach Stille wandern fertige UND
  unfertige Teile in die Sicherung, am Ende zählt immer alles (fertig +
  unfertiger Rest). `withoutPrevious` nur für gerade eben (8 s) Abgeschicktes
  mit mehr als einem Wort – „Okay“ wird nie abgeschnitten.
- Bühne (`useSpeechInput({ buehne: true })`): beendet der Browser nach
  Stille, hört Mia still weiter (`continuous`, Neustart nur nach echtem
  Ende – auf dem iPhone also höchstens ein Systemton je Pause; im Test 1
  Neustart je Atempause). Abgeschickt wird nach 2,5 s Stille nach dem letzten
  Wort (`STILLE_MS`), beim Antippen von Mia oder bei „fertig“/„das war’s“,
  höchstens 2 Minuten. Ab 0,6 s Stille blinzelt Mia und ein dünner Ring läuft
  ab („Gleich schick ich’s ab“). Sagt niemand etwas, hört sie nach 8 s auf.
- Weiterreden: Vorlesen aus → das Mikro bleibt an, während Mia denkt und
  antwortet; Vorlesen an → erst sprechen, dann sofort wieder zuhören. Was in
  der Antwortzeit gesagt wird, steht als Blase „wartet“ da und geht nach
  Mias Antwort raus.
- Gespräch scrollt mit (`useStickToBottom`): endet immer oberhalb von Mia,
  neue Nachrichten und die Live-Blase bleiben im Bild; wer hochscrollt,
  bleibt dort und bekommt „↓ Neu“. Die Live-Blase wächst mit und zeigt bei
  sehr langem Text die letzten Zeilen (oben ausgeblendet).
- „Lieber tippen“ (seit v0.97): Ob getippt wird, entscheidet der Fokus des
  Felds, nicht die gemessene Tastaturhöhe (Safari schiebt beim Öffnen der
  Tastatur die Seite hoch, die Höhe sprang kurz auf 0 und der Tippen-Modus
  ging zu). Er schließt nur bei echtem Fokusverlust, leerem Feld und nach
  300 ms ohne fokussiertes Feld (`tippModus.ts`). „Lieber sprechen“ unter
  dem Feld führt zurück zu Mia (sie hört gleich zu). Die Bühne (`StageSheet`)
  ist fest an den sichtbaren Bereich gebunden (`useVisualViewportBox`), das
  Feld sitzt direkt über der Tastatur. Die anderen Fenster mit
  `useKeyboardInset` (Schnelleingabe, Termin, Einkauf, Katalog) nutzen die
  Höhe nur als Abstand nach unten und schließen nie von selbst.
- Der „Düdüp“ beim Zuhören ist der Systemton von iOS/Safari (Erkennung
  startet/endet) und lässt sich im Web nicht ändern.
- Mikrofon-Freigabe (Tafel 27) für ALLE Mikro-Stellen über `src/lib/core/mic.ts`
  (Zustand geräteweit, nur im Speicher) und `src/components/ui/MicPermission.tsx`
  (`MicSheetHost` im Layout, `MicStrip`, `useMicBlocked`, `MIC_BLOCKED`) +
  `MicSheets.tsx` (bei Bedarf geladen):
  - Allererster Tipp (Freigabe unbekannt, Einmal-Hinweis `mikro-gefragt` nicht
    gesehen): „Darf ich zuhören?“ mit nachgebautem System-Dialog; erst „Okay,
    frag mich“ startet Erkennung bzw. `getUserMedia`. „Lieber tippen“ = Fokus
    ins Feld neben dem Mikro. iPhone: „dein iPhone“/„Erlauben“, sonst „dein
    Handy“/„Zulassen“.
  - Seit v0.95 (Tafel 86) statt des Hilfe-Fensters der **Mikro-Check**
    (`ui/MicCheck.tsx`, Logik rein in `core/micCheck.ts`, Browser-Teil
    `core/useMicCheck.ts`): öffnet sich von selbst, sobald Zuhören scheitert,
    und über Einstellungen → Mia → „Mikrofon prüfen“. Häkchen-Liste
    „Mikrofon erlaubt · Diktierfunktion und Spracherkennung · Ton kommt an“;
    geprüft wird Spracherkennung (startet im Tipp), `getUserMedia` (Zeitlimit,
    einmal still neu) und ein Pegel-Test („Sag mal kurz „Moin““).
  - Fehlerarten (`micFehler`/`diagnose`): gesperrt (NotAllowedError, bzw.
    „not-allowed“ ohne erlaubtes Mikro), erkennung_aus („service-not-allowed“,
    bzw. „not-allowed“ obwohl das Mikro erlaubt ist = Felix’ Fall
    „Spracherkennung → Safari“ aus), kein_ton, haengt, privat (Verdacht über
    sehr wenig Speicher, nicht vom Home-Bildschirm), unklar.
  - Nur die Schritte für den fehlenden Schalter (`schalterFuer`, `anleitung`):
    iPhone Schalter 1 „Apps → Safari → Mikrofon → Erlauben“ (bis iOS 17 ohne
    „Apps“), Schalter 2 „Allgemein → Tastatur → Diktierfunktion“, Schalter 3
    „Datenschutz & Sicherheit → Spracherkennung → Safari“, unklar = alle drei
    nummeriert; am Ende „Mia ganz schließen und neu öffnen“ mit kleiner
    Wisch-Animation. Bei Sperre der Kasten „Immer noch durchgestrichen?“
    (Website-Einstellungen in Safari). Android: Chrome → ⋮ Einstellungen →
    Website-Einstellungen → Mikrofon → Adresse → Zulassen → neu öffnen.
    Klein „Menünamen können je nach Handy leicht abweichen.“
  - „Zeig’s mir“ ein Schritt pro Bildschirm (große Schrift, Mini-Bild),
    am Ende „Nochmal testen“. „Details“ zeigt das Mikro-Protokoll mit
    „Kopieren“. „Darf ich zuhören?“ hat auf dem iPhone den Zusatz „Falls
    danach nichts passiert: Ich zeig dir, woran’s liegt.“
  - Danach: gelber Streifen „Mikro aus – tippen geht immer. Anmachen ›“,
    Mikro-Knopf grau + durchgestrichen (nie der Stopp-Knopf), Tipp darauf =
    Hilfe. Zurück in der App (`visibilitychange`) wird `navigator.permissions`
    neu gefragt; erlaubt → Streifen weg, kurz „✓ Mikro ist an“.
  - Bugfix: Bei jedem Mikro-Fehler wird die Aufnahme sofort zurückgesetzt
    (kein hängender Stopp-Knopf, keine laufenden Tracks).
  - Schritt-Karten und „Zeig’s mir“ sind ein gemeinsamer Baustein
    (`ui/StepGuide.tsx`: `StepList`, `StepGuide`) – auch für die Stimme.
- Stimme (Tafel 86): Einstellungen → Mia → Stimme oben „Probe hören“; ohne
  Premium/Erweitert-Stimme die Karte „Mia kann schöner klingen“ → Anleitung
  (`voiceSteps`: iOS ab 26 „Lesen & Sprechen“ unter „Sehen“ → „Stimmen“, sonst
  „Gesprochene Inhalte“; laden, dann antippen, Hinweis „Laden allein reicht
  nicht. Danach die Stimme antippen.“; Android Sprachausgabe von Google →
  Sprachdaten installieren, Samsung „Allgemeine Verwaltung“). Nach der
  Rückkehr in die App: „Neue Stimme gefunden: Anna. Nehmen?“ (Ja/Nein,
  `StimmenVorschlag`, bekannte Stimmen in `wasgibts.stimmen`).
- Stimme – weg vom Blech-Klang (Tafel 28): `speech.ts` nimmt immer die beste
  deutsche Stimme (Premium > Erweitert/Enhanced > Google-Netzstimme > Rest,
  Spaß-/Eloquence-Stimmen nie), Tempo „Normal“ = 1,0. `voiceGuide.ts`:
  `goodVoice` (gibt es eine gute?), `voiceSteps` (iOS bis 18 „Gesprochene
  Inhalte“, ab 26 bzw. unbekannt „Lesen & Sprechen“; Android
  Text-in-Sprache-Ausgabe → Google → Sprachdaten), `voiceOfferText`.
  - Im Chat (`VoiceOffer.tsx` über der Eingabe): beim Vorlesen „liest vor …“
    mit Lautsprecher (Tipp stoppt). Nach dem ersten Vorlesen EINMAL (nur
    ohne gute Stimme, Einmal-Hinweis `stimme-angeboten`): Karte „Klinge ich
    blechern? 🤖 Dein iPhone/Handy hat …“ mit „Schönere Stimme holen“ /
    „Passt so“.
  - Anleitung (`VoiceGuideSheet`): vier Schritte, „Zeig’s mir“, „Fertig
    geladen“, „Später“. Danach (und beim Zurückkommen in die App) neu
    nachschauen: grün „✓ Neue Stimme gefunden – ab jetzt spreche ich mit
    „Anna (Premium)“.“ + Probehören, sonst „Hm, ich finde sie noch nicht …“.
  - Einstellungen → Vorlesen: Überschrift „Mias Stimme“, Auswahl aller
    deutschen Stimmen mit Probehören; ohne gute Stimme „Schönere Stimme
    holen“. Nie unerwartet vorlesen: `auto` nur, wenn per Mikro gefragt.
- Vorlesen (`speech.ts`): `shouldRead` – `auto` nur, wenn per Mikrofon
  gefragt. Tempo 0,8 / 0,95 / 1,2. `pickVoice` wählt eine deutsche Stimme
  passend zur Art, natürlichere zuerst (`isNaturalVoice`); fehlt eine
  passende, einmal `VOICE_HINT`. `unlockSpeech` beim ersten Tippen (iPhone).
  Klappt es nicht, passiert einfach nichts.
- Per Satz ohne KI: „Lies mir vor“, „Nicht mehr vorlesen“, „Sprich langsamer“
  (`readingChange`).

### Mias Stimme und Ohr vom Server (seit v0.98, ElevenLabs)

- Nur mit `ELEVENLABS_API_KEY` (Vercel, Sensitive) und echter KI; Stimme
  `MIA_VOICE_ID` (nicht geheim), Modelle per `ELEVENLABS_TTS_MODEL`
  (`eleven_flash_v2_5`) bzw. `ELEVENLABS_STT_MODEL` (`scribe_v1`). Fehlt der
  Schlüssel: Routen antworten „aus“ (503), die App spricht und hört über den
  Browser. Testmodus `STIMME_MOCK=1` (nie Produktion): Stille als WAV, fester Text.
- Server `begleitung/stimmeServer.ts` (Routen `/api/stimme`, `/api/hoeren`
  dünn): gleicher Zugangscode und Grenzen wie die KI (`guard.ts`,
  `rateLimit.ts`, eigene Zähler je Gerät/IP), Text vor dem Senden durch
  `vorlesText` (= `tidyMiaText` + `cleanForSpeech`, gemeinsam mit dem
  Handy), höchstens 600 Zeichen je Stück. Aufnahmen höchstens 3 MB / 60 s,
  nur `audio/*`, werden nur weitergereicht. Ins Log nur „Stimme:
  Anbieter-Fehler“ + Status. Status steht im KI-Status (`GET /api/lotte` →
  `stimme: { sprechen, hoeren, v }`, `v` = Kennung von Stimme+Modell).
- Feste Sätze (`FESTE_SAETZE` in `stimmeProtokoll.ts`): `GET
  /api/stimme?satz=<Nr>&v=<Kennung>` ohne Zugangscode, lange gültig
  zwischengespeichert (Server-Instanz, Netz, Gerät).
- App `stimmeClient.ts`: `speak()` (speech.ts) nimmt bei „Mias Stimme“
  (`wasgibts.vorlesen.quelle`, Standard `mia`) den Server: Antwort in
  Stücken (~300 Zeichen) holen, nacheinander über EINEN beim ersten Tippen
  freigeschalteten Abspieler (iPhone). Erste Silbe nach höchstens 1 s, sonst
  bzw. bei Fehlern liest die Stimme des Handys den Rest (`ersatz`).
- Hören (nur Bühne, `useSpeechInput` → `aufnahme.ts`): getUserMedia +
  MediaRecorder, Pegel alle 50 ms (`lauschen.ts`, rein): Sprechen ab ~150 ms
  am Stück über dem Grundrauschen, Ring nach 0,6 s Stille, abgeschickt nach
  2,5 s, nichts gesagt → nach 8 s leise aus, höchstens 60 s. Danach „denkt“
  Mia, `aufnahmeVerstehen` schickt den Ton; Fehler einmal still nochmal,
  dann „Hat grad nicht geklappt. Nochmal?“; 503 → bis zum Neuladen Browser.
- Mikro-Check mit Server-Ohr: nur „Mikrofon erlaubt“ und „Ton kommt an“.
- Kosten: `recordStimme` (Zeichen, Sekunden, geschätzte Dollar) in
  `wasgibts.verbrauch`, sichtbar unter „Für Entwickler“.
- Pinnwand-Sprachnachrichten gehen nie an ElevenLabs (Test).

### Mails

- Nie automatisch senden, kein Postfach. Werkzeuge `mail_entwurf` und
  `antwort_knoepfe`; ohne KI `localReply`, `localNewMail`, `reviseDraft`
  (`mailRules.ts`). Karte `MailCard`: „In Mail öffnen“ (`mailtoHref`),
  Kopieren, Ändern (Kürzer, förmlicher, Du/Sie, lockerer). Du/Sie wird je
  Empfänger gemerkt (`rememberTone`). Termine in der Mail (`eventsIn`) werden
  als Vorschlag angeboten.

### Gesicht und Zustände

- Mia als Linien-Icon: `components/ui/MiaLineIcon` (seit v0.99) – gleiche Form
  wie `BegleitungAvatar` (Maßstab 0,3), nur Umriss, Linienstärke 2,
  `currentColor`; für Stellen zwischen anderen lucide-Symbolen (Erster Start
  „Zeig mal“, später Seiten-Tipps). Das farbige Gesicht bleibt `BegleitungAvatar`.

- `BegleitungAvatar` (Kreis in der Lieblingsfarbe, Sprechblase mit Gesicht;
  dunkle Farben mit feinem Rand). Zustände setzt nur die App
  (`avatarState.ts`): zuhören > sprechen > denken > verwirrt >
  freuen/begrüßen > schlafen > ruhig. Mikrofon → zuhören, KI lädt → denken,
  Fehler-Antwort → verwirrt, Vorlesen → sprechen, einmal am Tag begrüßen
  (`greetOncePerDay`), Feierabend mit Ruhe → schlafen (Leiste antippen weckt).
- Mia-Knopf unten rechts (`MiaButton`, seit v0.62, statt der Schreib-Leiste):
  72 px, atmet leicht (1,00–1,025 über 4 s) mit weichem Schein; Tippen holt
  Mia auf die Bühne, lange drücken = sofort sprechen, Loslassen = absenden;
  einmal der Hinweis „Tippen & sprechen“ (`mia-knopf`). Auf der Startseite
  zeichnet ihn der Pager.

### Eine Bühne für jedes Gespräch (seit v0.70, ersetzt „Mia in der Mitte“)

- Ein Ort für alles (`MiaStage.tsx`, Regeln in `lib/begleitung/stage.ts`):
  Startseiten-Mia, „＋“ in Kacheln, Termin per Satz, Wochencheck und die
  Kochidee öffnen dieselbe Bühne. Die Seite dahinter bleibt sichtbar – weich
  verschwommen (`backdrop-blur-[14px]`, als Tailwind-Klasse – roh in CSS blieb
  nach dem Bauen nur die -webkit-Form) unter dem warmen Schleier
  (`bg-background/75`, Dunkel entsprechend). Oben ✕ (immer, auch im
  Wochencheck) und „Verlauf“. Kein Mikrofon-Knopf, keine Schreib-Leiste.
- Danebentippen schließt (seit v0.101): jede freie Fläche mit `data-daneben`
  (Schleier, Gesprächsfläche zwischen den Blasen, Mias Bereich). Ist die
  Tastatur offen, schließt der erste Tipp nur die Tastatur.
- Mia (`StageMia`) steht groß (120 px) im unteren Drittel, Mittelpunkt bei
  ~64 % der Höhe über der Safe-Area (`StageFoot`). Sie fliegt beim Öffnen
  vom Mia-Knopf an ihren Platz und beim Schließen (✕, Danebentippen,
  Runterwischen, Zurück, Escape) dorthin zurück; dabei blenden Schleier und Gespräch aus
  (`data-closing`, 0,8 s). Bewegung reduzieren = nur Überblenden.
- Oben läuft das Gespräch mit (`ChatHistory`): neueste Blase unten, endet
  immer über Mia. Mias Blasen links in Weiß mit kleiner Mia (36 px) nur bei
  der ersten Blase einer Folge (`firstOfRun`), eigene rechts in Orange; beim
  Sprechen erscheint der Text live als eigene Blase. Vorschauen (Termin,
  Aufgabe, Einkauf, Gericht …) als Karten mit „Passt“/„Übernehmen“. Kleiner
  Bereichs-Kopf über Mias erster Blase nur mit Anlass (`stageTopic`:
  KOCHIDEE, WOCHENCHECK, TERMIN, AUFGABE, EINKAUF, NOTIZ, PINNWAND;
  `ChatState.topic`). Jedes Öffnen beginnt ein neues Gespräch
  (`ChatState.since`), „Verlauf“ zeigt alles (mit „Neues Gespräch“).
- Zustände (`stageState`, automatisch): hört zu (Mund offen, zwei Kreise,
  Tonwelle darüber, „Fertig? Einfach Mia antippen“) · überlegt (Augen nach
  oben, drei Punkte) · spricht (Mund beim Vorlesen bzw. beim Erscheinen der
  Antwort) · wartet (atmet, zwinkert alle ~5 s, ruhige Einlade-Kreise, „Tipp
  mich an, wenn du noch was hast“). Mia antippen = zuhören ↔ fertig
  (`stageTap`). Nach Mias Antwort wartet sie; nur bei einer Rückfrage mit
  Knöpfen hört sie nach dem Vorlesen kurz mit (8 s).
- „Lieber tippen“ unter Mia: das Feld kommt, Mia wird klein (64 px) und
  steht direkt darüber (`stageLayout`); Tastatur zu (nichts getippt) → Mia
  wieder groß. Mikro aus/gesperrt: direkt das Tippfeld mit dem Streifen
  „Mikro aus – tippen geht immer · Anmachen ›“ – Mia antippen öffnet nie das
  große Hilfefenster. Der Zugangscode erscheint als Hinweis im Gespräch.
- „Passt“ (Knopf) oder „ja/passt/mach“ übernimmt; Mia freut sich, unter ihr
  „Erledigt“, nach ~1 s zu, Meldung „Übernommen“.
- „＋“ holt nie Mia (seit v0.72.0, Tafel 76): „＋ = tippen, Mia = sprechen“ –
  jedes ＋ öffnet die Schnelleingabe (`docs/bereiche/core.md`). Der frühere
  Modus „eintragen“ und „Lieber Formular“ sind weg.
- Wochencheck auf der Bühne: Mias Satz oben, das Gesagte als eigene Blase
  (Kernwörter fett), „Ich hab schon“; Mia antippen beim Zuhören = fertig
  (sortieren), „Lieber tippen“ = Feld + „Fertig“.
- Bewegung (globals.css „Mia zuerst“ und „Eine Bühne“): 0,8–1,2 s,
  `cubic-bezier(.16,1,.3,1)`, nur transform/opacity.
- Tests: `tests/begleitung/buehne.test.ts`, Durchklick `buehne`
  (`e2e/ablaeufe/miazuerst.mjs`).

### Erster Start und neue Person

- `HelloScreen` (Tafel 55, seit v0.67): Mia groß und rund (132 px), „Moin, ich bin Mia.“ (seit v0.92; Name über
  `helperName()` in Orange, eine Zeile mit `clamp(26px,9vw,38px)`)
  (vorher seit v0.77 „Moin!“ mit orangem „!“), „Erzähl einfach,
  was ansteht. / Ich sortier das.“ (zwei Zeilen, seit v0.91), „Los geht’s“
  (`startFresh`), mit Konten „Schon ein Konto? Anmelden“. Unten seit v0.91
  (Tafel 84, Variante A) nur ein ruhiger, mittiger Abschluss ohne kleines
  Logo: „Gemacht in Eutin von KARAMBA Eis“ (nie umbrechend, Schrift per
  `clamp`), darunter leiser „Datenschutz · Impressum“ (Links, 44-px-
  Tippfläche über `hit`), ca. 40 px über der Unterkante. Immer „KARAMBA Eis“. Die
  Deko-Kacheln und die Leiste mit Mikro sind weg. Ablauf (`HELLO_T` in
  `core/hello.ts`): 0 s Mia, 0,95 s Überschrift tippt, 1,8 s Zeile, 2,0 s
  Freudensprung, 2,2 s Knopf, Link und Abschluss unten. Beim Start fliegt Mia in die
  Jetzt-Karte.
- Freudensprung (v0.68.1, einmal je Anzeige, ohne Antippen, 2,8 s, nur
  transform/opacity): ducken (Augen ^ ^) → Sprung bis ~115 px (auf kleinen
  Bildschirmen nur so hoch, wie oben Platz ist, `--jump`) mit einer Drehung
  → Landung breit, federt aus, Mund lacht, 8 Funken (`--app-spark-*`),
  leichtes Vibrieren → ab 1,05 s Sprechblase „Ich bin bereit!“ oben rechts
  (`HELLO_READY`, 2,5 s) → zwei kleine Hüpfer; „Los geht’s“ pulsiert bei
  2,15 s und 2,8 s; der Schatten wird im Sprung kleiner und heller
  (`helloJump`). Neuaufbau mitten in der Begrüßung: kein zweiter Sprung.
  Bewegung reduzieren: kein Sprung, nur die Sprechblase.
- Antippen = kitzelig: ~1 s kichernd hin und her (±10°, gedämpft), Augen ^ ^,
  Mund lacht, drei Herzen, Sprechblase (`HELLO_TAPS`: zuerst „Hihi,
  kitzelig!“, danach im Wechsel); im Sprung erst danach.
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
- Wochencheck (Tafel 36): Werkzeug `woche_eintragen` (calendarTools) legt alle
  Punkte eines frei gesprochenen Wochenüberblicks als Vorschläge an (Op
  `upsert_entry` mit `hint` für Vorschläge wie Sport in freien Lücken).
  Nachrichten mit „[Wochencheck]“ bekommen das große Modell und 16000 Tokens
  (`isWeekCheck`). Testmodus: `weekCheckUses` übersetzt mit `parseWeekTalk`.
  Fenster und Regeln: siehe `docs/bereiche/kalender.md`.

## Tests

- `tests/begleitung/`: `engine.test.ts`, `modellwahl.test.ts`,
  `schutz.test.ts`, `client.test.ts`, `prompt.test.ts`, `vorschau.test.ts`,
  `uebernehmen.test.ts`, `werkzeuge*.test.ts` (Essen, Kalender, Notizen,
  Startseite, Tag), `testmodus.test.ts`, `testmodusRunden.test.ts`,
  `regelnOhneKi.test.ts`, `tagesChat.test.ts`, `mails.test.ts`,
  `diktat.test.ts`.
- `tests/begleitung/stimme.test.ts` – Rangfolge (nur Standard, Erweitert,
  Premium, Google, Spaß-Stimmen), Menünamen je iOS-Version, Texte.
  Durchklick `stimme` (Schein-Stimmen `FAKE_VOICES` in `e2e/lib.mjs`):
  Angebot nur bei Standardstimme, neue Stimme → grüne Karte, „Passt so“ →
  nie wieder. Bilder: `stimme-angebot`, `stimme-anleitung`.
- `tests/core/mikrofon.test.ts` – Gerät, Fehlerarten, Schritte je Gerät und
  iOS-Version, Vorab-Frage, Sperre/Freigabe.
- Durchklick `mikrofon` (`e2e/ablaeufe/mikrofon.mjs`, Schein-Fehler über
  `FAKE_MIC` in `e2e/lib.mjs`): Vorab-Frage, Hilfe, „Zeig’s mir“ 4 Schritte,
  Streifen + grauer Knopf, Diktieren aus; iPhone- bzw. Android-Texte. Bilder:
  Szenen `mikro-fragen`, `mikro-hilfe`, `mikro-zeigen`. Testgeräte haben das
  Mikrofon sonst erlaubt (`newPage`).
- `tests/begleitung/stimmeServer.test.ts` – Mias Stimme/Ohr vom Server:
  ohne Schlüssel „aus“, Text bereinigt, nie Ton/Text im Log, Grenzen, feste
  Sätze zwischengespeichert, Satzende am Pegel, Kosten, Mikro-Check ohne
  Spracherkennung, Pinnwand nie über den Anbieter. Durchklick `stimmeServer`
  und `ohrServer` (`e2e/ablaeufe/serverstimme.mjs`, Server nachgestellt).
- `tests/einstellungen/neuePerson.test.ts`, `erkennung.test.ts`,
  `kiErkennungApp.test.ts`.
- `tests/app/regeln.test.ts`: kein fest eingebauter Name der Begleitung in
  sichtbaren Texten.

## Mia heißt Mia (v0.67)

- Name an einer Stelle: `APP_NAME` (`src/lib/core/app.ts`); `helperName()`
  liefert immer ihn, `helperTitle()` „deine Assistentin“.
- „Ich nenn dich …“, „Sei lieber Theo“, „Nimm eine männliche Stimme“ →
  `stayMiaReply` (`helperTools.ts`): „Ich bleib lieber Mia 😊“ (bei Stimme
  mit Hinweis auf die Einstellungen). Mit KI über den Prompt; das Werkzeug
  `assistent_anpassen` und die Op `set_helper` gibt es nicht mehr.
- Profil v22: Theo, Lotte und eigene Namen → Mia (`migrateHelper`, alte Farbe
  bleibt in den Daten), einmal „Ab jetzt heiße ich überall Mia.“
  (`miaNotice`, KitchenHelper).


## Mia – die Familienmanagerin (seit v0.83, Tafel 81/82)

- Steckbrief und feste Sätze zentral in `src/lib/mia/persona.ts`
  (`steckbrief(name)` steht im System-Prompt; `SAETZE` je 3–5 Varianten,
  `miaSatz` nie zweimal dieselbe hintereinander; `VERBOTEN` prüft der Test).
- Lebendig ohne Ansprüche: `miaLook` in `src/lib/mia/zubehoer.ts` (rein,
  Datum/Uhrzeit/Wetter/Familie als Parameter) – EIN Zubehör, Rangfolge
  Familien-Geburtstag (Partyhut) > Anlass (Halloween Kürbis, 1.–24.12. Mütze,
  Silvester 23:55–1:00 Konfetti und wach, Ostern Ei) > Kochen (Timer läuft:
  Kochmütze) > Wetter (Schirm nur bei Regen jetzt/nächste Stunde,
  Sonnenbrille nur jetzt sonnig > 22 °C im Sommer) > Jahreszeit (Schal
  Dez–Feb). Nachts 22–6 schläft Mia, 6–8 verschlafen, ab 19 Uhr ruhiger.
  Gezeichnet in `MiaZubehoer.tsx`, angewendet über `useMiaLook` am Knopf.
- Kurze Momente (`miaMoment`, nur sichtbare Seite, nie Dauerschleife): Sturm
  (Böen ≥ 60 km/h jetzt) einmal wackeln, höchstens alle 30 Min; Herbst
  (Sep–Nov) ein fallendes Blatt, höchstens 1×/h. Reduzierte Bewegung = still.
- Bühne: „Danke“ → Herzchen-Augen und Herzen, Lob → Freudensprung
  (`src/lib/mia/reaktion.ts`), höchstens 1× je Gespräch und 3× am Tag.
  Nachts begrüßt Mia mit „Moin … äh, Nacht! Was liegt an?“ (Varianten).
- Knopf: 16 px Rand, 24 px über der Unterkante/Safe Area; Einstellungen →
  Mia → „Knopf links“ (Linkshänder, `wasgibts.miaknopf`).
- Tests: `tests/mia/familienmanagerin.test.ts`.

## Mia – die Familienmanagerin, Routinen (seit v0.83)

- Rein in `src/lib/mia/routinen.ts`, auf Heute über
  `src/components/heute/useMiaRoutinen.ts`:
  - Morgens 6–10 Uhr Jetzt-Karte „Moin! Fußball 15, Zahnarzt 16“, Zeile 2
    Wetter nur mit Planbezug („Ab 14 Uhr Regen. Regenjacke für Mathis?“).
  - Überschneidung zweier Termine mit Personen (auch < 15 Min Fahrtzeit):
    „Fußball und Zahnarzt – 15 und 16:10 Uhr. Das wird knapp. Wer fährt?“, in
    „Dein Tag“ mit genau 2 Knöpfen „Ich fahre“ (Notiz am Termin) / „Lisa
    fragen“ (Pinnwand-Nachricht). Kein Rot.
  - Abends 17–20 Uhr, wenn morgen früh etwas mit Notiz ansteht: „Morgen
    früh: Kita-Ausflug.“ – „Soll ich’s auf die Packliste setzen?“ → „Ja,
    bitte“ (Aufgabe „Packen: …“ heute) / „Hab ich schon“.
- Jede Frage nur einmal (`wasgibts.miafragen`). Nie im Beispiel-Tag.
- Tests: `tests/mia/routinen.test.ts`.
