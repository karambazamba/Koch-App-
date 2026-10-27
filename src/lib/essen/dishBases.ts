// Das Essen selbst je Form (Nudeln, Reis, Suppe, Kuchen …) – liegt in der
// Fläche, die das Gefäß vorgibt (Teller, Schale, Pfanne, Form, Blech, Brett;
// siehe dishSvg.ts). Toppings kommen über `scatter` aus dishBits.ts.

import type { DishArt, Topping } from "@/lib/essen/dishArt";
import { between, blob, breadSlice, center, drop, ellipse, f, lemonSlice, mozzaSlice, pick, rect, scatter, size, spot, tomatoSlice, type Region, type Rng } from "@/lib/essen/dishBits";

const has = (art: DishArt, t: Topping) => art.toppings.includes(t);

const PASTA = ["#F2C46B", "#EDB85A", "#F6D27E", "#E9AE4E"];

/** Lange Nudeln: viele geschwungene Stränge, darunter Soße (wie gericht.webp) */
export function pastaLong(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const red = has(art, "tomate") || has(art, "hack");
  const green = has(art, "pesto");
  let out = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r * 1.02)}" ry="${f(r * 0.98)}" fill="${green ? "#C9B64A" : "#E39A4A"}" opacity="0.75"/>`;
  if (red) out += `<ellipse cx="${f(cx - r * 0.25)}" cy="${f(cy + r * 0.18)}" rx="${f(r * 0.52)}" ry="${f(r * 0.4)}" fill="#D9562E" opacity="0.35" filter="url(#soft)"/><ellipse cx="${f(cx + r * 0.38)}" cy="${f(cy - r * 0.3)}" rx="${f(r * 0.44)}" ry="${f(r * 0.35)}" fill="#D9562E" opacity="0.3" filter="url(#soft)"/>`;
  for (let i = 0; i < 150; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * (0.12 + rng() * 0.74);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.92;
    const len = 38 + rng() * 60;
    const b = a + Math.PI / 2 + (rng() - 0.5) * 1.6;
    const x2 = x + Math.cos(b) * len;
    const y2 = y + Math.sin(b) * len;
    out += `<path d="M${f(x)} ${f(y)} Q${f((x + x2) / 2 + (rng() - 0.5) * 68)} ${f((y + y2) / 2 + (rng() - 0.5) * 68)} ${f(x2)} ${f(y2)}" stroke="${pick(rng, PASTA)}" stroke-width="${f(7 + rng() * 3)}" fill="none" stroke-linecap="round"/>`;
  }
  if (has(art, "hack")) out += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r * 0.5)}" ry="${f(r * 0.45)}" fill="#B23A22" opacity="0.9"/>`;
  const hackRegion = ellipse(cx, cy, r * 0.45, r * 0.4);
  out += has(art, "hack") ? scatter(["hack"], rng, hackRegion, { density: 1.6 }) : "";
  out += scatter(art.toppings, rng, ellipse(cx, cy, r * 0.9, r * 0.86), { skip: ["hack"] });
  if (!has(art, "pesto")) out += `<path d="M${f(cx - r * 0.3)} ${f(cy + r * 0.25)} C ${f(cx - 10)} ${f(cy + r * 0.4)}, ${f(cx + r * 0.3)} ${f(cy + r * 0.35)}, ${f(cx + r * 0.4)} ${f(cy + r * 0.15)}" stroke="#D9B23A" stroke-width="5" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  return out;
}

/** Kurze Nudeln (Penne): kleine Röhrchen mit Rillen */
export function pastaShort(art: DishArt, rng: Rng, reg: Region, base?: string): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const sauce = base ?? (has(art, "tomate") || has(art, "hack") ? "#D2502E" : has(art, "pesto") ? "#8FA445" : has(art, "kaese") ? "#F0D79A" : "#E6B567");
  let out = blob(rng, cx, cy, r * 0.98, sauce, 0.12, ' opacity="0.85"');
  const n = Math.round(80 * (r / 175) ** 2);
  for (let i = 0; i < n; i++) {
    const [x, y] = spot(rng, reg, 0.9);
    const rot = between(rng, 0, 180);
    const tone = pick(rng, PASTA);
    out += `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><rect x="${f(x - 17)}" y="${f(y - 6.5)}" width="34" height="13" rx="5" fill="${tone}"/><path d="M${f(x - 10)} ${f(y - 5)} L${f(x - 13)} ${f(y + 5)} M${f(x)} ${f(y - 5)} L${f(x - 3)} ${f(y + 5)} M${f(x + 10)} ${f(y - 5)} L${f(x + 7)} ${f(y + 5)}" stroke="#D99A3E" stroke-width="1.5" opacity="0.6"/><ellipse cx="${f(x + 15)}" cy="${f(y)}" rx="3" ry="5.5" fill="#C98A3A" opacity="0.6"/></g>`;
  }
  return out + scatter(art.toppings, rng, reg);
}

/** Reis: heller Hügel aus vielen Körnern */
export function rice(rng: Rng, reg: Region, tint: boolean | string = false): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const base = typeof tint === "string" ? tint : tint ? "#F2E2A8" : "#E9DFCB";
  let out = blob(rng, cx + 5, cy + 9, r, "#000", 0.15, ' opacity="0.1"') + blob(rng, cx, cy, r, base, 0.15);
  const n = Math.round(260 * (r / 175) ** 2);
  for (let i = 0; i < n; i++) {
    const [x, y] = spot(rng, reg, 0.92);
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="2.4" fill="${pick(rng, tint ? ["#FFFBEA", "#F8EBB8", "#F2E2A0"] : ["#FFFFFF", "#F7F2E8", "#EFE6D6"])}" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>`;
  }
  return out;
}

