// Einkauf: Sorte per KI (A-067), rein – Anfrage prüfen, Aufgabe für Haiku,
// Antwort lesen. Nur für Sachen, die die feste Wortliste nicht kennt; jede
// Sache wird nur einmal eingeordnet (gespeichert in `sortenKi`). Geschickt
// werden nur die Namen der Sachen, nichts sonst.

import { SORTEN, isSorte, type SorteId } from "@/lib/einkauf/sorten/sorten";

/** Höchstens so viele Sachen je Anfrage */
const MAX_SACHEN = 30;

export type SortenAnfrage = { namen: string[] };

/** Anfrage prüfen: 1–30 kurze Namen; null = ungültig */
export function parseSortenAnfrage(body: unknown): SortenAnfrage | null {
  const namen = (body as { namen?: unknown })?.namen;
  if (!Array.isArray(namen) || !namen.length || namen.length > MAX_SACHEN) return null;
  const ok = namen.filter((n): n is string => typeof n === "string" && n.trim().length > 0 && n.length <= 60).map((n) => n.trim().toLowerCase());
  return ok.length === namen.length ? { namen: [...new Set(ok)] } : null;
}

/** Aufgabe für die KI (knapp, nur JSON zurück) */
export const SORTEN_SYSTEM = [
  "Du ordnest Sachen von einer deutschen Einkaufsliste in feste Sorten ein.",
  `Sorten: ${SORTEN.map((s) => `${s.id} (${s.label})`).join(", ")}.`,
  "Passt keine Sorte, nimm \"sonst\".",
  'Antworte NUR mit JSON: {"<sache>": "<sorte>", ...} – Schlüssel genau wie geschickt.',
].join("\n");

export const sortenNachricht = (a: SortenAnfrage) => JSON.stringify(a.namen);

/** Antwort der KI lesen: nur geschickte Namen und bekannte Sorten */
export function parseSortenAntwort(text: string, a: SortenAnfrage): Record<string, SorteId> {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let roh: unknown;
  try {
    roh = JSON.parse(json);
  } catch {
    return {};
  }
  if (!roh || typeof roh !== "object") return {};
  const out: Record<string, SorteId> = {};
  for (const [k, v] of Object.entries(roh as Record<string, unknown>)) {
    const name = k.trim().toLowerCase();
    if (a.namen.includes(name) && isSorte(v)) out[name] = v;
  }
  return out;
}
