# Bild- und Quellennachweise

## Gericht-Bilder

- Alle Gericht-Bilder sind **eigene Illustrationen, im Code erzeugt** – keine
  fremden Fotos, keine KI, keine Lizenzpflicht. Quelle: `dishArt` (erkennt
  Form und Toppings) und `renderDishSvg` (zeichnet) in `src/lib/essen/`.
- `public/gerichte/<slug>.webp` – eingebaute Gerichte (Gerichte-Liste,
  Beispiel-Gerichte, Backstube), erzeugt mit `npm run gerichte-bilder`
  (`scripts/generate-dish-images.mjs`).
- `public/demo/gericht.webp` – „Pasta mit Tomaten & Burrata“ für den
  Beispiel-Tag, aus denselben Bausteinen (ebenfalls `npm run gerichte-bilder`).
- Eigene Rezepte, Vorschläge und Freitext werden in der App live gezeichnet.
- Ein echtes Foto (eigenes oder lizenzfrei, z. B. Unsplash/Pexels/CC0) kann
  ein Bild jederzeit ersetzen – dann hier Quelle und Lizenz eintragen und
  `CACHE_VERSION` in `public/sw.js` erhöhen.