/** Soße/Eintopf in der Schale */
export function stew(art: DishArt, rng: Rng, reg: Region): string {
  if (art.variant === "poke") return poke(art, rng, reg);
  const [cx, cy] = center(reg);
  const r = size(reg);
  // Paprikarot statt Braun (Tafel 62 B), Curry bleibt Gelb
  const color = art.variant === "curry" ? "#E2A23B" : art.variant === "chili" ? "#CC4A2C" : "#C9502E";
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${color}"/><ellipse cx="${f(cx - r * 0.3)}" cy="${f(cy - r * 0.35)}" rx="${f(r * 0.35)}" ry="${f(r * 0.15)}" fill="#fff" opacity="0.18"/>`;
  let food = ellipse(cx, cy, r * 0.9);
  if (art.side === "reis") {
    out += rice(rng, ellipse(cx - r * 0.38, cy - r * 0.05, r * 0.5, r * 0.6));
    food = ellipse(cx + r * 0.38, cy, r * 0.45, r * 0.75);
  }
  if (art.variant === "chili" && !has(art, "bohnen")) out += scatter(["bohnen"], rng, food);
  if (art.variant === "gulasch") out += Array.from({ length: 9 }, () => { const [x, y] = spot(rng, food); return blob(rng, x, y, between(rng, 14, 20), "#A8381F", 0.4); }).join("");
  out += scatter(art.toppings, rng, food);
  if (art.variant === "chili" || art.variant === "curry") out += blob(rng, cx + r * 0.2, cy - r * 0.2, r * 0.18, "#FBF6EE", 0.3);
  return out;
}

