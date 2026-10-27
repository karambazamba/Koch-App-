// Leiste unten (Tafel 96, Stil B1): drei Bereiche Kalender · Heute · Essen,
// Mia rechts in der Leiste. Jede Seite gehört zu einem Bereich und lässt
// dessen Reiter leuchten. Reiter antippen: anderer Bereich = dessen
// Hauptseite; aktiver Reiter auf einer Unterseite = zurück zur Hauptseite
// (im Verlauf, dort bleibt die Scrollhöhe); aktiver Reiter auf der Hauptseite
// = weich nach oben. Rein bis auf die kleine Brücke zum Pager.

export type Bereich = "kalender" | "heute" | "essen";

export const BEREICHE: { value: Bereich; label: string }[] = [
  { value: "kalender", label: "Kalender" },
  { value: "heute", label: "Heute" },
  { value: "essen", label: "Essen" },
];

/** Unterseiten des Kalenders bzw. des Essens; alles andere gehört zu Heute */
const KALENDER = ["/tag", "/woche"];
const ESSEN = ["/kochbuch", "/wochenplan"];

const unter = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

/** Zu welchem Bereich gehört diese Adresse? */
export function bereichVon(url: string): Bereich {
  const [path, query = ""] = url.split("?");
  if (path === "/") {
    const seite = new URLSearchParams(query).get("seite");
    return seite === "kalender" || seite === "woche" ? "kalender" : seite === "essen" ? "essen" : "heute";
  }
  if (unter(path, KALENDER)) return "kalender";
  if (unter(path, ESSEN)) return "essen";
  return "heute";
}

/** Hauptseite = eine der drei Seiten auf „/“ */
export const istHauptseite = (url: string) => url.split("?")[0] === "/";

export const hauptseite = (b: Bereich) => (b === "heute" ? "/" : `/?seite=${b}`);

export type TabSchritt = { art: "oben" } | { art: "wechseln" } | { art: "zurueck"; schritte: number } | { art: "neu"; url: string };

/**
 * Was passiert beim Antippen eines Reiters? `schritteZurHauptseite`: wie weit
 * im Verlauf zurück die letzte Hauptseite liegt (`null` = gar nicht).
 */
export function tabSchritt(tab: Bereich, url: string, schritteZurHauptseite: number | null): TabSchritt {
  if (istHauptseite(url)) return bereichVon(url) === tab ? { art: "oben" } : { art: "wechseln" };
  if (schritteZurHauptseite) return { art: "zurueck", schritte: schritteZurHauptseite };
  return { art: "neu", url: hauptseite(tab) };
}

/** Wischen vom linken Rand auf Unterseiten = eine Ebene zurück (rein): Start ≤ 24 px vom Rand, ≥ 70 px nach rechts, kaum senkrecht */
export const RAND_PX = 24;
export const randZurueck = (startX: number, dx: number, dy: number) => startX <= RAND_PX && dx >= 70 && Math.abs(dy) < Math.max(50, dx * 0.6);

/** Rechtsseiten, Anmelden, Notiz-Editor, Kochmodus: ohne Leiste */
const OHNE = ["/anmelden", "/beitreten", "/notizen/bearbeiten", "/kochbuch/kochen", "/datenschutz", "/impressum", "/nutzungsbedingungen"];

/** Ohne Profil (erster Start, Zustimmung) und auf den Seiten oben gibt es keine Leiste */
export const leisteVersteckt = (pathname: string, hatProfil: boolean) => !hatProfil || OHNE.includes(pathname);

// --- Brücke zum Pager auf „/“ (Kalender · Heute · Essen) --------------------

/** `gemerkt`: kommt von einer Unterseite zurück – gleicher Reiter heißt dann „bleiben, wie es war“, nicht nach oben */
type PagerFn = (b: Bereich, gemerkt: boolean) => void;
let pager: PagerFn | null = null;
let wunsch: Bereich | null = null;

/** Der Pager meldet sich an (und bekommt einen gemerkten Wunsch sofort) */
export function pagerAnmelden(fn: PagerFn): () => void {
  pager = fn;
  if (wunsch) {
    const w = wunsch;
    wunsch = null;
    fn(w, true);
  }
  return () => {
    if (pager === fn) pager = null;
  };
}

/** Reiter gewählt: der Pager wechselt (bzw. scrollt nach oben); ohne Pager merken, bis er da ist */
export function bereichWaehlen(b: Bereich) {
  if (pager) pager(b, false);
  else wunsch = b;
}
