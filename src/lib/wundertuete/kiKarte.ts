// Mias Nachschub (A-052), Server-Teil: Witze für die Wundertüte und Rätsel
// schreibt Mia per KI nach – sonst nichts (Plattdeutsch und Angeberwissen
// kommen nur geprüft aus Paketen). Kindertauglich, deutsch, je Karte
// höchstens zwei Sätze, einige Karten je Anfrage. Modell: das für den Alltag
// (Haiku, `begleitung/modellwahl.ts`). Jeder Text läuft durch `tidyMiaText()`
// und wird streng geprüft; was nicht passt, fällt weg. Im Testmodus
// (`KUECHENHELFER_MOCK=1`) feste Karten ohne KI. Rein (ohne Netz), die Route
// liegt unter `/api/nachschub`.

import type Anthropic from "@anthropic-ai/sdk";
import { tidyMiaText } from "@/lib/begleitung/tidy";

/** Nur diese beiden Arten schreibt die KI */
export type KiArt = "witz" | "raetsel";
const KI_ARTEN: readonly KiArt[] = ["witz", "raetsel"];

export type KiAnfrage = { art: KiArt; versuch: 1 | 2; nr: number };

export type KiAntwort = { vorne: string; hinten?: string };

/** So viele Karten bittet die App je Anfrage */
const JE_ANFRAGE = 5;

type CreateJson = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

/** Anfrage der App prüfen (Art witz/raetsel, Versuch 1–2, laufende Nummer) */
export function parseKiAnfrage(body: unknown): KiAnfrage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const art = KI_ARTEN.includes(b.art as KiArt) ? (b.art as KiArt) : null;
  const versuch = b.versuch === 1 || b.versuch === 2 ? b.versuch : null;
  const nr = typeof b.nr === "number" && Number.isInteger(b.nr) && b.nr >= 0 && b.nr < 100_000 ? b.nr : null;
  return art && versuch && nr !== null ? { art, versuch, nr } : null;
}

const SYSTEM = [
  "Du schreibst für eine deutsche Familien-App neue, kurze Karten für Kinder und Eltern.",
  "Kindertauglich, freundlich, trockener norddeutscher Humor, nie albern, nie gemein.",
  "Keine Fakten, keine Zahlen über die Welt, keine echten Personen, keine Marken.",
  "Keine Politik, Religion, Krankheit, Körper, Gewicht, Gewalt oder Angst.",
  "Kein Emoji, kein Gedankenstrich, typografischer Apostroph (’). Jede Karte anders, nichts Bekanntes wiederholen.",
].join(" ");

const AUFGABE: Record<KiArt, string> = {
  raetsel: `Schreib ${JE_ANFRAGE} neue, eindeutige Rätsel. vorne: die Rätselfrage (ein Satz, höchstens 70 Zeichen). hinten: die Lösung als ein kurzer Satz, das Lösungswort in **doppelten Sternchen**.`,
  witz: `Schreib ${JE_ANFRAGE} neue, kurze Witze. vorne: der Anfang (eine Frage oder ein Satz, höchstens 80 Zeichen). hinten: die Pointe (höchstens 70 Zeichen).`,
};

const SCHEMA = {
  type: "object",
  properties: { karten: { type: "array", items: { type: "object", properties: { vorne: { type: "string" }, hinten: { type: "string" } }, required: ["vorne", "hinten"], additionalProperties: false } } },
  required: ["karten"],
  additionalProperties: false,
};

const VERBOTEN = /(?<![a-zäöüß])(fehlt|offen|überfällig\w*|verpasst\w*|du musst|du solltest|vergiss nicht|diät|kalorie\w*|abnehmen|gewicht|dick|dünn|krank\w*|medikament\w*|gott|kirche|partei\w*|krieg\w*|tot|töten|sterben|waffe\w*|mia|lotte)(?![a-zäöüß])/i;

const saetze = (t: string) => t.replace(/\*\*/g, "").split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 1).length;