/** Bowl ohne Soße („poke“): heller Reis, darauf Lachs, Edamame, Avocado, Gurke, Sesam – nichts Braunes */
function poke(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = rice(rng, ellipse(cx, cy, r * 0.95));
  // Edamame: kleine grüne Schoten
  for (let i = 0; i < 7; i++) {
    const a = -0.6 + i * 0.22;
    const x = cx + Math.cos(a) * r * 0.5;
    const y = cy + Math.sin(a) * r * 0.5;
    out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(between(rng, 0, 180))})"><ellipse rx="15" ry="8" fill="#7FB55A"/><circle cx="-6" r="5" fill="#95C76C"/><circle cx="5" r="5" fill="#95C76C"/></g>`;
  }
  const extra: Topping[] = ["lachs", "avocado", "gurke"].filter((t) => !art.toppings.includes(t as Topping)) as Topping[];
  out += scatter([...art.toppings, ...extra], rng, ellipse(cx - r * 0.15, cy - r * 0.05, r * 0.6), { density: 1.6, s: 1.45 });
  // Sesam
  out += Array.from({ length: 22 }, () => { const [x, y] = spot(rng, ellipse(cx, cy, r * 0.8)); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3" ry="1.8" fill="#F6EBD2" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>`; }).join("");
  return out;
}

const SOUP: Record<string, string> = { tomate: "#D9472B", kuerbis: "#E58A2E", linsen: "#E0873E", kartoffel: "#E8CE8E", erbsen: "#8DB24A", gemuese: "#D99A4A" };

/** Suppe: glatte Fläche, Sahne-Spirale, Kräuter (+ Brot daneben macht dishSvg) */
export function soup(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const color = SOUP[art.variant ?? "gemuese"] ?? SOUP.gemuese;
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${color}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#gloss)"/>`;
  if (art.variant !== "linsen" && art.variant !== "gemuese") out += `<path d="M${f(cx - r * 0.4)} ${f(cy)} C ${f(cx - r * 0.4)} ${f(cy - r * 0.4)}, ${f(cx + r * 0.35)} ${f(cy - r * 0.4)}, ${f(cx + r * 0.3)} ${f(cy)} S ${f(cx - r * 0.15)} ${f(cy + r * 0.3)}, ${f(cx - r * 0.05)} ${f(cy + r * 0.05)}" stroke="#FBF3E6" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/>`;
  const chunks: Topping[] = art.variant === "linsen" ? ["linsen", "moehre"] : art.variant === "gemuese" ? ["moehre", "erbsen"] : art.variant === "kartoffel" ? ["moehre"] : [];
  out += scatter([...new Set([...chunks, ...art.toppings.filter((t) => !["tomate", "kuerbis"].includes(t))])], rng, ellipse(cx, cy, r * 0.8), { s: 0.8, density: 0.7 });
  return out;
}

/** Pfanne/Geschnetzeltes: Glanz-Soße, viele Stückchen (optional Reis daneben) */
/**
 * Soße passend zum Gericht und sparsam (Tafel 62 B): Tomate/Hack/Shakshuka
 * rot, Ei/Hähnchen/Curry goldgelb, sonst nur ein heller Glanz – das Gemüse
 * bringt die Farbe. Nie Braun als große Fläche.
 */
export function panSauce(art: DishArt): { color: string; opacity: number } {
  if (has(art, "tomate") || has(art, "hack") || art.variant === "shakshuka") return { color: "#E2552F", opacity: 0.8 };
  if (has(art, "ei") || has(art, "ruehrei") || has(art, "haehnchen") || art.variant === "curry") return { color: "#F4C64E", opacity: 0.65 };
  return { color: "#EBD27A", opacity: 0.35 };
}

export function stirFry(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const sauce = panSauce(art);
  const withRice = art.side === "reis";
  // Soße als klare Fläche unter dem Gemüse – der helle Pfannenrand bleibt frei
  let out = blob(rng, withRice ? cx + r * 0.3 : cx, cy, r * (withRice ? 0.62 : 0.72), sauce.color, 0.06, ` opacity="${sauce.opacity}"`);
  let food = ellipse(cx, cy, r * 0.72);
  if (withRice) {
    out += rice(rng, ellipse(cx - r * 0.45, cy, r * 0.42, r * 0.66));
    food = ellipse(cx + r * 0.3, cy, r * 0.5, r * 0.62);
  }
  if (has(art, "ei") && withRice) out += scatter(["ruehrei"], rng, ellipse(cx - r * 0.45, cy, r * 0.3), { s: 0.55 });
  // Viel buntes Gemüse obendrauf, damit die helle Pfanne nicht leer wirkt
  const tops: Topping[] = art.toppings.length >= 3 ? art.toppings : [...new Set<Topping>([...art.toppings, "paprika", "zucchini", "brokkoli"])].slice(0, 4);
  return out + scatter(tops, rng, food, { density: 1.8, s: 1.25, skip: ["ei"] });
}

/** Ofengemüse: Kartoffelspalten + Gemüse auf dem Blech */
export function trayVeg(art: DishArt, rng: Rng, reg: Region): string {
  let out = "";
  const big = size(reg) > 150 ? 1.5 : 1;
  for (let i = 0; i < (big > 1 ? 22 : 14); i++) {
    const [x, y] = spot(rng, reg);
    const rot = between(rng, 0, 360);
    out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${big})"><path d="M-30 8 C-22 -14 22 -14 30 8 Z" fill="#000" opacity="0.12" transform="translate(2 4)"/><path d="M-30 8 C-22 -14 22 -14 30 8 Z" fill="#E9B65A"/><path d="M-26 6 C-18 -10 18 -10 26 6" stroke="#B9782E" stroke-width="3" fill="none"/></g>`;
  }
  return out + scatter(art.toppings, rng, reg, { density: 1.4 * big, s: big > 1 ? 1.4 : 1 });
}

/** Wraps: aufgeschnittene Rollen mit bunter Füllung */
export function wraps(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const fill = art.toppings.map((t) => ({ paprika: "#D93A2B", gurke: "#6FA84D", mais: "#F6C945", tomate: "#E0331F", avocado: "#B9D27A", haehnchen: "#E8B76A", hack: "#8E5A38", kaese: "#F4D35E", quark: "#FBF6EE", spinat: "#3E7A35", bohnen: "#8E2E26" } as Partial<Record<Topping, string>>)[t]).filter(Boolean) as string[];
  const layers = [...fill, "#7DB24A", "#FBF6EE"].slice(0, 5);
  let out = "";
  const spots: [number, number][] = [[cx - r * 0.42, cy - r * 0.25], [cx + r * 0.4, cy - r * 0.3], [cx, cy + r * 0.38]];
  for (const [x, y] of spots) {
    const rr = r * 0.42;
    out += drop(x, y, rr, rr * 0.95, 0.16) + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#EBCB8F"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.9)}" fill="#F5E2B8"/>`;
    layers.forEach((c, i) => {
      out += blob(rng, x + between(rng, -4, 4), y + between(rng, -4, 4), rr * (0.82 - i * 0.14), c, 0.3);
    });
    out += Array.from({ length: 5 }, () => `<circle cx="${f(x + Math.cos(rng() * 6.3) * rr * 0.95)}" cy="${f(y + Math.sin(rng() * 6.3) * rr * 0.95)}" r="${f(between(rng, 2, 4))}" fill="#C9944E" opacity="0.7"/>`).join("");
  }
  return out + scatter(art.toppings, rng, ellipse(cx, cy, r * 0.95), { density: 0.3, s: 0.8 });
}

