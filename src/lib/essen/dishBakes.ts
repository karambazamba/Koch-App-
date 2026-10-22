// Gebackenes und Überbackenes für die Gericht-Bilder: Kuchenstück, Muffins,
// Kekse, Waffeln, Schnecken und der Inhalt einer Auflaufform (Nudelauflauf,
// Lasagne, gefüllte Paprika, Crumble).

import type { DishArt } from "@/lib/essen/dishArt";
import { between, blob, center, drop, f, pick, scatter, size, spot, rect, ellipse, type Region, type Rng } from "@/lib/essen/dishBits";

const CAKE: Record<string, { top: string; edge: string }> = {
  apfel: { top: "#E5B866", edge: "#B9783A" },
  marmor: { top: "#F1D9A6", edge: "#B9783A" },
  zitrone: { top: "#F2D372", edge: "#C9963E" },
  kaese: { top: "#F6E7B8", edge: "#C98A3A" },
  moehre: { top: "#FBF4E6", edge: "#B9783A" },
  schoko: { top: "#6A4128", edge: "#4A2C1E" },
  banane: { top: "#D9A55E", edge: "#9A6230" },
  streusel: { top: "#E9C27A", edge: "#B9783A" },
  brownie: { top: "#5A3A28", edge: "#3E2618" },
};

