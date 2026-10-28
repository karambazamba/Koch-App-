# Core

Kurz: Das Fundament aller Bereiche – Speicher-Verzeichnis und Sicherung,
zentrale Zeit, Zurück-Navigation, Meldungen und Rückgängig, feste
Sortier-Regeln, Design-System, Service Worker, App-Icons und Manifest.

## Wo im Code

- `src/lib/core/`:
  - `storage.ts` – `STORAGE`, `StorageKey`, `BACKUP_KEYS`, `RETIRED_KEYS`,
    `removeRetiredKeys`, `OLD_TERMINE_KEY`.
  - `localStore.ts` – `createLocalStore`, `readRaw`, `writeRaw`.
  - `useExternalStore.ts` – einziger React-Zugang der Daten-Module.
  - `backup.ts` – `createBackup`, `parseBackup`, `backupSummary`,
    `restoreBackup`, `backupFileName`.
  - `now.ts` – `now`, `setNowForTests`, `nowIso`, `berlinTime`, `toIsoDate`,
    `fromIsoDate`, `addDays`, `todayIso`, `useToday`, `useMinutes`.
  - `navigation.ts` – Verlauf und Scrollhöhen; `useGoBack.ts`,
    `useBackCloses.ts`, `pageLabel.ts`.
  - `toast.ts` – `showToast`, `showDeleted`, `showDone`, `useToast`.
  - `undo.ts` – `pushUndo`, `undoLast`, `isRegisteredUndo`.
  - `abhaken.ts` – `STEHEN_MS` (1 s), `GLEITEN_MS` (0,8 s): Abhaken mit Bedenkzeit, gleich für Einkauf und Pinnwand.
  - `sort.ts` – alle festen Reihenfolgen.
  - `app.ts` – `APP_NAME`, `APP_VERSION`, `versionLabel`, `icon`, `iconFor`,
    `FARBE_COOKIE`, `CLOUD_SYNC`, `BEGLEITUNG_PUSH_ICON`, `BRAND_COLOR`.
  - `theme.ts` – `applyTheme`, `THEME_COLORS`, `THEME_BOOT_SCRIPT`.
  - `iconColor.ts` – `setIconColor`; `homescreen.ts` – `iconChangeHint`.
  - `features.ts` – Bausteine (siehe `einstellungen.md`).
  - Weitere: `avatarState.ts`, `entries.ts` (einheitliches Eintrags-Modell),
    `homeLayout.ts`, `demo.ts`, `hello.ts`, `hints.ts`, `darkTip.ts`,
    `activity.ts`, `celebrate.ts`, `text.ts`, `wakeLock.ts`,
    `useMobileKeyboard.ts`, `useNowMs.ts`.
- `src/components/core/`: `ServiceWorkerRegistration.tsx`, `IconSync.tsx`,
  `ThemeSync.tsx`, `NavigationMemory.tsx`, `FeatureGate.tsx`,
  `PlanningGate.tsx`.
- `src/components/ui/`: `styles.ts` (Klassen-Bausteine), `Sheet.tsx`,
  `ConfirmDialog.tsx`, `ToastHost.tsx`, `PageHeader.tsx`, `BackButton.tsx`,
  `QuickButton.tsx` (`QuickButton`, `PagePlus`), `ListRow.tsx`,
  `IconBadge.tsx`, `Category.tsx`, `ChoiceGroup.tsx`, `Segmented.tsx`,
  `SwipeRow.tsx`, `MoreMenu.tsx`, `PersonAvatar.tsx`, `TagInput.tsx`,
  `NameField.tsx`, `NumberStepper.tsx`.
- `src/app/globals.css` (Tokens), `src/app/manifest.ts`, `public/sw.js`,
  `next.config.ts`, `scripts/generate-icons.mjs`.

## Daten und Speicher

- `STORAGE` listet JEDEN Schlüssel genau einmal: `key`, `what`, `version`,
  `migration` (Ort), `area` (`local`/`session`/`indexeddb`), `backup`.
  `createLocalStore`, `readRaw` und `writeRaw` nehmen nur `StorageKey`
  (bzw. `RetiredKey`). Neue Daten zuerst dort eintragen.
