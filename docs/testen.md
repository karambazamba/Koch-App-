# Testen (aus CLAUDE.md umgezogen)

Vor jedem PR alles grün:
- `npm test` – Vitest, `tests/<bereich>/*.test.ts`, `tests/app/` für Code- und
  Textregeln (Stilblatt, Ohne-Druck-Wörter, Speicher, Service Worker).
  Gemeinsame Hilfen in `tests/helpers.ts`: `at()`/`atFresh()` (feste Zeit),
  `memoryStorage()`, `fakeWindow()`/`noBrowser()`, `termin()`/`aufgabe()`.
- `npm run test:abdeckung` – Abdeckung `src/lib` (ohne `use*.ts` und reine
  Browser-Schnittstellen), Untergrenze 80 % Zeilen.
- `npx tsc --noEmit`, `npm run lint`, `npx knip` (ungenutzter Code muss 0
  sein; `@public` im Kommentar = bewusst für Tests/Push).
- `npm run build`, danach `.next/static` nach `sk-ant` und Supabase-
  Geheimnissen (`service_role`, `SUPABASE_SECRET`) durchsuchen.
- `npm run test:datenbank` – Migrationen und RLS gegen echtes Postgres
  (bei Änderungen in `supabase/`).
- `npm run durchklick` – Playwright mit echten Touch-Gesten, iPhone 15 Pro und
  Pixel 7 (Abläufe in `e2e/ablaeufe/`, eigener Testserver mit Testmodus).
- Bei Oberflächen-Änderungen: `npm run bilder` (96 Bildschirmfotos) und
  `npm run bilder:vergleich` (Abweichung > 0,1 %); gewollte Änderungen
  ansehen, dann `npm run bilder -- --basis`. Bilder liegen in `.bilder/`.
- `npm run messen` – JavaScript je Seite.
- Vor dem Vorführen bzw. bei großen Änderungen: `npm run pruefen` (jede Seite
  auf SE/15 Pro/Pixel 7, hell/dunkel, Browser/App, Startseite zu 5 Uhrzeiten:
  seitlich verrutscht, unter der Leiste, Tippflächen, Knopf über Text, Knopf
  fängt keinen Tipp, 16 px, Konsole, 404, Texte; `-- --schnell` = ein Gerät)
  und `npm run knoepfe` (jeden Knopf antippen: passiert etwas?).
- Testmodus ohne KI: `KUECHENHELFER_MOCK=1`, `WETTER_MOCK=1`,
  `TIPS_SOURCE=demo`, `KONTEN_TEST=1` (Test-Backend für Konten).
