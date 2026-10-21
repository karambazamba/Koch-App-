// Kleine Zeichen-Bausteine für die Gericht-Bilder (dishSvg.ts): fester Zufall,
// Flächen zum Verteilen und je Topping ein Stückchen – Tomate, Feta, Erbsen,
// Kräuter … Alles reiner SVG-Text, im Stil von public/demo/gericht.webp.

import type { Topping } from "./dishArt";

export type Rng = () => number;

/** Fester Zufall (mulberry32): gleicher Startwert = gleiche Folge */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const f = (n: number) => (Math.round(n * 10) / 10).toString();
export const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length) % list.length];
export const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a);

/** Fläche, auf der Stückchen liegen: Ellipse oder Rechteck */
export type Region = { kind: "e"; cx: number; cy: number; rx: number; ry: number } | { kind: "r"; x: number; y: number; w: number; h: number };

export const ellipse = (cx: number, cy: number, rx: number, ry = rx): Region => ({ kind: "e", cx, cy, rx, ry });
export const rect = (x: number, y: number, w: number, h: number): Region => ({ kind: "r", x, y, w, h });

/** Zufälliger Punkt in der Fläche (gleichmäßig verteilt) */
export function spot(rng: Rng, r: Region, fill = 0.88): [number, number] {
  if (r.kind === "e") {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * fill;
    return [r.cx + Math.cos(a) * r.rx * d, r.cy + Math.sin(a) * r.ry * d];
  }
  const m = (1 - fill) / 2;
  return [r.x + r.w * (m + rng() * fill), r.y + r.h * (m + rng() * fill)];
}

export const center = (r: Region): [number, number] => (r.kind === "e" ? [r.cx, r.cy] : [r.x + r.w / 2, r.y + r.h / 2]);
export const size = (r: Region) => (r.kind === "e" ? Math.min(r.rx, r.ry) : Math.min(r.w, r.h) / 2);

/** Weicher Schatten unter einem Stück */
export const drop = (x: number, y: number, rx: number, ry = rx, o = 0.13) => `<ellipse cx="${f(x)}" cy="${f(y + rx * 0.18)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="${o}"/>`;

/** Unregelmäßiger runder Klecks (für Hack, Püree, Quark …) */
export function blob(rng: Rng, x: number, y: number, r: number, fill: string, wobble = 0.28, extra = ""): string {
  const n = 7;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const d = r * (1 - wobble / 2 + rng() * wobble);
    return [x + Math.cos(a) * d, y + Math.sin(a) * d];
  });
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + 1) % n];
    const c = pts[i];
    const mx = (c[0] + p[0]) / 2;
    const my = (c[1] + p[1]) / 2;
    d += ` Q${f(c[0])} ${f(c[1])} ${f(mx)} ${f(my)}`;
  }
  return `<path d="${d} Z" fill="${fill}"${extra}/>`;
}

