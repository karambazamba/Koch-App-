// Mias Wundertüte im Gespräch (A-022, Bereich "alltag"): „Erzähl mir was
// Unnützes“, „Angeberwissen“, „Gib uns eine Tischfrage“, „Rätsel!“ → Mia
// liest eine passende Karte aus dem geprüften Pool vor (Frage, kurze Pause,
// Antwort; bei Rätsel und Schätzfrage erst auf „Lösung“). Nur Lesen, nichts
// wird geändert; Fakten kommen NUR aus dem Pool (nie erfinden).

import type { BegleitungTool } from "@/lib/begleitung/registry";
import type { ToolContext } from "@/lib/begleitung/tools";
import { erlaubteSorten, passt, type Lage } from "@/lib/wundertuete/auswahl";
import { POOL, eintraegeDer } from "@/lib/wundertuete/pool";
import { ohneFett, SORTE_IDS, sorteMeta, type Eintrag, type Sorte } from "@/lib/wundertuete/sorten";

const SORTEN = [...SORTE_IDS, "egal"] as const;

const norm = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();

/** Lage für den Pool (Mia kennt Tag und Uhrzeit; Wetter/Gericht spielen hier keine Rolle) */
const lageVon = (ctx: ToolContext): Lage => ({ heute: ctx.today, minuten: 12 * 60, haushalt: "familie" });

/** Eine Karte der Sorte (Heute vor 100 Jahren nur am belegten Tag, Anlass-Karten nur, wenn sie passen) */
function karte(ctx: ToolContext, sorte: Sorte | "egal", rng: () => number): Eintrag | null {
  const lage = lageVon(ctx);
  const s: Sorte = sorte === "egal" ? (erlaubteSorten(lage).includes("heute100") ? "heute100" : "angeberwissen") : sorte;
  const list = eintraegeDer(s).filter((x) => passt(x, lage));
  return list.length ? list[Math.floor(rng() * list.length) % list.length] : null;
}

/** Lösung zu einer schon vorgelesenen Frage (aus dem Gesprächsverlauf) */
function loesung(frage: string): Eintrag | null {
  const f = norm(frage);
  if (f.length < 8) return null;
  return POOL.find((x) => x.hinten && (norm(x.vorne).includes(f) || f.includes(norm(x.vorne)))) ?? null;
}

export const WUNDERTUETE_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "wundertuete_karte",
      description:
        "Holt eine Karte aus Mias Wundertüte: geprüftes unnützes Wissen (angeberwissen), Plattdeutsch (platt), Rätsel (raetsel), Gesprächsfragen für den Esstisch (tischrunde), Schätzfragen (schaetzmal), Mini-Spiele (werzuerst), heute vor 100 Jahren (heute100). Für 'Erzähl mir was Unnützes', 'Angeberwissen', 'Gib uns eine Tischfrage', 'Rätsel!', 'Was heißt was auf Platt?', 'Ein Spiel für den Tisch'. Lies GENAU diesen Text vor, nichts dazuerfinden. Wissen und Platt: Frage, dann als eigener Satz die Antwort. Rätsel und Schätzfragen: nur die Frage und antwort_knoepfe ['Lösung']; sagt jemand 'Lösung', rufe das Werkzeug mit frage = deiner Frage von eben. Tischrunde und Wer zuerst: nur die Frage bzw. das Spiel.",
      input_schema: {
        type: "object",
        properties: {
          sorte: { type: "string", enum: [...SORTEN], description: "Welche Sorte; egal = Angeberwissen (bzw. heute vor 100 Jahren, wenn es heute etwas gibt)" },
          frage: { type: "string", description: "Nur für die Lösung: die Frage, die du eben vorgelesen hast" },
        },
        required: ["sorte"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as { sorte?: string; frage?: string };
      if (typeof input.frage === "string" && input.frage.trim()) {
        const x = loesung(input.frage);
        if (!x) return { content: "Zu dieser Frage hab ich keine Lösung im Pool. Sag kurz ehrlich, dass du sie grad nicht weißt, nichts erfinden." };
        return { content: `Lösung (nur das sagen, kurz): ${ohneFett(x.hinten ?? "")}` };
      }
      const sorte = (SORTEN as readonly string[]).includes(input.sorte ?? "") ? (input.sorte as Sorte | "egal") : "egal";
      const x = karte(ctx, sorte, Math.random);
      if (!x) return { content: "Für heute gibt es dazu keine Karte. Biete kurz eine andere Sorte an (z. B. Angeberwissen)." };
      const meta = sorteMeta(x.sorte);
      const vorne = x.sorte === "werzuerst" ? `Wer zuerst ${x.vorne.replace(/^…\s*/, "")}` : x.vorne;
      if (!x.hinten) return { content: `${meta.name}: ${vorne}\nNur das vorlesen, ohne eigene Antwort.` };
      if (x.sorte === "raetsel" || x.sorte === "schaetzmal") return { content: `${meta.name}: ${vorne}\n(Lösung kommt erst auf „Lösung“: ${ohneFett(x.hinten)})\nJetzt nur die Frage sagen und antwort_knoepfe ['Lösung'].` };
      return { content: `${meta.name}: ${vorne}\nAntwort: ${ohneFett(x.hinten)}\nFrage, dann die Antwort als eigener Satz. Nichts dazuerfinden.` };
    },
  },
];
