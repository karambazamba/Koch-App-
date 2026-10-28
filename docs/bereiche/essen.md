# Essen

## Feste Regeln (aus CLAUDE.md umgezogen)

- **Bilder der Gerichte:** eigene Zeichnungen im Code, keine fremden Fotos,
  keine KI (`docs/credits.md`); neues eingebautes Gericht → `npm run
  gerichte-bilder`. Kein Braun und kein Dunkelgrau als große Fläche. Soßen
  frisch: Rot, Gelb, Grün, Creme, und sparsam (Fläche unter dem Essen, Rand
  bleibt frei). Braun nur für Kleinteile (Kruste, Brot, Gewürz).
  → `docs/bereiche/essen.md`


Kurz: Was gibt’s heute – und was kann man mit dem kochen, was da ist? Der
Essen-Reiter zeigt das Gericht von heute, die Woche und Ideen aus dem Bestand.
Dahinter liegen Wochenplan, Rezepte, Backstube, Spontan-Ideen und Tipps –
jeweils als Baustein (`src/lib/core/features.ts`), alles Neue zuerst aus.

## Wo im Code

- Essen-Reiter (`/?seite=essen`): `src/components/essen/FoodPage.tsx`
  (`DishHero`, Woche, `ShoppingChips`), `ImHausBereich.tsx` (EIN Bereich „Im
  Haus“ mit „Was koch ich daraus?“ = Spontan kochen, siehe `vorrat.md`),
  `BausteinSections.tsx`, `SwapSheet.tsx` (das eine Fenster „Was koche ich?“),
  `useMeals.ts`, `DemoFoodTile.tsx` (Beispielgericht), `DishPicture.tsx`.
- Startseite: `FoodTile` in `src/components/heute/HomeTiles.tsx` mit
  `DishTile.tsx` (final Tafel 134: Bild, oben „Was anderes?“, unten
  Statuszeile + Name + Zeile(n), rechts Pille „Wochenplan ›“ bzw. „Weiter
  kochen ›“; Kachel antippen = Vorschau/Rezept/Kochmodus), Pillen
  `ui/KachelPille.tsx` und `ui/KachelKnopf.tsx`, `OhneRezeptSheet.tsx` („Mia
  schreibt dir ein Rezept dazu“), `AutoCooked.tsx` (im Layout: nach dem Essen
  als gekocht vermerken). Reine Logik `lib/heute/essenKachel.ts`
  (`kachelZustand`, `essenKopf`, `essenPille`, `essenTippen`,
  `essenUnterzeilen`, `zutatenKurz`, Namensgröße `titelPx`, Verlauf/Kontrast)
  und `lib/heute/kachelKnopf.ts` (Stufen statt „…“).
- Wochenplan: `src/lib/essen/mealPlan.ts` (Woche zusammensetzen, reine
  Änderungen, Speicher), `weekPlan.ts` (Planungswoche, Wochen-Vorgaben,
  Wunschtag), `templates.ts` (Lieblingswochen). Oberfläche
  `src/components/essen/plan/`: `WeekPlanView.tsx` (`/wochenplan`),
  `WeekCheck.tsx` (`/woche/check`, „Kurz vor der Woche“), `PlanSheets.tsx`,
  `TemplateSheets.tsx`, `FixedMealsSection.tsx`.
- Rezepte: `cookbook.ts`, `dishStatus.ts` („Kennt ihr“), `recipeSpeech.ts`,
  `baking/` (Backstube), `demoDish.ts`; Oberfläche
  `src/components/essen/rezepte/` (`CookbookList`, `RecipeView`,
  `RezeptZutaten`, `RezeptSchritte`, `RecipeEditor`, `NewRecipeSheet`,
  `CookMode`, `KochOhr`, `heuteGericht`, `MachineSteps`). Schnellanleitung
  `lib/essen/kurz/` (Kurzfassungen `daten1–3.ts`, `ansicht.ts`, `mia.ts`),
  Kochmodus rein `lib/essen/kochModus.ts`.
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
  (fleisch/vegetarisch/fisch/cheatday), Zutaten, Schritten, optional
  `shortSteps` (Schnellanleitung von Mia, additiv ohne neue Version), `favorite`,
  `cookedCount`, `lastCookedAt`, `known`, `kind` (kochen/backen), `oven`,
  `pan`, `kidSteps`, `machineSteps`. Migration: bis v1 gelten eigene Rezepte
  als bekannt, bis v2 wird Backen am Namen erkannt.
- `wasgibts.gekocht` v1 (Sicherung): je Kochtag Titel, `how` (auto/marked),
  Zähler-Stand davor, aus dem Vorrat Genommenes, verbrauchte Zutaten.
