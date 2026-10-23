// Gericht-Bild als SVG-Text (rein): Bühne wie public/demo/gericht.webp –
// warmer Verlauf, Leinen-Serviette, Gabel, Gefäß von oben mit weichem
// Schatten – und darauf das Essen je Form (dishBases.ts, dishBakes.ts).
// Dieselben Bausteine erzeugen die eingebauten Bilder (npm run gerichte-bilder)
// und die live gezeichneten Bilder in der App.

import type { DishArt } from "@/lib/essen/dishArt";
import { bake, buns, cake, cookies, muffins, waffles } from "@/lib/essen/dishBakes";
import { bread, fish, meat, pancakes, pastaLong, pastaShort, pizza, potatoPlate, rice, salad, soup, stew, stirFry, sweetBowl, trayVeg, wraps } from "@/lib/essen/dishBases";
import { breadSlice, CX, CY, ellipse, f, H, pepper, pick, R, rect, rngFrom, scatter, W, type Region, type Rng } from "@/lib/essen/dishBits";

const DEFS = `<radialGradient id="plate" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.8" stop-color="#F4EFE8"/><stop offset="1" stop-color="#E4DCD0"/></radialGradient>
<radialGradient id="tom" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FF6B4A"/><stop offset="0.7" stop-color="#E0331F"/><stop offset="1" stop-color="#B21E12"/></radialGradient>
<radialGradient id="bur" cx="0.42" cy="0.38" r="0.65"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.75" stop-color="#FBF6EC"/><stop offset="1" stop-color="#EDE3D2"/></radialGradient>
<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6FB25A"/><stop offset="1" stop-color="#3E8A35"/></linearGradient>
<radialGradient id="gloss" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.12"/></radialGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9A367"/><stop offset="1" stop-color="#B07640"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`;

const shadow = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${f(cx + 10)}" cy="${f(cy + 22)}" rx="${f(rx)}" ry="${f(ry)}" fill="#5A2A12" opacity="0.33" filter="url(#soft)"/>`;

function stage(art: DishArt): string {
  const [a, b, c] = art.bg;
  return `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect x="-30" y="420" width="315" height="225" rx="15" transform="rotate(-12 128 525)" fill="#F3E6D3" opacity="0.9"/>
<path d="M-15 480 L285 420 M-8 518 L292 458 M0 555 L300 495" stroke="#E2CFB3" stroke-width="5" opacity="0.8"/>
<g transform="rotate(28 768 315)" opacity="0.92"><rect x="760" y="188" width="16" height="248" rx="8" fill="#D8D2CA"/><rect x="749" y="128" width="39" height="75" rx="10" fill="#E6E1DA"/><path d="M754 128 V83 M763 128 V79 M773 128 V79 M782 128 V83" stroke="#E6E1DA" stroke-width="6" stroke-linecap="round"/></g>`;
}

// --- Gefäße: zeichnen sich und geben die Fläche fürs Essen zurück ---------------------

type Vessel = { svg: string; food: Region };

function plate(scale = 1): Vessel {
  const r = R * scale;
  return {
    svg: `${shadow(CX, CY, r + 8, r - 2)}<circle cx="${CX}" cy="${CY}" r="${f(r)}" fill="url(#plate)"/><circle cx="${CX}" cy="${CY}" r="${f(r * 0.82)}" fill="none" stroke="#EAE2D6" stroke-width="3"/>`,
    food: ellipse(CX, CY, r * 0.72, r * 0.7),
  };
}

function bowl(rng: Rng): Vessel {
  const ceramic = pick(rng, ["#F6F1EA", "#E4ECF0", "#F1E1D0", "#EDE7DA"]);
  return {
    svg: `${shadow(CX, CY, R * 0.9, R * 0.86)}<circle cx="${CX}" cy="${CY}" r="${f(R * 0.9)}" fill="${ceramic}"/><circle cx="${CX}" cy="${CY}" r="${f(R * 0.9)}" fill="url(#gloss)"/><circle cx="${CX}" cy="${CY}" r="${f(R * 0.76)}" fill="#E3D9CB"/>`,
    food: ellipse(CX, CY, R * 0.72),
  };
}

