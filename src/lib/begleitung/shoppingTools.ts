// Lotte: Werkzeug für die Einkaufsliste (Bereich "einkauf") – Zusätzliches
// für eine Woche vorschlagen, mit Tag, Gericht und Laden. Zutaten aus dem
// Wochenplan kommen ohnehin automatisch auf die Liste. Ansehen, leeren und
// entfernen stehen in homeTools.ts.

import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { SECTIONS, sectionFor, type Section } from "@/lib/einkauf/shoppingList";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { dateForDay, fail, nextId, propose, str, toolInput, WEEK_PROP, weekStartOf, type Input } from "@/lib/begleitung/tools";

export const SHOPPING_TOOLS = {
  einkaufsliste_hinzufuegen: {
    area: "einkauf",
    definition: {
      name: "einkaufsliste_hinzufuegen",
      description:
        "Schlägt Artikel für die Einkaufsliste einer Woche vor. Zutaten für Gerichte im Wochenplan kommen automatisch auf die Liste – hier nur Zusätzliches. fuer_tag (heute, morgen oder Wochentag) und gericht merken, wofür der Artikel ist; Artikel für heute stehen oben unter \"Für heute\". laden: wo es das gibt (wird für den Artikel gemerkt; 'Müsli von Rossmann'). Im Laden selbst (\"Ich bin bei REWE\") öffnet app_befehl mit genau diesem Satz den Einkaufsmodus.",
      input_schema: {
        type: "object",
        properties: {
          woche: WEEK_PROP,
          artikel: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                menge: { type: "string", description: "z. B. '2 Pck.', leer erlaubt" },
                abteilung: { type: "string", enum: SECTIONS.map((s) => s.value) },
                fuer_tag: { type: "string", enum: ["heute", "morgen", ...WEEKDAYS], description: "Für welchen Tag (optional)" },
                gericht: { type: "string", description: "Für welches Gericht (optional)" },
                laden: { type: "string", description: "In welchem Laden es das gibt, z. B. 'Rossmann' (optional; wird für den Artikel gemerkt)" },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
        required: ["woche", "artikel"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const weekStart = weekStartOf(ctx, input);
      const artikel = Array.isArray(input.artikel) ? (input.artikel as Input[]) : [];
      if (!weekStart || artikel.length === 0) return fail("woche und artikel angeben.");
      const names: string[] = [];
      for (const a of artikel.slice(0, 30)) {
        const itemName = str(a.name);
        if (!itemName) continue;
        const section = SECTIONS.some((s) => s.value === a.abteilung) ? (a.abteilung as Section) : sectionFor(itemName);
        const forDay = str(a.fuer_tag) ? dateForDay(ctx.today, str(a.fuer_tag)) : null;
        const day = forDay ? WEEKDAYS[(new Date(`${forDay}T00:00:00Z`).getUTCDay() + 6) % 7] : undefined;
        propose(ctx, { id: nextId(ctx), type: "add_shopping", weekStart, name: itemName, amount: str(a.menge), section, ...(day ? { day } : {}), ...(str(a.gericht) ? { dish: str(a.gericht) } : {}), ...(str(a.laden) ? { shop: str(a.laden).slice(0, 30) } : {}) });
        names.push(itemName);
      }
      return { content: `Vorgemerkt für die Einkaufsliste: ${names.join(", ")}.` };
    },
  },
} satisfies Record<string, BegleitungTool>;
