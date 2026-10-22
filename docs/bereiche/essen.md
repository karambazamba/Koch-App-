# Essen

Kurz: Was gibt’s heute – und was kann man mit dem kochen, was da ist? Der
Essen-Reiter zeigt das Gericht von heute, die Woche und Ideen aus dem Bestand.
Dahinter liegen Wochenplan, Rezepte, Backstube, Spontan-Ideen und Tipps –
jeweils als Baustein (`src/lib/core/features.ts`), alles Neue zuerst aus.

## Wo im Code

- Essen-Reiter (`/?seite=essen`): `src/components/essen/FoodPage.tsx`
  (`DishHero`, Woche, `ShoppingChips`), `CookFromStock.tsx` (`StockChips` =
  „Das ist da“, `CookIdeas` = „Daraus kannst du kochen“),
  `BausteinSections.tsx`, `SwapSheet.tsx` (das eine Fenster „Was koche ich?“),
  `useMeals.ts`, `DemoFoodTile.tsx` (Beispielgericht), `DishPicture.tsx`.
- Startseite: `FoodTile` in `src/components/heute/HomeTiles.tsx`,
  `CookingTile.tsx` („Ich koche jetzt“, Schritte, „Gegessen“),
  `AutoCooked.tsx` (im Layout: nach dem Essen als gekocht vermerken).
- Wochenplan: `src/lib/essen/mealPlan.ts` (Woche zusammensetzen, reine
  Änderungen, Speicher), `weekPlan.ts` (Planungswoche, Wochen-Vorgaben,
  Wunschtag), `templates.ts` (Lieblingswochen). Oberfläche
  `src/components/essen/plan/`: `WeekPlanView.tsx` (`/wochenplan`),
  `WeekCheck.tsx` (`/woche/check`, „Kurz vor der Woche“), `PlanSheets.tsx`,
  `TemplateSheets.tsx`, `FixedMealsSection.tsx`.
- Rezepte: `cookbook.ts`, `dishStatus.ts` („Kennt ihr“), `recipeSpeech.ts`,
  `baking/` (Backstube), `demoDish.ts`; Oberfläche
  `src/components/essen/rezepte/` (`CookbookList`, `RecipeView`,
  `RecipeEditor`, `NewRecipeSheet`, `CookMode`, `MachineSteps`).
- Ideen/Spontan: `ideas.ts`, `useIdeas.ts`, `dishIdeas.ts` (`DISHES`,
  `matchStock`, `soonToUse`), `useStock.ts`, `spontan.ts`, `spontanTake.ts`,
  `spontanFilters.ts`, `leftovers/` (Gesagtes zerlegen), `wishes.ts`,
  `likes.ts`, `bases.ts`, `neverAgain.ts`, `planUnlock.ts`, `market.ts`. Der
  Spontan-Modus im Chat: `src/components/begleitung/SpontanBoard.tsx`,
  `useSpontanChat.ts`.
- Bilder: `dishArt.ts`, `dishSvg.ts`, `dishBases/Bakes/Bits.ts`,
  `dishImages.ts`, `dishImageList.ts` (erzeugt); `scripts/generate-dish-images.mjs`.
- Tipps: `tips/` (+ `daily.ts`), `healthTips.ts`. Nach dem Essen:
  `mealDone.ts`; Kochen: `kochSession.ts`.
- Seiten-Schranken: `/wochenplan` und `/woche/check` = Baustein `wochenplan`
  + `PlanningGate` (nicht bei „spontan“); `/kochbuch` = `rezepte` oder
  `backen`; `/kochbuch/bearbeiten` = `rezepte`; `/kochbuch/rezept` und
  `/kochbuch/kochen` immer offen. Alte Adressen `/ideen` und `/schnellkueche`
  leiten auf den Essen-Reiter (`next.config.ts`).

## Daten und Speicher

Alle Schlüssel aus `src/lib/core/storage.ts`:

- `wasgibts.wochenplan` v3 (Sicherung): `{ weeks: { <Wochenbeginn>: { <Wochentag>:
  StoredEntry, "<Tag>:notiz": note } } }`. `StoredEntry` = `recipe`
  (`recipeId`, `title`, `category`) | `text` | `wish` | `cleared` | `note`;
  optional `double`, `spontan` (aus den Ideen gewählt), `persons` (nur für
  diesen Tag umgerechnet). Gespeichert werden nur eigene Einträge und
  Überschreibungen. Migration: v1 rät die Kategorie aus dem Titel; bis v2
  zwei Plätze je Tag → das Gericht der Hauptmahlzeit bleibt, das andere wird
  Notiz (nichts geht verloren).