/** Brot je Art: Scheiben, Toast, Baguette, Zopf, Brötchen, Rührei mit Brot */
export function bread(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const tops: Topping[] = art.toppings.filter((t) => t !== "ruehrei");
  switch (art.variant) {
    case "zopf": {
      let out = "";
      for (let i = 0; i < 6; i++) {
        const x = cx - 170 + i * 68;
        const y = cy + (i % 2 ? 22 : -22);
        out += `${drop(x, y, 58, 44, 0.15)}<ellipse cx="${f(x)}" cy="${f(y)}" rx="58" ry="46" fill="#B8692C" transform="rotate(${i % 2 ? 30 : -30} ${f(x)} ${f(y)})"/><ellipse cx="${f(x - 10)}" cy="${f(y - 14)}" rx="24" ry="10" fill="#E3A35E" opacity="0.6" transform="rotate(${i % 2 ? 30 : -30} ${f(x)} ${f(y)})"/>`;
      }
      return out + Array.from({ length: 40 }, () => `<circle cx="${f(cx + between(rng, -200, 200))}" cy="${f(cy + between(rng, -45, 45))}" r="2" fill="#FBF6EE"/>`).join("");
    }
    case "broetchen": {
      const spots: [number, number][] = [[cx - 120, cy - 70], [cx + 40, cy - 95], [cx + 150, cy + 20], [cx - 60, cy + 80], [cx + 80, cy + 120]];
      return spots.map(([x, y]) => `${drop(x, y, 66, 58, 0.16)}<ellipse cx="${f(x)}" cy="${f(y)}" rx="64" ry="56" fill="#C98340"/><ellipse cx="${f(x - 8)}" cy="${f(y - 10)}" rx="46" ry="38" fill="#DCA05A"/><path d="M${f(x - 30)} ${f(y - 4)} Q${f(x)} ${f(y - 22)} ${f(x + 30)} ${f(y - 4)}" stroke="#F4D9A8" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("");
    }
    case "baguette": {
      let out = "";
      for (const [y, rot] of [[cy - 60, -8], [cy + 70, -4]] as const) {
        out += `<g transform="rotate(${rot} ${f(cx)} ${f(y)})">${drop(cx, y, 230, 52, 0.15)}<rect x="${f(cx - 230)}" y="${f(y - 50)}" width="460" height="100" rx="50" fill="#C27A36"/><rect x="${f(cx - 215)}" y="${f(y - 38)}" width="430" height="76" rx="38" fill="#EDB75A"/>${blob(rng, cx - 90, y, 40, "#F2C54E", 0.4)}${blob(rng, cx + 90, y + 4, 44, "#E9B040", 0.4)}</g>`;
        out += scatter(tops, rng, rect(cx - 200, y - 30, 400, 60), { s: 0.7, density: 0.5 });
      }
      return out;
    }
    case "toast":
      return [[-110, -10, -8], [100, 20, 10]].map(([dx, dy, rot]) => breadSlice(rng, cx + dx, cy + dy, 1.35, rot, "#C98A3E", "#E9C27A")).join("") + scatter(tops, rng, ellipse(cx, cy, r * 0.75, r * 0.5), { s: 0.8, density: 0.6 });
    case "ruehrei":
      return `${scatter(["ruehrei"], rng, ellipse(cx + r * 0.2, cy, r * 0.4), { s: 1.1 })}${breadSlice(rng, cx - r * 0.5, cy - r * 0.2, 1.05, -14)}${breadSlice(rng, cx - r * 0.45, cy + r * 0.35, 1.05, 8)}${scatter(has(art, "tomate") ? ["petersilie", "tomate"] : ["petersilie"], rng, ellipse(cx + r * 0.2, cy, r * 0.5), { s: 0.8, density: 0.5 })}`;
    default: {
      let out = breadSlice(rng, cx - 95, cy - 20, 1.4, -10) + breadSlice(rng, cx + 95, cy + 15, 1.4, 8);
      if (has(art, "kaese")) out += [[cx - 95, cy - 25, -10], [cx + 95, cy + 10, 8]].map(([x, y, rot]) => `<rect x="${f(x - 62)}" y="${f(y - 55)}" width="124" height="100" rx="10" fill="#F4CF5A" opacity="0.95" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`).join("");
      return out + scatter(tops.filter((t) => t !== "kaese"), rng, ellipse(cx, cy, r * 0.8, r * 0.6), { s: 0.85, density: 0.6 });
    }
  }
}

/** Pfannkuchen-Stapel, Puffer oder Omelett */
export function pancakes(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const spots = (k: number, x: number, y: number, rr: number) => Array.from({ length: k }, () => `<circle cx="${f(x + Math.cos(rng() * 6.3) * rr * Math.sqrt(rng()))}" cy="${f(y + Math.sin(rng() * 6.3) * rr * Math.sqrt(rng()))}" r="${f(between(rng, 5, 12))}" fill="#D9963E" opacity="0.55"/>`).join("");
  if (art.variant === "puffer") {
    const ps: [number, number][] = [[cx - r * 0.42, cy - r * 0.3], [cx + r * 0.35, cy - r * 0.38], [cx - r * 0.3, cy + r * 0.4], [cx + r * 0.42, cy + r * 0.3]];
    return ps.map(([x, y]) => `${drop(x, y, r * 0.36, r * 0.34, 0.15)}${blob(rng, x, y, r * 0.36, "#C98A3A", 0.25)}${blob(rng, x - 3, y - 3, r * 0.3, "#E2AE58", 0.3)}${spots(6, x, y, r * 0.26)}`).join("") + scatter(art.toppings, rng, ellipse(cx, cy, r * 0.3), { s: 0.8 });
  }
  if (art.variant === "omelett") {
    return `<path d="M${f(cx - r * 0.88)} ${f(cy + r * 0.1)} C ${f(cx - r * 0.8)} ${f(cy - r * 0.75)}, ${f(cx + r * 0.8)} ${f(cy - r * 0.75)}, ${f(cx + r * 0.88)} ${f(cy + r * 0.1)} Z" fill="#000" opacity="0.12" transform="translate(5 10)"/><path d="M${f(cx - r * 0.88)} ${f(cy + r * 0.1)} C ${f(cx - r * 0.8)} ${f(cy - r * 0.75)}, ${f(cx + r * 0.8)} ${f(cy - r * 0.75)}, ${f(cx + r * 0.88)} ${f(cy + r * 0.1)} Z" fill="#F2C94E"/><path d="M${f(cx - r * 0.8)} ${f(cy + r * 0.05)} C ${f(cx - r * 0.7)} ${f(cy - r * 0.62)}, ${f(cx + r * 0.7)} ${f(cy - r * 0.62)}, ${f(cx + r * 0.8)} ${f(cy + r * 0.05)} Z" fill="#F6D96A"/>${spots(8, cx, cy - r * 0.25, r * 0.45)}${scatter(art.toppings, rng, ellipse(cx, cy - r * 0.22, r * 0.6, r * 0.3), { s: 0.85 })}`;
  }
  let out = "";
  for (let i = 0; i < 3; i++) {
    const x = cx - 18 + i * 12;
    const y = cy + 20 - i * 16;
    out += `${drop(x, y, r * 0.78, r * 0.74, 0.12)}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.78)}" fill="#E8B45A"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.72)}" fill="#F1C874"/>`;
  }
  out += spots(14, cx + 6, cy - 12, r * 0.65);
  return out + scatter(art.toppings, rng, ellipse(cx + 6, cy - 12, r * 0.5), { s: 0.9 }) + Array.from({ length: 30 }, () => { const [x, y] = spot(rng, ellipse(cx, cy - 12, r * 0.7)); return `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="#FFFFFF" opacity="0.85"/>`; }).join("");
}

