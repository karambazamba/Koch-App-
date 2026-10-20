// Erzeugt alle App-Icons aus einem Motiv: die Begleitung als ruhige weiße
// Sprechblase mit mittiger Spitze (senkrechte Augen, dezentes Lächeln) auf
// orangem Verlauf. Aufruf: `npm run icons`
// Alle Dateien tragen die Version im Namen (ICON_VERSION in src/lib/core/app.ts),
// z. B. apple-touch-icon-v3.png – so holt kein Gerät das alte Icon aus dem Cache.
// - public/icons/icon.svg              Quelle, Logo in der App
// - public/icons/apple-touch-icon.png  180×180, vollflächig ohne Transparenz
// - public/icons/icon-192.png / icon-512.png   PWA
// - public/icons/icon-maskable-512.png         PWA maskable (Zeichen kleiner, für den Kreis-Zuschnitt)
// - public/icons/favicon-32.png / favicon-48.png
// - public/icons/lotte-192.png         Avatar im orangen Kreis (für Push-Mitteilungen)
// - src/app/favicon.ico                16/32/48 px
// Avatar in der App: src/components/LotteAvatar.tsx (gleiches Motiv, Farbe der Begleitung).
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const GRADIENT = `<defs><linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#F7843E"/><stop offset="1" stop-color="#EE5F14"/></linearGradient></defs>`;

/** Motiv (Koordinaten 0–80): Sprechblase mit mittiger Spitze, Augen und Lächeln in Farbe `c` */
const motif = (c) =>
  `<rect x="8" y="10" width="64" height="52" rx="20" fill="#fff"/><path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><g transform="translate(40 36) scale(1.05) translate(-40 -36)"><rect x="27.5" y="29" width="5" height="10" rx="2.5" fill="${c}"/><rect x="47.5" y="29" width="5" height="10" rx="2.5" fill="${c}"/><path d="M31 45.5c5 4 13 4 18 0" stroke="${c}" stroke-width="4.2" fill="none" stroke-linecap="round"/></g>`;

/** App-Icon: Verlauf vollflächig, Zeichen auf 88 % (maskable: 72 %, zentriert) */
const icon = (transform) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="1024" height="1024">${GRADIENT}<rect width="80" height="80" fill="url(#g)"/><g transform="${transform}">${motif("#EE5F14")}</g></svg>\n`;

/** Avatar im orangen Kreis (wie LotteAvatar) */
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="1024" height="1024"><circle cx="40" cy="40" r="40" fill="#F26B21"/><g transform="translate(11.2 12.5) scale(.72)">${motif("#F26B21")}</g></svg>\n`;

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

// Version im Dateinamen (aus src/lib/core/app.ts, ICON_VERSION) – umgeht den Icon-Cache von iPhone/Android
const VERSION = readFileSync("src/lib/core/app.ts", "utf8").match(/ICON_VERSION = "([^"]+)"/)[1];
const file = (name) => `public/icons/${name.replace(/(\.\w+)$/, `-${VERSION}$1`)}`;
// Alte Icon-Dateien (ohne bzw. mit anderer Version) aufräumen
for (const old of readdirSync("public/icons")) unlinkSync(`public/icons/${old}`);

const full = icon("translate(4.8 6.8) scale(.88)");
// Maskable: Schutzzone = Kreis mit 40 % Radius → Zeichen auf 72 %
const maskable = icon("translate(11.2 12.5) scale(.72)");

writeFileSync(file("icon.svg"), full);
writeFileSync(file("apple-touch-icon.png"), await png(full, 180, true));
writeFileSync(file("icon-192.png"), await png(full, 192, true));
writeFileSync(file("icon-512.png"), await png(full, 512, true));
writeFileSync(file("icon-maskable-512.png"), await png(maskable, 512, true));
writeFileSync(file("favicon-32.png"), await png(full, 32, true));
writeFileSync(file("favicon-48.png"), await png(full, 48, true));
writeFileSync(file("lotte-192.png"), await png(avatar, 192));
writeFileSync(
  "src/app/favicon.ico",
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(full, size, true) })))),
);
console.log("Icons erzeugt.");
