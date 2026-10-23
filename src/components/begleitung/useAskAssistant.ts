"use client";

// Frage an die KI (Streaming, Schleifenschutz, sofortige Kleinigkeiten,
// Vorschau). Ein Fehler wird einmal still wiederholt. Ist die KI nicht
// erreichbar, wandert die Frage an die eigenen Regeln – sonst ein ehrlicher
// Satz (nie „nicht verstanden“); offline merkt Mia sich die Frage und holt sie
// nach, sobald wieder Netz da ist.

import { useState, type Dispatch, type SetStateAction } from "react";
import { askAssistant, BegleitungUnavailable, commitOps, runInstantOps, unavailableText } from "@/lib/begleitung/client";
import { isSafeOp, noteMiaDone } from "@/lib/begleitung/miaDone";
import { queueForLater } from "@/lib/begleitung/nachholen";
import type { AssistantErrorCode } from "@/lib/begleitung/protocol";
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

  /** KI gerade nicht da: erst die eigenen Regeln, sonst ein ehrlicher Satz (offline: merken und nachholen) */
  const notUnderstood = (said: string, local?: (t: string) => boolean, reason?: AssistantErrorCode | "offline") => {
    if (local?.(said)) return;
    const why = reason ?? (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "fehler");
    if (why === "offline") queueForLater(said);
    setChat((c) => ({
      ...c,
      turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: unavailableText(why), error: true }],
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
      // Ein Fehler (nicht offline/Limit/Code) wird einmal still wiederholt
      let result = await send(history, chat.proposal?.ops ?? []).catch((e: unknown) => {
        if (e instanceof BegleitungUnavailable && e.reason === "fehler") {
          setStreaming(null);
          return send(history, chat.proposal?.ops ?? []);
        }
        throw e;
      });
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
      // Machen statt fragen: nur kleine, sichere Dinge → sofort, mit „Rückgängig“ und in „Mia hat schon …“
      let done: (() => void) | null = null;
      if (result.ops.length && !chat.proposal && result.ops.every(isSafeOp)) {
        const committed = commitOps(data, result.ops, new Set(result.ops.map((op) => op.id)), question);
        noteMiaDone(result.ops, committed.undo);
        done = committed.undo;
        result = { ...result, ops: [], reply: committed.notes.length ? `${result.reply}\n${committed.notes.join(" ")}` : result.reply };
      }
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
              ...(done ? { undo: done, quick: true } : {}),
            },
          ],
          proposal: result.ops.length > 0 ? { ops: result.ops, selected } : null,
        };
      });
      if (result.mail) rememberTone(result.mail, revisionOf(question));
    } catch (e) {
      // Offline, kein Guthaben, Limit, falscher Code …: nie Technik-Texte – die Frage
      // wandert an die eigenen Regeln (ohne KI), sonst der ehrliche Satz
      setChat((c) => ({ ...c, turns: c.turns.slice(0, -1) }));
      notUnderstood(display ?? question, local, e instanceof BegleitungUnavailable ? e.reason : undefined);
    } finally {
      setBusy(false);
      setStreaming(null);
    }
  };

  return { busy, streaming, ask, notUnderstood };
}
