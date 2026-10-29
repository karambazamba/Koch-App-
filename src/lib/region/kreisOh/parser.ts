// Kreis Ostholstein, Veranstaltungskalender: HTML → Rohdaten. Gebaut an echten
// Seiten (tests/fixtures/kreis-oh/, Stand 29.10.2026):
//
// - Liste: `<ul class="result-list veranstaltungen">`, je Eintrag ein `<li>`
//   mit Link (FID=3906.<id>.1), `<h3 class="list-title">`, `<time>` mit dem
//   Datum („29.10.2026“ oder „31.10.2026 bis 14.11.2026“) und daneben
//   „Uhrzeit: 08:00 bis 12:00 Uhr“ (fehlt bei ganztags). Einen Ort nennt die
//   Liste nicht – den liefert die Abfrage je Gemeinde (`ort=247.<n>`, siehe
//   abruf.ts) bzw. die Detailseite („Ort:“, „Ortschaft:“).
// - Blättern: `<span class="pn_active">` gefolgt von einem weiteren Link = es
//   gibt eine nächste Seite.
// - Gemeinden: `<select name="ort">` im Suchformular.
// - Die Seiten sind ISO-8859-15 kodiert (`dekodiere`).
//
// Text-Auswertung für Datum/Uhrzeit (../zeit.ts), Ort (../orte.ts) und
// Kategorie (../kategorien.ts) passiert in abruf.ts.

/** Ein Eintrag der Liste – nur Text, ausgewertet wird in abruf.ts */
export type ListenEintrag = {
  /** Aus FID=3906.<id>.1 */
  id: string;
  titel: string;
  /** z. B. „29.10.2026“ oder „31.10.2026 bis 14.11.2026“ */
  datumText: string;
  /** z. B. „08:00 bis 12:00 Uhr“; null = ganztags bzw. nur im Detail */
  zeitText: string | null;
  ortText: string | null;
  /** Art der Veranstaltung, falls die Seite sie nennt (für die Kategorie) */
  artText: string | null;
  /** Absoluter Link zur Detailseite */
  link: string;
};

export type ListenSeite = { eintraege: ListenEintrag[]; weiter: boolean };

export type DetailEintrag = Omit<ListenEintrag, "link">;

/** Eine Gemeinde aus dem Suchformular („247.1“ → „Eutin“) */
export type Gemeinde = { wert: string; name: string };

/** Ist der Parser an echten Seiten gebaut? Solange false: nichts abrufen (siehe abruf.ts) */
export const PARSER_BEREIT = true;

const KREIS_HOST = "https://www.kreis-oh.de";

const BENANNT: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  eacute: "é",
  egrave: "è",
  ndash: "–",
  mdash: "—",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  hellip: "…",
  euro: "€",
};

/** HTML-Entitäten auflösen (benannt und als Zahl) */
export function entitaeten(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ganz;
    }
    return BENANNT[e] ?? ganz;
  });
}

/** HTML-Stück → schlichter Text (ohne Tags, ohne versteckte Vorlese-Hilfen) */
const text = (html: string) =>
  entitaeten(html.replace(/<span class="sr-only">[^<]*<\/span>/g, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Seite als Bytes → Text in der Kodierung der Seite (Kopfzeile, sonst `<meta charset>`, sonst UTF-8) */
export function dekodiere(bytes: ArrayBuffer | Uint8Array, contentType: string | null): string {
  const roh = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const kopf = new TextDecoder("latin1").decode(roh.subarray(0, 4096));
  const label = contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? kopf.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(label).decode(roh);
  } catch {
    return new TextDecoder("utf-8").decode(roh);
  }
}

/** ID aus einem Link mit FID=3906.<id>.1 (auch URL-kodiert); null = keiner */
export function idAusLink(href: string): string | null {
  let s = href;
  try {
    s = decodeURIComponent(href);
  } catch {
    // kaputt kodiert: so lassen
  }
  const m = s.match(/FID=3906\.(\d{1,12})\.1(?!\d)/);
  return m ? m[1] : null;
}

/** Absoluter Link zur Detailseite, ohne die Such-Angaben (Gemeinde, Zeitraum, Blättern) */
const absolut = (href: string) => {
  try {
    const u = new URL(entitaeten(href), KREIS_HOST);
    const behalten = new URLSearchParams();
    for (const k of ["object", "ModID", "FID", "NavID"]) {
      const v = u.searchParams.get(k);
      if (v) behalten.set(k, v);
    }
    return `${u.origin}${u.pathname}?${decodeURIComponent(behalten.toString())}`;
  } catch {
    return null;
  }
};

/** Listen-Seite → Einträge + „gibt es eine nächste Seite?“ */
export function parseListe(html: string): ListenSeite {
  const start = html.search(/<ul class="result-list veranstaltungen"/);
  if (start < 0) return { eintraege: [], weiter: false };
  const ende = html.indexOf("</ul>", start);
  const liste = html.slice(start, ende < 0 ? undefined : ende);
  const eintraege: ListenEintrag[] = [];
  for (const li of liste.split(/<li[\s>]/).slice(1)) {
    const href = li.match(/<a[^>]+href="([^"]+)"/)?.[1];
    const id = href ? idAusLink(entitaeten(href)) : null;
    const link = href ? absolut(href) : null;
    const titel = text(li.match(/<h3 class="list-title">([\s\S]*?)<\/h3>/)?.[1] ?? "");
    const datumText = text(li.match(/<time[^>]*>([\s\S]*?)<\/time>/)?.[1] ?? "");
    const zeit = li.match(/title="Uhrzeit"[\s\S]*?<\/i>([\s\S]*?)<\/span>\s*<\/p>/)?.[1];
    if (!id || !link || !titel || !datumText) continue;
    eintraege.push({ id, titel, datumText, zeitText: zeit ? text(zeit) || null : null, ortText: null, artText: null, link });
  }
  // Nach der aktuellen Seite noch ein Link → es geht weiter
  const nav = html.match(/class="pn_active"[^>]*>[^<]*<\/span>\s*<\/li>\s*<li>\s*<a /);
  return { eintraege, weiter: Boolean(nav) };
}

/** Feld der Detailseite („Datum:“ → Text daneben) */
const feld = (html: string, name: string) => {
  const m = html.match(new RegExp(`<div class="column-3">${name}:</div>\\s*<div class="column-2x3">([\\s\\S]*?)</div>`));
  return m ? text(m[1]) || null : null;
};

/** Detailseite → Text-Stücke; null = keine Veranstaltung erkannt */
export function parseDetail(html: string): DetailEintrag | null {
  const titel = text(html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const datumText = feld(html, "Datum");
  const id = idAusLink(entitaeten(html.match(/FID=3906\.\d+\.1/)?.[0] ?? ""));
  if (!titel || !datumText || !id) return null;
  const ort = feld(html, "Ort");
  const ortschaft = feld(html, "Ortschaft");
  const ortText = [ort, ortschaft && !ort?.includes(ortschaft) ? ortschaft : null].filter(Boolean).join(", ") || null;
  return { id, titel, datumText, zeitText: feld(html, "Uhrzeit"), ortText, artText: null };
}

/** Gemeinden aus dem Suchformular (`<select name="ort">`) */
export function parseGemeinden(html: string): Gemeinde[] {
  const select = html.match(/<select name="ort"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? "";
  return [...select.matchAll(/<option value="(\d+\.\d+)">([^<]+)<\/option>/g)].map((m) => ({ wert: m[1], name: text(m[2]) }));
}