- `wasgibts.wochenvorgaben` v4 (Sicherung): je Woche `WeekPlan` =
  Standardwoche-Felder (`meatDays`, `vegetarianDays`, `fishDays`, `cheatDay`,
  `cheatDayWeekday`) + `awayDays`, `budgetEuro`, `wishes`, `wish` (Wunschtag),
  `fixedMeals`. Migration v1–v3: Wunsch/feste Gerichte ohne Mahlzeit,
  höchstens ein festes Gericht je Tag.
- `wasgibts.vorlagen` v1 (Sicherung): Lieblingswochen `{ templates }`, je
  Wochentag Rezept oder Freitext.
- `wasgibts.kochbuch` v3 (Sicherung): `Recipe` mit Kategorie
  (fleisch/vegetarisch/fisch/cheatday), Zutaten, Schritten, `favorite`,
  `cookedCount`, `lastCookedAt`, `known`, `kind` (kochen/backen), `oven`,
  `pan`, `kidSteps`, `machineSteps`. Migration: bis v1 gelten eigene Rezepte
  als bekannt, bis v2 wird Backen am Namen erkannt.
- `wasgibts.gekocht` v1 (Sicherung): je Kochtag Titel, `how` (auto/marked),
  Zähler-Stand davor, aus dem Vorrat Genommenes, verbrauchte Zutaten.
- `wasgibts.wuensche` v1 (Sicherung): Wünsche (`who`, `personId`, `dish`).
- Nur auf dem Gerät: `wasgibts.kochen` v1 (heute gestartetes Kochen,
  abgehakte Schritte), `wasgibts.tipps` v1 (gezeigte Gesundheits-Tipps je
  Woche, ausprobiert/abgelehnt), `wasgibts.ideen` v1 (Tagesstand der Ideen –
  wird derzeit nur gelesen, nie geschrieben), `wasgibts.spontan.filter`
  (Sitzung). `wasgibts.maschinenansicht` (Thermomix-Ansicht, in der Sicherung).
- Im Profil (`familienkueche.haushaltsprofil`): `shoppingDay`, Standardwoche,
  `warmMeal`, `mealClock`, `planStyle`/`planWeek`, `cookingStyle`,
  `newPerWeek`, `mixSuggest`, `weekendStyle`, `kitchenMachine`, `likes`,
  `bases`, `neverAgain`, `healthTips`, `tips`, `pause`.
- Nie gespeichert: Beispielgerichte (`d:…`), Backstube (`b:…`, bis „In unsere
  Rezepte“), live gezeichnete Bilder (nur im Arbeitsspeicher, höchstens 150).

## So verhält es sich

**Essen-Reiter** (von oben):
- Gericht von heute, nach dem Essen (Essenszeit + 90 Min oder gegessen) das
  von morgen: Bild vollflächig, „HEUTE · 18:30“, Name, Chip „alles im Haus“
  (grün) bzw. „auf die Liste: …“ (Abgleich mit dem Bestand), Personen nur bei
  Umrechnung, Minuten, „Kochen ›“; oben „⇄ Tauschen“. Ohne Gericht „Noch frei“
  mit „Ideen zeigen“ / „<Name> fragen“; Ausflug „Kein Kochtag“, Pause „Pause –
  genießt die Zeit“. Im Beispiel-Tag das Beispielgericht (`DemoDishHero`).
- „Diese Woche“: Mo–So mit Bildern, heute orange umrandet, frei gestrichelt
  mit Plus, feste Gerichte hellorange; Antippen öffnet „Was koche ich?“.
  „Plan öffnen ›“ nur mit Baustein Wochenplan.
- „Das ist da“ (nur mit Baustein Vorrat und Inhalt, siehe `vorrat.md`).
- „Daraus kannst du kochen“ (nach dem Essen „Ideen für morgen“): 3 Ideen aus
  `useTodayIdeas` (ohne das geplante Gericht) mit Bild, Zeit · Grund. „alles
  im Haus“ → „Heute“ (`takeForToday`), sonst „auf die Liste: …“ → „Einkauf“
  legt die Zutaten für heute auf die Liste (mit Gericht) und zeigt „✓ Liste“.
  Immer sichtbar, kein Baustein.