/** Kuchenstück von oben (oder Stücke vom Blech: Brownies, Streusel, Bananenbrot) */
export function cake(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const v = art.variant ?? "apfel";
  const c = CAKE[v] ?? CAKE.apfel;
  if (v === "brownie" || v === "streusel" || v === "banane") {
    let out = "";
    const pieces: [number, number, number][] = [[cx - r * 0.45, cy - r * 0.38, -8], [cx + r * 0.45, cy - r * 0.3, 6], [cx, cy + r * 0.5, -3]];
    for (const [x, y, rot] of pieces) {
      const w = v === "banane" ? r * 1.1 : r * 0.78;
      const h = v === "banane" ? r * 0.5 : r * 0.78;
      out += `<g transform="rotate(${rot} ${f(x)} ${f(y)})"><rect x="${f(x - w / 2 + 6)}" y="${f(y - h / 2 + 10)}" width="${f(w)}" height="${f(h)}" rx="10" fill="#000" opacity="0.15"/><rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="10" fill="${c.edge}"/><rect x="${f(x - w / 2 + 6)}" y="${f(y - h / 2 + 6)}" width="${f(w - 12)}" height="${f(h - 12)}" rx="7" fill="${c.top}"/>`;
      if (v === "brownie") out += `<path d="M${f(x - w * 0.3)} ${f(y - h * 0.1)} l${f(w * 0.2)} ${f(h * 0.15)} l${f(w * 0.25)} ${f(-h * 0.08)}" stroke="#3A2416" stroke-width="3" fill="none"/>`;
      if (v === "streusel") out += Array.from({ length: 18 }, () => blob(rng, x + between(rng, -w * 0.4, w * 0.4), y + between(rng, -h * 0.4, h * 0.4), between(rng, 5, 9), pick(rng, ["#F4D9A0", "#D9A55E", "#E9C27A"]), 0.5)).join("");
      if (v === "banane") out += Array.from({ length: 5 }, () => `<circle cx="${f(x + between(rng, -w * 0.4, w * 0.4))}" cy="${f(y + between(rng, -h * 0.3, h * 0.3))}" r="5" fill="#B97A3E" opacity="0.6"/>`).join("");
      out += "</g>";
    }
    if (v === "streusel") out += scatter(["beeren"], rng, ellipse(cx, cy, r * 0.8), { density: 0.6 });
    return out + sugar(rng, reg, v === "brownie" ? 25 : 0);
  }
  // Ein Stück von der runden Torte, Spitze zur Mitte
  const tip: [number, number] = [cx - r * 0.95, cy + r * 0.7];
  const rr = r * 1.85;
  const a1 = -0.95;
  const a2 = -0.25;
  const p1 = [tip[0] + Math.cos(a1) * rr, tip[1] + Math.sin(a1) * rr];
  const p2 = [tip[0] + Math.cos(a2) * rr, tip[1] + Math.sin(a2) * rr];
  const path = `M${f(tip[0])} ${f(tip[1])} L${f(p1[0])} ${f(p1[1])} A${f(rr)} ${f(rr)} 0 0 1 ${f(p2[0])} ${f(p2[1])} Z`;
  let out = `<path d="${path}" fill="#000" opacity="0.16" transform="translate(8 14)"/><path d="${path}" fill="${c.edge}"/>`;
  const inner = (k: number) => {
    const q1 = [tip[0] + Math.cos(a1) * rr * k, tip[1] + Math.sin(a1) * rr * k];
    const q2 = [tip[0] + Math.cos(a2) * rr * k, tip[1] + Math.sin(a2) * rr * k];
    return `M${f(tip[0] + 8)} ${f(tip[1] - 4)} L${f(q1[0])} ${f(q1[1])} A${f(rr * k)} ${f(rr * k)} 0 0 1 ${f(q2[0])} ${f(q2[1])} Z`;
  };
  out += `<path d="${inner(0.93)}" fill="${c.top}"/>`;
  const mid = (k: number, t: number) => [tip[0] + Math.cos(a1 + (a2 - a1) * t) * rr * k, tip[1] + Math.sin(a1 + (a2 - a1) * t) * rr * k];
  if (v === "marmor") for (let i = 0; i < 4; i++) { const [x, y] = mid(0.3 + i * 0.17, 0.5); out += `<path d="M${f(x - 40)} ${f(y)} q 20 -26 40 0 t 40 0" stroke="#8A5530" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.85"/>`; }
  if (v === "zitrone") for (let i = 0; i < 5; i++) { const [x, y] = mid(0.3 + i * 0.14, 0.2); out += `<path d="M${f(x)} ${f(y)} q 30 30 60 10" stroke="#FFFDF6" stroke-width="6" fill="none" stroke-linecap="round"/>`; }
  if (v === "kaese") out += `<path d="${inner(0.93)}" fill="none" stroke="#D9A04A" stroke-width="16" opacity="0.7"/>`;
  if (v === "moehre") for (const t of [0.35, 0.6, 0.85]) { const [x, y] = mid(0.72, t); out += `<path d="M${f(x)} ${f(y)} l18 -6 l-14 14 Z" fill="#EE8A2E"/><path d="M${f(x + 16)} ${f(y - 6)} l8 -8" stroke="#5E9E3A" stroke-width="3"/>`; }
  if (v === "apfel") for (let i = 0; i < 3; i++) { const [x, y] = mid(0.4 + i * 0.2, 0.5); out += `<path d="M${f(x - 30)} ${f(y + 8)} C${f(x - 20)} ${f(y - 14)} ${f(x + 20)} ${f(y - 14)} ${f(x + 30)} ${f(y + 8)}" stroke="#C98A3A" stroke-width="4" fill="#F0D59A"/>`; }
  if (v === "schoko") out += Array.from({ length: 10 }, () => { const [x, y] = mid(between(rng, 0.3, 0.85), between(rng, 0.2, 0.8)); return `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#3A2214"/>`; }).join("");
  out += sugar(rng, ellipse(mid(0.6, 0.5)[0], mid(0.6, 0.5)[1], r * 0.35), v === "apfel" ? 40 : 0);
  // Krümel und Gabel
  out += Array.from({ length: 6 }, () => { const [x, y] = spot(rng, ellipse(cx + r * 0.45, cy + r * 0.45, r * 0.25)); return blob(rng, x, y, between(rng, 3, 6), c.edge, 0.5); }).join("");
  return out;
}

/** Puderzucker-Punkte */
function sugar(rng: Rng, reg: Region, n: number): string {
  return Array.from({ length: n }, () => { const [x, y] = spot(rng, reg); return `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="#FFFFFF" opacity="0.9"/>`; }).join("");
}

/** Drei Muffins in Papierförmchen */
export function muffins(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  const choc = art.variant !== "blaubeer";
  const paper = pick(rng, ["#F2B8A8", "#BFD7E8", "#F3E3C6"]);
  let out = "";
  for (const [dx, dy] of [[-0.45, -0.22], [0.42, -0.3], [0, 0.42]]) {
    const x = cx + dx * r;
    const y = cy + dy * r;
    const rr = r * 0.42;
    out += drop(x, y, rr, rr * 0.95, 0.16) + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${paper}"/>`;
    out += Array.from({ length: 16 }, (_, i) => `<path d="M${f(x)} ${f(y)} L${f(x + Math.cos((i / 16) * 6.283) * rr)} ${f(y + Math.sin((i / 16) * 6.283) * rr)}" stroke="#fff" stroke-width="2" opacity="0.4"/>`).join("");
    out += blob(rng, x, y - 3, rr * 0.86, choc ? "#6A4128" : "#D9A24E", 0.18) + blob(rng, x - rr * 0.15, y - rr * 0.2, rr * 0.5, choc ? "#82502F" : "#E8B866", 0.3);
    out += scatter(choc ? ["schoko"] : ["beeren"], rng, ellipse(x, y - 3, rr * 0.7), { density: 0.5, s: 0.9 });
  }
  return out;
}

