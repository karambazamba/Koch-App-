// Beispielgericht für den Beispiel-Tag (Pasta mit Tomaten & Burrata) als
// eigene Illustration – kein fremdes Foto nötig. Erzeugt
// public/demo/gericht.webp (1200 × 800). Aufruf: npm run demo-bild
// Ein echtes Foto (eigenes oder lizenzfrei) kann die Datei jederzeit ersetzen
// (Quelle dann in docs/credits.md eintragen).

import sharp from "sharp";

const W = 1200;
const H = 800;
const cx = 640;
const cy = 410;

// Kleiner Zufall mit festem Startwert – das Bild ist bei jedem Lauf gleich
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const strands = Array.from({ length: 170 }, () => {
  const a = rnd() * Math.PI * 2;
  const r = 30 + rnd() * 165;
  const x = cx + Math.cos(a) * r;
  const y = cy + Math.sin(a) * r * 0.92;
  const len = 50 + rnd() * 80;
  const b = a + Math.PI / 2 + (rnd() - 0.5) * 1.6;
  const x2 = x + Math.cos(b) * len;
  const y2 = y + Math.sin(b) * len;
  const qx = (x + x2) / 2 + (rnd() - 0.5) * 90;
  const qy = (y + y2) / 2 + (rnd() - 0.5) * 90;
  const tone = ["#F2C46B", "#EDB85A", "#F6D27E", "#E9AE4E"][Math.floor(rnd() * 4)];
  return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${tone}" stroke-width="${(9 + rnd() * 4).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
}).join("");

const tomato = (x, y, r) => `
  <circle cx="${x}" cy="${y + 4}" r="${r}" fill="#000" opacity="0.12"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#tom)"/>
  <ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.32}" ry="${r * 0.2}" fill="#fff" opacity="0.55"/>`;
const tomatoes = [
  [520, 330, 30], [575, 520, 28], [760, 330, 26], [790, 500, 31], [455, 450, 27], [690, 560, 25], [640, 255, 24], [830, 410, 22],
].map(([x, y, r]) => tomato(x, y, r)).join("");

const leaf = (x, y, rot, s = 1) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 0 C 18 -26, 58 -26, 76 0 C 58 26, 18 26, 0 0 Z" fill="url(#leaf)"/>
    <path d="M4 0 L70 0" stroke="#2F6B2A" stroke-width="2" opacity="0.6"/>
  </g>`;
const leaves = [leaf(470, 360, -35), leaf(700, 520, 20, 0.9), leaf(690, 250, -20, 0.8), leaf(850, 470, -150, 0.85), leaf(520, 560, 10, 0.75), leaf(640, 330, -60, 0.7)].join("");

const pepper = Array.from({ length: 60 }, () => {
  const a = rnd() * Math.PI * 2;
  const r = rnd() * 180;
  return `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${(1.5 + rnd() * 2).toFixed(1)}" fill="#3A2A20" opacity="0.7"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E9A27A"/><stop offset="0.55" stop-color="#D97B4E"/><stop offset="1" stop-color="#B9582F"/>
    </linearGradient>
    <radialGradient id="plate" cx="0.45" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.8" stop-color="#F4EFE8"/><stop offset="1" stop-color="#E4DCD0"/>
    </radialGradient>
    <radialGradient id="tom" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FF6B4A"/><stop offset="0.7" stop-color="#E0331F"/><stop offset="1" stop-color="#B21E12"/>
    </radialGradient>
    <radialGradient id="bur" cx="0.42" cy="0.38" r="0.65">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.75" stop-color="#FBF6EC"/><stop offset="1" stop-color="#EDE3D2"/>
    </radialGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6FB25A"/><stop offset="1" stop-color="#3E8A35"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- Leinen-Serviette -->
  <rect x="-40" y="560" width="420" height="300" rx="20" transform="rotate(-12 170 700)" fill="#F3E6D3" opacity="0.9"/>
  <path d="M-20 640 L380 560 M-10 690 L390 610 M0 740 L400 660" stroke="#E2CFB3" stroke-width="6" opacity="0.8"/>
  <!-- Gabel -->
  <g transform="rotate(28 1010 420)" opacity="0.92">
    <rect x="1000" y="250" width="22" height="330" rx="11" fill="#D8D2CA"/>
    <rect x="985" y="170" width="52" height="100" rx="14" fill="#E6E1DA"/>
    <path d="M992 170 V110 M1004 170 V105 M1018 170 V105 M1030 170 V110" stroke="#E6E1DA" stroke-width="8" stroke-linecap="round"/>
  </g>
  <!-- Teller -->
  <ellipse cx="${cx + 14}" cy="${cy + 30}" rx="330" ry="318" fill="#5A2A12" opacity="0.35" filter="url(#soft)"/>
  <circle cx="${cx}" cy="${cy}" r="320" fill="url(#plate)"/>
  <circle cx="${cx}" cy="${cy}" r="262" fill="none" stroke="#EAE2D6" stroke-width="3"/>
  <!-- Pasta -->
  <ellipse cx="${cx}" cy="${cy}" rx="235" ry="225" fill="#E39A4A" opacity="0.75"/>
  <ellipse cx="${cx - 60}" cy="${cy + 40}" rx="120" ry="90" fill="#D9562E" opacity="0.35" filter="url(#soft)"/>
  <ellipse cx="${cx + 90}" cy="${cy - 70}" rx="100" ry="80" fill="#D9562E" opacity="0.3" filter="url(#soft)"/>
  ${strands}
  ${tomatoes}
  <!-- Burrata -->
  <ellipse cx="${cx + 8}" cy="${cy + 16}" rx="108" ry="98" fill="#000" opacity="0.14" filter="url(#soft)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="104" ry="95" fill="url(#bur)"/>
  <path d="M${cx - 20} ${cy + 30} C ${cx + 10} ${cy + 5}, ${cx + 40} ${cy + 40}, ${cx + 70} ${cy + 20}" stroke="#EFE3CC" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.8"/>
  <ellipse cx="${cx - 35}" cy="${cy - 40}" rx="34" ry="18" fill="#fff" opacity="0.8"/>
  <!-- Olivenöl -->
  <path d="M${cx - 60} ${cy + 50} C ${cx - 10} ${cy + 80}, ${cx + 60} ${cy + 70}, ${cx + 80} ${cy + 30}" stroke="#D9B23A" stroke-width="6" fill="none" opacity="0.55" stroke-linecap="round"/>
  ${leaves}
  ${pepper}
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile("public/demo/gericht.webp");
console.log("public/demo/gericht.webp");