/** Kartoffeln: Brat-, Pell-, Püree, Spalten */
function potatoes(art: DishArt, rng: Rng, reg: Region, variant = art.variant): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = "";
  if (variant === "pueree") {
    out += `${blob(rng, cx + 6, cy + 10, r * 0.9, "#000", 0.2, ' opacity="0.1"')}${blob(rng, cx, cy, r * 0.9, "#F3E2B0", 0.2)}`;
    for (let i = 0; i < 5; i++) out += `<path d="M${f(cx - r * (0.7 - i * 0.12))} ${f(cy - r * 0.3 + i * r * 0.15)} q${f(r * 0.3)} ${f(-r * 0.2)} ${f(r * 0.6)} 0" stroke="#E6CF92" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    out += `<rect x="${f(cx - 14)}" y="${f(cy - 18)}" width="28" height="22" rx="5" fill="#F7DE7A" transform="rotate(12 ${f(cx)} ${f(cy)})"/>`;
  } else if (variant === "pell") {
    const n = Math.max(3, Math.round(7 * (r / 175)));
    for (let i = 0; i < n; i++) {
      const [x, y] = spot(rng, reg, 0.75);
      const rr = between(rng, 40, 52) * Math.min(1, r / 150);
      out += drop(x, y, rr, rr * 0.85) + (i % 2
        ? `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.82)}" fill="#C9A26B"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr * 0.82)}" ry="${f(rr * 0.66)}" fill="#F2DE9A"/>`
        : `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.82)}" fill="#C39A62"/>${[0, 1, 2].map(() => `<circle cx="${f(x + between(rng, -rr * 0.6, rr * 0.6))}" cy="${f(y + between(rng, -rr * 0.5, rr * 0.5))}" r="2.5" fill="#8E6A3E"/>`).join("")}<ellipse cx="${f(x - rr * 0.3)}" cy="${f(y - rr * 0.35)}" rx="${f(rr * 0.3)}" ry="${f(rr * 0.15)}" fill="#fff" opacity="0.3"/>`);
    }
  } else if (variant === "wedges") {
    out += trayVeg({ ...art, toppings: [] }, rng, reg);
  } else {
    const n = Math.round(30 * (r / 175) ** 2);
    out += blob(rng, cx, cy, r * 0.85, "#D9A04A", 0.15, ' opacity="0.45"');
    for (let i = 0; i < n; i++) {
      const [x, y] = spot(rng, reg);
      const rr = between(rng, 22, 32) * Math.min(1, r / 150);
      out += `${drop(x, y, rr)}<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.8)}" fill="#E7B65A" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>${blob(rng, x + rr * 0.2, y, rr * 0.45, "#C98A3A", 0.5, ' opacity="0.7"')}`;
    }
  }
  return out;
}