/** Blatt wie in gericht.webp (Basilikum, Spinat) */
const leaf = (x: number, y: number, rot: number, s: number, fill = "url(#leaf)", vein = "#2F6B2A") =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="M0 0 C 18 -26, 58 -26, 76 0 C 58 26, 18 26, 0 0 Z" fill="${fill}"/><path d="M4 0 L70 0" stroke="${vein}" stroke-width="2" opacity="0.6"/></g>`;

const tomato = (x: number, y: number, r: number) =>
  `${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#tom)"/><ellipse cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.4)}" rx="${f(r * 0.32)}" ry="${f(r * 0.2)}" fill="#fff" opacity="0.55"/>`;

/** Tomatenscheibe von oben (Caprese, Brot) */
export const tomatoSlice = (x: number, y: number, r: number) =>
  `${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#D9341F"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.78)}" fill="#EE5A3C"/>${[0, 1, 2, 3].map((i) => `<ellipse cx="${f(x + Math.cos(i * 1.57 + 0.6) * r * 0.42)}" cy="${f(y + Math.sin(i * 1.57 + 0.6) * r * 0.42)}" rx="${f(r * 0.2)}" ry="${f(r * 0.12)}" fill="#F7B26B" transform="rotate(${i * 90 + 35} ${f(x + Math.cos(i * 1.57 + 0.6) * r * 0.42)} ${f(y + Math.sin(i * 1.57 + 0.6) * r * 0.42)})"/>`).join("")}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.16)}" fill="#F58A5E"/>`;

export const mozzaSlice = (x: number, y: number, r: number) => `${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#bur)"/><ellipse cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" rx="${f(r * 0.35)}" ry="${f(r * 0.18)}" fill="#fff" opacity="0.8"/>`;

const egg = (x: number, y: number, s: number) =>
  `${drop(x, y, 30 * s, 24 * s)}<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(30 * s)}" ry="${f(24 * s)}" fill="#FFFDF7"/><circle cx="${f(x + 2 * s)}" cy="${f(y + 1 * s)}" r="${f(12 * s)}" fill="#F6B830"/><circle cx="${f(x - 2 * s)}" cy="${f(y - 3 * s)}" r="${f(4 * s)}" fill="#FFE08A" opacity="0.8"/>`;

function friedEgg(rng: Rng, x: number, y: number, s: number): string {
  return `${blob(rng, x + 6 * s, y + 10 * s, 70 * s, "#000", 0.3, ' opacity="0.12"')}${blob(rng, x, y, 70 * s, "#FFFDF8", 0.32)}<circle cx="${f(x + 6 * s)}" cy="${f(y - 4 * s)}" r="${f(26 * s)}" fill="#F2A81D"/><circle cx="${f(x + 6 * s)}" cy="${f(y - 4 * s)}" r="${f(22 * s)}" fill="#F7BC2E"/><ellipse cx="${f(x - 2 * s)}" cy="${f(y - 12 * s)}" rx="${f(8 * s)}" ry="${f(5 * s)}" fill="#FFF3C4" opacity="0.85"/>`;
}

export const lemonSlice = (x: number, y: number, r: number, rot = 0) =>
  `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#F2CC2E"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.86)}" fill="#FBF3C8"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.78)}" fill="#F7DC5A"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${f(x)} ${f(y)} L${f(x + Math.cos((i * Math.PI) / 4) * r * 0.78)} ${f(y + Math.sin((i * Math.PI) / 4) * r * 0.78)}" stroke="#FBF3C8" stroke-width="${f(r * 0.08)}"/>`).join("")}</g>`;

/** Brotscheibe von oben: Kruste, Krume, ein paar Poren */
export function breadSlice(rng: Rng, x: number, y: number, s: number, rot = 0, crust = "#B9783A", crumb = "#F0D6A0"): string {
  const path = (k: number) => `M${f(-58 * k)} ${f(40 * k)} L${f(-58 * k)} ${f(-18 * k)} C${f(-74 * k)} ${f(-60 * k)} ${f(-30 * k)} ${f(-70 * k)} 0 ${f(-58 * k)} C${f(30 * k)} ${f(-70 * k)} ${f(74 * k)} ${f(-60 * k)} ${f(58 * k)} ${f(-18 * k)} L${f(58 * k)} ${f(40 * k)} Q${f(58 * k)} ${f(52 * k)} ${f(46 * k)} ${f(52 * k)} L${f(-46 * k)} ${f(52 * k)} Q${f(-58 * k)} ${f(52 * k)} ${f(-58 * k)} ${f(40 * k)} Z`;
  const pores = Array.from({ length: 9 }, () => `<ellipse cx="${f(between(rng, -38, 38) * s)}" cy="${f(between(rng, -36, 36) * s)}" rx="${f(between(rng, 2, 4.5) * s)}" ry="${f(between(rng, 1.5, 3) * s)}" fill="#D9B676" opacity="0.8"/>`).join("");
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="${path(s * 1.04)}" fill="#000" opacity="0.13" transform="translate(4 8)"/><path d="${path(s)}" fill="${crust}"/><path d="${path(s * 0.86)}" fill="${crumb}"/>${pores}</g>`;
}

// --- Toppings ------------------------------------------------------------------------

