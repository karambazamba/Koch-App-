"use client";

// Spontan kochen ("mit dem, was da ist") im Chat: Zutaten in den Vorrat,
// Ideen-Antworten live aus dem Bestand, "Andere Ideen", "Ideen anpassen",
// "Heute" und unbekannte Wörter übernehmen.

import { useState, type Dispatch, type SetStateAction } from "react";
import { bumpBase, type BaseId } from "@/lib/essen/bases";
import { parseLeftovers, type ParsedLeftover } from "@/lib/essen/leftovers/parser";
import { addPantryItems, formatPantryItem, type PantryItem } from "@/lib/vorrat/pantry";
import { mergeStock, stockItem, stockNearlyEmpty } from "@/lib/essen/dishIdeas";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { spontanIdeas, type SpontanFilter, type SpontanIdea } from "@/lib/essen/spontan";
import { takeForToday } from "@/lib/essen/spontanTake";
import { replaceMealPlans } from "@/lib/essen/mealPlan";
import { learnFromRecipe, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { bausteinOf, unlockFeature } from "@/lib/core/features";
import { toIsoDate } from "@/lib/essen/weekPlan";
import type { AssistantData } from "@/lib/begleitung/ops";
import { spontanHeading } from "@/components/begleitung/SpontanBoard";
import { loadSpontanFilters, saveSpontanFilters } from "@/lib/essen/spontanFilters";
import { spontanStartTurn, type ChatState, type ChatTurnView } from "@/components/begleitung/chatTypes";

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  pantry: PantryItem[] | undefined;
  spontanStyle: boolean;
  setChat: Dispatch<SetStateAction<ChatState>>;
  setInput: (text: string) => void;
};

