// Erzeugt alle App-Icons aus einem Motiv (weißer Kochtopf mit drei
// Dampfwölkchen auf Orange). Aufruf: `npm run icons`
// - public/icons/icon.svg            Logo in der App + Favicon (abgerundet)
// - public/icons/apple-touch-icon.png 180×180, vollflächig ohne Transparenz
// - public/icons/icon-192.png / icon-512.png  PWA (abgerundet)
// - public/icons/icon-maskable-512.png       PWA maskable (vollflächig, Motiv in der Schutzzone)
// - src/app/favicon.ico              16/32/48 px
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const ORANGE = "#f97316";

// Motiv auf 512×512, optisch mittig
const MOTIF = `<g transform="translate(0 12)">
  <g fill="#fff">
    <rect x="235" y="190" width="42" height="34" rx="12"/>
    <rect x="112" y="214" width="288" height="36" rx="18"/>
    <path d="M138 242h236v86a54 54 0 0 1-54 54H192a54 54 0 0 1-54-54z"/>
    <rect x="86" y="266" width="70" height="30" rx="15"/>
    <rect x="356" y="266" width="70" height="30" rx="15"/>
  </g>
  <g fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <path d="M196 168c-16-14-16-28 0-40s16-26 0-40"/>
    <path d="M256 160c-16-14-16-28 0-40s16-26 0-40"/>
    <path d="M316 168c-16-14-16-28 0-40s16-26 0-40"/>
  </g>
</g>`;

/** rounded: Ecken abrunden (sonst vollflächig); scale: Motiv verkleinern (maskable) */
function svg({ rounded, scale = 1 }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="112" fill="${ORANGE}"/>`
    : `<rect width="512" height="512" fill="${ORANGE}"/>`;
  const motif = scale === 1 ? MOTIF : `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${MOTIF}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${motif}</svg>\n`;
}

const png = (source, size, flatten = false) => {
  let img = sharp(Buffer.from(source), { density: 72 * (size / 512) * 4 }).resize(size, size);
  if (flatten) img = img.flatten({ background: ORANGE });
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

const rounded = svg({ rounded: true });
const full = svg({ rounded: false });
// Maskable: Schutzzone = Kreis mit 40 % Radius → Motiv auf 78 %
const maskable = svg({ rounded: false, scale: 0.78 });

writeFileSync("public/icons/icon.svg", rounded);
writeFileSync("public/icons/apple-touch-icon.png", await png(full, 180, true));
writeFileSync("public/icons/icon-192.png", await png(rounded, 192));
writeFileSync("public/icons/icon-512.png", await png(rounded, 512));
writeFileSync("public/icons/icon-maskable-512.png", await png(maskable, 512, true));
writeFileSync(
  "src/app/favicon.ico",
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) })))),
);
console.log("Icons erzeugt.");