- `wasgibts.wuensche` v1 (Sicherung): Wünsche (`who`, `personId`, `dish`).
- Nur auf dem Gerät: `wasgibts.kochen` v2 (nur heute: gestartetes Kochen,
  abgehakte/durchgestrichene Schritte, Kochmodus-Stand `at`, abgehakte
  Zutaten `zutaten`; v1 → v2 ergänzt leer), `wasgibts.rezeptansicht` v1
  („So geht’s“ Kurz/Ausführlich, pro Gerät, nicht in der Sicherung), `wasgibts.tipps` v1 (gezeigte Gesundheits-Tipps je
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

- **Die nächsten 7 Tage (v0.126.0, Tafel 97)** ersetzen die Wochenkarte:
  immer ab heute, über die Wochengrenze (gespeichert bleibt je Woche ab dem
  Einkaufstag; `lib/essen/sieben`, Oberfläche `components/essen/sieben`).
  Kopf „Die nächsten 7 Tage“, Umschalter Liste/Reihe (gemerkt in
  `wasgibts.essenansicht`, nicht in der Sicherung), „Woche planen“ (Mia plant
  die freien Tage) und „···“ (Feste Gerichte und Vorlagen, nur mit Baustein
  Wochenplan). Jeder Tag öffnet in beiden Ansichten EIN Tag-Fenster
  (`TagFenster`): großes Bild, „DONNERSTAG · 29.10. · 18:30“, Name, Minuten ·
  Personen · Vorrat, „Rezept ansehen“ (jedes Gericht hat ein Rezept: eigenes
  oder eingebautes über `rezeptIdFuer`), „Tauschen“, „Anderer Tag“, „Kein
  Kochtag“/„Doch kochen“ und „Oder lieber“ mit drei Ideen; freier Tag = „Noch
  frei“ + Ideen. Liste: Halten (300 ms) & ziehen tauscht bzw. verschiebt
  (`verschiebe`, auch zwischen zwei Wochen) mit „Rückgängig“; Hinweis „Halten &
  ziehen“, bis einmal gezogen (`essen-ziehen`). „Zuletzt gegessen ›“ zeigt die
  letzten 14 Tage. Der Einkauf wird aus dem Plan berechnet, Zutaten wandern
  also mit. Tests `tests/essen/siebenTage.test.ts`, Durchklick `wochenkarte`.
- **Abwechslung (v0.117)**: Essen-Kachel mit „Woche ›“. Ideen: 14 Tage nach dem Essen nicht wieder; gezeigt und nicht
  genommen → 7 Tage weiter hinten (`ideenGezeigt.ts`, Speicher
  `wasgibts.ideengezeigt`, 30 Tage, nicht in der Sicherung); unter den ersten
  drei höchstens eine je Grundlage (`mixFirst`); fester Tages-Zufall bei
  Gleichstand; ⇄ nie zweimal dieselbe (`naechsteIdee`). Tests
  `tests/essen/abwechslung.test.ts`.
- **150 Alltagsgerichte**: `gerichte/<gruppe>.ts` (deutsch 30, nudeln 25,
  asiatisch 20, vegetarisch 20, fisch 15, fleisch 14, suppen 11,
  international 10, suess 5), zusammen `GERICHTE` = `DISHES` (`dishList.ts`).
  Jedes mit `gruppe`, `beliebt` (1–5), `kind`, Zeit, Hauptzutaten, Bild und
  Rezept für 4: entweder in `kochen/data*.ts` (gleicher Titel) oder als
  `zutaten`/`schritte` im Eintrag (→ `GERICHT_REZEPTE`, ID `k:<slug>`).
  `rezeptIdFuer(titel)` (`kochen/index.ts`) findet das Rezept zu jedem Titel;
  Ideen aus der Liste tragen es als `recipeId`. Mischung der 8 Ideen
  (`ideasFor`): ≈ 3 Lieblinge (Favorit, 👍, kennt ihr), ≈ 3 Klassiker
  (`beliebt` ≥ 4), ≈ 2 Neue, höchstens 2 je Gruppe, Tages-Zufall stark
  genug für täglich neue Mischung; mit Bestand steht die beste passende Idee
  vorn. Allergien und „mag nicht“ der Familie (`persons`) strikt über Titel
  und Rezept-Zutaten. Tests `tests/essen/pool150.test.ts` (30 Tage simuliert).

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
- „Im Haus“ (gehört zu 1.0, ersetzt „Spontan kochen“ und „Das ist da“):
  Chips der Sachen, „bald aufbrauchen“ zuerst, höchstens 8, ＋ und „Alle ›“,
  darunter groß „Was koch ich daraus?“ (öffnet Spontan kochen mit genau diesen
  Sachen). Leer: „Sag mir, was da ist, dann schlag ich was vor.“ +
  „Eintragen“. Mia stellt es beim ersten Besuch einmal vor. Siehe `vorrat.md`.
- „Daraus kannst du kochen“ (nach dem Essen „Ideen für morgen“): 3 Ideen aus
  `useTodayIdeas` (ohne das geplante Gericht) mit Bild, Zeit · Grund. „alles
  im Haus“ → „Heute“ (`takeForToday`), sonst „auf die Liste: …“ → „Einkauf“
  legt die Zutaten für heute auf die Liste (mit Gericht) und zeigt „✓ Liste“.
  Immer sichtbar, kein Baustein.
- Bausteine: „Unsere Rezepte“ (Rezepte, bis 8 Bilder, meistgekochte
  zuerst), „Backen“; „Spontan kochen“ als eigene Karte nur noch, wenn „Im
  Haus“ abgeschaltet ist. Darunter „Einkauf“ als Chips (bis 14) mit Plus.
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
  Vorschau) oder „Selbst schreiben“ (`/kochbuch/bearbeiten`).
- Rezeptseite (Reihenfolge seit Tafel 122, siehe unten): Bild mit „‹ Heute“
  und „…“ (Bearbeiten, Teilen, Löschen bzw. „In unsere Rezepte“ =
  `adoptBuiltin`), „Los, Schritt für Schritt“/„Zusammen backen“, Zutaten
  (Personen-Zähler rechnet um, `?personen=` = nur heute), „So geht’s“,
  Infozeile mit Herz, „Für einen Tag einplanen“ (nächste 7 Tage), „Kennen wir“.
