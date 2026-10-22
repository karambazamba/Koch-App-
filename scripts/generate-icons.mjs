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
// Dazu je Lieblingsfarbe der Begleitung (AVATAR_COLORS in src/lib/einstellungen/profile.ts)
// ein Satz unter public/icons/<farbe>/: icon.svg, icon-192, icon-512, icon-maskable-512,
// apple-touch-icon, favicon-32 – Verlauf von der Farbe (18 % heller) zur vollen Farbe,
// Augen und Lächeln in der vollen Farbe. Orange = genau das Original oben.
// Avatar in der App: src/components/begleitung/BegleitungAvatar.tsx (gleiches Motiv, Farbe der Begleitung).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const gradient = (from, to) => `<defs><linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`;
/** Original-Orange (App-Icon-Quelle) */
const ORANGE = { from: "#F7843E", to: "#EE5F14" };

/** Motiv (Koordinaten 0–80): Sprechblase mit mittiger Spitze, Augen und Lächeln in Farbe `c` */
const MOTIF = (c) =>
  `<rect x="8" y="10" width="64" height="52" rx="20" fill="#fff"/><path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><g transform="translate(40 36) scale(1.05) translate(-40 -36)"><rect x="27.5" y="29" width="5" height="10" rx="2.5" fill="${c}"/><rect x="47.5" y="29" width="5" height="10" rx="2.5" fill="${c}"/><path d="M31 45.5c5 4 13 4 18 0" stroke="${c}" stroke-width="4.2" fill="none" stroke-linecap="round"/></g>`;

/** App-Icon: Verlauf vollflächig, Zeichen auf 88 % (maskable: 72 %, zentriert) */
const icon = (transform, { from, to } = ORANGE) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="1024" height="1024">${gradient(from, to)}<rect width="80" height="80" fill="url(#g)"/><g transform="${transform}">${MOTIF(to)}</g></svg>\n`;
const FULL = "translate(4.8 6.8) scale(.88)";
// Maskable: Schutzzone = Kreis mit 40 % Radius → Zeichen auf 72 %
const MASKABLE = "translate(11.2 12.5) scale(.72)";

/** Farbe um `amount` (0–1) zu Weiß hin aufhellen */
const lighten = (hex, amount) =>
  `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * amount).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
/** Lieblingsfarben aus dem Profil (eine Quelle) */
const COLORS = [...readFileSync("src/lib/einstellungen/profile.ts", "utf8").matchAll(/\{ id: "(\w+)", label: "[^"]+", hex: "(#[0-9A-Fa-f]{6})" \}/g)].map((m) => ({ id: m[1], hex: m[2] }));
if (COLORS.length !== 10) throw new Error(`AVATAR_COLORS nicht gefunden (${COLORS.length})`);

/** Avatar im orangen Kreis (wie BegleitungAvatar) */
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="1024" height="1024"><circle cx="40" cy="40" r="40" fill="#F26B21"/><g transform="translate(11.2 12.5) scale(.72)">${MOTIF("#F26B21")}</g></svg>\n`;

const png = (source, size, flatten = false, background = ORANGE.to) => {
  let img = sharp(Buffer.from(source), { density: Math.max(72, 72 * (size / 1024) * 4) }).resize(size, size);
  if (flatten) img = img.flatten({ background });
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
const file = (name, dir = "") => `public/icons/${dir ? `${dir}/` : ""}${name.replace(/(\.\w+)$/, `-${VERSION}$1`)}`;
// Alte Icon-Dateien (ohne bzw. mit anderer Version) aufräumen
rmSync("public/icons", { recursive: true, force: true });
mkdirSync("public/icons");

const full = icon(FULL);
const maskable = icon(MASKABLE);

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
// Je Lieblingsfarbe ein eigener Satz (Homescreen, Favicon, Splash)
for (const { id, hex } of COLORS) {
  const tone = id === "orange" ? ORANGE : { from: lighten(hex, 0.18), to: hex };
  const f = icon(FULL, tone);
  mkdirSync(`public/icons/${id}`);
  writeFileSync(file("icon.svg", id), f);
  writeFileSync(file("apple-touch-icon.png", id), await png(f, 180, true, tone.to));
  writeFileSync(file("icon-192.png", id), await png(f, 192, true, tone.to));
  writeFileSync(file("icon-512.png", id), await png(f, 512, true, tone.to));
  writeFileSync(file("icon-maskable-512.png", id), await png(icon(MASKABLE, tone), 512, true, tone.to));
  writeFileSync(file("favicon-32.png", id), await png(f, 32, true, tone.to));
}
console.log("Icons erzeugt.");
