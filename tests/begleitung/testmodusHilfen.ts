// Hilfen für die Testmodus-Tests (Schein-Modell KUECHENHELFER_MOCK=1)
import type Anthropic from "@anthropic-ai/sdk";
import { createMockModel } from "@/lib/begleitung/mock";
import { BAUSTEINE } from "@/lib/core/features";

type Msg = Anthropic.Beta.BetaMessageParam;
export type Use = { name: string; input: Record<string, unknown>; id: string };

/** Kontext wie aus prompt.ts – Do 22.10.2026, Familie mit Jonne */
export function context(extra: string[] = [], opts: { on?: string[]; vorrat?: string; kochbuch?: string; pinnwand?: string; schnellnotiz?: string } = {}): string {
  const on = opts.on ?? ["wochenplan", "tipps"];
  return [
    "Du heißt Mia und bist die persönliche Assistentin der Familie Meier in der App.",
    "Heute: Donnerstag, 22. Oktober 2026 (2026-10-22), jetzt 10:00 Uhr (Zeitzone Europe/Berlin)",
    "Haushalt: Meier, 4 Personen, Typ: Familie",
    "- Felix; erwachsen",
    "- Jonne; Kind, 6 J.",
    "Neue Gerichte pro Woche: 1",
    `Schnellnotiz (Schmierzettel): ${opts.schnellnotiz ? JSON.stringify(opts.schnellnotiz) : "leer"}`,
    `Pinnwand: ${opts.pinnwand ?? "leer"}`,
    `Bausteine an: x. Aus: ${BAUSTEINE.filter((b) => !on.includes(b.feature)).map((b) => `${b.name} (${b.feature}: ${b.text})`).join("; ") || "keine"}`,
    'Mail-Stil: Gruß "Viele Grüße", Name "Felix"',
    "Planungswoche, wenn nichts gesagt wird: aktuell",
    `Kochbuch: ${opts.kochbuch ?? "3 Rezepte – Spaghetti Bolognese (👍2), Kartoffelsuppe, Linsencurry"}`,
    ...(opts.vorrat === "" ? [] : [`Vorrat (aktuell): ${opts.vorrat ?? "Hack 500 g (Kühlschrank), Paprika (Kühlschrank)"}`]),
    "- Do 2026-10-22: 09:00 Zahnarzt [id=t1; termin, familie] | Steuer machen [id=a1; aufgabe, familie]",
    "- Fr 2026-10-23: 08:00 Kita-Fest [id=t2; termin, familie, wiederkehrend]",
    ...extra,
  ].join("\n");
}

const model = createMockModel();

/** Eine Runde des Schein-Modells: Text und Werkzeug-Aufrufe */
export async function run(system: string, messages: Msg[]) {
  const m = await model({ model: "mock", max_tokens: 100, system: [{ type: "text", text: system }], messages } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  const text = m.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Beta.BetaTextBlock).text).join("");
  const uses = m.content.filter((b) => b.type === "tool_use").map((b) => b as Anthropic.Beta.BetaToolUseBlock).map((b) => ({ name: b.name, input: b.input as Record<string, unknown>, id: b.id }));
  return { text, uses, stop: m.stop_reason };
}

/** Neue Frage (mit bisherigem Verlauf als Text) */
export const ask = (system: string, latest: string, history: [role: "user" | "assistant", text: string][] = []) =>
  run(system, [...history.map(([role, content]) => ({ role, content })), { role: "user", content: latest }]);

/** Zweite Runde: das Modell hat Werkzeuge aufgerufen, das sind die Ergebnisse (nach Name) */
export function afterTools(system: string, question: string, uses: { name: string; input?: Record<string, unknown>; id?: string }[], results: Record<string, string>, errors: string[] = []) {
  const withIds = uses.map((u, i) => ({ ...u, id: u.id ?? `t${i}`, input: u.input ?? {} }));
  return run(system, [
    { role: "user", content: question },
    { role: "assistant", content: withIds.map((u) => ({ type: "tool_use" as const, id: u.id, name: u.name, input: u.input })) },
    {
      role: "user",
      content: withIds.map((u) => ({ type: "tool_result" as const, tool_use_id: u.id, content: results[u.name] ?? "", ...(errors.includes(u.name) ? { is_error: true } : {}) })),
    },
  ]);
}
