"use client";

// Frage an die KI (Streaming, Schleifenschutz, sofortige Kleinigkeiten,
// Vorschau). Ein Fehler wird einmal still wiederholt. Ist die KI nicht
// erreichbar, wandert die Frage an die eigenen Regeln – sonst ein ehrlicher
// Satz (nie „nicht verstanden“); offline merkt Mia sich die Frage und holt sie
// nach, sobald wieder Netz da ist.
// Sofort-Weg (Auftrag „Mia schneller“): Eindeutige Kurzbefehle erledigt die
// App selbst (`sofort/erkennen.ts`) – die KI bekommt die Nachricht trotzdem,
// prüft im Hintergrund und korrigiert nur, wenn sie etwas anderes versteht.
// Fortsetzung nach einer Denkpause: `zurueckziehen` nimmt die eben gestellte
// Frage samt Antwort zurück (Anfrage abgebrochen, Erledigtes zurückgenommen).

import { newMiaConversation, reactToUser } from "@/lib/mia/reaktion";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { askAssistant, BegleitungUnavailable, commitOps, runInstantOps, unavailableText } from "@/lib/begleitung/client";
import { eingetragenMitRaum, isSafeOp, noteMiaDone } from "@/lib/begleitung/miaDone";
import { gelernteRaeume } from "@/lib/kalender/raum/gedaechtnis";
import { isImHausFrage } from "@/lib/vorrat/reinsprechen";
import { isEinkaufFrage } from "@/lib/einkauf/einsprechen";
import { doneCount, doneGroups, doneSummary, shortDoneReply, type DoneGroup } from "@/lib/begleitung/uebersicht";
import { queueForLater } from "@/lib/begleitung/nachholen";
import type { AssistantErrorCode, AssistantReply } from "@/lib/begleitung/protocol";
import { clockNow, isSameReply } from "@/lib/begleitung/localAnswers";
import { draftForHistory, revisionOf } from "@/lib/begleitung/mail";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import type { ChatTurn } from "@/lib/begleitung/protocol";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { tipsShown, useTipStore } from "@/lib/essen/healthTips";
import type { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate, weekStartFor } from "@/lib/essen/weekPlan";
import { unlockTips } from "@/lib/tipps/client";
import { sofortErkennen, type Sofort } from "@/lib/begleitung/sofort/erkennen";
import { SOFORT_OK } from "@/lib/begleitung/sofortOk";
import { tempoMarke, tempoSofort } from "@/lib/begleitung/tempo";
import { loadCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { shopRulesForMia } from "@/lib/einkauf/shopRules";
import { now } from "@/lib/core/now";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";
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

/** Die eben gestellte Frage (für `zurueckziehen`) */
type Laufend = { frage: string; abbrechen: AbortController; undo: (() => void) | null; proposal: ChatState["proposal"] };

/** KI-Anfrage des Chats: `busy`, die Antwort während sie kommt, `ask`, `notUnderstood`, `zurueckziehen` */
export function useAskAssistant({ data, today, ready, chat, setChat, setInput, setAdjusting, pantry, shopping, tipStore }: Options) {
  const [busy, setBusy] = useState(false);
  // Antwort, während sie noch kommt (Streaming)
  const [streaming, setStreaming] = useState<string | null>(null);
  /** Diese Antwort kam über den Sofort-Weg (kein „Mhm.“) */
  const [sofortAktiv, setSofortAktiv] = useState(false);
  const laufend = useRef<Laufend | null>(null);

  /** KI gerade nicht da: erst die eigenen Regeln, sonst ein ehrlicher Satz (offline: merken und nachholen) */
  const notUnderstood = (said: string, local?: (t: string) => boolean, reason?: AssistantErrorCode | "offline" | "einwilligung") => {
    if (local?.(said)) return;
    const why = reason ?? (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "fehler");
    if (why === "offline") queueForLater(said);
    setChat((c) => ({
      ...c,
      turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: unavailableText(why), error: true }],
    }));
  };

  const listNames = () => shopping?.list.items.filter((i) => !i.checked && !i.hidden).map((i) => (i.shop ? `${i.name} (${i.shop})` : i.name));

  /** Antwort zeigen: kleine Dinge sofort erledigen, der Rest als Vorschau; `ersetzt` = diese Blase ersetzen */
  const zeige = (raw: AssistantReply, question: string, d: AssistantData, ersetzt?: ChatTurnView) => {
    let result = raw;
    // Kleine Dinge (Timer, Stoppuhr, Kochschritt, "Ich koche jetzt") sofort – der Rest als Vorschau
    const instant = runInstantOps(result.ops);
    result = { ...result, ops: instant.rest, reply: instant.notes.length ? `${result.reply}\n${instant.notes.join(" ")}` : result.reply };
    // Machen statt fragen: nur kleine, sichere Dinge → sofort, mit „Rückgängig“ und in „Mia hat schon …“
    let done: (() => void) | null = instant.undo ?? null;
    // Mehreres auf einmal: nur „Erledigt.“ + kompakte Übersicht (die KI bekommt die Liste im Verlauf)
    let overview: DoneGroup[] | null = null;
    // Ein neuer Termin bzw. eine neue Aufgabe: Raum-Chip „Familie ⌄“ unter der Bestätigung (A-034)
    let raum: ChatTurnView["raum"] | null = null;
    // „Was ist da?“ (Tafel 102) und „Einsprechen“ (Tafel 110): erst als Vorschau, nie sofort
    if (result.ops.length && !chat.proposal && !isEinkaufFrage(question) && !isImHausFrage(question) && result.ops.every(isSafeOp)) {
      const committed = commitOps(d, result.ops, new Set(result.ops.map((op) => op.id)), question);
      noteMiaDone(result.ops, committed.undo);
      const timerUndo = done;
      done = timerUndo ? () => (committed.undo(), timerUndo()) : committed.undo;
      raum = eingetragenMitRaum(result.ops);
      const groups = doneGroups(result.ops);
      if (doneCount(groups) >= 2) {
        overview = groups;
        result = { ...result, ops: [], reply: shortDoneReply(result.reply, doneCount(groups)) };
      } else result = { ...result, ops: [], reply: committed.notes.length ? `${result.reply}\n${committed.notes.join(" ")}` : result.reply };
    }
    const tipsWhere = result.tips?.length ? unlockTips() : null;
    const turn: ChatTurnView = {
      role: "assistant",
      text: tipsWhere ? `${result.reply}\n${tipsWhere}` : result.reply,
      ...(result.mail ? { mail: result.mail, send: `${result.reply}\n\n${draftForHistory(result.mail)}` } : {}),
      ...(result.chips?.length ? { chips: result.chips } : {}),
      ...(result.tips?.length ? { tips: result.tips } : {}),
      ...(done ? { undo: done, quick: true } : {}),
      ...(raum && !overview ? { raum } : {}),
      ...(overview ? { overview, send: `${result.reply} (${doneSummary(overview)})` } : {}),
    };
    setChat((c) => {
      // Bisher abgewählte Punkte bleiben abgewählt, neue sind ausgewählt
      const previous = new Set(c.proposal?.ops.map((op) => op.id));
      const selected = new Set(result.ops.filter((op) => !previous.has(op.id) || c.proposal?.selected.has(op.id)).map((op) => op.id));
      const at = ersetzt ? c.turns.indexOf(ersetzt) : -1;
      const turns = at >= 0 ? c.turns.map((x, i) => (i === at ? turn : x)) : [...c.turns, turn];
      return { ...c, turns, proposal: result.ops.length > 0 ? { ops: result.ops, selected } : null };
    });
    if (result.mail) rememberTone(result.mail, revisionOf(question));
    return done;
  };

  /** Sofort-Weg: selbst erledigen, kurz bestätigen – die KI prüft still im Hintergrund */
  const sofortWeg = (s: Sofort, question: string, display: string | undefined, history: ChatTurn[], d: AssistantData, weekStart: string) => {
    tempoSofort();
    setSofortAktiv(true);
    const instant = runInstantOps(s.ops);
    let undo = instant.undo ?? (() => {});
    let notes = instant.notes;
    if (instant.rest.length) {
      const committed = commitOps(d, instant.rest, new Set(instant.rest.map((op) => op.id)), question);
      noteMiaDone(instant.rest, committed.undo);
      undo = committed.undo;
      notes = [...notes, ...committed.notes];
    }
    const raum = eingetragenMitRaum(instant.rest);
    const turn: ChatTurnView = { role: "assistant", text: notes.length ? `${s.reply}\n${notes.join(" ")}` : s.reply, undo, quick: true, ...(raum ? { raum } : {}) };
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: display ?? question, send: display ? question : undefined }, turn] }));
    tempoMarke("fertig");
    const abbrechen = new AbortController();
    laufend.current = { frage: question, abbrechen, undo, proposal: chat.proposal };
    if (!ready || !today) return;
    // KI prüft im Hintergrund: „OK“ = passt; sonst zurücknehmen und ihre Lesart zeigen
    void askAssistant(history, [], d, toIsoDate(today), weekStart, tipsShown(weekStart, tipStore), { clock: clockNow(), shoppingNames: listNames(), messen: false, sofort: s.was, signal: abbrechen.signal })
      .then((r) => {
        if (abbrechen.signal.aborted || !r.ops.length || r.reply.trim().replace(/[.!]$/, "").toUpperCase() === SOFORT_OK) return;
        undo();
        const neu = zeige(r, question, d, turn);
        if (laufend.current?.abbrechen === abbrechen) laufend.current.undo = neu;
      })
      .catch(() => {
        // Prüfung ist nur Kür – ohne KI bleibt das sofort Erledigte
      });
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
    if (!chat.turns.some((t) => t.role === "user")) newMiaConversation();
    reactToUser(question, toIsoDate(today));
    setInput("");
    setAdjusting(false);
    const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
    const weekStart = weekStartFor(today, shoppingDay);
    const d = { ...data, pantry: pantry ?? [] };
    // Sofort-Weg: eindeutiger Kurzbefehl, kein offener Vorschlag
    const sofort = chat.proposal || display
      ? null
      : sofortErkennen(question, {
          today: toIsoDate(today),
          nowMinutes: now().getHours() * 60 + now().getMinutes(),
          persons: data.profile.persons.map((p) => ({ id: p.id, name: p.name })),
          laeden: shopRulesForMia().meine,
          weekStart: planningWeekStart(today, shoppingDay).weekStart,
          aufDerListe: listNames() ?? [],
          entries: loadCalendarEntries(),
          gelernt: gelernteRaeume(),
        });
    if (sofort) return sofortWeg(sofort, question, display, history, d, weekStart);
    setSofortAktiv(false);
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: display ?? question, send: display ? question : undefined }] }));
    setBusy(true);
    const abbrechen = new AbortController();
    const mine: Laufend = { frage: question, abbrechen, undo: null, proposal: chat.proposal };
    laufend.current = mine;
    try {
      // Immer der aktuelle Bestand (Vorrat + Gekauftes) – nie ein alter Stand
      const clock = clockNow();
      const send = (turns: ChatTurn[], pending: ChangeOp[]) =>
        askAssistant(turns, pending, d, toIsoDate(today), weekStart, tipsShown(weekStart, tipStore), { clock, shoppingNames: listNames(), onText: setStreaming, signal: abbrechen.signal });
      // Ein Fehler (nicht offline/Limit/Code) wird einmal still wiederholt
      let result = await send(history, chat.proposal?.ops ?? []).catch((e: unknown) => {
        if (e instanceof BegleitungUnavailable && e.reason === "fehler") {
          setStreaming(null);
          return send(history, chat.proposal?.ops ?? []);
        }
        throw e;
      });
      if (abbrechen.signal.aborted) return;
      // Schleifenschutz: dieselbe Antwort wie eben → alten Verlauf und offenen Vorschlag vergessen
      // und die Nachricht frisch schicken (nur die Frage selbst)
      const lastReply = [...chat.turns].reverse().find((x) => x.role === "assistant" && !x.local && !x.error)?.text;
      if (isSameReply(lastReply, result.reply)) {
        setStreaming(null);
        result = await send([{ role: "user", text: question }], []);
        setChat((c) => ({ ...c, turns: c.turns.map((x) => (x.role === "assistant" && !x.local ? { ...x, local: true } : x)), proposal: null }));
      }
      if (abbrechen.signal.aborted) return;
      mine.undo = zeige(result, question, data);
    } catch (e) {
      // Zurückgezogen (Fortsetzung nach einer Denkpause): still, die neue Frage kommt gleich
      if (abbrechen.signal.aborted) return;
      // Offline, kein Guthaben, Limit, falscher Code …: nie Technik-Texte – die Frage
      // wandert an die eigenen Regeln (ohne KI), sonst der ehrliche Satz
      setChat((c) => ({ ...c, turns: c.turns.slice(0, -1) }));
      notUnderstood(display ?? question, local, e instanceof BegleitungUnavailable ? e.reason : undefined);
    } finally {
      setBusy(false);
      setStreaming(null);
    }
  };

  /**
   * Fortsetzung nach einer Denkpause: die eben gestellte Frage `frage` samt
   * Antwort zurücknehmen (Anfrage abbrechen, sofort Erledigtes rückgängig).
   * true = zurückgezogen; die zusammengesetzte Frage schickt der Aufrufer neu.
   */
  const zurueckziehen = (frage: string): boolean => {
    const l = laufend.current;
    if (!l || l.frage !== frage.trim()) return false;
    laufend.current = null;
    l.abbrechen.abort();
    l.undo?.();
    setBusy(false);
    setStreaming(null);
    setChat((c) => {
      const at = c.turns.map((t, i) => ({ t, i })).filter(({ t }) => t.role === "user" && (t.send ?? t.text) === l.frage).pop()?.i ?? -1;
      return at < 0 ? c : { ...c, turns: c.turns.slice(0, at), proposal: l.proposal };
    });
    return true;
  };

  return { busy, streaming, ask, notUnderstood, zurueckziehen, sofortAktiv };
}
