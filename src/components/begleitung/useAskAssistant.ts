"use client";

// Frage an die KI (Streaming, Schleifenschutz, sofortige Kleinigkeiten,
// Vorschau). Ist die KI nicht erreichbar, wandert die Frage an die eigenen
// Regeln – sonst der freundliche Satz statt einer Fehlermeldung.

import { useState, type Dispatch, type SetStateAction } from "react";
import { askAssistant, runInstantOps, unavailableText } from "@/lib/begleitung/client";
import { clockNow, isSameReply } from "@/lib/begleitung/localAnswers";
import { draftForHistory, revisionOf } from "@/lib/begleitung/mail";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import type { ChatTurn } from "@/lib/begleitung/protocol";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { tipsShown, useTipStore } from "@/lib/essen/healthTips";
import type { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { DEFAULT_SHOPPING_DAY, toIsoDate, weekStartFor } from "@/lib/essen/weekPlan";
import { unlockTips } from "@/lib/tipps/client";
import type { ChatState } from "@/components/begleitung/chatTypes";
import { rememberTone } from "@/components/begleitung/mailRules";

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  ready: boolean;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  setInput: (text: string) => void;
  setAdjusting: (on: boolean) => void;
  pantry: PantryItem[] | undefined;
  shopping: ReturnType<typeof useWeekShoppingList>;
  tipStore: ReturnType<typeof useTipStore>;
};

/** KI-Anfrage des Chats: `busy`, die Antwort während sie kommt, `ask` und `notUnderstood` */
export function useAskAssistant({ data, today, ready, chat, setChat, setInput, setAdjusting, pantry, shopping, tipStore }: Options) {
  const [busy, setBusy] = useState(false);
  // Antwort, während sie noch kommt (Streaming)
  const [streaming, setStreaming] = useState<string | null>(null);

  /** KI gerade nicht da: erst die eigenen Regeln, sonst der freundliche Satz */
  const notUnderstood = (said: string, local?: (t: string) => boolean) => {
    if (local?.(said)) return;
    setChat((c) => ({
      ...c,
      turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: unavailableText(), error: true }],
    }));
  };

  /**
   * Frage an die KI; `display` = was im Chat steht, wenn anders als die Frage.
   * `local` versucht es ohne KI, falls sie gerade nicht erreichbar ist.
   */
  const ask = async (text: string, display?: string, local?: (t: string) => boolean) => {
    const question = text.trim();
    if (!question || busy || !data || !today) return;
    if (!ready) {
      setInput("");
      notUnderstood(display ?? question, local);
      return;
    }
    const history: ChatTurn[] = [
      ...chat.turns.filter((t) => !t.error && !t.local).map(({ role, text: t, send }) => ({ role, text: send ?? t })),
      { role: "user", text: question },
    ];
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: display ?? question, send: display ? question : undefined }] }));
    setInput("");
    setAdjusting(false);
    setBusy(true);
    try {
      const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
      const weekStart = weekStartFor(today, shoppingDay);
      // Immer der aktuelle Bestand (Vorrat + Gekauftes) – nie ein alter Stand
      const clock = clockNow();
      const send = (turns: ChatTurn[], pending: ChangeOp[]) =>
        askAssistant(turns, pending, { ...data, pantry: pantry ?? [] }, toIsoDate(today), weekStart, tipsShown(weekStart, tipStore), {
          clock,
          shoppingNames: shopping?.list.items.filter((i) => !i.checked && !i.hidden).map((i) => (i.shop ? `${i.name} (${i.shop})` : i.name)),
          onText: setStreaming,
        });
      let result = await send(history, chat.proposal?.ops ?? []);
      // Schleifenschutz: dieselbe Antwort wie eben → alten Verlauf und offenen Vorschlag vergessen
      // und die Nachricht frisch schicken (nur die Frage selbst)
      const lastReply = [...chat.turns].reverse().find((x) => x.role === "assistant" && !x.local && !x.error)?.text;
      if (isSameReply(lastReply, result.reply)) {
        setStreaming(null);
        result = await send([{ role: "user", text: question }], []);
        setChat((c) => ({ ...c, turns: c.turns.map((x) => (x.role === "assistant" && !x.local ? { ...x, local: true } : x)), proposal: null }));
      }
      // Kleine Dinge (Timer, Stoppuhr, Kochschritt, "Ich koche jetzt") sofort – der Rest als Vorschau
      const instant = runInstantOps(result.ops);
      result = { ...result, ops: instant.rest, reply: instant.notes.length ? `${result.reply}\n${instant.notes.join(" ")}` : result.reply };
      const tipsWhere = result.tips?.length ? unlockTips() : null;
      setChat((c) => {
        // Bisher abgewählte Punkte bleiben abgewählt, neue sind ausgewählt
        const previous = new Set(c.proposal?.ops.map((op) => op.id));
        const selected = new Set(
          result.ops.filter((op) => !previous.has(op.id) || c.proposal?.selected.has(op.id)).map((op) => op.id),
        );
        return {
          ...c,
          turns: [
            ...c.turns,
            {
              role: "assistant",
              text: tipsWhere ? `${result.reply}\n${tipsWhere}` : result.reply,
              ...(result.mail ? { mail: result.mail, send: `${result.reply}\n\n${draftForHistory(result.mail)}` } : {}),
              ...(result.chips?.length ? { chips: result.chips } : {}),
              ...(result.tips?.length ? { tips: result.tips } : {}),
            },
          ],
          proposal: result.ops.length > 0 ? { ops: result.ops, selected } : null,
        };
      });
      if (result.mail) rememberTone(result.mail, revisionOf(question));
    } catch {
      // Offline, kein Guthaben, Limit, falscher Code …: nie Technik-Texte – die Frage
      // wandert an die eigenen Regeln (ohne KI), sonst der freundliche Satz
      setChat((c) => ({ ...c, turns: c.turns.slice(0, -1) }));
      notUnderstood(display ?? question, local);
    } finally {
      setBusy(false);
      setStreaming(null);
    }
  };

  return { busy, streaming, ask, notUnderstood };
}