/** Helle Emaille-Pfanne mit farbigem Rand und Holzgriff (Tafel 62 B – nie dunkel) */
function skillet(rng: Rng): Vessel {
  const rim = pick(rng, ["#3E7C8C", "#E8643A", "#8FAE8B"]);
  return {
    svg: `${shadow(CX, CY, R * 0.95, R * 0.92)}<g transform="rotate(-28 ${CX} ${CY})"><rect x="${f(CX + R * 0.85)}" y="${f(CY - 18)}" width="230" height="36" rx="18" fill="#C98A4E"/><rect x="${f(CX + R * 0.85 + 12)}" y="${f(CY - 12)}" width="200" height="7" rx="3.5" fill="#E2A96A"/></g><circle cx="${CX}" cy="${CY}" r="${f(R * 0.95)}" fill="${rim}"/><circle cx="${CX}" cy="${CY}" r="${f(R * 0.86)}" fill="#F7F1E6"/><circle cx="${CX}" cy="${CY}" r="${f(R * 0.82)}" fill="#FBF7F0"/><ellipse cx="${f(CX - R * 0.35)}" cy="${f(CY - R * 0.5)}" rx="${f(R * 0.3)}" ry="${f(R * 0.1)}" fill="#fff" opacity="0.35"/>`,
    food: ellipse(CX, CY, R * 0.78),
  };
}

function bakingDish(rng: Rng): Vessel {
  const rim = pick(rng, ["#E8643A", "#3E6E8E", "#F2EDE4", "#C9A24A"]);
  const w = 520;
  const h = 370;
  const x = CX - w / 2;
  const y = CY - h / 2;
  return {
    svg: `${shadow(CX, CY, w / 2 + 20, h / 2 + 10)}<rect x="${x - 34}" y="${CY - 34}" width="${w + 68}" height="68" rx="30" fill="${rim}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="56" fill="${rim}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="56" fill="url(#gloss)"/><rect x="${x + 22}" y="${y + 22}" width="${w - 44}" height="${h - 44}" rx="40" fill="#F7F1E8"/>`,
    food: rect(x + 32, y + 32, w - 64, h - 64),
  };
}

function tray(): Vessel {
  const w = 620;
  const h = 410;
  const x = CX - w / 2;
  const y = CY - h / 2;
  return {
    svg: `${shadow(CX, CY, w / 2 + 10, h / 2)}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#77716C"/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="12" fill="#605B57"/><rect x="${x + 30}" y="${y + 26}" width="${w - 60}" height="${h - 52}" rx="6" fill="#F4ECDD" transform="rotate(1.5 ${CX} ${CY})"/>`,
    food: rect(x + 44, y + 40, w - 88, h - 80),
  };
}

function board(round: boolean): Vessel {
  if (round)
    return {
      svg: `${shadow(CX, CY, R + 10, R + 6)}<rect x="${CX + R - 10}" y="${CY - 26}" width="110" height="52" rx="26" fill="url(#wood)"/><circle cx="${CX}" cy="${CY}" r="${R + 12}" fill="url(#wood)"/>${[0.4, 0.7, 0.95].map((k) => `<circle cx="${CX}" cy="${CY}" r="${f((R + 12) * k)}" fill="none" stroke="#A9703C" stroke-width="2" opacity="0.4"/>`).join("")}`,
      food: ellipse(CX, CY, R * 0.92),
    };
  const w = 600;
  const h = 420;
  return {
    svg: `${shadow(CX, CY, w / 2, h / 2)}<rect x="${CX - w / 2}" y="${CY - h / 2}" width="${w}" height="${h}" rx="36" fill="url(#wood)"/>${[0.2, 0.45, 0.7, 0.88].map((k) => `<path d="M${CX - w / 2 + 30} ${f(CY - h / 2 + h * k)} q ${w / 3} -14 ${w - 60} 6" stroke="#A9703C" stroke-width="2.5" fill="none" opacity="0.45"/>`).join("")}`,
    food: ellipse(CX, CY, w * 0.42, h * 0.4),
  };
}

// --- Zusammensetzen ------------------------------------------------------------------

