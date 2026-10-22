# Großes Aufräumen – Ausgangslage (vor Etappe 1)

Stand: v0.47.0 (main nach #87), gemessen am 22.10.2026. Vergleich am Ende in
`docs/aufraeumen-nachher.md`.

## Sicherheitsnetz (Etappe 0)

- `npm run durchklick` – 15 Abläufe auf iPhone 15 Pro und Pixel 7 (Ordner
  `e2e/`, Playwright, echte Touch-Gesten über CDP): Hallo → Startseite,
  Bearbeiten-Modus, Wischen, Eintragen, Kalender, Essen, Rezept, Einkauf,
  Vorrat, Pinnwand, Wetter, Spendentopf, Tipps (Demo), Einstellungen, Chat im
  Testmodus. Startet selbst einen Testserver (vorher `npm run build`) oder
  nutzt `E2E_BASE`.
- `npm run bilder` (`-- --basis` für die Ausgangslage) – 96 Bildschirmfotos:
  16 Ansichten × iPhone SE / iPhone 15 Pro / Pixel 7 × hell / dunkel, feste
  Zeit (Mi 21.10.2026 10:30), fester Zufall, Testmodi für KI, Wetter, Tipps.
  `npm run bilder:vergleich` meldet Abweichungen > 0,1 % (Unterschiedsbilder
  in `.bilder/unterschied`, nicht im Repo). Zweimal hintereinander: 96/96
  gleich.
- `npm run messen` – JavaScript je Hauptseite beim ersten Aufruf.

## Zahlen

| | vorher |
|---|---|
| Dateien in `src/` (.ts/.tsx) | 391 |
| Zeilen in `src/` | 47 651 |
| größte Datei | `components/assistant/HelperPanel.tsx` (1 190) |
| Komponenten > 400 Zeilen | 7 |
| Logik > 600 Zeilen | 4 |
| knip (Zeilen Bericht) | 17 |
| direkte `localStorage`/`sessionStorage`-Aufrufe außerhalb `localStore.ts` | 29 |
| `new Date()` außerhalb `now.ts` | 1 |
| Testdateien / Tests | 21 / 231 |
| `npm test` | ≈ 3 s |

Komponenten über 400 Zeilen: HelperPanel 1 190 · PlanSheets 535 · TodayPage
504 · HomeBoard 493 · AreaEditViews 469 · editors 445 · ShoppingListView 432.
Logik über 600 Zeilen: shoppingList 771 · baking/data 766 · profile 640 ·
lotte/tools 621.

## JavaScript je Seite (erster Aufruf, Pixel 7, mit Familie)

| Seite | JS unkomprimiert | JS gzip |
|---|---|---|
| / | 1453 KB | 467 KB |
| /?seite=kalender | 1453 KB | 467 KB |
| /?seite=essen | 1453 KB | 467 KB |
| /kochbuch/rezept?id=sp | 1281 KB | 406 KB |
| /einkaufsliste | 1199 KB | 387 KB |
| /vorrat | 1188 KB | 384 KB |
| /pinnwand | 1178 KB | 380 KB |
| /wetter | 1186 KB | 383 KB |
| /tipps | 1209 KB | 391 KB |
| /profil | 1338 KB | 434 KB |

(Enthält das im Leerlauf vorgeholte Gespräch.)

## Lighthouse (mobil, Lighthouse 12.2.1, ohne Profil = Hallo-Bildschirm auf /)

| Seite | Leistung | Barrierefreiheit | Best Practices | SEO |
|---|---|---|---|---|
| / | 74 | 95 | 100 | 100 |
| /pinnwand | 90 | 95 | 100 | 100 |
| /wetter | 88 | 96 | 100 | 100 |

Lighthouse 12 hat keine eigene PWA-Kategorie mehr; Manifest und Service
Worker werden über die Durchklicks geprüft.

## knip

```
Unused exports (7)
PORT                     e2e/lib.mjs:9:14                          
TIME                     e2e/lib.mjs:11:14                         
FAMILY                   e2e/lib.mjs:67:14                         
TASK_COUNT               src/components/alltag/MiniCards.tsx:137:14
byTimeThenAge  function  src/lib/aufgaben/model.ts:266:17          
FEATURES                 src/lib/core/features.ts:13:14            
nextSlots      function  src/lib/wetter/forecast.ts:93:17          
Unused exported types (9)
ChatMessage   type  src/lib/einstellungen/onboarding/engine.ts:15:13
NameEntry     type  src/lib/einstellungen/onboarding/engine.ts:20:13
OvenSettings  type  src/lib/essen/cookbook.ts:14:28                 
TipCategory   type  src/lib/essen/tips/types.ts:3:13                
SlotRef       type  src/lib/lotte/ops.ts:73:13                      
Dish          type  src/lib/lotte/ops.ts:88:13                      
WeekChoice    type  src/lib/lotte/tools.ts:31:13                    
PinData       type  src/lib/pinnwand/model.ts:15:13                 
PartId        type  src/lib/wetter/view.ts:20:13                    
Configuration hints (1)
@tailwindcss/turbopack    knip.json  Remove from ignoreDependencies
```

## Sonst

- TODO: 2 echte (`tipps/sources/tldb.ts`, wartet auf TLDB-Zugang) – die übrigen
  Treffer sind Variablennamen (`TODO_VERB`, `TODO_WORDS`).
- eslint-disable: 7 (je mit Begründung; Prüfung in Etappe 1).
