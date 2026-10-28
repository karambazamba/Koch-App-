// Essen-Kachel (Auftrag „Essen-Kachel – immer Bild, gezeigtes Gericht immer
// wählbar“), rein: Was zeigt die Kachel? Jedes gezeigte Gericht (heute
// geplant, morgen geplant, Vorschlag) ist eine Bild-Kachel; „Ideen ansehen“
// gibt es nur, wenn gar kein Gericht gezeigt wird. Ein Vorschlag lässt sich
// nehmen – tagsüber für heute, nach dem Essen für morgen.

import type { RecipeCategory } from "@/lib/essen/cookbook";

export type FoodView =
  /** Geplantes Gericht: „Essen · 18:30“ bzw. „Morgen · Mo“, kein Zusatz */
  | { kind: "geplant"; title: string; when: "heute" | "morgen" }
  /** Nur Vorschlag (⇄ bzw. Idee): leise „Vorschlag“ unter dem Namen */
  | { kind: "vorschlag"; title: string; takeFor: "heute" | "morgen" }
  /** Kein Gericht: „Noch frei“ (bzw. „Kein Kochtag“), „Ideen ansehen“ nur mit Ideen */
  | { kind: "frei"; title: string; ideen: boolean };

export function foodTileView(o: {
  /** Nach dem Abendessen: die Kachel zeigt morgen */
  over: boolean;
  /** Heute geplantes Gericht */
  today: string | null;
  /** Morgen geplantes Gericht */
  tomorrow: string | null;
  /** Mit ⇄ gewählte Idee */
  idea: string | null;
  /** Kein Kochtag / Pause (Text statt Gericht) */
  away: string | null;
  /** Wie viele Ideen es gibt */
  ideas: number;
}): FoodView {
  if (o.idea) return { kind: "vorschlag", title: o.idea, takeFor: o.over ? "morgen" : "heute" };
  const planned = o.over ? o.tomorrow : o.today;
  if (planned) return { kind: "geplant", title: planned, when: o.over ? "morgen" : "heute" };
  return { kind: "frei", title: o.away ?? "Noch frei", ideen: o.ideas > 0 };
}

/** Knopf im Gericht-Fenster */
export const takeLabel = (takeFor: "heute" | "morgen") => (takeFor === "morgen" ? "Für morgen nehmen" : "Für heute nehmen");

/**
 * ⇄ „Andere Idee“: die nächste Idee, die nicht das gerade Gezeigte ist – nie
 * zweimal dieselbe hintereinander. `null` = keine andere da.
 */
export function naechsteIdee(titles: string[], alt: number | null, shown: string | null): number | null {
  const now = shown?.trim().toLowerCase() ?? "";
  for (let step = 1; step <= titles.length; step++) {
    const i = ((alt ?? -1) + step) % titles.length;
    if (titles[i].trim().toLowerCase() !== now) return i;
  }
  return null;
}

/** Kocht gerade (Essen-Kachel mit „Weiter kochen“): dasselbe Bild wie das geplante Gericht */
type KochView = { kind: "kocht"; title: string };

/**
 * Bild der Essen-Kachel – für JEDEN Zustand eins (Auftrag „Sofort-Kachel“):
 * gezeigtes Gericht = Bild des Gerichts (mit Zutaten/Art, wenn bekannt),
 * „Noch frei“ und „Kein Kochtag“ = gezeichneter leerer Teller. Nie ohne Bild.
 */
export type KachelBild = { title: string; ingredients?: string[]; category?: RecipeCategory | null; leer?: true };

export function kachelBild(view: FoodView | KochView, dish?: { ingredients?: string[]; category?: RecipeCategory | null }): KachelBild {
  if (view.kind === "frei") return { title: view.title, leer: true };
  return { title: view.title, ingredients: dish?.ingredients, category: dish?.category ?? null };
}

/** Kocht gerade (Tafel 122): Kochmodus-Stand → „Schritt 3 von 6“ (0 = Zutaten zählt als Schritt 1) */
export function kochSchrittText(at: number, total: number): string | null {
  if (total < 1) return null;
  return `Schritt ${Math.min(total, Math.max(1, at))} von ${total}`;
}

/** Was auf die Liste müsste – höchstens zwei Namen, dann „…“ */
const listenText = (needs: string[]) => `${needs.slice(0, 2).join(", ")}${needs.length > 2 ? " …" : ""}`;