function dish(art: DishArt, rng: Rng): { svg: string; savory: boolean; oil: boolean } {
  const v = (vessel: Vessel, food: (reg: Region) => string, savory = true, oil = false) => ({ svg: vessel.svg + food(vessel.food), savory, oil });
  switch (art.form) {
    case "nudeln-lang":
      return v(plate(), (reg) => pastaLong(art, rng, reg), true, false);
    case "nudeln-kurz":
      return v(plate(), (reg) => pastaShort(art, rng, reg), true, true);
    case "reis":
      return v(plate(), (reg) => {
        const r = reg.kind === "e" ? reg.rx : 170;
        const tint = art.toppings.includes("kuerbis") ? "#EDB86E" : art.toppings.includes("pilze") ? "#DCC8A6" : art.toppings.includes("tomate") ? "#E59A6E" : false;
        return rice(rng, ellipse(CX - r * 0.35, CY, r * 0.62, r * 0.85), tint) + scatter(art.toppings, rng, ellipse(CX + r * 0.45, CY, r * 0.5, r * 0.8), { density: 1.5 });
      });
    case "bowl":
      return v(bowl(rng), (reg) => stew(art, rng, reg));
    case "suppe": {
      const vessel = bowl(rng);
      return { svg: vessel.svg + soup(art, rng, vessel.food) + breadSlice(rng, CX - R * 0.95, CY + R * 0.72, 1.1, -24), savory: false, oil: false };
    }
    case "pfanne":
      return v(skillet(rng), (reg) => stirFry(art, rng, reg));
    case "blech":
      return v(tray(), (reg) => trayVeg(art, rng, reg), true, true);
    case "wrap":
      return v(plate(), (reg) => wraps(art, rng, reg), false);
    case "brot":
      return v(art.variant === "ruehrei" ? plate() : board(false), (reg) => bread(art, rng, reg), art.variant === "ruehrei");
    case "pfannkuchen":
      return v(plate(), (reg) => pancakes(art, rng, reg), art.variant !== "stapel");
    case "kartoffeln":
      return v(plate(), (reg) => potatoPlate(art, rng, reg));
    case "fisch":
      return v(plate(), (reg) => fish(art, rng, reg));
    case "fleisch":
      return v(plate(), (reg) => meat(art, rng, reg));
    case "salat":
      return v(art.variant === "nudel" ? bowl(rng) : plate(), (reg) => salad(art, rng, reg), true, art.variant !== "nudel");
    case "pizza":
      return v(board(art.variant !== "flammkuchen"), (reg) => pizza(art, rng, reg), true, false);
    case "suess":
      return v(bowl(rng), (reg) => sweetBowl(art, rng, reg), false);
    case "auflauf":
      return v(bakingDish(rng), (reg) => bake(art, rng, reg), art.variant !== "crumble");
    case "kuchen":
      return v(plate(0.9), (reg) => cake(art, rng, reg), false);
    case "muffins":
      return v(plate(), (reg) => muffins(art, rng, reg), false);
    case "kekse":
      return v(plate(), (reg) => cookies(art, rng, reg), false);
    case "waffeln":
      return v(plate(), (reg) => waffles(art, rng, reg), false);
    case "schnecken":
      return v(plate(), (reg) => buns(art, rng, reg), false);
  }
}

/**
 * Das ganze Bild als SVG-Text (viewBox 900 × 600). `width`/`height` setzen
 * die Ausgabegröße (z. B. 1200 × 800 für gericht.webp), am Inhalt ändert
 * sich nichts.
 */
export function renderDishSvg(art: DishArt, opts: { width?: number; height?: number } = {}): string {
  const rng = rngFrom(art.seed);
  const body = dish(art, rng);
  const extra = (body.oil ? `<path d="M${CX - 70} ${CY + 60} C ${CX - 20} ${CY + 90}, ${CX + 50} ${CY + 80}, ${CX + 70} ${CY + 40}" stroke="#D9B23A" stroke-width="5" fill="none" opacity="0.45" stroke-linecap="round"/>` : "") + (body.savory ? pepper(rng, ellipse(CX, CY, R * 0.7), 40) : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width ?? W}" height="${opts.height ?? H}" viewBox="0 0 ${W} ${H}"><defs>${DEFS}${stage(art)}${body.svg}${extra}</svg>`;
}
