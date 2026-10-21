// Eingebaute Gericht-Bilder: je Gericht aus DISHES, den Beispiel-Gerichten und
// der Backstube eine eigene Illustration (dishArt + renderDishSvg, dieselben
// Bausteine wie das Live-Bild in der App) als public/gerichte/<slug>.webp
// (900 × 600, Ziel < 80 KB). Dazu public/demo/gericht.webp (1200 × 800) und
// die Liste src/lib/essen/dishImageList.ts. Aufruf: npm run gerichte-bilder
// Optional: --bogen <datei.png> legt einen Kontaktbogen aller Bilder an.

import { createJiti } from "jiti";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": `${root}src` } });
const load = (p) => jiti.import(`${root}${p}`);

const { dishArt, dishSlug } = await load("src/lib/essen/dishArt.ts");
const { renderDishSvg } = await load("src/lib/essen/dishSvg.ts");
const { DISHES } = await load("src/lib/essen/dishIdeas.ts");
const { DEMO_RECIPES } = await load("src/lib/essen/demoDish.ts");
const { BUILTIN_BAKING } = await load("src/lib/essen/baking/index.ts");

const names = (r) => r.ingredients.map((i) => i.name);
const list = [
  ...DEMO_RECIPES.map((r) => ({ title: r.title, ingredients: names(r), category: r.category })),
  ...DISHES.map((d) => ({ title: d.title, ingredients: d.needs, category: d.category })),
  ...BUILTIN_BAKING.map((r) => ({ title: r.title, ingredients: names(r), category: r.category })),
];

const seen = new Map();
for (const d of list) if (!seen.has(dishSlug(d.title))) seen.set(dishSlug(d.title), d);

await rm(`${root}public/gerichte`, { recursive: true, force: true });
await mkdir(`${root}public/gerichte`, { recursive: true });
const files = [];
let big = 0;
for (const [slug, d] of seen) {
  const art = dishArt(d.title, d.ingredients, d.category);
  const out = `${root}public/gerichte/${slug}.webp`;
  const info = await sharp(Buffer.from(renderDishSvg(art))).webp({ quality: 80 }).toFile(out);
  const kb = Math.round(info.size / 1024);
  if (kb > 80) big++;
  files.push({ slug, title: d.title, form: art.form, kb, out });
  console.log(`${kb.toString().padStart(3)} KB  ${art.form.padEnd(12)} ${slug}${art.guessed ? "  (geraten)" : ""}`);
}

// Das Beispielgericht des Beispiel-Tags aus denselben Bausteinen (größer)
const pasta = DEMO_RECIPES[0];
await sharp(Buffer.from(renderDishSvg(dishArt(pasta.title, names(pasta), pasta.category), { width: 1200, height: 800 })))
  .webp({ quality: 82 })
  .toFile(`${root}public/demo/gericht.webp`);

const slugs = [...seen.keys()].sort();
await writeFile(
  `${root}src/lib/essen/dishImageList.ts`,
  `// Von scripts/generate-dish-images.mjs erzeugt (npm run gerichte-bilder) – nicht von Hand ändern.\n// Gerichte mit eingebautem Bild unter /gerichte/<slug>.webp\n\nexport const DISH_IMAGES: ReadonlySet<string> = new Set([\n${slugs.map((s) => `  "${s}",`).join("\n")}\n]);\n`,
);
console.log(`\n${files.length} Bilder, ${big} über 80 KB · public/demo/gericht.webp · src/lib/essen/dishImageList.ts`);

// Kontaktbogen (nur zum Ansehen, nicht im Repo)
const bogen = process.argv.indexOf("--bogen");
if (bogen > 0) {
  const tw = 300;
  const th = 200;
  const cols = 6;
  const rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(
    files.map(async (file, i) => ({
      input: await sharp(file.out).resize(tw, th).composite([{ input: Buffer.from(`<svg width="${tw}" height="24"><rect width="${tw}" height="24" fill="#000" opacity="0.55"/><text x="6" y="17" font-family="sans-serif" font-size="13" fill="#fff">${file.title.replace(/&/g, "&amp;")}</text></svg>`), top: th - 24, left: 0 }]).png().toBuffer(),
      left: (i % cols) * tw,
      top: Math.floor(i / cols) * th,
    })),
  );
  await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: "#222" } }).composite(tiles).png().toFile(process.argv[bogen + 1]);
  console.log(`Kontaktbogen: ${process.argv[bogen + 1]}`);
}
