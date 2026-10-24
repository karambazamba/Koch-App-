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
- Prüfstand (`pruefstand/`): 120 Alltagssätze mit erwarteter Aktion, Bewertung
  (Aktion, Datum/Uhrzeit/Person, max. 2 Sätze, Floskeln/Striche, Zeit),
  Route `/api/pruefstand` (nur mit `PRUEFSTAND_SECRET` bzw. `CRON_SECRET`,
  20 Sätze je Aufruf), Bericht unter „Für Entwickler“. Ziel ≥ 95 %.
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
  - Schritt-Karten und „Zeig’s mir“ sind ein gemeinsamer Baustein
    (`ui/StepGuide.tsx`: `StepList`, `StepGuide`) – auch für die Stimme.
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
  (`bg-background/75`, Dunkel entsprechend). Oben ✕ (bzw. „Abbrechen“) und
  „Verlauf“. Kein Mikrofon-Knopf, keine Schreib-Leiste.
- Mia (`StageMia`) steht groß (120 px) im unteren Drittel, Mittelpunkt bei
  ~64 % der Höhe über der Safe-Area (`StageFoot`). Sie fliegt beim Öffnen
  vom Mia-Knopf an ihren Platz und beim Schließen (✕, Runterwischen, Zurück,
  Escape) dorthin zurück; dabei blenden Schleier und Gespräch aus
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
