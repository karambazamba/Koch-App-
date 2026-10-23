# Bild- und Quellennachweise

## Gericht-Bilder

- Alle Gericht-Bilder sind **eigene Illustrationen, im Code erzeugt** – keine
  fremden Fotos, keine KI, keine Lizenzpflicht. Quelle: `dishArt` (erkennt
  Form und Toppings) und `renderDishSvg` (zeichnet) in `src/lib/essen/`.
- `public/gerichte/<slug>.webp` – eingebaute Gerichte (Gerichte-Liste,
  Beispiel-Gerichte, Küche „Mehr Ideen“, Backstube), erzeugt mit `npm run gerichte-bilder`
  (`scripts/generate-dish-images.mjs`).
- `public/demo/gericht.webp` – „Pasta mit Tomaten & Burrata“ für den
  Beispiel-Tag, aus denselben Bausteinen (ebenfalls `npm run gerichte-bilder`).
- Eigene Rezepte, Vorschläge und Freitext werden in der App live gezeichnet.
- Ein echtes Foto (eigenes oder lizenzfrei, z. B. Unsplash/Pexels/CC0) kann
  ein Bild jederzeit ersetzen – dann hier Quelle und Lizenz eintragen und
  `CACHE_VERSION` in `public/sw.js` erhöhen.

## Einkaufs-Symbole

- Die Symbole auf den Einkaufs-Kacheln sind **eigene Zeichnungen im Code**
  (`src/components/einkauf/kacheln/ItemSymbol.tsx`) – keine fremden Bilder,
  keine KI, keine Lizenzpflicht.

## Wetterdaten

- Hauptquelle: **Deutscher Wetterdienst (DWD)**, Vorhersage MOSMIX und
  Stationsmessungen, abgerufen über **Bright Sky** (api.brightsky.dev, frei,
  ohne Schlüssel). In der App: „Daten: Deutscher Wetterdienst (über Bright
  Sky)“. DWD-Daten: Datenlizenz Deutschland – Namensnennung 2.0.
- Ausweichquelle: **Open-Meteo** (open-meteo.com, CC BY 4.0) mit dem
  DWD-Modell ICON (`models=icon_seamless`). In der App: „Daten: Open-Meteo
  (DWD ICON)“.
- Ortssuche: Open-Meteo Geocoding; „Meinen Standort verwenden“: OpenStreetMap
  Nominatim (© OpenStreetMap-Mitwirkende, ODbL) – nur der Stadtname wird
  gespeichert.