- Kochmodus `/kochbuch/kochen?id=` (`CookMode`, seit Tafel 122 dunkel, siehe
  unten): erst Zutaten (mit Backofen und Form), dann ein Schritt je
  Bildschirm, Bildschirm bleibt an, Vorlesen an/aus oben rechts, Kinder-Schritte
  „<Kind> darf jetzt:“ reihum (nur mit Kindern).
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
- Spontan-Modus im Chat (Einstieg auf Essen: „Was koch ich daraus?“ im
  Bereich „Im Haus“, auch auf /vorrat und in der Kachel; im Chat immer per
  Satz): ein Satz, „Noch da: …“ (dieselbe Reihe wie die Chips, `imHausReihe`),
  genau 3 Ideen
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

### Mehr Ideen – bunte Mischung zum Durchschieben (seit v0.61)

- Unter jedem Kochrezept (auch Beispiel-Tag) eine wischbare Reihe mit bis zu
  8 Ideen (`components/essen/rezepte/MoreIdeas.tsx`, ersetzt
  `DemoMoreIdeas`): 2,5 Karten sichtbar, Einrasten pro Karte, endlos (Liste
  dreifach, springt nach dem Einrasten unbemerkt in die Mitte), keine
  Pfeile/Punkte; für Screenreader nur die mittlere Liste; `data-no-swipe`.
  Karten: Bild, Titel, Minuten, Etikett „Besonders“ / „Wenn Zeit ist“.
- Mischung (`lib/essen/mehrIdeen/mix.ts`): feste Grenzen zuerst (Allergien,
  „mag nicht“, „mag nicht: Fleisch/Fisch/vegetarisch“ = ganze Art, nichts
  aus den letzten 7 Tagen, nicht das aktuelle Rezept; weniger als 8, wenn es
  nicht mehr gibt). Mo–Do 3 einfach / 2 Lieblinge / 2 besonders / 1 wenn
  Zeit ist (hinten), Fr–So 2/2/2/2 (Aufwendige vorn). „Besonders“ an Platz
  3 (und 6). Je Gruppe zuerst „alles im Haus“. Zu kleine Gruppe → Plätze an
  einfach → Lieblinge → besonders; ohne Lieblinge an „einfach“. Tages-Zufall
  je Haushalt; höchstens 2 von gestern (die Tage werden ab 1. Januar
  nacheinander gemischt, damit das genau stimmt).
- Lieblinge: eigene Rezepte mit Favorit, Daumen hoch oder gekocht, oder
  zweimal angetippt. Still mitlernen (`mehrIdeen/store.ts`,
  `wasgibts.ideenmix`): Antippen zählt (Gericht, Art, Aufwand, Kategorie),
  gezeigt und nie angetippt = seltener.
- Rezeptvorrat „Aus unserer Küche“ (`lib/essen/kochen`, ID `k:<id>`): 34
  Familiengerichte für 4 mit `aufwand` (einfach/normal/aufwendig) und `art`
  (klassisch/besonders), eigene Zeichnungen (`npm run gerichte-bilder`).
  Lesbar und kochbar wie Kochbuch-Rezepte, „In unsere Rezepte“ übernimmt.
  Eigene Rezepte: Aufwand aus Zeit, Zutaten und Ofen geschätzt.

### 8 Ideen immer auf der Essen-Seite (v0.75)
- Die Reihe aus „Mehr Ideen“ (`essen/rezepte/MoreIdeas`, gleiche Karten)
  steht immer auf der Essen-Seite – Beispiel-Tag und eigener Tag, mit und
  ohne Konto, Plan oder Vorrat. Sie ersetzt „Daraus kannst du kochen“
  (`CookIdeas` ist weg). Überschrift: nichts geplant → „Ideen für heute“,
  nach dem Abendessen „Ideen für morgen“, sonst „Mehr Ideen“; das geplante
  Gericht steht nie dabei. Antippen öffnet das Rezept, „Fürs Abendessen“
  trägt es für heute (nach dem Essen für morgen) ein.

### Gerichte-Bilder ohne Braun (Tafel 62 B, v0.75)
- Pfanne hell wie Emaille (`skillet`): Innen #FBF7F0, farbiger Rand
  (Petrol/Orange/Salbei), Holzgriff. Soße (`panSauce`): Tomate/Hack/
  Shakshuka rot, Ei/Hähnchen/Curry goldgelb, sonst nur heller Glanz; als
  klare Fläche unter dem Gemüse (0,72 × Pfanne, mit Reis 0,62 rechts), Rand
  frei, mehr Gemüse obendrauf. Eintöpfe Paprikarot, Chili #CC4A2C,
  Linsensuppe orange. Bowl ohne Soße = Variante „poke“ (Reis, Lachs,
  Edamame, Avocado, Gurke, Sesam). Vorher/nachher:
  `docs/vorlagen/gerichte-ohne-braun.webp`. Tests `tests/essen/ohneBraun.test.ts`.

### Kochidee – ohne Fragen, einfach erzählen (Tafel 64 C/65, seit v0.71; früher „Kochtipp“)

- Für Nutzer heißt es „Kochidee“; intern bleibt `kochtipp` (Ordner,
  Speicher `wasgibts.kochtipp`, `app_befehl`-Erkennung `isKochtippRequest`,
  die jetzt auch „Kochidee“ versteht).