- Bausteine: „Spontan kochen“ (Spontan-Ideen), „Unsere Rezepte“ (Rezepte,
  bis 8 Bilder, meistgekochte zuerst), „Backen“, leerer Vorrat. Darunter
  „Einkauf“ als Chips (bis 14) mit Plus.
- **„Was koche ich?“** (`SwapSheet`): Titel „Statt <Gericht>“ bzw. „Was gibt’s
  heute?“, 3 Ideen „Nehmen“ (`takeForDay`: das alte Gericht rutscht auf den
  nächsten freien Tag dieser/nächster Woche), „<Name> fragen“, „Tag
  freimachen“ (Gelöscht · Rückgängig).

**Wochenplan** (Baustein `wochenplan`):
- Genau EIN Hauptgericht je Tag. Die Planungswoche beginnt am Einkaufstag
  (Standard Montag) und hat 7 Tage; ab 2 Tage vor dem nächsten Einkaufstag
  wird die nächste geplant (`planningWeekStart`). Nach einem Wechsel des
  Einkaufstags findet `resolveWeekKey` die überlappende alte Woche.
- `composeWeek` setzt zusammen: eigene Einträge, feste Gerichte und Wunsch
  aus den Vorgaben, Ausflugs- und Pausetage (`away`), Cheat Day,
  Kategorie-Hinweise für freie Tage, Reste vom Vortag bei „doppelt kochen“,
  Personen (mittags unter der Woche nur, wer zu Hause ist,
  `mainMealHeadcount`). Löschen/Verschieben überschreibt Vorgaben nur im Plan.
- Wochenend-Stil (`weekendStyle`, Standard „locker“, derzeit ohne Schalter):
  Sa/So „locker“ = Zutaten optional, zählt nicht als gekocht; „frei“ = keine
  Hinweise, zählt nicht mit.
- `/wochenplan`: Zeitraum mit ‹ ›, 7 Zeilen (Bild, Gericht, „fester Tag“,
  Notiz; frei „Noch frei“ + „Ideen“), „<Name>, füll die freien Tage“.
  Zurückblättern bis 26 Wochen = Rückblick (nur lesen, „Nochmal kochen“). Im
  „…“: Vorlage speichern/laden, Frühere Wochen, Feste Tage & Vorlieben, Plan
  teilen, Unsere Rezepte. Heute gekocht: „Auf morgen verschieben“
  (`moveToTomorrow`, Zähler und Vorrat zurück). Keine Zähler oder Kosten.
- „Kurz vor der Woche“ (`WeekCheck`): drei Fragen mit Chips – „Seid ihr
  diese Woche mal unterwegs?“, „Wie oft darf es Fleisch sein?“, „Etwas
  Besonderes?“ –, Fortschritt als Striche, „Weiter“/„Überspringen“ am Ende;
  feste Gerichte, Mengen, Budget, Wünsche hinter „Alles im Detail“.
  Vorausgefüllt aus den Vorgaben der Woche, sonst aus der Standardwoche.
- Wunschtag: Kind reihum (`wishKidForWeek`, ab Mindestalter), belegt einen
  Kochtag, zählt nicht bei Fleisch/Veggie/Fisch; nicht auf Ausflugstagen.
- Feste Gerichte: eins je Tag, zählen in ihre Kategorie; ein Cheat-Day-Rezept
  setzt den Cheat Day auf diesen Tag.
- Vorlagen: „Vorlage speichern“ (Name; nur Rezepte/Freitext), „Vorlage laden“
  (Tage abwählbar; belegte Tage: „Überschreiben“ oder „Nur freie Tage“).
- Plan-Stil (`planStyle`: plan / spontan / mix, Baustein `kochstil` für die
  Seite `/profil/kochstil`): „spontan“ blendet Plan, Vorgaben, Einkaufstag und
  Standardwoche aus (Daten bleiben); nur aus den Ideen Gewähltes (`spontan:
  true`) zählt. „Ich will doch mal planen“ → „Nur diese Woche“ (`planWeek`,
  zählt wie mix) oder „Ab jetzt immer“ (mix/plan).

