# Einstellungen

Kurz: Das Haushaltsprofil (Familie, Begleitung, Vorlieben, Darstellung) mit
Migration älterer Stände, die Einstellungs-Seiten unter `/profil`, „Mehr
Funktionen“ (Bausteine) und „Daten & App“ (sichern, einspielen, neu
anfangen).

## Wo im Code

- Profil `src/lib/einstellungen/`:
  - `profile.ts` – öffentlicher Einstieg, exportiert alles aus
    `profileModel.ts` (Modell, `createEmptyProfile`, `createPerson`,
    `APP_THEMES`, `LIMITS`), `profileHelper.ts` (Begleitung),
    `profileHousehold.ts` (Haushalt, Personen), `profileFood.ts` (Essen).
  - `profileStore.ts` – `migrateProfile`, `migrateHelper`, `loadProfile`,
    `saveProfile`, `clearProfile`, `subscribeProfile`.
  - `useProfile.ts` – `useProfile()` (`undefined` = lädt, `null` = keins).
  - `removePerson.ts` – Person mit allen Bezügen entfernen.
  - `welcome.ts` / `welcomeStore.ts` – erster Start (`startState`,
    `profileFrom`, `homeTilesFor`, `startFresh`, `clearWelcome`,
    `useWorkRoom`).
  - `onboarding/` – neue Person im Gespräch (siehe `begleitung.md`).
  - `personLunch.ts` – Mittagessen je Person.
- Oberfläche `src/components/einstellungen/`:
  - `ProfilePageContent.tsx` – `/profil`: ohne Profil `HelloScreen`, sonst
    `FamilyOverview`.
  - `FamilyOverview.tsx` – die Übersicht.
  - `settings/Hubs.tsx` – `FamilyHubView` (`/profil/familie`), `FoodHubView`
    (`/profil/essen`), `DataView` (`/profil/daten`), `householdTitle`.
  - `settings/MiaView.tsx` – Seite der Begleitung (`/profil/kuechenhelfer`).
  - `settings/BegleitungSettings.tsx` – `DarstellungGroup`, `FarbeChoice`.
  - `settings/ReadingView.tsx` – `VoiceSettings` (Vorlesen, Stimme, Tempo).
  - `settings/SettingsParts.tsx` – `Group`, `Row`, `ChoiceCards`,
    `SettingsPage`, `SwitchRow`, `PersonRow`, `AddRow`, `DataSection`.
  - `settings/DayRoutineView.tsx`, `settings/MailSettingsView.tsx`.
  - `BausteineView.tsx` – „Mehr Funktionen“.
  - `ProfileEditPage.tsx`, `AreaEditViews.tsx`, `CookingEditViews.tsx`,
    `Editors.tsx`, `PersonEditView.tsx`, `PersonEditors.tsx`,
    `PersonRemoval.tsx` (`usePersonRemoval`), `ProductsView.tsx`,
    `NeverAgainView.tsx`, `WeatherPlaceForm.tsx`.
- Begleitungs-Auswahl: `src/components/begleitung/BegleitungPicker.tsx`.
- Bausteine: `src/lib/core/features.ts`.
- Seiten: `src/app/profil/*/page.tsx`.

## Daten und Speicher

- Profil unter `familienkueche.haushaltsprofil` (alter Arbeitsname, nicht
  ändern), aktuell Version 20, in der Sicherung. Eintrag im
  Speicher-Verzeichnis `core/storage.ts` mit Version 20.
- `HouseholdProfile` u. a.: `householdName`, `adults`, `kids`, `persons`,
  `householdType`, `helper`, `theme` + `themeSet`, `helperMode`, `display`,
  `tips`, `weekendIdeas`, `pause`, `planStyle`/`planWeek`/`mixSuggest`,
  `shoppingDay`, `warmMeal`, `mealClock`, `weekRules`, `wishDay`, `likes`,
  `likesBlocked`, `neverAgain`, `favoriteDishes`, `bases`, `healthTips`,
  `cookingStyle`, `newPerWeek`, `kitchenMachine`, `weather`, `updatedAt`.