const PEPPER_PAPRIKA = ["#D93A2B", "#F2B530", "#E5552C", "#5E9E3A"];

/** Wie viele Stückchen je Topping (bei voller Fläche) */
const COUNT: Partial<Record<Topping, number>> = {
  tomate: 7, mozzarella: 5, feta: 8, kaese: 26, paprika: 9, zucchini: 6, moehre: 8, erbsen: 18, mais: 18, bohnen: 11, kuerbis: 8, pilze: 6, spinat: 6,
  brokkoli: 5, gurke: 6, avocado: 4, linsen: 30, zwiebel: 5, ei: 3, lachs: 6, thunfisch: 10, fischstaebchen: 3, hack: 26, haehnchen: 7, speck: 10,
  zitrone: 1, basilikum: 5, dill: 4, petersilie: 9, pesto: 7, apfel: 6, beeren: 14, schoko: 14, rosinen: 10,
};

/** Ein Stückchen eines Toppings an (x, y), s = Größe (1 = großer Teller) */
function piece(top: Topping, rng: Rng, x: number, y: number, s: number): string {
  const rot = between(rng, 0, 360);
  switch (top) {
    case "tomate":
      return tomato(x, y, between(rng, 17, 23) * s);
    case "mozzarella":
      return mozzaSlice(x, y, between(rng, 18, 24) * s);
    case "feta": {
      const w = between(rng, 18, 26) * s;
      return `<rect x="${f(x - w / 2 + 3)}" y="${f(y - w / 2 + 5)}" width="${f(w)}" height="${f(w)}" rx="${f(w * 0.2)}" fill="#000" opacity="0.1" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/><rect x="${f(x - w / 2)}" y="${f(y - w / 2)}" width="${f(w)}" height="${f(w)}" rx="${f(w * 0.2)}" fill="#FBF8F0" stroke="#E6DDCB" stroke-width="1.5" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    }
    case "kaese": {
      const l = between(rng, 12, 20) * s;
      return `<path d="M${f(x)} ${f(y)} l${f(Math.cos(rot) * l)} ${f(Math.sin(rot) * l)}" stroke="${pick(rng, ["#F4D35E", "#EFC54A", "#F7DE7C"])}" stroke-width="${f(4.5 * s)}" stroke-linecap="round"/>`;
    }
    case "paprika": {
      const l = between(rng, 30, 44) * s;
      const a = rng() * Math.PI;
      const x2 = x + Math.cos(a) * l;
      const y2 = y + Math.sin(a) * l;
      return `<path d="M${f(x)} ${f(y)} Q${f((x + x2) / 2 + 9 * s)} ${f((y + y2) / 2 - 9 * s)} ${f(x2)} ${f(y2)}" stroke="${pick(rng, PEPPER_PAPRIKA)}" stroke-width="${f(10 * s)}" fill="none" stroke-linecap="round"/>`;
    }
    case "zucchini":
    case "gurke": {
      const r = between(rng, 13, 17) * s;
      const [rim, flesh] = top === "zucchini" ? ["#4E8A3A", "#D9E6A8"] : ["#5F9E43", "#E3F2CC"];
      return `${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${rim}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.82)}" fill="${flesh}"/>${[0, 1, 2].map((i) => `<circle cx="${f(x + Math.cos(i * 2.1) * r * 0.35)}" cy="${f(y + Math.sin(i * 2.1) * r * 0.35)}" r="${f(r * 0.1)}" fill="#B8CC84"/>`).join("")}`;
    }
    case "moehre": {
      const r = between(rng, 10, 13) * s;
      return `${drop(x, y, r)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#E9781F"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" fill="#F5A04A"/>`;
    }
    case "erbsen":
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6.5 * s)}" fill="#5FA83A"/><circle cx="${f(x - 2 * s)}" cy="${f(y - 2 * s)}" r="${f(2 * s)}" fill="#B6E08A"/>`;
    case "mais":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5.5 * s)}" ry="${f(4.6 * s)}" fill="#F6C945"/><circle cx="${f(x - 1.5 * s)}" cy="${f(y - 1.5 * s)}" r="${f(1.6 * s)}" fill="#FFF0A6"/>`;
    case "bohnen":
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(13 * s)}" ry="${f(7.5 * s)}" fill="#8E2E26"/><ellipse cx="${f(x - 3 * s)}" cy="${f(y - 2.5 * s)}" rx="${f(5 * s)}" ry="${f(2 * s)}" fill="#C76A5E" opacity="0.7"/></g>`;
    case "kuerbis": {
      const w = between(rng, 18, 24) * s;
      return `<rect x="${f(x - w / 2)}" y="${f(y - w / 2)}" width="${f(w)}" height="${f(w)}" rx="${f(w * 0.25)}" fill="#EF8D2B" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/><rect x="${f(x - w / 4)}" y="${f(y - w / 3)}" width="${f(w / 3)}" height="${f(w / 5)}" rx="2" fill="#F9C27A" opacity="0.8" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    }
    case "pilze":
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="M-20 0 C-20 -22 20 -22 20 0 Z" fill="#E9D5B4" stroke="#B89A74" stroke-width="2"/><rect x="-6" y="-2" width="12" height="18" rx="5" fill="#E9D5B4" stroke="#B89A74" stroke-width="2"/></g>`;
    case "spinat":
      return leaf(x, y, rot, 0.65 * s, "#3E7A35", "#2A5424");
    case "brokkoli":
      return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M-4 6 L-6 26 L6 26 L4 6 Z" fill="#A9C98A"/>${[[-12, -4], [0, -12], [12, -4], [-6, 4], [7, 4]].map(([a, b], i) => `<circle cx="${a}" cy="${b}" r="11" fill="${i % 2 ? "#4C8F3A" : "#5FA348"}"/>`).join("")}<circle cx="-2" cy="-14" r="3" fill="#8CC56A"/></g>`;
    case "avocado":
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="M-30 0 C-20 -18 20 -18 30 0 C20 -8 -20 -8 -30 0 Z" fill="#4E7A2B"/><path d="M-27 -1 C-18 -15 18 -15 27 -1 C18 -9 -18 -9 -27 -1 Z" fill="#C2D97E"/></g>`;
    case "spargel":
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(-20 + rng() * 10)}) scale(${f(s)})"><rect x="-70" y="-6" width="140" height="12" rx="6" fill="#EDE3B8" stroke="#CFC08A" stroke-width="1.5"/><path d="M62 -8 Q80 0 62 8 Z" fill="#D9CFA0"/></g>`;
    case "linsen":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(4 * s)}" ry="${f(3 * s)}" fill="${pick(rng, ["#B4703A", "#C6844A", "#9E5E30"])}"/>`;
    case "zwiebel":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(16 * s)}" ry="${f(11 * s)}" fill="none" stroke="${pick(rng, ["#F3E6DA", "#C98BA8"])}" stroke-width="${f(3.5 * s)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    case "ei":
      return egg(x, y, s);
    case "lachs":
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><rect x="${f(x - 16 * s)}" y="${f(y - 11 * s)}" width="${f(32 * s)}" height="${f(22 * s)}" rx="${f(6 * s)}" fill="#F28A6B"/><path d="M${f(x - 10 * s)} ${f(y - 9 * s)} q${f(4 * s)} ${f(9 * s)} 0 ${f(18 * s)} M${f(x + 2 * s)} ${f(y - 9 * s)} q${f(4 * s)} ${f(9 * s)} 0 ${f(18 * s)}" stroke="#FBD3C2" stroke-width="${f(2.4 * s)}" fill="none"/></g>`;
    case "thunfisch":
      return blob(rng, x, y, between(rng, 9, 13) * s, pick(rng, ["#D9A08A", "#C98F7A", "#E3B39D"]), 0.45);
    case "fischstaebchen":
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">${drop(x, y, 36 * s, 14 * s)}<rect x="${f(x - 36 * s)}" y="${f(y - 13 * s)}" width="${f(72 * s)}" height="${f(26 * s)}" rx="${f(7 * s)}" fill="#E39A3E"/><rect x="${f(x - 32 * s)}" y="${f(y - 10 * s)}" width="${f(64 * s)}" height="${f(8 * s)}" rx="${f(4 * s)}" fill="#F2BC6A" opacity="0.7"/></g>`;
    case "hack":
      return blob(rng, x, y, between(rng, 7, 12) * s, pick(rng, ["#7A4A2E", "#8E5A38", "#6A3E26", "#9A6640"]), 0.5);
    case "haehnchen":
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">${drop(x, y, 26 * s, 11 * s)}<rect x="${f(x - 26 * s)}" y="${f(y - 10 * s)}" width="${f(52 * s)}" height="${f(20 * s)}" rx="${f(9 * s)}" fill="#E8B76A"/><path d="M${f(x - 12 * s)} ${f(y - 9 * s)} l${f(-6 * s)} ${f(18 * s)} M${f(x + 6 * s)} ${f(y - 9 * s)} l${f(-6 * s)} ${f(18 * s)}" stroke="#B9783A" stroke-width="${f(3 * s)}" opacity="0.7"/></g>`;
    case "speck":
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><rect x="${f(x - 11 * s)}" y="${f(y - 6 * s)}" width="${f(22 * s)}" height="${f(12 * s)}" rx="${f(3 * s)}" fill="#C8584E"/><rect x="${f(x - 11 * s)}" y="${f(y - 1 * s)}" width="${f(22 * s)}" height="${f(3 * s)}" fill="#F2C8B8"/></g>`;
    case "zitrone":
      return lemonSlice(x, y, 30 * s, rot);
    case "basilikum":
      return leaf(x, y, rot, between(rng, 0.5, 0.7) * s);
    case "dill":
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})" stroke="#5E8F3A" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M0 0 L36 0"/>${[6, 14, 22, 30].map((p) => `<path d="M${p} 0 l6 -8 M${p} 0 l6 8"/>`).join("")}</g>`;
    case "petersilie":
      return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${[[0, 0], [5, -4], [-5, -3], [2, 5]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4.2" fill="#4F8F3A"/>`).join("")}<circle cx="-1" cy="-2" r="1.6" fill="#8CC56A"/></g>`;
    case "pesto":
      return blob(rng, x, y, between(rng, 10, 16) * s, pick(rng, ["#5E8F2E", "#4E7F24", "#6E9E36"]), 0.5, ' opacity="0.9"');
    case "apfel":
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="M-26 6 C-18 -16 18 -16 26 6 C16 -2 -16 -2 -26 6 Z" fill="#C9382E"/><path d="M-23 5 C-15 -12 15 -12 23 5 C14 0 -14 0 -23 5 Z" fill="#F3E3B5"/></g>`;
    case "beeren":
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(7 * s)}" fill="#3B4C8C"/><circle cx="${f(x - 2 * s)}" cy="${f(y - 2.5 * s)}" r="${f(2.2 * s)}" fill="#8E9DD0" opacity="0.8"/>`;
    case "schoko":
      return `<path d="M${f(x)} ${f(y - 6 * s)} L${f(x + 5 * s)} ${f(y + 4 * s)} L${f(x - 5 * s)} ${f(y + 4 * s)} Z" fill="#4A2C1E"/>`;
    case "rosinen":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 * s)}" ry="${f(3.5 * s)}" fill="#5A3326" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    default:
      return "";
  }
}