**Rezepte** (Baustein `rezepte`, Backstube `backen`):
- `/kochbuch`: Bilder-Raster, Suche (`searchRank`: Titel vor Zutaten),
  Text-Chips Alle · Lieblinge · Schnell (≤ 25 Min) · Backen · Veggie ·
  Fleisch · Fisch · Cheat Day; Sortierung `RECIPES` (Lieblinge → zuletzt
  gekocht → oft gekocht → Name). Bei „Backen“ darunter „Aus unserer
  Backstube“ (20 eingebaute Rezepte, ohne die schon übernommenen).
- „+“: „<Name> erzählen“ (Sprache/Tippen → `parseSpokenRecipe`, regelbasiert,
  Vorschau) oder „Selbst eintippen“ (`/kochbuch/bearbeiten`).
- Rezeptseite: Bild voll, runde Knöpfe (Zurück, Herz, „…“ mit Bearbeiten,
  Teilen, Löschen bzw. „In unsere Rezepte“ = `adoptBuiltin`), Personen-Zähler
  rechnet Zutaten um (`?personen=` = nur heute), „Jetzt kochen“/„Zusammen
  backen“, „Für einen Tag einplanen“ (nächste 7 Tage), Schalter „Kennen wir“.
- Kochmodus `/kochbuch/kochen?id=` (`CookMode`): erst Zutaten (mit Backofen
  und Form), dann ein Schritt je Seite, Weiter/Zurück am Inhaltsende,
  Bildschirm bleibt an, „Vorlesen an/aus“ und „Nochmal“, Schritte mit Zeit
  bieten „<n> Min – ich sag Bescheid“ (sichtbarer Timer, Ton), Kinder-Schritte
  „🧒 <Kind> darf jetzt:“ reihum (nur mit Kindern).
- Thermomix: mit `kitchenMachine: "thermomix"` und `machineSteps` Umschalter
  „Mit Thermomix“/„Klassisch“ (`MachineSteps`), rein beschreibend.
- „Kennt ihr“ (`recipeIsKnown`): von Hand markiert oder oft genug gekocht.

**Ideen und Spontan**:
- `ideasFor` (rein): Wünsche ganz oben; dann Punkte – Bestand zählt am
  meisten (genutzte Zutaten, Abdeckung, „bald aufbrauchen“), dazu Liebling,
  kennt ihr, Jahreszeit, unter der Woche Schnelles; nicht, was in den letzten
  5 Tagen dran war; nie „Nie wieder“, keine Backrezepte. Quellen: Kochbuch +
  Klassiker `DISHES`. Fester Tages-Zufall, Gleichstand → schneller (`IDEAS`).
- Bestand (`useStock`): Vorrat + auf der Liste Abgehaktes/„Haben wir schon“
  (diese und Einkaufswoche), ohne gerade Verkochtes (`usedRecently`).
  Grundzutaten (`AT_HOME`) zählen nie als Einkauf.
- Spontan-Modus im Chat (Baustein `spontan` für den Einstieg auf Essen; im
  Chat immer per Satz): ein Satz, „Noch da: …“, genau 3 Ideen
  (`spontanIdeas`: meiste Vorrats-Zutaten, angezeigt schnellste zuerst;
  Fertigprodukte aus dem Vorrat zählen; reicht es nicht, dürfen 1–2
  Kleinigkeiten auf die Liste), „Anpassen“ (Zeit, Vorrang, Beilage) und
  „Andere Ideen“. Gesagtes landet im Vorrat.
- Wünsche: „Mathis wünscht sich Pfannkuchen“ → steht ganz oben bei den Ideen.
- „Das mögt ihr“ (`likes.ts`): gelernt aus Chat-Sätzen (+3), gewählten
  Vorschlägen/Gekochtem (+1); geht an die KI.

