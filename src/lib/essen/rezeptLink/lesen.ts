// Rezept-Links an Mia (Einkauf Teil B): aus einer Rezept-Seite nur das
// Nötigste lesen – Titel, Bild-Adresse (nur verlinkt), Portionen, Zutaten,
// Quelle. Erst schema.org/Recipe als JSON-LD (auch in @graph und Listen),
// sonst Microdata (itemprop). Kein Rezepttext wird übernommen. Rein.

export type LinkRezept = {
  title: string;
  /** Bild der Seite (nur verlinkt, nie gespeichert) */
  image: string | null;
  /** Portionen laut Seite (null = unbekannt) */
  servings: number | null;
  /** Zutaten-Zeilen wie auf der Seite */
  ingredients: string[];
  url: string;
  /** „chefkoch.de“ */
  source: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "’")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
const clean = (s: string) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const isRecipeType = (t: unknown) => (Array.isArray(t) ? t.some(isRecipeType) : typeof t === "string" && /(^|\/)Recipe$/i.test(t));

/** Alle Recipe-Objekte in einem JSON-LD-Wert finden (auch verschachtelt) */
function recipesIn(v: unknown, out: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 6) return out;
  if (Array.isArray(v)) v.forEach((x) => recipesIn(x, out, depth + 1));
  else if (isObj(v)) {
    if (isRecipeType(v["@type"])) out.push(v);
    else for (const k of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) if (k in v) recipesIn(v[k], out, depth + 1);
  }
  return out;
}

const firstString = (v: unknown): string | null => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = firstString(x);
      if (s) return s;
    }
    return null;
  }
  if (isObj(v)) return firstString(v.url ?? v.contentUrl ?? v["@id"]);
  return null;
};