/** Große Einzelstücke in die Mitte (Burrata, Spiegelei, Quark, Apfelmus, Rührei) */
function centerpiece(top: Topping, rng: Rng, x: number, y: number, s: number): string {
  switch (top) {
    case "burrata":
      return `<ellipse cx="${f(x + 6 * s)}" cy="${f(y + 12 * s)}" rx="${f(82 * s)}" ry="${f(74 * s)}" fill="#000" opacity="0.14" filter="url(#soft)"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(78 * s)}" ry="${f(71 * s)}" fill="url(#bur)"/><path d="M${f(x - 15 * s)} ${f(y + 22 * s)} C ${f(x + 8 * s)} ${f(y + 4 * s)}, ${f(x + 30 * s)} ${f(y + 30 * s)}, ${f(x + 52 * s)} ${f(y + 15 * s)}" stroke="#EFE3CC" stroke-width="${f(11 * s)}" fill="none" stroke-linecap="round" opacity="0.8"/><ellipse cx="${f(x - 26 * s)}" cy="${f(y - 30 * s)}" rx="${f(26 * s)}" ry="${f(14 * s)}" fill="#fff" opacity="0.8"/>`;
    case "spiegelei":
      return friedEgg(rng, x, y, s);
    case "quark":
      return `${blob(rng, x + 4 * s, y + 8 * s, 46 * s, "#000", 0.25, ' opacity="0.1"')}${blob(rng, x, y, 46 * s, "#FBF8F1", 0.25)}<path d="M${f(x - 22 * s)} ${f(y)} q${f(22 * s)} ${f(-18 * s)} ${f(40 * s)} ${f(-4 * s)}" stroke="#EDE6D8" stroke-width="${f(6 * s)}" fill="none" stroke-linecap="round"/>${Array.from({ length: 7 }, () => `<rect x="${f(x + between(rng, -26, 26) * s)}" y="${f(y + between(rng, -22, 22) * s)}" width="${f(7 * s)}" height="${f(2.4 * s)}" rx="1" fill="#4F8F3A" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>`).join("")}`;
    case "apfelmus":
      return `${blob(rng, x + 4 * s, y + 8 * s, 62 * s, "#000", 0.3, ' opacity="0.1"')}${blob(rng, x, y, 62 * s, "#E9B44C", 0.3)}${blob(rng, x - 10 * s, y - 10 * s, 30 * s, "#F3CC72", 0.3)}`;
    case "ruehrei":
      return Array.from({ length: 16 }, () => {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * 70 * s;
        return blob(rng, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, between(rng, 16, 26) * s, pick(rng, ["#F6D45A", "#F2C44A", "#F8DE78"]), 0.45);
      }).join("");
    default:
      return "";
  }
}