- `createLocalStore(key, migrate)`: `load` ruft `migrate` auf und liefert
  dasselbe Objekt, solange sich nichts ändert (für `useSyncExternalStore`).
  Ändert die Migration die Version, wird der neue Stand einmal
  zurückgeschrieben. Defekte Daten werden ignoriert. `subscribe` hört auch
  auf andere Tabs (`storage`-Ereignis).
- `readRaw`/`writeRaw`: kleine Merker ohne Format, Fehler still (privater
  Modus, Server). `writeRaw(key, null)` löscht.
- `RETIRED_KEYS` (Bewertungen, Hinweise, Kennenlernen, Twists, altes Wetter,
  Tippkarten, alter Vorlese-Schalter) und Sitzungs-Schlüssel
  (`wasgibts.entwicklung`, `wasgibts.alleszeigen`) löscht
  `removeRetiredKeys` beim Start (im `KitchenHelper`). `wasgibts.termine`
  erst nach `migrateOldTermine`, den alten Vorlese-Schalter liest vorher
  `adoptLegacySpeech`.
- Sitzung (`sessionStorage`): `wasgibts.verlauf`, `wasgibts.spontan.filter`,
  `wasgibts.zeitvorschau`, `wasgibts.wetterszenario`.

## So verhält es sich

### Sicherung (`backup.ts`)

- `createBackup`: alle Schlüssel mit `backup: true` als
  `{app: "was-gibts", version, exportedAt, data}`. Aus der Pinnwand werden
  die Sprachnachrichten herausgenommen, nur ihre Zahl bleibt
  (`memosNichtGesichert`). Dateiname `was-gibts-sicherung-<Datum>.json`.
- `parseBackup`: nur Dateien dieser App; nur bekannte Schlüssel, nie
  Geräte-Daten (Zugangscode, Zähler, Geräte-Kennung …).
- `backupSummary`: „3 Termine, 5 Aufgaben, 2 Notizen, …, 2
  Sprachnachrichten (nicht gesichert), 3 Personen“, sonst „Einstellungen“.
- `restoreBackup`: löscht alle gesicherten Schlüssel, schreibt die Datei
  zurück; Geräte-Daten und die Sprachnachrichten dieses Geräts bleiben. Alte
  Formate migrieren beim nächsten Laden.

### Zeit (`now.ts`)

- Immer `now()` statt `new Date()`. Überschreibbar mit `setNowForTests` oder
  im Browser `window.__WASGIBTS_NOW__`. Datum/Uhrzeit in Europe/Berlin
  (`berlinTime`, auch auf dem Server). `useToday`/`useMinutes` für React.

### Navigation und Zurück

- `navigation.ts` merkt einen eigenen Verlauf und die Scrollhöhe je Eintrag
  (`wasgibts.verlauf`). Vorwärts startet oben, zurück an der alten Stelle
  (`restoreScroll` wartet, bis die Seite hoch genug ist; eigenes Scrollen
  bricht ab).
- `useGoBack`: mit Verlauf `router.back()`, sonst `router.replace(fallback)`.
  `router.replace` immer mit `expectReplace()`. Reiter-Wechsel der
  Startseite mit `expectTabSwitch()` (kein Sprung nach oben).
- Haus-Knopf (`ui/HomeButton.tsx`): nur tiefer als eine Ebene unter Heute;
  `stepsToHome(istHeute)` → `history.go(-n)` (Zurück über mehrere Ebenen räumt
  den Verlauf auf), ohne Heute im Verlauf `resetNavigation()` + `replace("/")`.
- Öffnen = Startseite (`heimkehr.ts`, `wasgibts.zuletztweg`, nicht in der
  Sicherung): beim Verstecken/Schließen gemerkt, beim Öffnen bzw. Zurückkommen
  geprüft und vergessen; mehr als 5 Minuten → Heute. Bleibt: Heute selbst,
  Kochmodus, `/e/`, Einladung, Anmelden, Konto, Rechtliches, Adressen mit
  Angaben (außer den Reitern Kalender/Essen).
- `BackButton` zeigt „‹ <vorherige Seite>“ über `previousUrl()` und
  `pageLabel()`.
- Fenster (`Sheet`, `ConfirmDialog`, Chat) schließen auch mit Zurück
  (`useBackCloses`: eigener Verlaufseintrag `{sheets}`), dazu ✕,
  Danebentippen, Runterwischen.