- Pille oben links in der Essen-Kachel (`KochideeKnopf.tsx` über
  `ui/KachelPille`, Text über `kochideeButton`): immer die weiße Pille
  „⇄ Was anderes?“ (12 px, 30 px hoch, Tippfläche 44 px; seit A-046 kein
  oranger „Idee“-Kreis mehr). VoiceOver: heute geplant „Was anderes kochen?
  Mia schlägt Alternativen vor“, sonst „Kochidee – Mia schlägt dir ein
  Gericht vor“. Mit Kochidee keine zweite Pille. Ab dem 3.
  Nutzungstag (wie bisher, `hatVisible`); beim ersten Mal wippt er einmal und
  zeigt EINMAL „Neu: Kochidee“ (`kochtipp-muetze` in hints). Am Beispiel-Tag
  steht die Pille ohne Blase.
- Tipp → Bühne mit Kopf „KOCHIDEE“ (`useKochidee`): sofort drei Vorschläge,
  keine Frage – zuerst, was Vorhandenes nutzt (Vorrat, „im Haus“, bald zu
  Verbrauchendes), dann die Mischung; nie das geplante Gericht, nie die
  letzten 7 Tage, Allergien und „mag nicht“ strikt (`rankIdeas`,
  `startIdeas`). Mias Satz: „Lust auf was anderes als …?“ bzw. „Wie wär’s
  damit? … hast du noch.“; bei geplantem Gericht gestrichelt „… – bleibt,
  wenn du nichts nimmst“. Zeilen mit Bild, Minuten, „alles im Haus“ (grün)
  bzw. „auf die Liste: …“ und „Nehmen“ (`KochideeViews.tsx`).
- Darunter „Oder worauf hast du Lust?“ mit 3–4 Vorschlags-Knöpfen (weiß,
  Rand und Text Orange, `chipClass(false, "vorschlag")`; `IdeaSuggestions`):
  passend zu Vorrat (bald Verbrauchendes bzw. Neuestes „Was mit …“, sonst
  „Ich hab Hähnchen gekauft“), Jahreszeit („Was mit Kürbis“ im Herbst,
  Spargel/Zucchini/Grünkohl …), Tageszeit (mittags/abends „Was Schnelles“,
  sonst deftig bzw. leicht) und „Ohne Fleisch“ – nur, was etwas Neues bringt
  und mindestens drei Gerichte findet (`ideaSuggestions` in
  `kochtipp/vorschlaege.ts`, beim Erzeugen der Antwort in `idea.suggest`
  gespeichert). Ein Tipp schickt den Satz als eigene Nachricht ab. Die
  frühere Karte „Ganz was anderes?“ mit zweiter pulsierender Mia ist weg
  (Video 27.10.): auf der Bühne ist nur die große Mia unten antippbar.
- Erzähltes (`parseIdeaTalk`): Zutaten („Ich hab Hähnchen gekauft“, auch kurz
  „Hähnchen gekauft“ bzw. „Grad Hähnchen geholt“ wie im Clip, „Paprika
  und Sahne sind noch da“) → „im Haus“ (mit Vorrat-Baustein in den Vorrat,
  sonst `noteImHaus` für 3 Tage) und kurz „… merk ich mir als „im Haus“ ✓“;
  Wünsche („was Cremiges“, „schnell“, „ohne Fleisch“, „was mit Kürbis“),
  „lieber ohne Sahne“, „nicht schon wieder Hähnchen“, „für 3“. Ergebnis:
  „Dann mach doch …!“, Stichworte, Karussell mit drei Gerichten (nächste
  Karte schaut hervor, Punkte, Zutaten-Chips mit ✓, „Rezept ansehen“,
  „Nehmen“), zuletzt „Noch was anderes?“ (Linien-Symbol, keine Mia),
  darunter wieder „Oder worauf hast du Lust?“. Neues
  Erzähltes ergänzt das Alte (`mergeTalk`). Auf einen Vorschlag antwortet
  Mia mit kurzem Satz + drei neuen Karten (`ideaReply`: „Kürbis geht immer
  im Herbst:“, „Geht fix:“, „Ganz ohne Fleisch:“, „Schön deftig:“; wer
  erzählt, was da ist, bekommt weiter „Dann mach doch …!“). Alles ohne KI.
- „Nehmen“ (`takeOutcome`): frei → Abendessen heute (nach dem Abendessen:
  morgen); geplant → ersetzt das heutige, das alte steht wieder bei den
  Ideen (als Wunsch); Fehlendes auf die Liste; Meldung „Eingetragen. …
  steht auf der Liste.“ mit Rückgängig.
- Nichts davor: kein Mikro beim Öffnen, kein Hilfefenster, kein Zugangscode.
- Tests: `tests/essen/kochidee.test.ts`, `tests/essen/kochtipp.test.ts`,
  `tests/essen/vorschlaege.test.ts`, `tests/begleitung/eineMia.test.ts`,
  Durchklick `kochtipp`, `eineMiaBuehnen` und `muetzeBeispielTag`.

### Rezept-Links an Mia (Einkauf Teil B, v0.86.0)
- Ein Link im Gespräch (fast nur der Link, kein Kalender-Link,
  `rezeptLinkIn`), aus dem Teilen-Menü (Manifest `share_target` →
  `/?geteilt=1`, `geteiltAnMia`) oder ins Gerichte-Feld eingefügt → Mia
  liest die Seite (`/api/rezept-link`, gleicher Schutz wie Kalender-Abos:
  nur https, keine privaten Adressen, Größe/Zeit begrenzt).