/** „4 Portionen“, 4, ["4", "4 servings"] → 4 */
export function servingsOf(v: unknown): number | null {
  const s = Array.isArray(v) ? v.map(String).join(" ") : v === undefined || v === null ? "" : String(v);
  const m = s.match(/\d+/);
  const n = m ? Number(m[0]) : NaN;
  return n > 0 && n <= 100 ? n : null;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const absolute = (src: string | null, base: string) => {
  if (!src) return null;
  try {
    const u = new URL(decode(src), base);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
};

/** Rezept aus dem HTML einer Seite lesen; null = nichts gefunden */
export function readRecipePage(html: string, url: string): LinkRezept | null {
  // 1) JSON-LD
  for (const m of html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const r of recipesIn(data)) {
      const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : [])
        .filter((x): x is string => typeof x === "string")
        .map(clean)
        .filter(Boolean)
        .slice(0, 60);
      const title = typeof r.name === "string" ? clean(r.name) : "";
      if (!title || !ingredients.length) continue;
      return { title: title.slice(0, 120), image: absolute(firstString(r.image), url), servings: servingsOf(r.recipeYield), ingredients, url, source: hostOf(url) };
    }
  }
  // 2) Microdata
  const items = [...html.matchAll(/itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\//gi)].map((m) => clean(m[1])).filter(Boolean);
  const metaItems = [...html.matchAll(/itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*content=["']([^"']+)["']/gi)].map((m) => clean(m[1]));
  const ingredients = [...items, ...metaItems].slice(0, 60);
  if (!ingredients.length) return null;
  const name = html.match(/itemprop=["']name["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? html.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title = clean(name);
  if (!title) return null;
  const yieldText = html.match(/itemprop=["']recipeYield["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? html.match(/itemprop=["']recipeYield["'][^>]*>([\s\S]*?)<\//i)?.[1];
  const image = html.match(/itemprop=["']image["'][^>]*(?:src|content)=["']([^"']+)["']/i)?.[1] ?? html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  return { title: title.slice(0, 120), image: absolute(image, url), servings: servingsOf(yieldText ? clean(yieldText) : null), ingredients, url, source: hostOf(url) };
}

// --- Zutaten-Zeilen ---------------------------------------------------------

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };
const UNITS = ["kg", "g", "mg", "l", "ml", "cl", "dl", "EL", "TL", "Prise", "Prisen", "Pck.", "Pck", "Päckchen", "Packung", "Dose", "Dosen", "Becher", "Bund", "Zehe", "Zehen", "Stück", "Stk.", "Scheibe", "Scheiben", "Glas", "Tasse", "Tassen", "Msp.", "Handvoll", "Zweig", "Zweige", "Würfel", "Liter", "Gramm", "Esslöffel", "Teelöffel"];
const UNIT_RE = new RegExp(`^(${UNITS.map((u) => u.replace(".", "\\.")).join("|")})(?![a-zäöüß])\\.?\\s*`, "i");
const UNIT_NORM: Record<string, string> = { esslöffel: "EL", teelöffel: "TL", gramm: "g", liter: "l", "stk.": "Stück", stk: "Stück", pck: "Pck.", "pck.": "Pck.", päckchen: "Pck.", prisen: "Prise", zehen: "Zehe", scheiben: "Scheibe", tassen: "Tasse", dosen: "Dose", zweige: "Zweig" };

export type LinkZutat = { amount: number | null; unit: string; name: string };

/** „200 g Mehl“, „1 ½ EL Öl“, „2-3 Zwiebeln“, „Salz und Pfeffer“ → Menge, Einheit, Name */
export function parseZutat(line: string): LinkZutat {
  let s = line.replace(/\s+/g, " ").trim();
  let amount: number | null = null;
  const frac = s.match(/^(\d+)\/(\d+)\s*/);
  const num = frac ? null : s.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔⅛])?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*/);
  if (num && (num[1] || num[2])) {
    amount = (num[1] ? Number(num[1].replace(",", ".")) : 0) + (num[2] ? FRACTIONS[num[2]] : 0);
    s = s.slice(num[0].length);
  } else if (frac && Number(frac[2])) {
    amount = Number(frac[1]) / Number(frac[2]);
    s = s.slice(frac[0].length);
  }
  let unit = "";
  const u = s.match(UNIT_RE);
  if (u) {
    unit = UNIT_NORM[u[1].toLowerCase()] ?? u[1];
    s = s.slice(u[0].length);
  }
  // Zusätze weg: „(ca. 500 g)“, „, gewürfelt“
  const name = s.replace(/\([^)]*\)/g, "").split(",")[0].replace(/^(etwas|n\.\s?B\.|nach Belieben)\s+/i, "").trim();
  return { amount: amount && amount > 0 ? amount : null, unit, name: name || line.trim() };
}

/** Menge für die eigene Haushaltsgröße (sinnvoll gerundet) */
export function umrechnen(z: LinkZutat, servings: number | null, persons: number): LinkZutat {
  if (z.amount === null || !servings || !persons || servings === persons) return z;
  const v = (z.amount * persons) / servings;
  const amount = v >= 100 ? Math.round(v / 10) * 10 : v >= 10 ? Math.round(v) : Math.round(v * 2) / 2 || 0.5;
  return { ...z, amount };
}

/** „200 g“, „1,5 EL“, „2“ */
export const mengeText = (z: LinkZutat) => [z.amount === null ? "" : String(z.amount).replace(".", ","), z.unit].filter(Boolean).join(" ");

/** Eine Nachricht, die (fast) nur ein Web-Link ist – kein Kalender-Link */
export function rezeptLinkIn(text: string): string | null {
  const t = text.trim();
  const m = t.match(/https:\/\/[^\s"'<>]+/i);
  if (!m) return null;
  const rest = t.replace(m[0], "").replace(/[^a-zäöüß]/gi, "");
  if (rest.length > 40) return null;
  const url = m[0].replace(/[).,;!?]+$/, "");
  if (/\.ics(\?|$)|\/ical\/|webcal/i.test(url)) return null;
  return url;
}

/** Teilen-Menü (Web Share Target, `/?geteilt=1&title=…&text=…&url=…`): was an Mia geht – null = nichts geteilt */
export function geteiltAnMia(search: string): string | null {
  const p = new URLSearchParams(search);
  if (!p.has("geteilt")) return null;
  const url = (p.get("url") ?? "").trim();
  const text = (p.get("text") ?? "").trim();
  const link = url || text.match(/https:\/\/\S+/)?.[0] || "";
  return (link || text || (p.get("title") ?? "").trim()).slice(0, 2000) || null;
}