/**
 * Unterzeile der Essen-Kachel (Tafel 122): „90 Min · auf die Liste: Karotte“,
 * sonst „90 Min · alles im Haus“, ohne Vorrat-Daten (`needs` null) nur
 * „90 Min“. Beim Kochen „Schritt 3 von 6“. Nie „fehlt“.
 */
export function essenUnterzeile(o: { minutes: number | null; needs: string[] | null; schritt?: string | null }): string {
  if (o.schritt) return o.schritt;
  const vorrat = o.needs === null ? "" : o.needs.length ? `auf die Liste: ${listenText(o.needs)}` : "alles im Haus";
  return [o.minutes ? `${o.minutes} Min` : "", vorrat].filter(Boolean).join(" · ");
}

/** Rezeptseite im Bild (Tafel 122): „90 Min · alles im Haus bis auf Karotte“ */
export function rezeptVorratZeile(minutes: number | null, needs: string[] | null): string {
  const vorrat = needs === null ? "" : needs.length ? `alles im Haus bis auf ${listenText(needs)}` : "alles im Haus";
  return [minutes ? `${minutes} Min` : "", vorrat].filter(Boolean).join(" · ");
}

/** Linker Knopf: Rezept · Vorschlag (nichts geplant) · Weiter kochen (Kochmodus läuft) · keiner (Kein Kochtag) */
export type LinkerKnopf = "rezept" | "vorschlag" | "weiter" | null;

export function essenKnoepfe(view: FoodView, o: { kocht: boolean; half: boolean }): { links: LinkerKnopf; rechts: "Wochenplan" | "Woche" } {
  const rechts = o.half ? "Woche" : "Wochenplan";
  if (view.kind === "geplant") return { links: o.kocht && view.when === "heute" ? "weiter" : "rezept", rechts };
  if (view.kind === "vorschlag") return { links: "vorschlag", rechts };
  return { links: view.ideen ? "vorschlag" : null, rechts };
}

// --- Name groß, nie mitten im Wort abgeschnitten -----------------------------------------

/** Schriftgrößen des Namens: S 20 px, M 24 px – nur wenn er sonst nicht in 2 Zeilen passt, etwas kleiner */
const TITEL_PX = { S: [20, 18, 17, 16, 15], M: [24, 22, 20, 18] } as const;
/** Textbreite der Kachel auf dem kleinsten Gerät (iPhone SE: 343 px Inhalt, Abstand 8, Rand 12) */
export const TITEL_BREITE = { S: 143, M: 319 } as const;

/**
 * Breite der Zeichen in em (Plus Jakarta Sans 800, im Browser gemessen),
 * abzüglich `tracking-tight` (−0,025 em). Unbekanntes zählt breit (0,7 em).
 */
const ZEICHEN_EM: Record<string, number> = {"a":0.58,"b":0.67,"c":0.61,"d":0.67,"e":0.61,"f":0.41,"g":0.65,"h":0.6,"i":0.26,"j":0.26,"k":0.59,"l":0.26,"m":0.93,"n":0.6,"o":0.65,"p":0.67,"q":0.67,"r":0.39,"s":0.51,"t":0.42,"u":0.6,"v":0.58,"w":0.91,"x":0.58,"y":0.6,"z":0.49,"ä":0.58,"ö":0.65,"ü":0.6,"ß":0.65,"A":0.73,"B":0.69,"C":0.77,"D":0.74,"E":0.59,"F":0.59,"G":0.8,"H":0.73,"I":0.29,"J":0.4,"K":0.69,"L":0.55,"M":0.91,"N":0.74,"O":0.88,"P":0.65,"Q":0.88,"R":0.67,"S":0.65,"T":0.55,"U":0.72,"V":0.71,"W":1.03,"X":0.68,"Y":0.67,"Z":0.57,"Ä":0.73,"Ö":0.88,"Ü":0.72,"é":0.61,"è":0.61,"à":0.58,"ç":0.61,"ñ":0.6," ":0.18,"-":0.63,"–":0.68,",":0.39,".":0.41,"'":0.33,"’":0.39,":":0.41,"&":0.81};
const zeichenEm = (c: string) => (ZEICHEN_EM[c] ?? 0.7) - 0.025;
const breite = (text: string, px: number) => [...text].reduce((sum, c) => sum + zeichenEm(c) * px, 0);
/** Zeilen bei Umbruch an Leerzeichen und Bindestrichen; null = ein Wortteil passt nicht in die Zeile */
export function titelZeilen(title: string, px: number, width: number): number | null {
  const teile = title.trim().split(/\s+/).flatMap((w) => w.split(/(?<=-)/));
  let lines = 1;
  let line = "";
  for (const t of teile) {
    if (breite(t, px) > width) return null;
    const next = line ? (line.endsWith("-") ? line + t : `${line} ${t}`) : t;
    if (breite(next, px) <= width) line = next;
    else {
      lines++;
      line = t;
    }
  }
  return lines;
}