/** Kartoffel-Teller (eigene Form): Kartoffeln + Toppings, Spargel quer daneben */
export function potatoPlate(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  if (has(art, "spargel")) {
    let out = potatoes(art, rng, ellipse(cx - r * 0.45, cy + r * 0.1, r * 0.45, r * 0.6), "pell");
    for (let i = 0; i < 6; i++) out += `<g transform="rotate(-18 ${f(cx + r * 0.3)} ${f(cy)})">${drop(cx + r * 0.3, cy - 60 + i * 24, 120, 8, 0.1)}<rect x="${f(cx + r * 0.3 - 120)}" y="${f(cy - 66 + i * 24)}" width="240" height="14" rx="7" fill="#EDE3B8" stroke="#CFC08A" stroke-width="2"/><path d="M${f(cx + r * 0.3 + 112)} ${f(cy - 68 + i * 24)} Q${f(cx + r * 0.3 + 134)} ${f(cy - 59 + i * 24)} ${f(cx + r * 0.3 + 112)} ${f(cy - 50 + i * 24)} Z" fill="#D9CFA0"/></g>`;
    out += `<path d="M${f(cx)} ${f(cy - 40)} C ${f(cx + 60)} ${f(cy - 10)}, ${f(cx + 100)} ${f(cy + 30)}, ${f(cx + 160)} ${f(cy + 10)}" stroke="#F3D25E" stroke-width="16" fill="none" stroke-linecap="round" opacity="0.9"/>`;
    return out + scatter(art.toppings.filter((t) => t !== "spargel"), rng, ellipse(cx - r * 0.4, cy, r * 0.4), { s: 0.8 });
  }
  return potatoes(art, rng, reg) + scatter(art.toppings, rng, ellipse(cx, cy, r * 0.85), { density: 0.8 });
}

/** Beilage bei Fisch/Fleisch */
function side(art: DishArt, rng: Rng, reg: Region): string {
  switch (art.side) {
    case "reis":
      return rice(rng, reg, has(art, "zitrone"));
    case "kartoffeln":
      return potatoes(art, rng, reg, "pell");
    case "pueree":
      return potatoes(art, rng, reg, "pueree");
    case "ofenkartoffeln":
      return potatoes(art, rng, reg, "wedges");
    default:
      return scatter(["brokkoli", "moehre", "erbsen"], rng, reg, { density: 1.2 });
  }
}

/** Fisch + Beilage */
export function fish(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = side(art, rng, ellipse(cx - r * 0.45, cy + r * 0.2, r * 0.5, r * 0.55));
  const fx = cx + r * 0.25;
  const fy = cy - r * 0.15;
  if (art.variant === "staebchen") {
    for (let i = 0; i < 4; i++) out += `<g transform="rotate(-25 ${f(fx)} ${f(fy)})">${drop(fx, fy - 75 + i * 48, 78, 18, 0.15)}<rect x="${f(fx - 78)}" y="${f(fy - 92 + i * 48)}" width="156" height="38" rx="9" fill="#D9862E"/><rect x="${f(fx - 72)}" y="${f(fy - 88 + i * 48)}" width="144" height="13" rx="6" fill="#EFB45E" opacity="0.8"/></g>`;
  } else {
    const [a, b, stripe] = art.variant === "lachs" ? ["#F59A74", "#E86F4F", "#FCD7C6"] : ["#F7EBD8", "#E9CFA4", "#FFFFFF"];
    out += `<g transform="rotate(-18 ${f(fx)} ${f(fy)})">${drop(fx, fy, 135, 66, 0.18)}<rect x="${f(fx - 135)}" y="${f(fy - 66)}" width="270" height="132" rx="56" fill="${b}"/><rect x="${f(fx - 126)}" y="${f(fy - 58)}" width="252" height="112" rx="50" fill="${a}"/>${[-70, -30, 10, 50, 90].map((dx) => `<path d="M${f(fx + dx)} ${f(fy - 54)} q18 54 0 108" stroke="${stripe}" stroke-width="5" fill="none" opacity="0.7"/>`).join("")}<rect x="${f(fx - 110)}" y="${f(fy - 52)}" width="200" height="22" rx="11" fill="#C9662E" opacity="${art.variant === "lachs" ? 0.35 : 0.2}"/></g>`;
  }
  out += lemonSlice(fx + 120, fy + 90, 32, 20);
  return out + scatter(art.toppings.filter((t) => t !== "zitrone"), rng, ellipse(fx, fy, 140, 70), { s: 0.9, density: 0.6 });
}

