"use client";

// Mias Modi mit eigener Vorschau: „Was ist da?“ (Im Haus, Tafel 102) und
// „Einsprechen“ (Einkauf, Tafel 110). KI zuerst – die Nachricht geht mit
// Kennzeichen („[Im Haus] …“, „[Einkauf] …“) an die KI; ohne KI versteht die
// App selbst (Notlösung). Nichts wird sofort eingetragen: erst „Hab ich so
// verstanden:“ bzw. „Hab ich:“, dann „Passt“. Schließen beendet den Modus.

import type { Dispatch, SetStateAction } from "react";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import type { ChatState } from "@/components/begleitung/chatTypes";
import type { ShoppingSettings } from "@/lib/einkauf/shoppingList";
import type { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { weekStartFor } from "@/lib/essen/weekPlan";
import { sameIngredient } from "@/lib/vorrat/pantry";
import { IM_HAUS_PREFIX, imHausVorschlag } from "@/lib/vorrat/reinsprechen";
import { EINKAUF_PREFIX, einkaufVorschlag, isEinkaufVorschlag, ladenFuer, passtText } from "@/lib/einkauf/einsprechen";

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  ready: boolean;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  setInput: (text: string) => void;
  shopping: ReturnType<typeof useWeekShoppingList>;
  shoppingSettings: ShoppingSettings | undefined;
  ask: (text: string, display?: string, local?: (t: string) => boolean) => Promise<void>;
};

export function useModusChat({ data, today, ready, chat, setChat, setInput, shopping, shoppingSettings, ask }: Options) {
  const weekStart = data && today ? weekStartFor(today, data.profile.shoppingDay || "Montag") : "";

  /** Verstandenes als Vorschlag zeigen */
  const zeigen = (t: string, v: { ops: ChangeOp[]; reply: string }) =>
    setChat((c) => ({
      ...c,
      turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: v.reply, local: true }],
      proposal: v.ops.length ? { ops: v.ops, selected: new Set(v.ops.map((op) => op.id)) } : c.proposal,
    }));

  /** „Was ist da?“ ohne KI */
  const imHausLokal = (t: string) => {
    if (!weekStart) return false;
    const onList = (name: string) => Boolean(shopping?.list.items.some((i) => !i.checked && sameIngredient(i.name, name)));
    zeigen(t, imHausVorschlag(t, chat.proposal?.ops ?? [], weekStart, onList));
    return true;
  };

  /** „Einsprechen“ ohne KI: an Kommas/„und“ trennen, mit dem Katalog abgleichen */
  const einkaufLokal = (t: string) => {
    if (!weekStart || !data || !shoppingSettings) return false;
    zeigen(t, einkaufVorschlag(t, chat.proposal?.ops ?? [], weekStart, { ...shoppingSettings, namen: data.profile.persons.map((p) => p.name) }));
    return true;
  };

  /** Nachricht im Modus? Dann hier erledigt (true) */
  const modus = (t: string): boolean => {
    const art = chat.imHaus ? { prefix: IM_HAUS_PREFIX, lokal: imHausLokal } : chat.einkauf ? { prefix: EINKAUF_PREFIX, lokal: einkaufLokal } : null;
    if (!art) return false;
    setInput("");
    if (ready) void ask(`${art.prefix} ${t}`, t, art.lokal);
    else art.lokal(t);
    return true;
  };

  /** Meldung nach „Passt“ im Einsprechen: „9 drauf · 3 ohne Laden“ (sonst null) */
  const passtMeldung = (selected: Set<string>): string | null => {
    if (!chat.einkauf || !chat.proposal || !isEinkaufVorschlag(chat.proposal.ops)) return null;
    const ops = chat.proposal.ops.filter((op) => selected.has(op.id));
    const s = shoppingSettings ?? { itemShops: {}, products: {} };
    return passtText(ops.length, ops.filter((op) => !ladenFuer(op, s)).length);
  };

  return { modus, passtMeldung };
}