/**
 * Schriftgröße des Namens: S = größte, bei der er in höchstens 2 Zeilen passt;
 * M (gleich hoch wie S, aber doppelt breit) = möglichst einzeilig groß, sonst
 * zweizeilig etwas kleiner. Nie ein Wort teilen; passt gar nichts, die kleinste.
 */
export function titelPx(title: string, size: "S" | "M", width: number = TITEL_BREITE[size]): number {
  const list = TITEL_PX[size];
  const passt = (px: number, max: number) => {
    const n = titelZeilen(title, px, width);
    return n !== null && n <= max;
  };
  if (size === "M") return list.find((px) => passt(px, 1)) ?? list.slice(2).find((px) => passt(px, 2)) ?? list[list.length - 1];
  return list.find((px) => passt(px, 2)) ?? list[list.length - 1];
}

/**
 * Name für die Kachel: Schriftgröße und Text. Passt ein sehr langer Name
 * selbst klein nicht in 2 Zeilen, wird er an einer Wortgrenze gekürzt
 * („Rahmspinat mit Spiegelei …“) – nie mitten im Wort. Der volle Name steht
 * im VoiceOver-Text und auf der Rezeptseite.
 */
export function titelAnzeige(title: string, size: "S" | "M", width: number = TITEL_BREITE[size]): { px: number; text: string } {
  const px = titelPx(title, size, width);
  const passt = (t: string) => {
    const n = titelZeilen(t, px, width);
    return n !== null && n <= 2;
  };
  if (passt(title)) return { px, text: title };
  const words = title.trim().split(/\s+/);
  for (let n = words.length - 1; n >= 1; n--) {
    const t = `${words.slice(0, n).join(" ").replace(/[,–-]$/, "")} …`;
    if (passt(t)) return { px, text: t };
  }
  return { px, text: words[0] };
}

// --- Verlauf über dem Bild (Kontrast weißer Schrift mind. 4,5:1) ---------------------------

/** Dunkler Verlauf von oben (leicht) nach unten (dunkel): [Position 0–1, Deckkraft] auf warmem Fast-Schwarz */
export const KACHEL_VERLAUF: readonly [number, number][] = [
  [0, 0.28],
  [0.22, 0.6],
  [0.6, 0.66],
  [1, 0.85],
];
const DUNKEL = [20, 12, 6] as const;

/** CSS des Tokens `--app-dish-tile-shade` (globals.css muss genau so lauten – Test) */
export const kachelVerlaufCss = () => `linear-gradient(180deg, ${KACHEL_VERLAUF.map(([p, a]) => `rgb(${DUNKEL.join(" ")} / ${a}) ${Math.round(p * 100)}%`).join(", ")})`;

/** Deckkraft des Verlaufs an einer Stelle (0 = oben, 1 = unten) */
export function verlaufAlpha(pos: number): number {
  const stops = KACHEL_VERLAUF;
  for (let i = 1; i < stops.length; i++) {
    const [p0, a0] = stops[i - 1];
    const [p1, a1] = stops[i];
    if (pos <= p1) return a0 + ((a1 - a0) * (pos - p0)) / (p1 - p0);
  }
  return stops[stops.length - 1][1];
}

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Kontrast weißer Schrift auf einem (schlimmstenfalls weißen) Bild unter dem Verlauf */
export function kontrastWeiss(alpha: number, bild: readonly [number, number, number] = [255, 255, 255]): number {
  const mix = bild.map((c, i) => c * (1 - alpha) + DUNKEL[i] * alpha);
  const l = 0.2126 * linear(mix[0]) + 0.7152 * linear(mix[1]) + 0.0722 * linear(mix[2]);
  return 1.05 / (l + 0.05);
}