/** Fleisch + Beilage (Frikadellen, Hähnchen, Schnitzel, Hackbraten, Würstchen) */
export function meat(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = side(art, rng, ellipse(cx - r * 0.45, cy + r * 0.15, r * 0.5, r * 0.6));
  const mx = cx + r * 0.3;
  const my = cy - r * 0.05;
  switch (art.variant) {
    case "haehnchen":
      out += scatter(["haehnchen"], rng, ellipse(mx, my, r * 0.45, r * 0.6), { s: 1.4, density: 1.2 });
      break;
    case "schnitzel":
      out += `${blob(rng, mx + 6, my + 10, r * 0.55, "#000", 0.3, ' opacity="0.14"')}${blob(rng, mx, my, r * 0.55, "#C9822E", 0.3)}${blob(rng, mx - 4, my - 4, r * 0.48, "#E0A548", 0.32)}${lemonSlice(mx + r * 0.3, my + r * 0.4, 28, 10)}`;
      break;
    case "hackbraten":
      // Drei Scheiben vom Laib: rosig innen, nur ein schmaler Krusten-Rand braun,
      // frische Tomatensoße sparsam darunter, Ei in der Mitte (Falscher Hase)
      out += blob(rng, mx + 4, my + 22, r * 0.5, "#D9483B", 0.18, ' opacity="0.8"');
      for (let i = 0; i < 3; i++) {
        const x = mx - 70 + i * 62;
        const y = my - 14 + i * 14;
        out += `<g transform="rotate(${-14 + i * 4} ${f(x)} ${f(y)})">${drop(x, y + 6, 58, 70, 0.15)}<rect x="${f(x - 56)}" y="${f(y - 72)}" width="112" height="144" rx="30" fill="#B8703F"/><rect x="${f(x - 49)}" y="${f(y - 65)}" width="98" height="130" rx="25" fill="#E9A386"/>${Array.from({ length: 9 }, () => `<circle cx="${f(x + between(rng, -38, 38))}" cy="${f(y + between(rng, -54, 54))}" r="${f(between(rng, 2, 3.5))}" fill="${rng() < 0.5 ? "#C97A5E" : "#5FA348"}" opacity="0.8"/>`).join("")}<ellipse cx="${f(x)}" cy="${f(y)}" rx="24" ry="30" fill="#FFFDF6"/><circle cx="${f(x)}" cy="${f(y + 2)}" r="13" fill="#F2B632"/></g>`;
      }
      break;
    case "wurst":
      for (let i = 0; i < 3; i++) out += `<g transform="rotate(${-30 + i * 8} ${f(mx)} ${f(my)})">${drop(mx, my - 50 + i * 50, 100, 22, 0.15)}<rect x="${f(mx - 100)}" y="${f(my - 72 + i * 50)}" width="200" height="44" rx="22" fill="#9A4E2A"/><path d="M${f(mx - 60)} ${f(my - 60 + i * 50)} l14 18 M${f(mx - 10)} ${f(my - 60 + i * 50)} l14 18 M${f(mx + 40)} ${f(my - 60 + i * 50)} l14 18" stroke="#6A3018" stroke-width="4"/></g>`;
      break;
    default:
      for (const [dx, dy] of [[-45, -55], [55, -20], [-10, 60]]) {
        const x = mx + dx;
        const y = my + dy;
        out += `${drop(x, y, 54, 50, 0.18)}<circle cx="${f(x)}" cy="${f(y)}" r="54" fill="#7E4A2A"/><circle cx="${f(x - 4)}" cy="${f(y - 4)}" r="46" fill="#9A5E36"/>${Array.from({ length: 10 }, () => `<circle cx="${f(x + between(rng, -36, 36))}" cy="${f(y + between(rng, -36, 36))}" r="${f(between(rng, 2, 4))}" fill="#6A3A20" opacity="0.7"/>`).join("")}<ellipse cx="${f(x - 18)}" cy="${f(y - 20)}" rx="16" ry="8" fill="#fff" opacity="0.18"/>`;
      }
  }
  if (art.variant !== "hackbraten") out += `<path d="M${f(mx - 80)} ${f(my + 110)} C ${f(mx - 20)} ${f(my + 140)}, ${f(mx + 60)} ${f(my + 130)}, ${f(mx + 100)} ${f(my + 100)}" stroke="#7A3E1E" stroke-width="12" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  return out + scatter(art.toppings.filter((t) => !["hack", "haehnchen"].includes(t)), rng, ellipse(cx, cy, r * 0.85), { s: 0.9, density: 0.5 });
}

/** Salat: grüne Blätter, Nudelsalat, Caprese oder Kartoffelsalat */
export function salad(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  if (art.variant === "nudel") return pastaShort({ ...art, toppings: art.toppings.filter((t) => t !== "kaese") }, rng, reg, "#F3E7C6");
  if (art.variant === "caprese") {
    let out = "";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = cx + Math.cos(a) * r * 0.62;
      const y = cy + Math.sin(a) * r * 0.62;
      out += i % 2 ? mozzaSlice(x, y, 38) : tomatoSlice(x, y, 38);
    }
    return out + scatter(["basilikum"], rng, ellipse(cx, cy, r * 0.75), { density: 1.4 }) + `<path d="M${f(cx - r * 0.3)} ${f(cy)} C ${f(cx - 10)} ${f(cy + 30)}, ${f(cx + 30)} ${f(cy - 30)}, ${f(cx + r * 0.3)} ${f(cy + 10)}" stroke="#5A3A1E" stroke-width="6" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  }
  if (art.variant === "kartoffel") return potatoes(art, rng, reg, "brat") + scatter(["gurke", "petersilie", ...art.toppings], rng, reg, { density: 0.6 });
  let out = "";
  for (let i = 0; i < 46; i++) {
    const [x, y] = spot(rng, reg, 0.95);
    out += blob(rng, x, y, between(rng, 22, 36), pick(rng, ["#7DB24A", "#5E9E3A", "#A6C96A", "#3E7A35", "#8CC05A"]), 0.45);
  }
  return out + scatter(art.toppings, rng, reg, { density: 1.1 });
}

