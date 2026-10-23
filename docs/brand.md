# Marke Mia

Stand v0.67: Die App heißt Mia (APP_NAME in `src/lib/core/app.ts`). „Was gibt’s?“ heißt nur noch der Essen-Bereich.

## Logo

- **Hauptlogo** = App-Icon links + Schriftzug „Mia“ rechts (großes M,
  normaler runder i-Punkt). Kein Blasen-i im Hauptlogo.
- **Wenig Platz:** nur das Icon.
- **Werbung:** zusätzlich „Mia.“ mit hellem Punkt.
- Schrift: Plus Jakarta Sans ExtraBold (800), leicht eng (−24/1000), in Pfade
  umgewandelt; der eckige i-Punkt der Schrift ist durch einen runden ersetzt.
- Lockup: Versalhöhe des M = 0,62 × Icon-Höhe, vertikal mittig, Abstand
  0,22 × Icon-Höhe. Icon mit runden Ecken (18/80).

## Farben

| Name | Wert | Token | Wofür |
|---|---|---|---|
| Mia-Orange | `#EE5F14` | `--app-brand` | Schrift und Marke (hell) |
| Mia-Orange dunkel | `#F7843E` | `--app-brand-dark` | Schrift auf dunklem Grund |
| Mia-Orange weich | `#F7A36E` | `--app-brand-soft` | Punkt in „Mia.“ |

Icon: Verlauf `#F7843E` → `#EE5F14`, weiße Blase, Gesicht in Orange.
`--app-brand-wort` ist im Hellen `--app-brand`, im Dunkeln `--app-brand-dark`.

## Dateien (`public/brand/`, erzeugt mit `npm run brand`)

| Datei | Variante |
|---|---|
| `mia-logo-hell` | Hauptlogo auf hellem Grund |
| `mia-logo-dunkel` | Hauptlogo auf dunklem Grund (Schrift `#F7843E`) |
| `mia-logo-auf-orange` | Icon umgedreht (weiße Kachel, orange Blase), „Mia“ weiß |
| `mia-icon` | nur das Icon |
| `mia-aufkleber` | runder Aufkleber (Icon + „Mia“ im weißen Kreis) |
| `mia-punkt` | „Mia.“ für Werbung |

Jede Variante als `.svg`, `.png`, `@2x.png`, `@3x.png` (64 px hoch, der
Aufkleber 128 px) und `-druck.png` (300 dpi; 30 mm hoch, Aufkleber 50 mm).
Quelle: `src/lib/core/brand.ts` (Farben + Schriftzug als Pfad) und
`scripts/generate-brand.mjs`.

In der App: `BrandMark` aus `src/components/ui/BrandMark.tsx`
(`variant="lockup" | "icon" | "wort"`, folgt Hell/Dunkel). Vorschau: `/brand`
(nur im Testmodus).

## Regeln

- **Schutzzone:** rundherum mindestens eine halbe Icon-Höhe frei.
- **Mindestgröße:** 24 px (Bildschirm) bzw. 10 mm (Druck) Icon-Höhe.
- **Do:** Original-Dateien nutzen, auf ruhigem Grund, hell/dunkel passend
  wählen.
- **Don’t:** nicht verzerren, keine anderen Farben, kein Schatten, kein
  Umriss, nie Orange auf Orange (auf Orange immer `mia-logo-auf-orange`).