- `Person`: `id`, `role` (erwachsen/kind), `name`, `allergies`, `dislikes`,
  bei Kindern `ageGroup`/`age`, `weekdayLunch`, bei Erwachsenen `employed`.
  Allergien und „mag nicht“ hängen an der Person.
- Migration (`migrateProfile`): nimmt Versionen 1–20 an, jede andere →
  `null`. Fehlende Felder bekommen Standards, nichts geht verloren. Beispiele:
  bis v6 ohne Namen → „Lotte“, sonst Standard Mia (`migrateHelper`); bis v18
  Art/Farbe aus dem Namen; bis v17 offene Pausen ohne Ende entfernt; bis v19
  ohne eigene Wahl → Hell, Dunkel bleibt (`migrateTheme`); „frisch“ →
  Automatisch. `createLocalStore` schreibt den migrierten Stand einmal zurück.
- Neue Felder: Version in `profileModel.ts` erhöhen, `migrateProfile`
  erweitern, Version in `STORAGE` anpassen.
- `saveProfile` gleicht die Personen an `adults`/`kids` an (`syncPersons`),
  ordnet die Wunschtag-Reihenfolge neu und setzt `updatedAt` über `now()`.
- Erster Start: `wasgibts.willkommen` v1 (nur `help`, steuert den Raum
  „Arbeit“ über `useWorkRoom`; nicht in der Sicherung).
- Bausteine: `wasgibts.funktionen` v2 `{ on: Feature[] }`, in der Sicherung.
  v1 mit `legacy` wird zurückgesetzt, Genutztes als Bausteine übernommen.

## So verhält es sich

### Übersicht `/profil` (`FamilyOverview`)

- Oben zwei große Karten: Familie (bis 3 Personen-Kreise, „3 Personen ·
  Familie mit Kindern“ → `/profil/familie`) und Begleitung (Avatar, Name,
  Anrede → `/profil/kuechenhelfer`).
- Gruppe „Startseite“: Startseite bearbeiten (öffnet den Bearbeiten-Modus
  auf der Startseite), Tagesablauf (Wert „Jetzt-Karte an/aus“), Wetter-Ort
  und Sport nur mit sichtbarer Kachel, Tipps aus der Region nur mit Quelle +
  Baustein, „Mehr Funktionen – Was {Name} noch kann“.
- Gruppe „Essen“ nur mit passendem Baustein: Kochstil, Essen & Vorlieben
  (Kochstil), Feste Tage (Wochenplan), Rezepte, Vorrat.
- Darstellung: Automatisch · Hell · Dunkel (`DarstellungGroup`, setzt
  `themeSet: true`).
- Ohne Überschrift: Spendentopf, Mails, Daten & App (Wert = Version).
  Darunter „Über die App“ und `versionLabel()`.
- Unterseiten über `SettingsPage`: klare Frage oben, wirken sofort, unten
  „Gilt sofort – nichts wird gelöscht.“ Ohne Profil: „Profil anlegen“.

### Haushalt und Personen

- `HOUSEHOLD_TYPES`: Nur für mich · Zu zweit · Familie mit Kindern ·
  WG/Mehrpersonen. `deriveHouseholdType` (Kinder → Familie),
  `fitHouseholdType` hält den Typ passend, `hasKids`, `isSolo` (du-Form),
  `isSmallHousehold` (1–2 Personen).
- `/profil/familie`: Personen (sortiert nach `PERSONS` aus `core/sort.ts`:
  Erwachsene, Kinder nach Alter, Name; `persons[0]` bleibt „ich“),
  Hinzufügen bis `LIMITS` (8 Erwachsene, 8 Kinder), nach links wischen zum
  Entfernen. Haushalt: Für wen kochst du?, Zusammen warm essen, Einkaufstag
  (nur mit Planung), Eure Produkte & Läden.
- Entfernen (`removePerson`, `usePersonRemoval`): Rückfrage, danach Meldung
  mit „Rückgängig“. Aufgeräumt werden Personenzahl, Wunschtag-Reihenfolge,
  Wünsche in Wochen-Vorgaben (→ keiner) und im Plan (→ normales Gericht).
  Die letzte Person bleibt (freundlicher Hinweis).