**Bilder je Gericht**: `DishPicture` nimmt eigenes Foto → eingebautes Bild
`/gerichte/<slug>.webp` (`builtinDishImage`, Liste `DISH_IMAGES`) → live
gezeichnet (`drawDishImage` lädt `dishArt` + `renderDishSvg` erst bei Bedarf)
→ einfacher Teller als Notlösung. `dishArt` erkennt die Form aus Titel, dann
Zutaten, Toppings (höchstens 5), Hintergrund, fester Zufall aus dem Namen;
Unbekanntes = allgemeine Form (`guessed`). `npm run gerichte-bilder` erzeugt
die Bilder (900 × 600 WebP) für `DISHES`, Beispielgerichte und Backstube,
`public/demo/gericht.webp` und `dishImageList.ts`. Der Service Worker merkt
sich `/gerichte/…` beim ersten Anzeigen.

**Tipps**: Baustein `tipps`/`wochenendIdeen` → `dailyTip` als ein leises Thema
der Jetzt-Karte, nur wenn heute nichts ansteht; Fr–So zuerst eine
Wochenend-Idee, sonst ein Tipp zum Gericht, sonst reihum (150 Tipps in
`tips/data/`, ohne Speicher). Gesundheits-Tipps (`healthTips.ts`, Einstellung
`healthTips` aus/ab und zu/öfter = 0/1/3 je Woche, Seite `/profil/gesundheit`):
ein freiwilliger Tausch für ein geplantes Rezept (nie Cheat Day, Wunsch,
Allergie), nur als Sprechblase im Chat (`TipBubble`, mit Baustein `tipps`);
„Ausprobieren“ ändert nur dieses Rezept (Notiz „🌱 Ausprobiert“, Rückgängig).

**Nach dem Essen** (`mealDone.ts`, `AutoCooked`): ab Essenszeit + 90 Min
(auch für gestern) zählt das Gericht ohne Nachfrage als gekocht – nicht bei
Ausflug/Pause, nicht Sa/So mit Wochenend-Stil, bei „spontan“ nur Gewähltes.
Dann: Kochbuch +1 (nicht doppelt am selben Tag), Zutaten aus Kühlschrank/
Tiefkühler raus, Gekauftes zählt 7 Tage nicht mehr als da. „Gegessen“ in der
Koch-Kachel auf Heute beendet es sofort (mit Rückgängig).

**Supermarkt** (`market.ts`): „Lachs ist im Angebot“, „Ich steh grad im
Rewe …“ → kurze Antwort mit 2–3 Ideen samt Zeit (Kochbuch, dann Vorlagen),
was dafür auf die Liste müsste, „Auf die Liste“ (→ „Jetzt mitnehmen“) und
„Statt <Tag> einplanen“ (`marketTargetDay`; bei „spontan“ nur „Heute kochen“).

**Beispielgericht** (`demoDish.ts`): im Beispiel-Tag ohne eigenes Gericht
„Pasta mit Tomaten & Burrata“ (18:30), ab 20:00 „Ofengemüse mit Feta“ für
morgen (`demoDishAt`); lesbar und kochbar über `findRecipe`, dazu „Mehr
Ideen“. Verschwindet mit dem ersten eigenen Gericht oder dem Beispiel-Tag.

### Kochtipp – spontan mit Mia (seit v0.60)

- Kochmütze oben rechts in der Essen-Kachel (`components/essen/kochtipp/
  KochtippHat.tsx`, 40 px orange, Tippfläche 44 px). Tipp → Kochtipp-Chat, der
  Rest der Kachel bleibt wie bisher. In der kleinen Kachel (S) entfällt mit
  Mütze das ⇄ „Andere Idee“.
- Freischalten (`lib/essen/kochtipp/store.ts`, `wasgibts.kochtipp`): ab dem
  3. Nutzungstag (3 verschiedene Kalendertage je Gerät), früher auf Nachfrage
  („Kochtipp“, „Was soll ich kochen?“ – auch mit KI, `unlockKochtipp`) oder
  mit „Alles zeigen“. Wer schon länger als 2 Tage dabei ist (Beispiel-Tag
  `since`), sieht die Mütze sofort. Beim ersten Erscheinen ploppt sie einmal
  auf, dazu EINMAL die dunkle Blase „(Neu:) Spontan? Tipp auf die Mütze …“
  (Hinweis `kochtipp-muetze`, weg bei Tipp oder nach 6 s, nicht zur
  Kochzeit).
