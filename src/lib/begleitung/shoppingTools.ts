// Lotte: Werkzeug für die Einkaufsliste (Bereich "einkauf") – Zusätzliches
// für eine Woche vorschlagen, mit Tag, Gericht und Laden. Zutaten aus dem
// Wochenplan kommen ohnehin automatisch auf die Liste. Ansehen, leeren und
// entfernen stehen in homeTools.ts.

import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { SECTIONS, sectionFor, type Section } from "@/lib/einkauf/shoppingList";
import { rulesByShop, shopRuleReply } from "@/lib/einkauf/shopRules";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { dateForDay, fail, nextId, propose, str, toolInput, WEEK_PROP, weekStartOf, type Input } from "@/lib/begleitung/tools";

export const SHOPPING_TOOLS = {
  einkaufsliste_hinzufuegen: {
    area: "einkauf",
    definition: {
      name: "einkaufsliste_hinzufuegen",
      description:
        "Schlägt Artikel für die Einkaufsliste einer Woche vor. Zutaten für Gerichte im Wochenplan kommen automatisch auf die Liste – hier nur Zusätzliches. fuer_tag (heute, morgen oder Wochentag) und gericht merken, wofür der Artikel ist; Artikel für heute stehen oben unter \"Für heute\". laden: wo es das gibt (wird für den Artikel gemerkt; 'Müsli von Rossmann'). Im Laden selbst (\"Ich bin bei REWE\") öffnet app_befehl mit genau diesem Satz den Einkaufsmodus. Was schon auf der Liste steht, nicht doppelt. '… ist alle', 'Eier sind alle', 'Milch ist leer' → sofort hier, ohne Rückfrage, Antwort nur 'Eier sind drauf.'. Ungefähre Wünsche ('Sachen fürs Frühstück', 'was für den Grillabend') nicht nachfragen, sondern nur_vorschlag mit passenden Sachen aus Stammartikeln und Verlauf.",
      input_schema: {
        type: "object",
        properties: {
          woche: WEEK_PROP,
          nur_vorschlag: { type: "boolean", description: "true bei vagen Wünschen ('so Sachen fürs Frühstück'): passende Artikel aus Stammartikeln/zuletzt Gekauftem vorschlagen – sie erscheinen als Vorschau mit 'Übernehmen' statt sofort. Statt nachzufragen." },
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
        propose(ctx, { id: nextId(ctx), type: "add_shopping", weekStart, name: itemName, amount: str(a.menge), section, ...(day ? { day } : {}), ...(str(a.gericht) ? { dish: str(a.gericht) } : {}), ...(str(a.laden) ? { shop: str(a.laden).slice(0, 30) } : {}), ...(input.nur_vorschlag === true ? { vorschlag: true } : {}) });
        names.push(itemName);
      }
      return { content: input.nur_vorschlag === true ? `Als Vorschlag mit "Übernehmen": ${names.join(", ")}. Antworte nur kurz, z. B. "Mein Vorschlag fürs Frühstück:"` : `Vorgemerkt für die Einkaufsliste: ${names.join(", ")}.` };
    },
  },
  laden_regel: {
    area: "einkauf",
    definition: {
      name: "laden_regel",
      description:
        "Feste Laden-Regel für einen Artikel: 'Tomaten kaufe ich immer bei Rewe', 'Butter immer bei Lidl', 'Shampoo nur bei Rossmann' → laden setzen. 'Tomaten nicht mehr bei Rewe', 'Milch egal wo' → laden leer = Regel weg, Artikel bewusst egal wo. Gilt danach überall (Liste, Wochenplan, Rezepte). Antwort knapp: 'Merk ich mir. Tomaten → Rewe.'",
      input_schema: {
        type: "object",
        properties: {
          artikel: { type: "string", description: "Der Artikel, z. B. 'Tomaten'" },
          laden: { type: "string", description: "Der Laden, z. B. 'Rewe'; leer = Regel entfernen" },
        },
        required: ["artikel", "laden"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const name = str(input.artikel).slice(0, 60);
      const shop = str(input.laden).slice(0, 30);
      if (!name) return fail("artikel angeben.");
      propose(ctx, { id: nextId(ctx), type: "set_shop_rule", name, shop });
      return { content: `Erledigt. Antworte genau: "${shopRuleReply(name, shop)}"` };
    },
  },
  laeden_anzeigen: {
    area: "einkauf",
    definition: {
      name: "laeden_anzeigen",
      description: "'Was kauf ich wo?', 'Welche Läden hab ich?': Meine Läden und die festen Regeln (Artikel je Laden). Danach kurz zusammenfassen, je Laden eine Zeile.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    run: (ctx) => {
      const l = ctx.data.laeden ?? { regeln: {}, meine: [] };
      const byShop = rulesByShop(l.regeln);
      const lines = Object.entries(byShop).map(([shop, items]) => `${shop}: ${items.join(", ")}`);
      return { content: [`Meine Läden: ${l.meine.length ? l.meine.join(", ") : "noch keine"}.`, lines.length ? `Feste Regeln: ${lines.join(" · ")}.` : "Noch keine festen Regeln."].join(" ") };
    },
  },
} satisfies Record<string, BegleitungTool>;