- Allergien & Unverträglichkeiten und „mag nicht“ je Person
  (`PersonEditors.tsx`, Vorschläge `COMMON_ALLERGIES`). Streng geprüft in
  `lib/begleitung/diet.ts` (auch versteckte Zutaten).

### Begleitung

- `STANDARD_HELPERS`: Mia (Assistentin, Orange) und Theo (Assistent,
  Nachtblau); `DEFAULT_HELPER` = Mia. Name bis 20 Zeichen
  (`HELPER_NAME_MAX`). `voice` folgt immer der Art (`voiceForArt`,
  `helperWith`).
- `AVATAR_COLORS`: 10 Farben (Orange, Nachtblau, Himmelblau, Lila, Beere,
  Rosa, Koralle, Senf, Waldgrün, Anthrazit), `avatarHex`. Die Farbe gilt für
  Gesicht UND App-Icon; alle übrigen App-Farben bleiben fest.
- Seite der Begleitung (`MiaView`, Titel = Name): Name & Art
  (`BegleitungPicker`: zwei Karten mit „Stimme“-Probe, eigener Name mit Art
  und Farbe), Farbe (`FarbeChoice` mit Icon-Vorschau und
  `iconChangeHint`), Vorlesen/Stimme/Tempo, „Wie oft melde ich mich?“ Selten ·
  Normal · Gern (`helperMode` locker/normal/dranbleiben), Tipps (mit Baustein),
  Wochenend-Ideen (mit Baustein), Pause. Neue Art → fest gewählte Stimme auf
  „passend“ zurück.
- Texte nur über `helperName`, `helperTitle` („deine Assistentin“/„dein
  Assistent“), `helperMessage`.

### Aussehen (seit v0.64, Tafel 51)

- Abschnitt „Aussehen“ in `/profil` (`DarstellungGroup`, Bausteine in
  `components/einstellungen/aussehen/LookChoice.tsx`): oben die zwei Looks
  der Startseite als Mini-Vorschauen („Farbig“ – farbige Kacheln, „Schlicht“
  – helle Kacheln, Farbe als Akzent; oranger Rahmen + Haken), darunter Hell ·
  Dunkel · Automatisch und „Meine Farbe im Kalender“ (10 Farben) mit dem Satz
  „<Name> und das App-Icon bleiben immer orange.“ Wirkt sofort.
- Profil v21: `look` (`farbig` | `schlicht`, Standard `farbig`) und
  `calendarColor` (bis v20 die Lieblingsfarbe der Begleitung `helper.farbe`;
  die alte Angabe bleibt in den Daten, färbt aber nichts mehr). `data-look`
  am `<html>` über `applyLook` (`core/theme.ts`, auch im Boot-Skript).
- `theme`: `warm` (Hell, Standard neuer Profile), `nacht` (Dunkel), `auto`
  (wie das Handy). Umgesetzt in `core/theme.ts` und `ThemeSync` (siehe
  `core.md`).
- Mia und das App-Icon sind immer orange (`BegleitungAvatar`, `IconSync`,
  Manifest); die Farbwahl auf Mias Seite und „Mach dich lila“ gibt es nicht
  mehr.
- Mia: „Mach die Startseite ruhiger / dezenter / schlichter / sachlicher /
  weniger bunt“ → Schlicht, „bunter / farbiger / wieder farbig“ → Farbig
  (`settingsChange`; mit KI als `app_befehl`-Vorschlag mit „Übernehmen“).

### Mehr Funktionen (`/profil/bausteine`)

- `BAUSTEINE`: Wochenplan, Vorrat & Tiefkühler, Rezepte, Backen mit Timern,
  Spontan-Ideen, Tipps, Wochenend-Ideen, Kochstil & Vorlieben – je Icon, Name,
  Satz, `where`. `TIPS_BAUSTEIN` (Tipps aus der Region) nur, wenn eine Quelle
  läuft. `modi` und `ideen` sind Features ohne eigene Zeile (`ideen` kommt
  mit `spontan`).