/**
 * Eine KI-Karte prüfen und aufräumen: Rätsel = Frage (≤ 70) + Lösung (≤ 90),
 * Witz = Anfang (≤ 80) + Pointe (≤ 70); zusammen höchstens zwei Sätze, kein
 * Emoji, keine heiklen Themen. So passt jede Karte ganz in Kachel und Fenster. Sonst null.
 */
export function pruefeKiKarte(art: KiArt, roh: { vorne?: unknown; hinten?: unknown }): KiAntwort | null {
  const vorne = typeof roh.vorne === "string" ? tidyMiaText(roh.vorne.replace(/\s+/g, " ")) : "";
  const hinten = typeof roh.hinten === "string" ? tidyMiaText(roh.hinten.replace(/\s+/g, " ")) : "";
  const alles = `${vorne} ${hinten}`;
  if (vorne.length < 8 || vorne.length > (art === "witz" ? 80 : 70)) return null;
  if (hinten.length < 2 || hinten.length > (art === "witz" ? 70 : 90)) return null;
  if (saetze(alles) > 2 || VERBOTEN.test(alles) || /\p{Extended_Pictographic}|[–—]|https?:/u.test(alles)) return null;
  return { vorne, hinten };
}

/** Mit Claude (strukturierte Ausgabe): die brauchbaren Karten, sonst [] */
export async function kiKarten(req: KiAnfrage, create: CreateJson, model: string): Promise<KiAntwort[]> {
  const message = await create({
    model,
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: "user", content: `${AUFGABE[req.art]}${req.versuch > 1 ? " Nimm diesmal etwas ganz anderes als das Naheliegende." : ""}` }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return [];
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    const roh = (JSON.parse(text) as { karten?: unknown }).karten;
    return (Array.isArray(roh) ? roh : []).slice(0, JE_ANFRAGE).flatMap((k) => pruefeKiKarte(req.art, (k ?? {}) as { vorne?: unknown; hinten?: unknown }) ?? []);
  } catch {
    return [];
  }
}

/** Testmodus: feste Karten ohne KI (je Anfrage drei, der Reihe nach; danach kommt nichts Neues mehr) */
export const MOCK_KARTEN: Record<KiArt, KiAntwort[]> = {
  raetsel: [
    { vorne: "Was fliegt ohne Flügel über das Wattenmeer?", hinten: "Der **Wind**." },
    { vorne: "Was hat Ärmel, aber keine Arme, und hält im Winter warm?", hinten: "Die **Jacke**." },
    { vorne: "Was gehört zum Hafen und fährt trotzdem nie zur See?", hinten: "Der **Poller**, an dem die Schiffe festmachen." },
    { vorne: "Welches Tier hat seine Wohnung immer dabei, wenn es taucht?", hinten: "Die **Schildkröte**." },
    { vorne: "Was wird morgens lang, mittags kurz und abends wieder lang?", hinten: "Dein **Schatten** auf dem Weg." },
    { vorne: "Was summt im Garten und macht süßen Brotaufstrich?", hinten: "Die **Biene**, sie macht Honig." },
  ],
  witz: [
    { vorne: "Treffen sich zwei Möwen am Hafen.", hinten: "Sagt die eine: „Heute ist mir alles Fischbrötchen.“" },
    { vorne: "Warum nimmt der Leuchtturm nie Urlaub?", hinten: "Er hat immer was zu leuchten." },
    { vorne: "Was sagt der Teebeutel zur Tasse?", hinten: "Ohne dich zieh ich mich nicht an." },
    { vorne: "Warum teilen Krabben so ungern?", hinten: "Sie sind kleine Schalentiere." },
    { vorne: "Was macht ein Deich bei Sturm?", hinten: "Er bleibt einfach liegen und lacht." },
    { vorne: "Warum sind Wattwürmer so entspannt?", hinten: "Sie lassen alles auf sich zukommen." },
  ],
};

export function mockKarten(req: KiAnfrage): KiAntwort[] {
  const list = MOCK_KARTEN[req.art];
  const start = (req.nr + (req.versuch - 1) * 3) % list.length;
  return [0, 1, 2].map((i) => list[(start + i) % list.length]);
}
