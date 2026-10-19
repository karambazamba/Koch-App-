// Erzeugt alle App-Icons aus einem Motiv: Lotte als lächelnde Sprechblase mit
// drei Härchen auf orangem Verlauf. Aufruf: `npm run icons`
// - public/icons/icon.svg              Quelle (1024×1024), Logo in der App
// - public/icons/apple-touch-icon.png  180×180, vollflächig ohne Transparenz
// - public/icons/icon-192.png / icon-512.png   PWA
// - public/icons/icon-maskable-512.png         PWA maskable (mehr Rand für Android)
// - public/icons/favicon-32.png / favicon-48.png
// - public/icons/lotte-192.png         Lotte im orangen Kreis (für Push-Mitteilungen)
// - src/app/favicon.ico                16/32/48 px
// Lottes Avatar in der App: src/components/LotteAvatar.tsx (gleiches Motiv).
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const GRADIENT = `<defs><linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#F7843E"/><stop offset="1" stop-color="#EE5F14"/></linearGradient></defs>`;

/** Lotte (Motiv-Koordinaten 0–80): Sprechblase, drei Härchen, Gesicht */
const MOTIF = `<path d="M18 22h44a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H38l-14 11V64h-6A12 12 0 0 1 6 52V34a12 12 0 0 1 12-12z" fill="#fff"/><path d="M28 21c-4-4 4-7 0-12M40 21c-4-4 4-7 0-12M52 21c-4-4 4-7 0-12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="29" cy="40" r="4.6" fill="#EE5F14"/><circle cx="51" cy="40" r="4.6" fill="#EE5F14"/><path d="M27 49c7 8 19 8 26 0" stroke="#EE5F14" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;

/** App-Icon: Verlauf vollflächig; `scale` < 1 = mehr Rand (maskable) */
function icon(scale = 1) {
  const s = 10 * scale;
  const offset = 512 - 40 * s; // Motiv-Mitte (40, 40) auf die Icon-Mitte
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${GRADIENT}<rect width="1024" height="1024" fill="url(#g)"/><g transform="translate(${offset},${offset}) scale(${s})">${MOTIF}</g></svg>\n`;
}

/** Lotte im orangen Kreis (wie LotteAvatar) */
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F26B21"/><g transform="translate(21.2,20.5) scale(0.72)">${MOTIF}</g></svg>\n`;

const png = (source, size, flatten = false) => {
  let img = sharp(Buffer.from(source), { density: Math.max(72, 72 * (size / 1024) * 4) }).resize(size, size);
  if (flatten) img = img.flatten({ background: "#EE5F14" });
  // Immer RGBA (die ICO-Datei verlangt es)
  img = img.ensureAlpha();
  return img.png().toBuffer();
};

/** ICO-Datei mit PNG-Bildern (von allen Browsern unterstützt) */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4); // Farbebenen
    header.writeUInt16LE(32, at + 6); // Bit pro Pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const full = icon();
// Maskable: Schutzzone = Kreis mit 40 % Radius → Motiv auf 80 %
const maskable = icon(0.8);

writeFileSync("public/icons/icon.svg", full);
writeFileSync("public/icons/apple-touch-icon.png", await png(full, 180, true));
writeFileSync("public/icons/icon-192.png", await png(full, 192, true));
writeFileSync("public/icons/icon-512.png", await png(full, 512, true));
writeFileSync("public/icons/icon-maskable-512.png", await png(maskable, 512, true));
writeFileSync("public/icons/favicon-32.png", await png(full, 32, true));
writeFileSync("public/icons/favicon-48.png", await png(full, 48, true));
writeFileSync("public/icons/lotte-192.png", await png(avatar, 192));
writeFileSync(
  "src/app/favicon.ico",
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(full, size, true) })))),
);
console.log("Icons erzeugt.");