- An/Aus mit Meldung (`where` bzw. „… ist aus – die Daten bleiben.“) und
  „Rückgängig“. Aus heißt nur ausgeblendet.
- API: `featureOn`, `useFeature`, `useBausteine`, `setFeature`,
  `unlockFeature`, `bausteinOf`; Seiten eines Bausteins hinter `FeatureGate`.

### Daten & App (`/profil/daten`)

- Auch ohne Profil erreichbar (Hallo-Bildschirm „Ich habe eine Sicherung“).
- „Daten sichern“: Datei über das Teilen-Menü bzw. Download
  (`createBackup`, `backupFileName`). „Daten wiederherstellen“: Vorschau
  (`backupSummary`) und Rückfrage, dann `restoreBackup` und Neuladen.
  Details in `core.md`.
- „Neu beginnen (Profil zurücksetzen)“: Rückfrage, dann `clearProfile` +
  `clearWelcome` (auch Beispiel-Tag) und zurück zu `/profil` (Hallo).
  Termine, Pläne, Listen und Notizen bleiben – so sagt es auch die Rückfrage
  (bis Etappe 8 versprach der Text, Pläne und Listen seien danach weg).
- „Einmal-Hinweise zurücksetzen“ (leise, unter „Neu beginnen“, nur im
  Testmodus = `useAssistantStatus(true)?.mock`): `resetHints` – alle
  Einmal-Hinweise (z. B. „Neue Kacheln holen“) kommen beim nächsten Mal
  wieder. Löscht nichts sonst.

### Erster Start

- „Los geht’s“ → EIN Bildschirm „Wie magst du’s?“ (`LookStep`, „Jederzeit
  änderbar.“, Farbig vorausgewählt, Antippen zeigt die Wahl sofort, „Weiter“
  und leise „Überspringen“) → `startFresh(look)`: `startState()` (Mia,
  Termine/Essen/Einkauf, „mal so, mal so“), Profil daraus mit dem Look,
  `DEFAULT_HOME`, `startDemo()`. Sonst keine Fragen.

## Begleitung (Mia)

- Per Gespräch ohne KI (`settingsChange` in `lib/begleitung/settingsChat.ts`,
  sofort, mit Rückgängig): „Jonne isst jetzt vegetarisch/vegan/wieder
  Fleisch“, „Lisa mag keine Pilze“, „… allergisch gegen …“, „Ich koche jetzt
  spontan“, „Mach die Ansicht dunkel/hell/automatisch“, „Zeig mir alles“,
  „Melde dich seltener/öfter“, „Keine Tipps mehr“, Wochenend-Ideen an/aus.
- Sich selbst ändern: „Ich nenn dich ab jetzt Frieda“, „Sei lieber Theo“,
  „Nimm eine männliche Stimme“, „Mach dich lila“ (`parseHelperCommand`; mit
  KI `assistent_anpassen`, Op `set_helper`, Vorschau).
- Neue Person: „Oma Rosi wohnt jetzt bei uns“ → geführtes Gespräch.
- Bausteine: `baustein_an`/`baustein_aus` bzw. „Zeig mir den Vorrat“.
- Pause: `pause_setzen`/`pause_beenden` (nur bei echter Abwesenheit).

## Tests

- `tests/einstellungen/profilMigration.test.ts` – alte Profile, nichts geht
  verloren.
- `tests/einstellungen/haushalt.test.ts` – Haushalt, Begleitung, Essen.
- `tests/einstellungen/personEntfernen.test.ts`, `neuePerson.test.ts`,
  `erkennung.test.ts`, `kiErkennungApp.test.ts`, `ersterStart.test.ts`.
- `tests/core/bausteine.test.ts`, `speicherBausteine.test.ts` – Bausteine.
- `tests/core/sicherung.test.ts`, `verzeichnis.test.ts` – Sicherung.
- `tests/begleitung/regelnOhneKi.test.ts` – Einstellungen per Satz.