### Meldungen und Rückgängig

- `toast.ts`: eine Meldung zugleich (`ToastHost`), Standard 6 s.
  `showDeleted` „Gelöscht · Rückgängig“ 3 s, `showDone` „Erledigt ·
  Rückgängig“ 4 s. Hinzufügen und Übernehmen melden sich still – außer in
  der Schnelleingabe („Eingetragen: … · Rückgängig“, 4 s).
- `undo.ts`: jede Änderung legt ihr Zurücknehmen ab (höchstens 20, nur diese
  Sitzung). Das gelieferte Zurücknehmen wirkt nur einmal. `undoLast` = „Mach
  das rückgängig“ (letzte noch gültige).

### Schnelleingabe („＋ = schreiben, Mia = sprechen“, Tafel 76)

- Jedes ＋ ruft `openQuick({ kind, date?, more?, me?, quote?, shopping? })`
  (`core/schnelleingabe.ts`); `QuickEntryHost` (im KitchenHelper, überall)
  zeigt dann `ui/QuickEntry.tsx` – geladen erst beim ersten ＋.
- Fenster über `Sheet` (✕, Danebentippen, Runterwischen, Zurück), unten über
  der Tastatur: Kopf in der Farbe des Bereichs („NEUER TERMIN“, „NEUE
  AUFGABE“, „AUF DIE LISTE“, „NEUE NOTIZ“, „NACHRICHT AN ALLE“, Token
  `--app-tile-<id>-ac`), EIN Feld (16 px, `autoFocus`), rechts das orange ➤
  (leer blass, tut nichts). Kein Mikro – sprechen geht über den Mia-Knopf.
- Live-Chips ohne KI (`readQuick`, `quickChips`; dahinter `kalender/sentence`
  und `kalender/quick`): Termin „Fr, 23. Okt · 16:00“ (ohne Uhrzeit
  „ganztägig“) + „Familie“/„Arbeit“; Aufgabe „bis Mi, 28. Okt“/„heute“/kein
  Tag + „Familie“. Antippen ändert (Tag-Leiste, Familie ↔ Arbeit, nur wenn
  es Arbeit gibt); nötig sind sie nie. Kurze Wochentage („Fr 16 Uhr“, „am
  Sa“) erkennt `readSentence` seit v0.72.0.
- ➤ oder Return speichert sofort (`ui/quickSave.ts`): Termin (mit Uhrzeit 30
  Min Erinnerung), Aufgabe (Startseite: heute; Aufgaben-Seite: ohne Tag),
  Einkauf (alles auf die Liste, Unsicheres so wie getippt), Notiz, Pinnwand
  (mit Zitat bei Antworten). Meldung „Eingetragen: …“ / „Auf der Liste: …“ /
  „Notiert: …“ / „Hängt: …“ mit Rückgängig (auch `undoLast`). Das Feld
  bleibt leer und offen für die nächste.
- „Mehr Details“ schließt und öffnet das volle Formular mit dem Getippten
  (`EntryForm` für Termine und Aufgaben, Einkauf-Fenster, `PinWriteSheet`,
  Notiz-Auswahl). Auch dort kein eigenes Mikro mehr.
- Kalender-＋ und Tag-＋ = „NEUER TERMIN“ mit dem gewählten Tag; das frühere
  Fenster „Was möchtest du eintragen?“ (`AddSheet`) ist weg. Kalender
  übernehmen: Einstellungen → Kalender.

### Sortieren (`sort.ts`)

- EINE Stelle für alle festen Reihenfolgen, nie eigenes `localeCompare`.
  Deutsche, natürliche Sortierung (`compareText`, leer zuletzt), stabil
  (`sortBy`), Bausteine `first`, `asc`/`desc`, `ascNum`/`descNum`, `byName`,
  `via`.
- Benannte Regeln: `TERMINE`, `timeThenCreated`, `SHOPPING` (Gang durch den
  Laden `SECTION_WALK`), `SHOP_GROUPS`, `SHOPS`, `PANTRY`, `RECIPES`,
  `searchRank`, `IDEAS`, `NOTES`, `PINS`, `TIPS`, `TILE_PICKER`, `PERSONS`.

### Design-System

