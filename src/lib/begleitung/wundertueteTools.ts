// Mias Wundertüte im Gespräch (A-022/A-052, Bereich "alltag"):
// „Erzähl mir was Unnützes“, „Angeberwissen“, „Erzähl einen Witz“,
// „Was heißt … auf Platt?“ → Mia liest eine Karte aus den geprüften Paketen
// vor (Frage, kurze Pause, Antwort). Rätsel öffnen seit A-064 die Wundertüte
// mit der Sorte Rätsel (app_befehl „Rätsel“, `wundertuete/oeffnen.ts`). Nur
// Lesen, nichts wird geändert; Fakten kommen NUR aus dem Pool (nie erfinden).
// Die Kachel-Karte und „gesehen“ bleiben davon unberührt.

import type { BegleitungTool } from "@/lib/begleitung/registry";
import type { ToolContext } from "@/lib/begleitung/tools";
import { passt } from "@/lib/wundertuete/auswahl";
import { POOL, eintraegeDer } from "@/lib/wundertuete/pool";
import { ohneFett, SORTE_IDS, sorteMeta, type Sorte } from "@/lib/wundertuete/sorten";
import type { Karte } from "@/lib/wundertuete/vorrat";

/** Sorten zum Vorlesen (Rätsel öffnen die Wundertüte, A-064) */
const SORTEN = [...SORTE_IDS.filter((s) => s !== "raetsel"), "egal"];
type Wahl = Exclude<Sorte, "raetsel"> | "egal";

const norm = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();

/** Eine Karte der Sorte (Anlass-Karten nur, wenn sie passen; Wetter/Gericht spielen hier keine Rolle) */
function karte(ctx: ToolContext, sorte: Wahl, rng: () => number): Karte | null {
  const list = eintraegeDer(sorte === "egal" ? "angeberwissen" : sorte).filter((x) => passt(x, { heute: ctx.today }));
  return list.length ? list[Math.floor(rng() * list.length) % list.length] : null;
}

/** Lösung zu einer schon vorgelesenen Frage (aus dem Gesprächsverlauf) */
function loesung(frage: string): Karte | null {
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
        "Holt eine Karte aus Mias Wundertüte: geprüftes unnützes Wissen (angeberwissen), Plattdeutsch (platt), Witze (witz). Für 'Erzähl mir was Unnützes', 'Angeberwissen', 'Erzähl einen Witz', 'Was heißt was auf Platt?'. Lies GENAU diesen Text vor, nichts dazuerfinden. Wissen und Platt: Frage, dann als eigener Satz die Antwort. Witz: Anfang, dann die Pointe. Rätsel NICHT hier: dafür app_befehl 'Rätsel' (öffnet die Wundertüte mit der Sorte Rätsel).",
      input_schema: {
        type: "object",
        properties: {
          sorte: { type: "string", enum: [...SORTEN], description: "Welche Sorte; egal = Angeberwissen" },
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
      const sorte = (SORTEN as readonly string[]).includes(input.sorte ?? "") ? (input.sorte as Wahl) : "egal";
      const x = karte(ctx, sorte, Math.random);
      if (!x) return { content: "Dazu gibt es grad keine Karte. Biete kurz eine andere Sorte an (z. B. Angeberwissen)." };
      const meta = sorteMeta(x.sorte as Sorte);
      if (x.sorte === "witz") return { content: `Witz: ${x.vorne}\nPointe: ${x.hinten ?? ""}\nErst den Anfang, dann die Pointe. Nichts dazuerfinden.` };
      return { content: `${meta.label ?? meta.titel}: ${x.vorne}\nAntwort: ${ohneFett(x.hinten ?? "")}\nFrage, dann die Antwort als eigener Satz. Nichts dazuerfinden.` };
    },
  },
];