const CENTER: Topping[] = ["burrata", "spiegelei", "quark", "apfelmus", "ruehrei"];
const HERBS: Topping[] = ["basilikum", "dill", "petersilie"];

/** Toppings über eine Fläche verteilen: erst Stückchen, dann Mittelstück, Kräuter zuletzt */
export function scatter(tops: Topping[], rng: Rng, region: Region, opts: { s?: number; density?: number; skip?: Topping[] } = {}): string {
  const s = opts.s ?? 1;
  const density = opts.density ?? 1;
  const area = Math.max(0.25, Math.min(1.2, size(region) / 175));
  const list = tops.filter((t) => !opts.skip?.includes(t));
  const draw = (t: Topping) => {
    const n = Math.max(1, Math.round((COUNT[t] ?? 5) * area * density));
    let out = "";
    for (let i = 0; i < n; i++) {
      const [x, y] = spot(rng, region);
      out += piece(t, rng, x, y, s);
    }
    return out;
  };
  const [cx, cy] = center(region);
  return [
    ...list.filter((t) => !CENTER.includes(t) && !HERBS.includes(t)).map(draw),
    ...list.filter((t) => CENTER.includes(t)).map((t, i) => centerpiece(t, rng, cx + i * 40 * s, cy + i * 20 * s, s * Math.max(0.55, Math.min(1, area)))),
    ...list.filter((t) => HERBS.includes(t)).map(draw),
  ].join("");
}

/** Pfeffer über das Gericht */
export const pepper = (rng: Rng, region: Region, n = 50) =>
  Array.from({ length: n }, () => {
    const [x, y] = spot(rng, region, 1);
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(between(rng, 1.1, 2.6))}" fill="#3A2A20" opacity="0.7"/>`;
  }).join("");

/** Bühne: 900 × 600, Teller-Mitte und -Radius */
export const W = 900;
export const H = 600;
export const CX = 465;
export const CY = 300;
export const R = 245;