- Farben nur über Tokens in `globals.css`: `@theme inline` bildet
  `--color-*` auf `--app-*` ab; je Token ein heller (`:root`) und ein
  dunkler Wert (`:root[data-theme="nacht"]` und `data-theme="auto"` mit
  `prefers-color-scheme: dark`). Im Code nie `var(--color-…)`, nur
  `var(--app-…)`; keine festen Tailwind-Farben.
- Radien: `rounded-card` 20 px, `rounded-field` 14 px, `rounded-full`; mit
  eigenem Namen `rounded-bar` 28 px, `rounded-sky` 24 px, `rounded-pair`
  26 px, `rounded-icon` 22 %.
- Pastell-Kacheln: `--app-tile-<id>` / `--app-tile-<id>-ac` (hell und
  dunkel) für Pinnwand, Wetter, Termine, Aufgaben, Essen, Einkauf, Tipps,
  Sport, Vorrat, Timer, Notizen, Spendentopf. `data-tone="<id>"` um eine
  Kachel setzt `bg-tile`, `text-tile-accent`, `bg-tile-inner`,
  `text-tile-label`.
- Bausteine in `ui/styles.ts`: `CARD`, `CARD_LIST`, `buttonClass`,
  `ICON_BUTTON`, `chipClass`, `tileClass`, `PAGE_PLUS`, `TILE_PLUS_DOT`,
  `INPUT_BASE`/`INPUT` (16 px, kein iOS-Zoom), `LABEL`, `SECTION_TITLE`
  (15/800), `TILE_LABEL` (10/800, groß), `TILE`, `TILE_INNER`, `SUBTLE`,
  `NOTE`, `WARNING`, `FAB_CLEARANCE`, `PAGE_MAIN`.
- Ein Fenster für alles: `Sheet` (`layer` base/chat/above).

### Darstellung

- `THEME_BOOT_SCRIPT` setzt `data-theme` vor dem ersten Zeichnen aus dem
  Profil („frisch“ → auto, mit Profil ohne Wert → warm). `ThemeSync` hält
  `data-theme` und `theme-color` aktuell, bei `auto` auch beim Wechsel des
  Handys.

### Service Worker und neue Version

- `public/sw.js` (nur im Produktions-Build registriert): `CACHE_VERSION`
  (bei jeder Auslieferung erhöhen), Cache `familienkueche-<Version>`. Lädt
  alle Seiten, Manifest, Icons und `/demo/gericht.webp` vor. Seiten und RSC:
  Netz zuerst, offline aus dem Cache (sonst `/`). `/_next/static/`,
  `/icons/`, `/gerichte/`: Cache zuerst. `/api/` nie aus dem Cache.
- Beim allerersten Mal sofort aktiv, ohne Neuladen. Danach wartet eine neue
  Version: `ServiceWorkerRegistration` zeigt „Neue Version da – Antippen zum
  Aktualisieren“, erst das Antippen schickt `SKIP_WAITING` und lädt neu.
  Beim Zurückkehren in die App `update()`.
- `next.config.ts` liefert `/sw.js` ohne HTTP-Cache und setzt `BUILD_DATE`
  für `versionLabel()` („Version 0.47.7 · Stand …“).

### App-Icons und Manifest

- Quelle `scripts/generate-icons.mjs` (`npm run icons`). Dateinamen mit
  `ICON_VERSION` (v3), Pfade nur über `icon("…")` bzw. `iconFor(farbe, "…")`.
  Je Farbe aus `AVATAR_COLORS` ein Satz unter `public/icons/<farbe>/`
  (icon.svg, 192, 512, maskable 512, apple-touch-icon, favicon-32); in
  `public/icons/` zusätzlich favicon-48 und `lotte-192` (Push,
  `BEGLEITUNG_PUSH_ICON`). `favicon.ico` liegt in `src/app/`.
- `IconSync` → `setIconColor`: Cookie `farbe` (für das Manifest),
  apple-touch-icon und Favicon im `<head>` in der Lieblingsfarbe (ein
  Beobachter stellt sie nach Seitenwechseln wieder her).
- `src/app/manifest.ts`: liest das Cookie, feste `id: "/"`, `theme_color`
  `BRAND_COLOR`, Icons in der Farbe (unbekannt → Orange).