/** Kekse: Hafer, Schoko oder Butterkekse (Stern, Herz, Kreis) */
export function cookies(art: DishArt, rng: Rng, reg: Region): string {
  let out = "";
  const [cx, cy] = center(reg);
  const k = size(reg);
  const places: [number, number][] = [[0, 0], [-0.62, -0.32], [0.6, -0.4], [-0.55, 0.45], [0.58, 0.38], [0, -0.72], [0.05, 0.72]];
  for (let i = 0; i < places.length; i++) {
    const x = cx + places[i][0] * k + between(rng, -6, 6);
    const y = cy + places[i][1] * k + between(rng, -6, 6);
    const rr = between(rng, 42, 50) * Math.min(1, k / 170);
    out += drop(x, y, rr, rr * 0.95, 0.14);
    if (art.variant === "butter") {
      const shape = i % 3;
      const col = "#F0CF8A";
      if (shape === 0) out += `<path d="${star(x, y, rr, rr * 0.5)}" fill="#D9A55E"/><path d="${star(x, y, rr * 0.88, rr * 0.44)}" fill="${col}"/>`;
      else if (shape === 1) out += `<path d="M${f(x)} ${f(y + rr * 0.8)} C${f(x - rr * 1.3)} ${f(y - rr * 0.1)} ${f(x - rr * 0.5)} ${f(y - rr * 1.1)} ${f(x)} ${f(y - rr * 0.35)} C${f(x + rr * 0.5)} ${f(y - rr * 1.1)} ${f(x + rr * 1.3)} ${f(y - rr * 0.1)} ${f(x)} ${f(y + rr * 0.8)} Z" fill="${col}" stroke="#D9A55E" stroke-width="4"/>`;
      else out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.85)}" fill="${col}" stroke="#D9A55E" stroke-width="4"/>`;
    } else {
      out += blob(rng, x, y, rr, art.variant === "hafer" ? "#C98F4E" : "#D8A15A", 0.18) + blob(rng, x - 3, y - 3, rr * 0.8, art.variant === "hafer" ? "#D9A55E" : "#E3B26A", 0.25);
      if (art.variant === "hafer") out += Array.from({ length: 10 }, () => `<ellipse cx="${f(x + between(rng, -rr * 0.6, rr * 0.6))}" cy="${f(y + between(rng, -rr * 0.6, rr * 0.6))}" rx="5" ry="2.5" fill="#F4DFAE" transform="rotate(${f(between(rng, 0, 180))} ${f(x)} ${f(y)})"/>`).join("");
      else out += Array.from({ length: 7 }, () => blob(rng, x + between(rng, -rr * 0.55, rr * 0.55), y + between(rng, -rr * 0.55, rr * 0.55), between(rng, 4, 7), "#4A2C1E", 0.4)).join("");
    }
  }
  return out;
}

function star(x: number, y: number, ro: number, ri: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 ? ri : ro;
    return `${i ? "L" : "M"}${f(x + Math.cos(a) * d)} ${f(y + Math.sin(a) * d)}`;
  }).join(" ") + " Z";
}

/** Herzwaffel (fünf Herzen) mit Gitter, Puderzucker und Beeren */
export function waffles(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg) * 0.95;
  let out = `<defs><clipPath id="waffel"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath></defs>`;
  out += drop(cx, cy, r, r * 0.96, 0.16) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#D9A04A"/>`;
  out += `<g clip-path="url(#waffel)">`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const hx = cx + Math.cos(a) * r * 0.48;
    const hy = cy + Math.sin(a) * r * 0.48;
    out += `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(r * 0.5)}" fill="#E9B85A" stroke="#C98A3A" stroke-width="3"/>`;
  }
  for (let k = -r; k <= r; k += 22) out += `<path d="M${f(cx - r)} ${f(cy + k)} L${f(cx + r)} ${f(cy + k)} M${f(cx + k)} ${f(cy - r)} L${f(cx + k)} ${f(cy + r)}" stroke="#C98A3A" stroke-width="4" opacity="0.55"/>`;
  out += `</g>` + sugar(rng, ellipse(cx, cy, r * 0.8), 70);
  return out + scatter(art.toppings, rng, ellipse(cx, cy, r * 0.5), { density: 0.8 });
}