/** Alles für Spontan kochen im Chat */
export function useSpontanChat({ data, today, pantry, spontanStyle, setChat, setInput }: Options) {
  /**
   * Gesagtes im Spontan-Modus: Zutaten in den Vorrat, die Ideen rechnen sich
   * neu. Ist nichts Essbares dabei, ist es eine normale Frage (Modus endet).
   */
  const spontanInput = async (text: string): Promise<boolean> => {
    if (!today) return false;
    const parsed = await parseLeftovers(text);
    const known = parsed.filter((p) => p.known);
    const unsure = parsed.filter((p) => !p.known);
    // Nur Unbekanntes in einem ganzen Satz/einer Frage → eher eine normale Frage
    const short = text.trim().split(/\s+/).length <= 3 && !text.includes("?");
    if (!known.length && (!unsure.length || !short)) return false;
    setInput("");
    if (known.length) addPantryItems(known.map(({ name, amount, unit }) => ({ name, amount, unit })), toIsoDate(today));
    // Genutzt = sichtbar machen ("Im Vorrat ansehen" darf keine Sackgasse sein)
    const shown = known.length > 0 && unlockFeature("vorrat");
    setChat((c) => {
      const live = [...c.turns].reverse().find((t) => t.spontan);
      return {
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text, local: true },
          {
            role: "assistant",
            local: true,
            text: known.length ? (shown ? `Notiert ✓ ${bausteinOf("vorrat")?.where ?? ""}`.trim() : "Notiert ✓") : "Das kenne ich nicht ganz:",
            items: known.map(formatPantryItem),
            unsure,
          },
          // Neue Ideen mit dem, was jetzt da ist (die alten klappen ein)
          ...(known.length ? [spontanStartTurn(c.spontan ?? [], [], live?.extra ?? [])] : []),
        ],
      };
    });
    return true;
  };

  /** Spontan-Modus starten (Kachel, Knopf, "Was ist noch da?"); ohne Filter die der Sitzung */
  const startSpontan = (said?: string, filters?: SpontanFilter[], extra: string[] = []) => {
    setInput("");
    setChat((c) => {
      const active = filters ?? c.spontan ?? loadSpontanFilters();
      return {
        ...c,
        spontan: active,
        turns: [...c.turns, ...(said ? [{ role: "user" as const, text: said, local: true }] : []), spontanStartTurn(active, [], extra)],
      };
    });
  };

  /** Bestand für eine Ideen-Antwort: Vorrat + Gekauftes + eben Genanntes */
  const stockFor = (turn: ChatTurnView) => mergeStock(pantry ?? [], (turn.extra ?? []).map((n) => stockItem(n, "s", today ? toIsoDate(today) : "")));

  /** Die Ideen einer Antwort – immer frisch aus dem aktuellen Bestand */
  const ideasFor = (turn: ChatTurnView): SpontanIdea[] =>
    data ? spontanIdeas(data.recipes, stockFor(turn), turn.ideaFilters ?? [], data.profile.neverAgain, turn.exclude ?? []) : [];

  const headingFor = (turn: ChatTurnView, ideas: SpontanIdea[]) =>
    spontanHeading(ideas, turn.ideaFilters ?? [], turn.extra ?? [], stockNearlyEmpty(stockFor(turn)));

  /** Was vorgelesen wird: der eine Satz und die Ideen */
  const speechFor = (turn: ChatTurnView) => {
    if (!turn.spontan) return turn.text;
    const ideas = ideasFor(turn);
    return `${headingFor(turn, ideas)} ${ideas.map((i) => `${i.title}${i.minutes !== null ? `, ${i.minutes} Minuten` : ""}`).join(". ")}`;
  };

  /** "🔄 Andere Ideen": drei neue, ohne die eben gezeigten */
  const moreIdeas = (turn: ChatTurnView) => {
    const shown = ideasFor(turn).map((i) => i.id);
    setChat((c) => ({ ...c, turns: [...c.turns, spontanStartTurn(turn.ideaFilters ?? [], [...(turn.exclude ?? []), ...shown], turn.extra ?? [])] }));
  };

  /** "Ideen anpassen" → 3 neue Ideen mit den Filtern (für die Sitzung gemerkt) */
  const [adjusting2, setAdjusting2] = useState<ChatTurnView | null>(null);
  const applyFilters = (turn: ChatTurnView, filters: SpontanFilter[]) => {
    setAdjusting2(null);
    saveSpontanFilters(filters);
    const bases = filters.filter((f) => f.startsWith("basis:") && !(turn.ideaFilters ?? []).includes(f));
    if (data && bases.length) saveProfile({ ...data.profile, bases: bases.reduce((b, f) => bumpBase(b, f.slice(6) as BaseId), data.profile.bases) });
    // Neue Filter = neue Auswahl (nichts ausschließen, sonst bleibt evtl. nichts übrig)
    setChat((c) => ({ ...c, spontan: filters, turns: [...c.turns, spontanStartTurn(filters, [], turn.extra ?? [])] }));
  };

  /** "Für heute übernehmen": heutiges Gericht ersetzen, das alte rutscht weiter (mit Rückgängig) */
  const takeIdea = (idea: SpontanIdea) => {
    if (!data || !today) return;
    const before = data.mealPlans;
    const result = takeForToday(data, today, idea, { spontan: spontanStyle });
    if (result.ok) {
      replaceMealPlans(result.weeks);
      if (idea.recipeId) learnFromRecipe(data.recipes[idea.recipeId], LIKE_WEIGHTS.chosen);
    }
    setChat((c) => ({
      ...c,
      spontan: null,
      turns: [
        ...c.turns,
        { role: "user", text: `${idea.title} – für heute`, local: true },
        {
          role: "assistant",
          local: true,
          text: result.text,
          undo: result.ok
            ? () => {
                replaceMealPlans(before);
                setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig. Alles wie vorher.", local: true }] }));
              }
            : undefined,
        },
      ],
    }));
  };

  /** Unbekanntes Wort übernehmen (Vorschlag oder wie gehört) */
  const acceptUnsure = (turnIndex: number, item: ParsedLeftover) => {
    if (!today) return;
    addPantryItems([{ name: item.suggestion ?? item.name, amount: item.amount, unit: item.unit }], toIsoDate(today));
    unlockFeature("vorrat");
    setChat((c) => ({
      ...c,
      turns: c.turns.map((t, i) =>
        i === turnIndex
          ? { ...t, unsure: t.unsure?.filter((u) => u !== item), items: [...(t.items ?? []), formatPantryItem({ ...item, name: item.suggestion ?? item.name })] }
          : t,
      ),
    }));
  };

  return { spontanInput, startSpontan, stockFor, ideasFor, headingFor, speechFor, moreIdeas, adjusting2, setAdjusting2, applyFilters, takeIdea, acceptUnsure };
}

export type SpontanChat = ReturnType<typeof useSpontanChat>;