- Gelesen wird nur das Nötigste (`essen/rezeptLink/lesen.ts`): schema.org
  Recipe als JSON-LD (auch `@graph`/Listen), sonst Microdata – Titel, Bild
  (nur verlinkt), Portionen, Zutaten, Quelle. Kein Rezepttext.
- Karte im Gespräch (`RezeptLinkKarte`): „Für 5 ▾“ (Haushaltsgröße,
  umgerechnet und sinnvoll gerundet), „auf die Liste: …“, grün „im Haus:
  …“, „vermutlich im Haus: …“, „steht schon drauf: …“; Grundsachen zählen
  nicht. Knöpfe „3 auf die Liste“ / „In den Wochenplan“ (Tag wählen → schlankes
  Rezept mit Notiz „Quelle: …“), beides mit Rückgängig.
- Nicht lesbar → „Auf der Seite finde ich kein Rezept – magst du mir die
  Zutaten einfach sagen?“ Testmodus: Host
  `rezept.test` (`mock.ts`).
- Tests: `tests/essen/rezeptLink.test.ts`, Durchklick `rezeptLink`.

## Begleitung (Mia)

- Werkzeuge (Vorschau + „Übernehmen“): `woche_lesen`, `gericht_setzen`,
  `platz_leeren`, `doppelt_kochen`, `gericht_verschieben`, `vorgaben_aendern`,
  `wunsch_merken` (`planTools.ts`; Ops `set_meal`, `clear_slot`, `set_double`,
  `move_meal`, `update_week`, `add_wish`); `kochbuch_durchsuchen`,
  `rezept_erstellen` (`cookbookTools.ts`, Op `add_recipe`, Allergien strikt);
  `wochenplan_anzeigen/_aendern/_loeschen`, `portionen_anpassen` (Op
  `set_persons`, nur dieser Tag) in `homeTools.ts`; sofort ohne Übernehmen:
  `kochen_starten`, `kochschritt`, `timer_stellen` (`dayTools.ts`).
- `gericht_verschieben` rollend (v0.126.0): ohne `woche` zählen die nächsten
  7 Tage ab heute, das Gericht auch über den Namen (`gericht`): „Schieb das Pad
  Thai auf Mittwoch“, „Tausch Freitag und Samstag“; `move_meal` klappt über die
  Wochengrenze (`ops.ts`, `preview.ts`). Testmodus: „Schieb die/das/den … auf
  <Tag>“. Prüfstand-Sätze „Schieb die Pizza auf Samstag“, „Schieb das Curry auf
  Montag“, „Tausch Freitag und Samstag“, „Was gibt’s Samstag?“ (152 Sätze).
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
  `umleitungen` (`/ideen`, `/schnellkueche`); `kochmodus.mjs` (Tafel 122).

## Essen-Kachel – immer Bild, gezeigtes Gericht immer wählbar (v0.116.0)

- Jedes gezeigte Gericht (heute geplant, morgen geplant, Vorschlag) ist eine
  Bild-Kachel (`DishTile`, eigene Zeichnungen, sonst Kategorie-Bild).
  Entscheidung rein in `lib/heute/essenKachel.ts` (`foodTileView`).
- Geplant: „Essen · 18:30“ bzw. „Morgen · Mo“, kein Zusatz. Nur Vorschlag:
  leise „Vorschlag“. „Ideen ansehen“ nur, wenn gar kein Gericht gezeigt wird.
- Antippen öffnet genau dieses Gericht: geplant mit Rezept → Rezept;
  Vorschlag → Fenster `GerichtSheet` mit „Für heute nehmen“ (nach dem Essen
  „Für morgen nehmen“, `takeForDay`) und „Rezept ansehen ›“. ⇄ wechselt wie
  bisher, die neue Idee ist genauso wählbar.
- Beispiel-Tag: Antippen öffnet das Beispielgericht im selben Fenster, erst
  „Nehmen“ übernimmt es in den echten Plan (Beispiel verschwindet).
- Tests `tests/heute/essenKachel.test.ts`, Durchklick `essenkachel.mjs`.

## Fehler raus (v0.122.0)

- Löschen über `ConfirmDialog` + „Gelöscht · Rückgängig“ (kein `window.confirm`). Kochmodus mit `&personen=N` (`personsParam`, `scaledAmount`). Variante `hackbraten` (Scheiben vom Laib). Herz in der Infozeile. „Kochmodus ›“, „Unsere Rezepte“, Kochmodus ohne Emojis. „Rezept erzählen“ ohne eigenes Mikro. Rezept-Links nur über `recipeHref` (nur wenn es das Rezept gibt). Tests `tests/essen/essenOhneFehler.test.ts`.

## Essen-Kachel „Rezept“ und Kochmodus (Tafel 122, A-025)

> Der Kachel-Teil hier ist ersetzt durch „Essen-Kachel final (A-045 +
> A-046, Tafel 133/134)“ weiter unten; Rezeptseite und Kochmodus gelten weiter.

Ersetzt den Kachel-Nachtrag „Ich koche jetzt“ (Tafel 121) und die eigene
Koch-Kachel (`CookingTile` ist weg).