- Chat (`useKochtippChat`, eigener Modus wie Spontan kochen): „Lust auf was
  ganz anderes? 😋“ / „Sag mir, was noch da ist – oder kaufen wir neu ein?“
  (mit der letzten Wahl: „Wie letztes Mal aus dem Vorrat?“), Schnellantworten
  Schau in den Vorrat · Reste verwerten · Neu einkaufen. Mikro erlaubt → hört
  gleich zu; Vorlesen an → Mia spricht die Frage (dann kein gleichzeitiges
  Zuhören).
- Antworten verstehen (`parseCookWish`): genannte Zutaten (zählen als da),
  „was mit Fisch“, „vegetarisch“, „was Schnelles“, „für 4“, „lieber ohne
  Reis“. Unverständliches beendet den Modus.
- EIN Gericht (`pickCookDish`, eigene Rezepte + Gerichte-Liste): Vorrat =
  höchstens eine Zutat auf die Liste, Reste = Bald-Verbrauchtes zuerst, Neu
  einkaufen = egal. Allergien und „mag nicht“ strikt, keine der letzten 10
  gezeigten und keine Gerichte der letzten 3 Tage. Nichts → „Dafür habe ich
  gerade nichts. Sollen wir was einkaufen?“.
- Karte (`KochtippCard`): Bild, Abzeichen (alles im Haus / fast alles im
  Haus / Resteessen / Einkauf nötig), „für N ▾ · Min · nimmt deine …“,
  „auf die Liste: …“, „Anderes“ / „Machen wir“. Machen wir → fehlt etwas,
  erst „… auf die Einkaufsliste?“ (Ja / Hab ich, Mengen auf die Personen
  umgerechnet), dann heutiges Essen (nur heute, `takeForToday` spontan),
  Chat zu, „Heute gibt’s …“, Rückgängig über Mia.

## Begleitung (Mia)

- Werkzeuge (Vorschau + „Übernehmen“): `woche_lesen`, `gericht_setzen`,
  `platz_leeren`, `doppelt_kochen`, `gericht_verschieben`, `vorgaben_aendern`,
  `wunsch_merken` (`planTools.ts`; Ops `set_meal`, `clear_slot`, `set_double`,
  `move_meal`, `update_week`, `add_wish`); `kochbuch_durchsuchen`,
  `rezept_erstellen` (`cookbookTools.ts`, Op `add_recipe`, Allergien strikt);
  `wochenplan_anzeigen/_aendern/_loeschen`, `portionen_anpassen` (Op
  `set_persons`, nur dieser Tag) in `homeTools.ts`; sofort ohne Übernehmen:
  `kochen_starten`, `kochschritt`, `timer_stellen` (`dayTools.ts`).
- Beim Übernehmen eines Plans wird der Baustein Wochenplan eingeschaltet, die
  Essen-Kachel gezeigt und gesagt, wo er steht; ein neues Rezept schaltet
  Rezepte frei (`client.ts`). Bei „spontan“ gelten neue Gerichte als gewählt.
- Ohne KI (`useChatRules.ts`, `localAnswers.ts`): Supermarkt- und Backwünsche
  (vor der KI, mit Karten), „Wir lieben Käse“, „Was ist noch da?“/„Reste“,
  „Was Schnelles mit Nudeln“ (Filter), „Was kann ich heute kochen?“, „Was mach
  ich mit Hack und Paprika?“ → Spontan-Ideen, „Wir kommen erst um 19 Uhr
  heim“ → 3 schnelle Ideen, „… wünscht sich …“ → Wunsch (Rückgängig), „Ich
  will doch mal planen“, „Zeig mir unsere Rezepte“, „Lösch den Wochenplan“.

## Tests

- `tests/essen/`: `wochenplan`, `wochenVorgaben`, `rezepte` (inkl.
  Backstube, Basen, Rezept erzählen), `ideen` (Bestand, Wünsche, Das mögt
  ihr), `spontan`, `reste`, `uebernehmen` (heute/Tag, Supermarkt, Vorlagen,
  Planung freischalten), `nachDemEssen`, `gesundheitsTipps`, `tippDesTages`,
  `gerichtBilder`, `bildVarianten` (je `.test.ts`; Hilfen `hilfen.ts`).
  Werkzeuge: `tests/begleitung/werkzeugeEssen.test.ts`.
- Durchklick `e2e/ablaeufe/essen.mjs`: `essen`, `rezept`; `start.mjs`
  `umleitungen` (`/ideen`, `/schnellkueche`).
