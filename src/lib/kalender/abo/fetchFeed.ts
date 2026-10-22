// Kalender-Link (Abo) auf dem Server abrufen – mit Schutz: nur https/webcal,
// nur Standard-Port, keine Zugangsdaten in der Adresse, keine privaten oder
// lokalen Adressen (auch nicht über DNS oder Weiterleitungen), höchstens 5 MB,
// höchstens 10 Sekunden. Der Link ist geheim und wird nie protokolliert.
// Abhängigkeiten (DNS, fetch) sind einsetzbar – so lässt es sich testen.

export class FeedError extends Error {}

export type FeedDeps = {
  lookup: (host: string) => Promise<string[]>;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  maxBytes?: number;
};

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** webcal:// → https://; nur https, Standard-Port, ohne Zugangsdaten; sonst null */
export function normalizeFeedUrl(raw: string): URL | null {
  const text = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  return url;
}

const v4 = (ip: string) => {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
};

/** Private, lokale, reservierte Adressen (IPv4 und IPv6, auch eingebettetes IPv4) @public für Tests */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.replace(/^\[|\]$/g, "").toLowerCase();
  const four = v4(addr);
  if (four) {
    const [a, b] = four;
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && four[2] === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (!addr.includes(":")) return true;
  const mapped = addr.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (addr === "::" || addr === "::1") return true;
  return /^(fc|fd|fe[89ab]|ff)/.test(addr);
}

/** Darf diese Adresse abgerufen werden? (Name prüfen, dann alle DNS-Antworten) */
async function checkHost(url: URL, deps: FeedDeps) {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(host)) throw new FeedError("Diese Adresse kann ich nicht abrufen.");
  if (v4(host) || host.includes(":")) {
    if (isPrivateAddress(host)) throw new FeedError("Diese Adresse kann ich nicht abrufen.");
    return;
  }
  let addresses: string[];
  try {
    addresses = await deps.lookup(host);
  } catch {
    throw new FeedError("Diese Adresse kenne ich nicht – ist der Link vollständig?");
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new FeedError("Diese Adresse kann ich nicht abrufen.");
}

/** Antwort lesen, höchstens `max` Bytes */
async function readLimited(res: Response, max: number): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > max) throw new FeedError("Der Kalender ist zu groß (mehr als 5 MB).");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new FeedError("Der Kalender ist zu groß (mehr als 5 MB).");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Kalender-Text holen; Fehler als freundlicher Satz (`FeedError`) */
export async function fetchFeed(raw: string, deps: FeedDeps): Promise<string> {
  let url = normalizeFeedUrl(raw);
  if (!url) throw new FeedError("Das ist kein Kalender-Link – er beginnt mit https:// oder webcal://.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? TIMEOUT_MS);
  try {
    for (let hop = 0; ; hop++) {
      await checkHost(url, deps);
      let res: Response;
      try {
        res = await deps.fetch(url.toString(), { redirect: "manual", signal: controller.signal, headers: { accept: "text/calendar, text/plain;q=0.8, */*;q=0.1" } });
      } catch {
        throw new FeedError(controller.signal.aborted ? "Der Kalender hat zu lange gebraucht – später nochmal?" : "Den Kalender konnte ich gerade nicht abrufen.");
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        if (hop >= MAX_REDIRECTS) throw new FeedError("Den Kalender konnte ich gerade nicht abrufen.");
        const next = normalizeFeedUrl(new URL(res.headers.get("location") as string, url).toString());
        if (!next) throw new FeedError("Diese Adresse kann ich nicht abrufen.");
        url = next;
        continue;
      }
      if (res.status === 404 || res.status === 403 || res.status === 401) throw new FeedError("Den Kalender gibt es unter diesem Link nicht (mehr) – ist er noch geteilt?");
      if (!res.ok) throw new FeedError("Den Kalender konnte ich gerade nicht abrufen.");
      const text = await readLimited(res, deps.maxBytes ?? MAX_BYTES).catch((e: unknown) => {
        if (e instanceof FeedError) throw e;
        throw new FeedError(controller.signal.aborted ? "Der Kalender hat zu lange gebraucht – später nochmal?" : "Den Kalender konnte ich gerade nicht abrufen.");
      });
      if (!/BEGIN:VCALENDAR/i.test(text)) throw new FeedError("Unter dem Link liegt kein Kalender.");
      return text;
    }
  } finally {
    clearTimeout(timer);
  }
}
