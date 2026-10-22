// npm run bilder:vergleich – .bilder/aktuell gegen .bilder/basis, Pixel für
// Pixel (sharp). Abweichung > 0,1 % = gemeldet, rotes Unterschiedsbild in
// .bilder/unterschied. Andere Bildgröße = 100 %.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import sharp from "sharp";

const LIMIT = 0.001;
const files = readdirSync(".bilder/basis").filter((f) => f.endsWith(".png"));
mkdirSync(".bilder/unterschied", { recursive: true });
const off = [];
for (const f of files) {
  const now = `.bilder/aktuell/${f}`;
  if (!existsSync(now)) {
    off.push([f, 1, "fehlt"]);
    continue;
  }
  const a = await sharp(`.bilder/basis/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(now).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    off.push([f, 1, `Größe ${a.info.width}×${a.info.height} → ${b.info.width}×${b.info.height}`]);
    continue;
  }
  const diff = Buffer.alloc(a.data.length);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    const hit = d > 24;
    if (hit) changed++;
    diff[i] = hit ? 255 : a.data[i] / 3;
    diff[i + 1] = hit ? 0 : a.data[i + 1] / 3;
    diff[i + 2] = hit ? 0 : a.data[i + 2] / 3;
    diff[i + 3] = 255;
  }
  const share = changed / (a.data.length / 4);
  if (share > LIMIT) {
    off.push([f, share, ""]);
    await sharp(diff, { raw: a.info }).png().toFile(`.bilder/unterschied/${f}`);
  }
}
for (const [f, share, why] of off) console.log(`✗ ${f}: ${(share * 100).toFixed(2)} %${why ? ` (${why})` : ""}`);
console.log(off.length ? `${off.length} von ${files.length} Bildern weichen ab` : `alle ${files.length} Bilder gleich`);
process.exit(off.length ? 1 : 0);