- `iconChangeHint`: nur als iPhone-Homescreen-App – das Icon bleibt, bis man
  die App neu hinzufügt; solange `CLOUD_SYNC` aus ist, mit Hinweis auf „Daten
  sichern“.

### Alte Adressen (`next.config.ts`, `OLD_PAGES`)

- `/ideen` und `/schnellkueche` → `/?seite=essen`; `/profil/ansicht`,
  `/profil/darstellung` → `/profil`; `/profil/lotte`, `/profil/vorlesen`,
  `/profil/farbe` → `/profil/kuechenhelfer`; `/profil/wochenende` →
  `/profil/kochstil`. Weiterleitung nicht dauerhaft (`permanent: false`).

## Begleitung (Mia)

- „Mach das rückgängig“ nimmt über `undoLast` die letzte gültige Änderung
  zurück (Regel ohne KI bzw. Werkzeug `rueckgaengig`).
- Mia ändert Farbe und Darstellung per Satz; Icon und Theme folgen über
  `IconSync`/`ThemeSync`.
- Sicherung und Speicher bedient sie nicht; sie verweist auf Daten & App
  (`iconChangeHint`).

## Tests

- `tests/core/speicher.test.ts`, `verzeichnis.test.ts`,
  `sicherung.test.ts` (echte Sicherungsdatei lässt sich einspielen),
  `abfragen.test.ts`.
- `tests/core/navigation.test.ts`, `wischen.test.ts`,
  `rueckgaengig.test.ts`.
- `tests/core/sortierung.test.ts`, `reihenfolgen.test.ts`.
- `tests/core/schnelleingabe.test.ts` (Satz → Chips, Speichern + Rückgängig,
  leer = nichts, jedes ＋ ohne Mia und Mikro); Durchklick `schnelleingabe`.
- `tests/core/oberflaeche.test.ts` (Hallo, Homescreen-Hinweis, Icon-Farbe,
  Hell/Dunkel).
- `tests/app/regeln.test.ts` (Speicher nur übers Verzeichnis, Zeit nur über
  `now()`, Fenster nur über Sheet/ConfirmDialog, Apostroph, Wortliste),
  `stilblatt.test.ts` (Tokens, keine festen Farben, kein `var(--color-…)`),
  `serviceWorker.test.ts` (alle Seiten vorgeladen), `umlaute.test.ts`.

## Leiste unten (v0.123.0, Tafel 96)

- `ui/Leiste.tsx` (im Layout über `KitchenHelper`, auf allen Seiten mit Profil),
  Logik rein in `core/leiste.ts`: `bereichVon` (Heute: Pinnwand, Einkauf,
  Notizen, Aufgaben, Timer, Wetter, Dein Tag, Einstellungen …; Kalender: `/tag`,
  `/woche`; Essen: `/kochbuch`, `/wochenplan`), `tabSchritt` (oben / wechseln /
  im Verlauf zurück zur Hauptseite mit `stepsToHome(istHauptseite)` / neu),
  `leisteVersteckt`, `randZurueck` und die Brücke `pagerAnmelden` /
  `bereichWaehlen` zum Pager (gemerkter Wunsch = Scrollhöhe bleibt).
- Mia-Knopf (`begleitung/MiaButton`, 60 px) sitzt rechts in der Leiste und ragt
  30 px heraus; „Knopf links“ setzt ihn links. Kein Wegrutschen mehr beim Scrollen.
- Ausblenden per CSS (`.leiste`): `data-weg` (Tastatur), offene Fenster
  (`[role=dialog][aria-modal]`, `alertdialog`), Testcode/Zustimmung, Bearbeiten;
  bei der Bühne nur unsichtbar (Mia fliegt von hier ein und zurück).
- `FAB_CLEARANCE` = Leiste + Mia + Luft, `UEBER_LEISTE` für Schwebendes.
- Wischen vom linken Rand auf Unterseiten = eine Ebene zurück
  (`core/RandZurueck`). Nach > 5 Min weg schließt eine offene Bühne
  (`closeHelper`). Der Haus-Knopf (v0.115) ist weg.
- Einmal-Hinweis „leiste-neu“ unter der Jetzt-Karte für alle, die die App schon
  vorher hatten. Tests `tests/core/leiste.test.ts`, Durchklick `leisteReiter`.