**Essen-Kachel (S und M, `DishTile`)**
- Bild füllt die Kachel, darüber der Verlauf `--app-dish-tile-shade` (oben
  leicht, unten dunkel). `kontrastWeiss` prüft: weiße Schrift auf dem hellsten
  Bild überall, wo Text steht, ≥ 4,5:1 (Test, Token = geprüfter Verlauf).
- Oben links die Pille: Kochidee „Was anderes?“ (Linien-Icon Shuffle, wie
  bisher) bzw. ohne Kochidee „Was anderes?“ = nächste Idee (`naechsteIdee`).
- Mitte linksbündig: „ESSEN · 18:30“ (ohne Uhrzeit „ESSEN“, nach dem Essen
  „MORGEN · DO“), Name groß – S 20 px, M 24 px; passt er nicht in 2 Zeilen,
  etwas kleiner (bis 15 px), sehr lange Namen in S an einer Wortgrenze mit
  „…“ gekürzt, nie mitten im Wort (`titelAnzeige`, Zeichenbreiten von Plus
  Jakarta Sans 800 gemessen; Test: alle 150 Gerichte auf dem iPhone SE).
  Darunter `essenUnterzeile`: „90 Min · auf die Liste: Karotte“, sonst „90
  Min · alles im Haus“, ohne Vorrat-Daten nur „90 Min“, beim Kochen „Schritt 3
  von 6“.
- Unten zwei gleich breite Knöpfe (44 px): links weiß, Schrift dunkles Orange
  (`on-photo-ink`) – „Rezept“ (Buch), beim Kochen „Weiter kochen“ (Mütze),
  ohne Gericht „Vorschlag“ (Glühbirne, öffnet `GerichtSheet`); rechts weiß
  85 % „Wochenplan“ bzw. bei S „Woche“ (Kalender) → `/?seite=essen&zu=woche`,
  „Die nächsten 7 Tage“ scrollt in Sicht. Kein Kochtag: nur „Wochenplan“.
- „Rezept“: Rezept des Eintrags, sonst eingebautes über den Titel
  (`rezeptIdFuer`, Wochenkarten-Gerichte), mit `&personen=` des Tages. Eigener
  Eintrag ohne Rezept: `OhneRezeptSheet` mit Name, „Mia schreibt dir ein
  Rezept dazu.“ und „Ja, gern“ (Bitte „Schreib mir ein Rezept für …“ an Mia).
- Rest der Kachel: geplant → Tagesansicht (`TagFenster`), Vorschlag →
  `GerichtSheet`, frei → Essen-Seite. Beispiel-Tag gleich (Rezept = Beispiel-Rezept
  für die Personen des Haushalts, `beispielPersonen`: eingetragene, sonst
  allein 1, zu zweit 2, Familie 4).
- Kocht gerade = Kochmodus heute geöffnet (`at`) oder „Ich koche jetzt“ (Mia).
  Nach „Gegessen“ zeigt die Kachel wie bisher das Gericht bzw. den Vorschlag für morgen.

**Rezeptseite**: großes Bild, „‹ Heute“ als weiße Pille (`BackButton pill`,
Name der vorigen Seite), im Bild unten „HEUTE · 18:30 · FÜR 5“ (Heute nur beim
Gericht von heute, Personen aus dem Haushalt bzw. `?personen=`), Name, „90 Min
· alles im Haus bis auf Karotte“ (`rezeptVorratZeile`). Direkt darunter „Los,
Schritt für Schritt“ (50 px, volle Breite). Läuft ein Timer, steht oben
„⏱ 7:42 · Tomatensoße“ (`KochTimerLeiste`, Linien-Icon). „Zutaten“
(`RezeptZutaten`): Kästchen zum Abhaken (nur heute), Mengen für die
Personenzahl; nicht im Haus → „+ Liste“ (eigener Artikel mit Gericht) bzw.
„auf der Liste“. „So geht’s“ (`RezeptSchritte`) mit `Segmented` „Kurz |
Ausführlich“: Standard Kurz, die Wahl merkt sich das Gerät
(`wasgibts.rezeptansicht`). Kurz = `kurzSchritte`: eigene Kurzfassung (Mia),
sonst fest hinterlegt (alle 159 eingebauten Kochrezepte inkl. der 150 Gerichte
und die 6 Beispielgerichte, `lib/essen/kurz/daten*.ts`, je Zeile ≤ 8 Wörter,
gleiche Schrittzahl, gleiche Zeiten), sonst erster Satz je Schritt. Zeiten
stehen als Chip daneben (`schrittZeiten`, Text ohne Zeit `ohneZeit`) und
starten `startStepTimer` – derselbe Timer wie im Kochmodus (je Schritt nur
einer). Schritt antippen = durchgestrichen (nur heute, `toggleStep`). Am Ende
„Gegessen“ beim Gericht von heute.