/** Pizza (rund) oder Flammkuchen (eckig) – liegt auf dem Brett */
export function pizza(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  if (art.variant === "flammkuchen") {
    let out = `${drop(cx, cy, 250, 150, 0.15)}<rect x="${f(cx - 250)}" y="${f(cy - 150)}" width="500" height="300" rx="40" fill="#D9A55A"/><rect x="${f(cx - 232)}" y="${f(cy - 132)}" width="464" height="264" rx="32" fill="#F6EEDC"/>`;
    out += Array.from({ length: 16 }, () => { const [x, y] = spot(rng, rect(cx - 230, cy - 130, 460, 260)); return blob(rng, x, y, between(rng, 8, 16), "#D9A55A", 0.5, ' opacity="0.6"'); }).join("");
    return out + scatter([...new Set<Topping>(["speck", "zwiebel", ...art.toppings.filter((t) => t !== "quark")])], rng, rect(cx - 230, cy - 130, 460, 260), { density: 2.6, s: 1.3 });
  }
  let out = `${drop(cx, cy, r, r * 0.97, 0.16)}<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#D69A4E"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.88)}" fill="#C8432A"/>`;
  out += Array.from({ length: 14 }, () => { const [x, y] = spot(rng, ellipse(cx, cy, r * 0.8)); return blob(rng, x, y, between(rng, 18, 30), "#F6E3A8", 0.45); }).join("");
  out += Array.from({ length: 10 }, () => `<circle cx="${f(cx + Math.cos(rng() * 6.3) * r * 0.94)}" cy="${f(cy + Math.sin(rng() * 6.3) * r * 0.94)}" r="${f(between(rng, 4, 8))}" fill="#A9682E" opacity="0.6"/>`).join("");
  return out + scatter(art.toppings.filter((t) => t !== "kaese"), rng, ellipse(cx, cy, r * 0.82));
}

/** Milchreis/Grießbrei in der Schale */
export function sweetBowl(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${art.variant === "griess" ? "#F3E6C8" : "#F6EDD8"}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#gloss)"/>`;
  if (art.variant !== "griess") for (let i = 0; i < 120; i++) { const [x, y] = spot(rng, reg, 0.9); out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="2.6" fill="#FFFDF6" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>`; }
  else out += `<path d="M${f(cx - r * 0.5)} ${f(cy + r * 0.1)} C ${f(cx - r * 0.3)} ${f(cy - r * 0.4)}, ${f(cx + r * 0.4)} ${f(cy - r * 0.3)}, ${f(cx + r * 0.5)} ${f(cy + r * 0.2)}" stroke="#E9D9B2" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  out += scatter(art.toppings, rng, ellipse(cx + r * 0.1, cy - r * 0.05, r * 0.6));
  return out + Array.from({ length: 40 }, () => { const [x, y] = spot(rng, ellipse(cx - r * 0.2, cy + r * 0.2, r * 0.4)); return `<circle cx="${f(x)}" cy="${f(y)}" r="1.6" fill="#9A5E2A" opacity="0.7"/>`; }).join("");
}

