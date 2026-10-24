// Testmodus: https://rezept.test/… liefert der Server selbst eine kleine
// Rezept-Seite (schema.org/Recipe als JSON-LD) – für Durchklick und Tests.

const SEITE = `<!doctype html><html><head><title>Kürbissuppe</title>
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: "Rezept-Test" },
    {
      "@type": "Recipe",
      name: "Kürbissuppe mit Ingwer",
      image: ["https://rezept.test/kuerbis.jpg"],
      recipeYield: "4 Portionen",
      recipeIngredient: ["1 Hokkaido-Kürbis", "2 Zwiebeln", "1 Stück Ingwer", "400 ml Kokosmilch", "500 ml Gemüsebrühe", "Salz", "Pfeffer"],
    },
  ],
})}</script></head><body><h1>Kürbissuppe</h1></body></html>`;

/** Seite für eine Test-Adresse (sonst null) */
export const mockRezeptSeite = (url: URL) => (url.hostname === "rezept.test" ? SEITE : null);