**Kochmodus** (`CookMode`, Leiste weg): dunkel (`bg-cook`), oben ✕ (zurück zum
Rezept, ohne Nachfrage), „Schritt 3 von 6“ (Zutaten-Bildschirm „Zutaten“) und
Punkte, Vorlesen an/aus. Ein Schritt je Bildschirm in 24 px. Zeit im Schritt →
„Timer 10 Min“ (orange); der Timer liegt in `timer/`, läuft beim Blättern und
Verlassen weiter, `TimerAlarm` meldet sich mit Ton und Karte. Unten „Zurück“ |
„Weiter“ (56 px), Wischen (nicht vom linken Rand). Wake Lock (`useWakeLock`,
sonst still). Der Schritt wird für heute gemerkt (`setCookAt`) – wieder öffnen
= dort weiter (`startSchritt`); erledigte Schritte erscheinen auf der
Rezeptseite durchgestrichen. Letzter Schritt: „Gegessen“ (Gericht von heute:
als gekocht vermerken, Kochen beenden, Startseite, Mia sagt nur „Lasst es euch
schmecken.“ bzw. „Lass es dir schmecken.“, durch `tidyMiaText`), sonst
„Fertig“ (zurück zum Rezept).
- Mia hört mit (`KochOhr`): Zeile mit kleinem Gesicht (nicht antippbar) „Sag
  einfach „Weiter“ oder „Timer 10 Minuten“.“ Einmal antippen = „Mikro an“
  (gemerkt als Einmal-Hinweis `koch-ohr`); mit Mikro-Freigabe hört sie danach
  still mit (`useSpeechInput` lang, nach jedem Befehl `reset()`), nie von selbst
  fragen. `kochBefehl` versteht weiter, zurück, nochmal (liest den Schritt
  vor), Timer X Minuten, fertig (letzter Schritt = Gegessen, sonst weiter);
  nur die letzten Wörter, lange Sätze lösen nichts aus.
- Mia schreibt Rezepte mit Kurzfassung: `rezept_erstellen` hat das Pflichtfeld
  `kurz` (je Schritt eine Zeile ≤ 8 Wörter); passt die Zahl nicht, kürzt die
  App selbst (`kurzVonMia`). Prüfstand +2 („Schreib mir ein Rezept für
  Gemüselasagne.“, „Timer 5 Minuten für die Béchamel“).
- Tests: `tests/heute/essenKachel.test.ts`, `tests/essen/schnellanleitung.test.ts`,
  `tests/essen/kochmodus.test.ts` (Befehls-Prüfstand 30 Sätze ≥ 95 %),
  `tests/begleitung/werkzeugeEssen.test.ts`; Durchklick `kochmodus.mjs`.

## Vorschläge erst anschauen, dann nehmen (Tafel 122, A-038)

Wortlaut: `docs/auftraege/A-038-vorschau.md`. Überall, wo Gerichte zur Auswahl
stehen, gilt dasselbe: Karte antippen (überall außer „Nehmen“) = Rezept-Vorschau,
„Nehmen“ = eintragen wie bisher.

- **Ein Hook für alle Stellen:** `useVorschau()` (`components/essen/vorschau/`)
  mit `zeigen(vorschlag, nehmen)`, `nehmen(vorschlag, nehmen)`, `fenster` und
  `hinweis(index, wo)`. Stellen: Kochidee auf der Bühne (Zeilen `IdeaRow` und
  Karussell `IdeaCarousel`, auch „Was anderes?“), Spontan kochen / „Was koch
  ich daraus?“ (`SpontanAnswer` → `IdeaCards` `onPreview`; Fertigprodukte
  „f:…“ ohne Rezept bleiben ohne Vorschau), „Was koche ich?“ (`SwapSheet`, auch
  im Wochenplan), Wochenkarte (`TagFenster` „Oder lieber“/„Wie wär’s mit“, mit
  eigenem „Nehmen“) und Mias Wochenplan-Vorschlag (`ProposalCard`, „Rezept
  ansehen“ statt der alten Klapp-Liste; „Nehmen“ = Zeile wählen).
- **Vorschau** (`RezeptVorschau`, EIN Fenster über `ui/Sheet`, Ebene über der
  Bühne): Bild, Name im Kopf, „35 Min · für 4 · alles im Haus“ (grün) bzw.
  „auf die Liste: …“, dann `RezeptZutaten` und `RezeptSchritte` der
  Rezeptseite mit `vorschau` (nur lesen: keine Kästchen, kein „+ Liste“, kein
  Durchstreichen, keine Timer; „Kurz | Ausführlich“ bleibt). Mengen für den
  Haushalt (`beispielPersonen`) bzw. die Personen der Stelle. Unten fest
  „Zurück zu den Ideen“ und „Nehmen“ (orange). ✕, Danebentippen,
  Runterwischen und Zurück schließen nur die Vorschau; die Vorschläge dahinter
  bleiben stehen (nichts lädt neu, Scrollposition bleibt).
- **Rezept finden** (`lib/essen/vorschau`): mitgeliefert (neues KI-Rezept im
  Vorschlag) → eigenes/eingebautes über ID oder Titel (`rezeptIdFuer`) →
  sonst schreibt Mia es (`ladeRezept`): Fenster öffnet sofort mit Bild und
  Name, „Mia schreibt das Rezept …“ (atmet ruhig über die Deckkraft,
  `vorschau-schreibt`, bei reduzierter Bewegung still). Weg: `askAssistant`
  mit `vorschauBitte` („Schreib mir ein Rezept für … Nur das Rezept, ohne
  Tag.“) – derselbe Server-Weg wie das Gespräch (Zugangscode, Tageslimit,
  Testmodus `mockVorschau.ts`), `rezept_erstellen` mit `fuer_plan=false`.
  Genau einmal je Gericht (läuft es schon, wird gewartet), gemerkt für die
  Sitzung (nur im Arbeitsspeicher). Fehler: einmal still nochmal, dann „Hat
  grad nicht geklappt. Nochmal?“ mit „Nochmal“.
