# Hinweise für Claude

@AGENTS.md

## Arbeitsweise

- Nach jeder fertigen Änderung ohne Rückfrage: testen (`npm run build`,
  `npx tsc --noEmit`, `npm run lint`, bei UI-Änderungen zusätzlich ein
  Durchklick-Test im mobilen Browser), committen, Pull Request nach `main`
  erstellen und direkt mergen.
- Sprache der App und der Antworten: Deutsch.
- Gespeicherte Profile müssen bei Datenmodell-Änderungen weiter funktionieren
  (Version in `src/lib/profile.ts` erhöhen, `migrateProfile` erweitern).

## Produktentscheidungen

- Der Assistent (7 Schritte) wird nur beim ersten Anlegen verwendet. Danach
  zeigt `/profil` die Übersicht "Unsere Familie"; Personen und Bereiche werden
  dort einzeln bearbeitet (eigene Seiten unter `/profil/...`).
- Im Assistenten werden Namen nur in Schritt 2 "Wie heißen alle?" eingegeben;
  spätere Schritte zeigen sie nur an. Schritt 1 muss ohne Scrollen aufs iPhone
  passen.
- Grundregel im Assistenten: Ist ein Schritt länger als der Bildschirm und noch
  nicht bis unten gescrollt, scrollt "Weiter" erst zum nächsten offenen
  Abschnitt (`src/lib/stepScroll.ts`). Wischen links = Weiter, rechts = Zurück
  (nicht in Eingabefeldern und Elementen mit `data-no-swipe`).
- Personen-Schritte im Assistenten (Allergien, Mittagessen) beginnen mit einer
  Vorfrage ("Nein, alle essen alles" bzw. "Passt so – alle wie üblich" oder
  Personen auswählen). Nur ausgewählte Personen bekommen eine Einzelseite mit
  Personen-Leiste; "Doch nichts – überspringen" setzt sie zurück. Mittagessen
  "wie üblich" = `usualLunch()`: Erwachsene zu Hause, Kita-/Schulkinder
  auswärts, Kleinkinder zu Hause.
- Planungswoche = 7 Tage ab dem Einkaufstag (Profil `shoppingDay`, Standard
  Montag). Wochen werden unter dem Datum ihres ersten Tags gespeichert; nach
  einem Wechsel des Einkaufstags findet `resolveWeekKey()` die überlappende
  alte Woche. Datumslogik zentral in `src/lib/weekPlan.ts`
  (`weekStartFor`, `planningWeekStart`, `weekDayNames`).
- "Standardwoche" (früher "Wochenregeln") ist die Vorlage im Profil. Der
  Wochen-Check (`/woche/check`, optional `?woche=`) übernimmt sie als Startwert
  und speichert Vorgaben pro Woche separat. Startseiten-Karte: bis 2 Tage vor
  dem nächsten Einkaufstag "Diese Woche planen" (mit Vorgaben ausgeblendet),
  danach "Nächste Woche planen" bzw. "Nächste Woche steht ✓".
- Startseite: Kachel "Was ist noch da?" (Route bleibt `/schnellkueche`).
  Untertitel von Wochenplan, Einkaufsliste und Kochbuch sind dynamisch.
- Wunschtag: in der Standardwoche einstellbar (Tag, Mahlzeit, Mindestalter).
  Teilnahme ab Mindestalter, ohne Alter Schul-/Kitakinder ja, Kleinkinder nein.
  Reihum in `wishDay.order`; wer dran ist, ergibt sich aus der letzten
  gespeicherten Woche mit Wunsch. Der Wunschtag belegt einen Kochtag und zählt
  nicht bei Fleisch/Veggie/Fisch.
- Kochbuch (`/kochbuch`, `src/lib/cookbook.ts`): Rezepte mit Kategorie
  Fleisch/Vegetarisch/Fisch/Cheat Day, Herkunft "eigenes" oder "ki".
  KI-Rezepte später über `saveAiRecipe()` direkt (als Favorit) übernehmen.
  Feste Gerichte im Wochen-Check zählen in ihre Kategorie (Zähler kann nicht
  darunter sinken); ein Cheat-Day-Rezept setzt den Cheat Day auf diesen Tag.
- Wochenplan (`/wochenplan`, `src/lib/mealPlan.ts`): aktuelle und nächste
  Woche. `buildWeek()` setzt Plätze laut Profil (warme Mahlzeit), feste
  Gerichte, Wunsch, Ausflugstage und Cheat Day aus dem Wochen-Check zusammen
  und verteilt Kategorie-Hinweise auf freie Tage. Gespeichert werden nur
  eigene Einträge und Überschreibungen ("cleared") – der Wochen-Check bleibt
  unverändert. Die Kachel "Wochenplan" führt hierher, nicht zum Wochen-Check.
- Einkaufsliste (`/einkaufsliste`, `src/lib/shoppingList.ts`): Artikel aus
  Rezepten im Wochenplan werden immer neu berechnet (`buildShoppingList`,
  Mengen je Einheitenfamilie g/kg, ml/l addiert, Abteilung per Stichwort).
  Gespeichert pro Woche nur eigene Artikel, Häkchen und "Haben wir schon"
  (Schlüssel Zutat + Einheit). Standard-Woche und Kachel-Zähler: die Woche,
  für die gerade eingekauft wird (`planningWeekStart`).