/** Rosinenschnecken mit Zuckerguss */
export function buns(art: DishArt, rng: Rng, reg: Region): string {
  const [cx, cy] = center(reg);
  const r = size(reg);
  let out = "";
  for (const [dx, dy] of [[-0.42, -0.3], [0.4, -0.32], [-0.35, 0.4], [0.42, 0.36]]) {
    const x = cx + dx * r;
    const y = cy + dy * r;
    const rr = r * 0.38;
    out += drop(x, y, rr, rr * 0.95, 0.16) + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#C98340"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.9)}" fill="#E2A458"/>`;
    let d = `M${f(x)} ${f(y)}`;
    for (let t = 0; t < 18; t++) { const a = t * 0.7; const k = (t / 18) * rr * 0.85; d += ` L${f(x + Math.cos(a) * k)} ${f(y + Math.sin(a) * k)}`; }
    out += `<path d="${d}" stroke="#A9662E" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    out += `<path d="M${f(x - rr * 0.6)} ${f(y - rr * 0.2)} q${f(rr * 0.4)} ${f(rr * 0.3)} ${f(rr * 1.1)} ${f(-rr * 0.1)}" stroke="#FFFDF6" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>`;
    out += scatter(["rosinen"], rng, ellipse(x, y, rr * 0.7), { density: 0.6 });
  }
  return out;
}

/** Inhalt der Auflaufform: goldene Käsekruste, Nudeln/Lasagne, gefüllte Paprika oder Crumble */
export function bake(art: DishArt, rng: Rng, reg: Region): string {
  if (reg.kind !== "r") return "";
  const { x, y, w, h } = reg;
  if (art.variant === "gefuellt") {
    let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="26" fill="#C8432A" opacity="0.85"/>`;
    const cols = ["#D93A2B", "#F2B530", "#5E9E3A", "#E5552C"];
    for (let i = 0; i < 4; i++) {
      const px = x + w * (i % 2 ? 0.72 : 0.28);
      const py = y + h * (i < 2 ? 0.3 : 0.72);
      out += `${drop(px, py, w * 0.2, h * 0.22, 0.2)}<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(w * 0.2)}" ry="${f(h * 0.22)}" fill="${cols[i]}"/>${blob(rng, px, py, Math.min(w, h) * 0.15, "#9A5E36", 0.3)}${blob(rng, px, py - 4, Math.min(w, h) * 0.12, "#F2C54E", 0.4)}`;
    }
    return out + scatter(["petersilie"], rng, reg, { density: 0.8 });
  }
  if (art.variant === "crumble") {
    let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="26" fill="#E3B45E"/>`;
    out += Array.from({ length: 60 }, () => { const [px, py] = spot(rng, reg); return blob(rng, px, py, between(rng, 8, 16), pick(rng, ["#F2CF8A", "#D9A04A", "#E9BC6A", "#C98A3A"]), 0.5); }).join("");
    out += Array.from({ length: 6 }, () => { const [px, py] = spot(rng, reg, 0.7); return blob(rng, px, py, 16, "#F5E2A6", 0.4); }).join("");
    return out + sugar(rng, reg, 60);
  }
  let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="26" fill="#E8B95E"/>`;
  if (art.variant === "lasagne") out += `<rect x="${f(x)}" y="${f(y + h * 0.82)}" width="${f(w)}" height="${f(h * 0.18)}" rx="12" fill="#C8432A" opacity="0.8"/>`;
  else out += Array.from({ length: 22 }, () => { const [px, py] = spot(rng, reg); return `<rect x="${f(px - 15)}" y="${f(py - 6)}" width="30" height="12" rx="5" fill="#F2C46B" transform="rotate(${f(between(rng, 0, 180))} ${f(px)} ${f(py)})"/>`; }).join("");
  out += Array.from({ length: 22 }, () => { const [px, py] = spot(rng, reg); return blob(rng, px, py, between(rng, 14, 28), pick(rng, ["#D9963E", "#C98234", "#F2CC6A"]), 0.5, ' opacity="0.85"'); }).join("");
  return out + scatter(art.toppings.filter((t) => t !== "kaese"), rng, rect(x + 20, y + 20, w - 40, h - 40), { density: 0.6, s: 0.9 });
}