- **„Nehmen“** (`nehmenMitRezept`): Karte und Vorschau gehen durch dieselbe
  Funktion. Gibt es das Rezept schon, läuft der Weg der Stelle unverändert
  (Kochidee: eintragen/ersetzen, Fehlendes mit Mengen auf die Liste,
  „Eingetragen. …“ mit Rückgängig; sonst `takeForDay`). Hat Mia es eben
  geschrieben, kommt es ins Kochbuch und der Plan zeigt darauf (Mengen für
  die Liste aus diesem Rezept, `listenMenge`); in Mias Wochenplan-Vorschlag
  hängt es stattdessen als neues KI-Rezept am Gericht (`rezeptInVorschlag`)
  und wird erst mit „Passt“ angelegt.
- **Hinweis:** einmal unter der ersten Karte „Antippen zum Reinschauen.“
  (Einmal-Hinweis `vorschau-antippen` in `wasgibts.einmalhinweise`), danach
  nie wieder.
- Tests: `tests/essen/vorschau.test.ts`; Durchklick `vorschau.mjs`
  (`vorschauBuehne`, `vorschauEssen`). Prüfstand +1 („Schreib mir ein Rezept
  für Kürbisrisotto. Nur das Rezept, ohne Tag.“).

## Essen-Kachel final (A-045 + A-046, Tafel 133/134)

Wortlaut `docs/auftraege/A-045-kachel-ganz.md` und
`docs/auftraege/A-046-essen-kachel-final.md`. Ersetzt die Kachel-Teile aus
Tafel 121/122/133.

**Aufbau (S und M gleich, M mit mehr Bild, `DishTile`)**
- Bild füllt die Kachel, Verlauf `--app-dish-tile-shade` (weiße Schrift
  ≥ 4,5:1). Die Kachel wächst mit dem Text (kein festes Raster für den Text).
- Oben links EINE weiße Pille „⇄ Was anderes?“ (`ui/KachelPille`, 12 px fett,
  orange Schrift): ohne Kochidee nächste Idee (`naechsteIdee`), mit Kochidee
  (ab dem 3. Tag) Mias Kochidee. Kein oranger „Idee“-Kreis, keine anderen
  Abzeichen.
- Unten links: Statuszeile 10,5 px in Großbuchstaben (`essenKopf`):
  Vorschlag „KOCHIDEE · HEUTE“ / „KOCHIDEE · MORGEN DO“, fest geplant
  „ESSEN · 18:30“ / „MORGEN · DO“, beim Kochen „ESSEN · JETZT“. Darunter der
  Name (S 19 px, M 22 px, `titelPx`; passt er nicht in 2 Zeilen, kleiner bis
  14 px, nur auf dem iPhone SE bei sehr langen Namen 3 Zeilen – nie „…“, nie
  mitten im Wort). Dann `essenUnterzeilen`: S zweizeilig „30 Min“ / „auf die
  Liste: Eier +3“ bzw. „alles im Haus“, M einzeilig „30 Min · auf die Liste:
  Eier, Limette +2“ (`zutatenKurz`: höchstens 2, in S 1 Name, Rest „+N“),
  beim Kochen „Schritt 3 von 6“.
- Unten rechts weiße Pille „Wochenplan ›“ (`ui/KachelKnopf`, 12,5 px, 32 px
  hoch, Tippfläche 44 px) → „Die nächsten 7 Tage“; beim Kochen „Weiter
  kochen ›“ → Kochmodus am Schritt (`essenPille`). Keine großen Knöpfe
  „Rezept“/„Woche“ mehr; `GerichtSheet` ist weg.
- Nichts geplant: gleich der erste Vorschlag des Tages als Kochidee. Gibt es
  keinen (oder Kein Kochtag/Pause): „Was gibt’s heute?“ (abends „Was gibt’s
  morgen?“) bzw. „Kein Kochtag“ mit leerem Teller.

**Antippen (`essenTippen`)** – ganze Kachel außer den zwei Pillen:
- Vorschlag → Rezept-Vorschau (A-038, `useVorschau`) mit Statuszeile im Bild,
  Zutaten, „So geht’s“ (Kurz | Ausführlich), unten „Zurück zu den Ideen“
  (derselbe Vorschlag bleibt stehen) und „Nehmen“ (trägt für heute bzw.
  abends für morgen ein, `takeDish`; was fehlt, kommt wie bisher über den
  Plan auf die Einkaufsliste – das Wochenplan-Angebot aus Tafel 127 gibt es
  auf diesem Stand noch nicht).
- Fest geplant → Rezeptseite mit „Los, Schritt für Schritt“ (ohne Rezept:
  `OhneRezeptSheet`).
- Beim Kochen → Kochmodus am aktuellen Schritt.
- Frei → die Ideen des Tages (`TagFenster`), Kein Kochtag → Essen-Seite.
- Beispiel-Tag: Antippen = Vorschau des Beispielgerichts (Personen des
  Haushalts), erst „Nehmen“ übernimmt es in den echten Plan.

**Grundregel (alle Kacheln):** kein sichtbarer Text endet auf „…“ – siehe
`docs/design.md`. Tests: `tests/heute/essenKachel.test.ts`,
`tests/heute/kachelKnopf.test.ts`, `tests/essen/kochidee.test.ts`;
Durchklick `nichtsAbgeschnitten` (`e2e/ablaeufe/abgeschnitten.mjs`),
`essenkachel.mjs`, `kochmodus.mjs`.
