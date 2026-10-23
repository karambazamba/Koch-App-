// Erzeugt die Logo-Dateien der Marke Mia unter public/brand/ (Aufruf: `npm run brand`).
// Quelle für Farben und Schriftzug: src/lib/core/brand.ts (Schrift als Pfad,
// kein Text). Das Icon ist dasselbe Motiv wie das App-Icon
// (scripts/generate-icons.mjs), hier mit runden Ecken.
// Varianten: hell, dunkel, auf Orange, nur Icon, runder Aufkleber, „Mia.“ –
// je SVG und PNG 1×/2×/3× (Druck: PNG mit 300 dpi). Maße in docs/brand.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const source = readFileSync("src/lib/core/brand.ts", "utf8");
const read = (name) => {
  const m = source.match(new RegExp(`export const ${name} = "?([^";]+)"?;`));
  if (!m) throw new Error(`${name} fehlt in brand.ts`);
  return m[1];
};
const BRAND = read("BRAND");
const BRAND_DARK = read("BRAND_DARK");
const BRAND_SOFT = read("BRAND_SOFT");
const CAP = Number(read("WORD_CAP"));
const WIDTH = Number(read("WORD_WIDTH"));
const WORD = read("WORD_PATH");
const DOT = read("WORD_DOT_PATH");
const DOT_WIDTH = Number(read("WORD_DOT_WIDTH"));

/** Motiv wie im App-Icon (Koordinaten 0–80): Blase in `bubble`, Augen und Lächeln in `face` */
const motif = (bubble, face) =>
  `<rect x="8" y="10" width="64" height="52" rx="20" fill="${bubble}"/><path d="M33 60 L40 72 L47 60 Z" fill="${bubble}" stroke="${bubble}" stroke-width="3" stroke-linejoin="round"/><g transform="translate(40 36) scale(1.05) translate(-40 -36)"><rect x="27.5" y="29" width="5" height="10" rx="2.5" fill="${face}"/><rect x="47.5" y="29" width="5" height="10" rx="2.5" fill="${face}"/><path d="M31 45.5c5 4 13 4 18 0" stroke="${face}" stroke-width="4.2" fill="none" stroke-linecap="round"/></g>`;
const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${BRAND_DARK}"/><stop offset="1" stop-color="${BRAND}"/></linearGradient></defs>`;
/** Icon 80×80 mit runden Ecken; `inverse` = weiße Kachel, orange Blase (für Orange als Grund) */
const iconAt = (x, y, size, inverse = false) => {
  const s = size / 80;
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect width="80" height="80" rx="18" fill="${inverse ? "#fff" : "url(#g)"}"/><g transform="translate(4.8 6.8) scale(.88)">${motif(inverse ? BRAND : "#fff", inverse ? "#fff" : BRAND)}</g></g>`;
};
/** Schriftzug mit Versalhöhe `cap` an (x, y = Oberkante des M) */
const wordAt = (x, y, cap, color, dot) => {
  const s = cap / CAP;
  return `<g transform="translate(${x} ${y}) scale(${+s.toFixed(5)})"><path d="${WORD}" fill="${color}"/>${dot ? `<path d="${DOT}" fill="${dot}"/>` : ""}</g>`;
};
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${+w.toFixed(2)} ${+h.toFixed(2)}" width="${Math.round(w)}" height="${Math.round(h)}">${gradient}${body}</svg>\n`;

// Lockup: Icon-Höhe 80 · Versalhöhe M = 0,62 × Icon · Abstand 0,22 × Icon · vertikal mittig
const H = 80;
const cap = 0.62 * H;
const gap = 0.22 * H;
const pad = 2; // Luft für den runden i-Punkt
const lockupW = H + gap + (WIDTH * cap) / CAP + pad;
const lockup = (color, inverse = false) => svg(lockupW, H, `${iconAt(0, 0, H, inverse)}${wordAt(H + gap, (H - cap) / 2, cap, color)}`);

// „Mia.“ (Werbung): Schriftzug mit hellem Punkt
const punktCap = 60;
const punktW = (DOT_WIDTH * punktCap) / CAP + pad;
const punktH = punktCap + 8;

// Runder Aufkleber: weißer Kreis, Icon oben, „Mia“ darunter
const sticker = () => {
  const capS = 20;
  const wS = (WIDTH * capS) / CAP;
  return svg(100, 100, `<circle cx="50" cy="50" r="48.5" fill="#fff" stroke="${BRAND}" stroke-width="3"/>${iconAt(30, 15, 40)}${wordAt((100 - wS) / 2, 63, capS, BRAND)}`);
};

const FILES = {
  "mia-logo-hell": { svg: lockup(BRAND), height: 64 },
  "mia-logo-dunkel": { svg: lockup(BRAND_DARK), height: 64 },
  "mia-logo-auf-orange": { svg: lockup("#fff", true), height: 64 },
  "mia-icon": { svg: svg(80, 80, iconAt(0, 0, 80)), height: 64 },
  "mia-aufkleber": { svg: sticker(), height: 128 },
  "mia-punkt": { svg: svg(punktW, punktH, wordAt(0, 4, punktCap, BRAND, BRAND_SOFT)), height: 64 },
};

const out = "public/brand";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [name, { svg: s, height }] of Object.entries(FILES)) {
  writeFileSync(`${out}/${name}.svg`, s);
  const [, w, h] = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  for (const scale of [1, 2, 3]) {
    const ph = height * scale;
    const pw = Math.round((w / h) * ph);
    await sharp(Buffer.from(s), { density: 72 * (ph / h) * 2 }).resize(pw, ph).png().toFile(`${out}/${name}${scale === 1 ? "" : `@${scale}x`}.png`);
  }
  // Druck: 50 mm hoch bzw. (Lockups) 30 mm hoch bei 300 dpi
  const mm = name === "mia-aufkleber" ? 50 : 30;
  const ph = Math.round((mm / 25.4) * 300);
  await sharp(Buffer.from(s), { density: 72 * (ph / h) * 2 })
    .resize(Math.round((w / h) * ph), ph)
    .withMetadata({ density: 300 })
    .png()
    .toFile(`${out}/${name}-druck.png`);
}
console.log(`${Object.keys(FILES).length} Varianten in ${out}/`);
