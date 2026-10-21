"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowUp, Mic, MicOff, Square, SquarePen } from "lucide-react";
import { baseLabel, bumpBase, type BaseId } from "@/lib/essen/bases";
import { parseLeftovers, type ParsedLeftover } from "@/lib/essen/leftovers/parser";
import { addPantryItems, formatPantryItem } from "@/lib/essen/pantry";
import { ingredientsFromQuestion, isCookIdeasRequest, mergeStock, stockItem, stockNearlyEmpty } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { effectivePlanStyle, hasKids, helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { addWish, parseWish, removeWish, wishLabel } from "@/lib/essen/wishes";
import { settingsChange } from "@/lib/lotte/settingsChat";
import { iconChangeHint } from "@/lib/core/homescreen";
import { isPlanUnlockRequest, unlockPlanning, type UnlockChoice } from "@/lib/essen/planUnlock";
import { finalizeProfile, startAddPerson, type OnboardingState } from "@/lib/einstellungen/onboarding/engine";
import { noteUserAction } from "@/lib/core/activity";
import { isAddPersonRequest } from "@/lib/einstellungen/onboarding/recognize";
import { GuidedChat } from "@/components/onboarding/GuidedChat";
import { LotteAvatar } from "@/components/LotteAvatar";
import { calendarChat, changeEntries, loadEntries } from "@/lib/aufgaben";
import { isRegisteredUndo, pushUndo } from "@/lib/core/undo";
import { runInstantOps } from "@/lib/lotte/client";
import { askAssistant, unavailableText, useAssistantStatus } from "@/lib/lotte/client";
import { setAvatarFlag, triggerAvatar } from "@/lib/core/avatarState";
import {
  loadSpeechSettings,
  saveSpeechSettings,
  shouldRead,
  speak,
  speechSupported,
  stopSpeaking,
  toggleSpeak,
  unlockSpeech,
  useSpeakingId,
  useSpeechSettings,
} from "@/lib/lotte/speech";
import { readingChange } from "@/lib/lotte/speechChat";
import type { AssistantData, ChangeOp } from "@/lib/lotte/ops";
import type { ChatTurn } from "@/lib/lotte/protocol";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";
import { DEFAULT_SHOPPING_DAY, addDays, planningWeekStart, toIsoDate, useToday, weekStartFor, weekdayName } from "@/lib/essen/weekPlan";
import { chatSuggestions, noteChatMessage, useShowSuggestions } from "@/lib/lotte/chatSuggestions";
import { mealOverOn, useCookedDays } from "@/lib/essen/mealDone";
import { useMinutes } from "@/lib/core/now";
import { addManualItem, removeManualItems, sectionFor, setItemShop, setProduct, useShoppingSettings } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { isMarketSituation, marketIdeas, marketProduct, marketTargetDay, type MarketIdea } from "@/lib/essen/market";
import { bakingIdeas, isBakingRequest } from "@/lib/essen/baking";
import { isShoppingRequest, parseProductStatement, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { filtersFromText, isIdeaFilterRequest, isQuickRequest, isSnackRequest, quickIdeas, snackReply, spontanIdeas, type SpontanFilter, type SpontanIdea } from "@/lib/essen/spontan";
import { takeForDay, takeForToday } from "@/lib/essen/spontanTake";
import { composeWeek, replaceMealPlans } from "@/lib/essen/mealPlan";
import { AdjustSheet, EarlierIdeas, SpontanAnswer, loadSpontanFilters, saveSpontanFilters, spontanHeading } from "./SpontanBoard";
import { type MarketTarget } from "./MarketBoard";
import { INPUT_BASE, NOTE } from "@/components/ui/styles";
import { ProposalCard } from "./ProposalCard";
import { draftForHistory, looksLikeMail, revisionOf, splitInstruction } from "@/lib/lotte/mail";
import { TipBubble } from "./TipBubble";
import { tipsShown, useTipStore } from "@/lib/essen/healthTips";
import { extractLikeStatements, learnFromRecipe, learnLikes, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { now } from "@/lib/core/now";
import { bausteinOf, unlockFeature, useFeature } from "@/lib/core/features";
import { unlockTips } from "@/lib/tipps/client";
import { Sheet } from "@/components/ui/Sheet";

import { spontanStartTurn, type ChatState, type ChatTurnView } from "./chatTypes";
import { pauseRule as pauseRuleOf, dayRule as dayRuleOf, boardRule as boardRuleOf, schnellnotizRule as schnellnotizRuleOf, noteRule as noteRuleOf, bausteinRule as bausteinRuleOf, homeCommand as homeCommandOf, type RuleContext } from "./localRules";
import { AccessCodeCard, SpeakButton } from "./ChatBits";
import { BUBBLE, ChatTurnItem } from "./ChatTurnItem";
import { mailRule as mailRuleOf, rememberTone } from "./mailRules";

/** Fragt die KI nach der Basis? Dann Basis-Chips anbieten */
function asksForBase(turn: ChatTurnView | undefined): boolean {
  return Boolean(turn && turn.role === "assistant" && !turn.local && !turn.error && /basis/i.test(turn.text) && turn.text.includes("?"));
}

type Props = {
  data: AssistantData | null | undefined;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
  /** Mikrofon beim Öffnen direkt starten */
  startListening?: boolean;
  /** Beim Öffnen gleich diese Frage stellen */
  initialAsk?: string;
};

/** Panel von unten: Chatverlauf, Vorschlag, großes Mikrofon und Textfeld */
export function HelperPanel({ data, chat, setChat, onApply, onClose, startListening, initialAsk }: Props) {
  const router = useRouter();
  const status = useAssistantStatus(true);
  // Zurück (Pfeil/Geste) schließt den Chat – eine Ebene
  const today = useToday();
  // Ohne sichtbaren Knopf (nur Löschen hat einen): jedes Zurücknehmen bleibt für "Mach das rückgängig" gemerkt
  useEffect(() => {
    for (const turn of chat.turns.slice(-3)) if (turn.undo && !isRegisteredUndo(turn.undo)) pushUndo(turn.text.slice(0, 60), turn.undo);
  }, [chat.turns]);
  const inset = useKeyboardInset();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Antwort, während sie noch kommt (Streaming)
  const [streaming, setStreaming] = useState<string | null>(null);
  const tipsOn = useFeature("tipps");
  const [adjusting, setAdjusting] = useState(false);
  const speechSettings = useSpeechSettings();
  const speakingId = useSpeakingId();
  // Zuletzt per Mikrofon gefragt? Dann liest Lotte (Standard "automatisch") vor
  const [viaVoice, setViaVoice] = useState(Boolean(startListening));
  const [dictationHint, setDictationHint] = useState(false);
  // Zugangscode "Später" – gilt, bis das Panel wieder geöffnet wird
  const [codeLater, setCodeLater] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Eingabefeld wächst mit (eingefügte Mails), höchstens ~6 Zeilen
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = Boolean(status?.ready && data && today);
  // Eingabe auch ohne KI möglich – z. B. für "neue Person" (ohne KI per Regeln)
  const canType = Boolean(data && today);
  const name = helperName(data?.profile);
  // Neue Person: geführtes Gespräch wie beim Kennenlernen
  const [guided, setGuided] = useState<OnboardingState | null>(null);
  const voice = data?.profile.helper.voice ?? "weiblich";
  // Aktueller Bestand: Vorrat + Gekauftes (abgehakt / "Haben wir schon") – immer live
  const pantry = useStock();
  const tipStore = useTipStore();
  const shoppingSettings = useShoppingSettings();
  const shopping = useWeekShoppingList("planning");
  // "Ich koche spontan" (diese Woche): keine Planungs-Beispiele, Wünsche und "doch planen" lokal
  const spontanStyle = Boolean(data && today && effectivePlanStyle(data.profile, weekStartFor(today, data.profile.shoppingDay || "Montag")) === "spontan");
  // "Zum Beispiel:" – passend zur Situation, je Chat einmal gewürfelt; weg nach der ersten eigenen Nachricht
  const [suggestRand] = useState(() => Math.random());
  const [suggestionsGone, setSuggestionsGone] = useState(false);
  const showSuggestions = useShowSuggestions();
  const minutes = useMinutes();
  const cooked = useCookedDays();
  const suggestions =
    data && today && minutes !== undefined && cooked && showSuggestions && !suggestionsGone && chat.turns.length === 0 && !guided
      ? chatSuggestions({
          profile: data.profile,
          mealOver: mealOverOn(toIsoDate(today), weekdayName(today), data.profile, minutes, cooked),
          pantry: pantry ?? [],
          shopping: shopping?.list.items.map((i) => i.name) ?? [],
          ai: ready,
          rand: suggestRand,
        })
      : [];

  // Avatar der Begleitung: denkt, solange die Antwort lädt (noch kein Text da) …
  const thinking = busy && !streaming;
  useEffect(() => {
    if (!thinking) return;
    setAvatarFlag("denken", true);
    return () => setAvatarFlag("denken", false);
  }, [thinking]);
  // … und schaut verwirrt statt einer Fehlermeldung
  const lastTurn = chat.turns[chat.turns.length - 1];
  const confused = lastTurn?.role === "assistant" && lastTurn.error ? chat.turns.length : 0;
  useEffect(() => {
    if (confused) triggerAvatar("verwirrt");
  }, [confused]);

  const ruleCtx: RuleContext = { data, today, setChat, setInput, router, onClose };

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
      const at = now();
      const send = (turns: ChatTurn[], pending: ChangeOp[]) =>
        askAssistant(turns, pending, { ...data, pantry: pantry ?? [] }, toIsoDate(today), weekStart, tipsShown(weekStart, tipStore), {
          clock: `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`,
          shoppingNames: shopping?.list.items.filter((i) => !i.checked && !i.hidden).map((i) => i.name),
          onText: setStreaming,
        });
      let result = await send(history, chat.proposal?.ops ?? []);
      // Schleifenschutz: dieselbe Antwort wie eben → alten Verlauf und offenen Vorschlag vergessen
      // und die Nachricht frisch schicken (nur die Frage selbst)
      const lastReply = [...chat.turns].reverse().find((x) => x.role === "assistant" && !x.local && !x.error)?.text;
      const loop = (a?: string) => (a ?? "").toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();
      if (lastReply && loop(lastReply) === loop(result.reply)) {
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

  // --- Spontan kochen ("mit dem, was da ist") ---------------------------------

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
                setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – alles wie vorher.", local: true }] }));
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

  /** Drei schnelle Ideen unter 20 Minuten (ohne KI) */
  const quickReply = (): string | null => {
    if (!data) return null;
    const ideas = quickIdeas(data.recipes, data.profile.neverAgain);
    return `Drei schnelle Ideen unter 20 Minuten: ${ideas.slice(0, -1).join(", ")} oder ${ideas[ideas.length - 1]}.`;
  };

  /** "Wir nehmen immer Alsan statt Butter" → merken und Antwort */
  const productReply = (t: string): string | null => {
    const product = parseProductStatement(t);
    if (!product) return null;
    setProduct(product.ingredient, product.product);
    return `Gemerkt ✓ Statt ${product.ingredient} steht ab jetzt ${product.product} auf der Einkaufsliste – die Rezepte bleiben gleich.`;
  };

  /** "… auf die Liste", "Wir brauchen Milch und Eier" → erledigen und Antwort (ohne KI) */
  const shoppingReply = (t: string): { text: string; undo: () => void } | null => {
    if (!data || !today) return null;
    if (!isShoppingRequest(t)) return null;
    const items = parseShoppingText(t, shoppingSettings?.shops ?? []);
    if (items.length === 0) return null;
    const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
    const ids = items.map((item) => {
      if (item.shop) setItemShop(shoppingSettings?.products[item.name.toLowerCase()] ?? item.name, item.shop);
      return addManualItem(weekStart, { name: item.name, amount: item.amount, section: sectionFor(item.name) });
    });
    const names = items.map((i) => `${i.amount ? `${i.amount} ` : ""}${i.name}${i.shop ? ` (${i.shop})` : ""}`);
    const remove = pushUndo(`${names.join(", ")} auf der Liste`, () => removeManualItems(weekStart, ids));
    return {
      text: `Steht drauf ✓ ${names.join(", ")}`,
      undo: () => {
        remove();
        setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – wieder runter von der Liste.", local: true }] }));
      },
    };
  };

  /** Termine und Aufgaben ohne KI: "Morgen um 9 Steuerberater", "Was steht diese Woche an?" – sofort, mit Rückgängig */
  const calendarReply = (t: string): { text: string; undo?: () => void } | null => {
    if (!data || !today) return null;
    const reply = calendarChat(t, loadEntries(), toIsoDate(today), data.profile.persons);
    if (!reply) return null;
    if (!reply.change) return { text: reply.text };
    const undo = pushUndo(reply.text, changeEntries(reply.change));
    return {
      text: reply.text,
      undo: () => {
        undo();
        setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht.", local: true }] }));
      },
    };
  };

  /** "Lachs ist im Angebot", "Ich steh grad im Rewe …" → Ideen mit Zeit, kurz */
  const marketTurn = (t: string): ChatTurnView | null => {
    if (!data || !today || !isMarketSituation(t)) return null;
    const product = marketProduct(t);
    if (!product) return null;
    const listNames = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden).map((i) => i.name);
    const ideas = marketIdeas(product, data.recipes, pantry ?? [], listNames, data.profile.neverAgain);
    if (!ideas.length) return null;
    // Passender Tag: heute (vor der Essenszeit) oder später in dieser bzw. nächster Woche
    const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
    const todayIso = toIsoDate(today);
    const weekStart = weekStartFor(today, shoppingDay);
    const week = composeWeek(weekStart, data.profile, data.weekPlans, data.mealPlans, data.recipes);
    const todayDay = week.days.find((d) => d.date === todayIso);
    const at = now();
    const clock = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    const beforeMeal = Boolean(todayDay) && clock < mealClockFor(data.profile, todayDay!.weekday);
    // Spontan: kein Plan – höchstens "Heute kochen"
    const target = spontanStyle
      ? beforeMeal && todayDay
        ? { date: todayIso, weekday: todayDay.weekday, replaces: null, label: "Heute kochen" }
        : null
      : marketTargetDay(week, todayIso, beforeMeal) ??
      marketTargetDay(composeWeek(addDays(weekStart, 7), data.profile, data.weekPlans, data.mealPlans, data.recipes), todayIso, false);
    return {
      role: "assistant",
      local: true,
      text: `${product}? Damit geht z. B.:`,
      market: { product, source: "text", ideas, target },
    };
  };

  /** "Auf die Liste": Produkt und was fehlt → "Jetzt mitnehmen" (mit Rückgängig) */
  const addMarketItems = (product: string, idea: MarketIdea) => {
    if (!data || !today) return;
    const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
    const names = [product, ...idea.needs];
    const ids = names.map((n) => addManualItem(weekStart, { name: n, amount: "", section: sectionFor(n), now: true }));
    noteUserAction(toIsoDate(today));
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: `Steht oben unter „Jetzt mitnehmen“ ✓ ${names.join(", ")}`,
          undo: () => {
            removeManualItems(weekStart, ids);
            setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – wieder runter von der Liste.", local: true }] }));
          },
        },
      ],
    }));
  };

  /** "Statt <Tag> einplanen": Idee auf den Tag, das bisherige Gericht rutscht weiter */
  const planMarketIdea = (idea: MarketIdea, target: MarketTarget) => {
    if (!data || !today) return;
    const before = data.mealPlans;
    const result = takeForDay(data, today, idea, target.date, { spontan: spontanStyle });
    if (result.ok) {
      replaceMealPlans(result.weeks);
      if (idea.recipeId) learnFromRecipe(data.recipes[idea.recipeId], LIKE_WEIGHTS.chosen);
    }
    noteUserAction(toIsoDate(today));
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: result.text,
          undo: result.ok
            ? () => {
                replaceMealPlans(before);
                setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – alles wie vorher.", local: true }] }));
              }
            : undefined,
        },
      ],
    }));
  };

  /** Backwunsch → eigene Backrezepte und die eingebaute Backstube */
  const bakingTurn = (t: string): ChatTurnView | null => {
    if (!data || !isBakingRequest(t)) return null;
    const withKids = hasKids(data.profile);
    const lower = t.toLowerCase();
    const own = Object.values(data.recipes).filter(
      (r) => r.kind === "backen" && r.title.toLowerCase().split(/[\s-]+/).some((w) => w.length >= 4 && lower.includes(w.replace(/(en|n|e|s)$/, ""))),
    );
    const builtin = bakingIdeas(t, withKids).filter((b) => !own.some((r) => r.title.toLowerCase() === b.title.toLowerCase()));
    const recipes = [...own, ...builtin].slice(0, 3);
    if (!recipes.length) return null;
    const kidsWanted = withKids && /kind|kinder|kleinen|zusammen|mit den/i.test(t);
    return {
      role: "assistant",
      local: true,
      text: kidsWanted ? "Oh ja, backen wir zusammen! 🧁 Das klappt gut mit Kindern:" : "Gern! 🧁 Wie wär’s damit:",
      baking: recipes,
    };
  };

  /** Eingabe abschicken: neue Person, Reste-Modus oder Frage an die KI (`byVoice` = per Mikrofon) */
  const submit = (text: string, byVoice = false) => {
    const t = text.trim();
    if (!t || busy || !data || !today) return;
    // Aufnahme verwerfen – ihr Ende darf nichts mehr ins Feld schreiben
    speech.reset();
    setSuggestionsGone(true);
    noteChatMessage();
    setViaVoice(byVoice);
    noteUserAction(toIsoDate(today));
    // Eine eingefügte Mail ist nie eine Zutatenliste
    if (chat.spontan && looksLikeMail(splitInstruction(t).mail)) {
      setChat((c) => ({ ...c, spontan: null }));
      route(t);
      return;
    }
    // Selbst geöffneter Spontan-Modus: "Was Schnelles mit Nudeln" passt die Ideen an,
    // genannte Zutaten landen im Vorrat; alles andere beendet ihn
    if (chat.spontan && isIdeaFilterRequest(t)) {
      rules(t);
      return;
    }
    if (chat.spontan) {
      void spontanInput(t).then((handled) => {
        if (handled) return;
        setChat((c) => ({ ...c, spontan: null }));
        route(t);
      });
      return;
    }
    route(t);
  };

  const mailRule = (t: string) => mailRuleOf(ruleCtx, chat.turns, t);

  /**
   * Grundregel: Ist die KI erreichbar, bekommt IMMER sie die Nachricht. Die
   * festen Regeln (Stichwörter) sind nur die Notlösung ohne KI – und keine
   * Regel hinterlässt einen Zustand, der weitere Nachrichten abfängt.
   */
  const route = (t: string) => {
    if (ready) {
      void ask(t, undefined, rules);
      return;
    }
    if (rules(t)) return;
    setInput("");
    notUnderstood(t);
  };

  /** Feste Regeln (ohne KI, oder wenn die KI ein `app_befehl` schickt). true = erledigt */
  const rules = (t: string): boolean => {
    if (!data || !today) return false;
    if (mailRule(t)) return true;
    if (boardRule(t)) return true;
    if (dayRule(t)) return true;
    if (schnellnotizRule(t)) return true;
    if (noteRule(t)) return true;
    if (isAddPersonRequest(t)) {
      setInput("");
      setGuided(startAddPerson(data.profile, t));
      return true;
    }
    // "Was Schnelles mit Nudeln" → Ideen mit passenden Filtern
    if (isIdeaFilterRequest(t)) {
      const filters = filtersFromText(t);
      saveSpontanFilters(filters);
      const named = /\bmit\b/i.test(t) ? filters.flatMap((f) => (f.startsWith("basis:") ? [baseLabel(f.slice(6) as BaseId)] : [])) : [];
      startSpontan(t, filters, named);
      return true;
    }
    // "Was ist noch da?", "Reste", "Spontan kochen" → Spontan-Ideen
    if (/^(was ist noch da|reste( verwerten)?|was kann ich aus (den |meinen |unseren )?resten|spontan (was )?kochen)/i.test(t)) {
      startSpontan(t);
      return true;
    }
    // Ausgeschalteter Baustein ("Zeig mir den Vorrat") → einschalten, bevor eine Seite geöffnet wird
    if (bausteinRule(t)) return true;
    // "Zeig mir unsere Rezepte" / "Was haben wir im Vorrat?" → hinführen
    const page = /\b(zeig|öffne|wo sind|wo finde)\w*\b.*\b(rezepte|kochbuch)\b/i.test(t) ? "/kochbuch" : /\b(zeig|öffne)\w*\b.*\b(vorrat|tiefkühler|kühlschrank)\b/i.test(t) ? "/vorrat" : null;
    if (page) {
      setInput("");
      router.push(page);
      onClose();
      return true;
    }
    if (pauseRule(t)) return true;
    // Ausflugs-Snacks und "Wir nehmen immer Alsan statt Butter" direkt erledigen
    const direct = (isSnackRequest(t) ? snackReply(pantry ?? []) : null) ?? productReply(t);
    if (direct) {
      setInput("");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: direct, local: true }] }));
      return true;
    }
    return localFirst(t) || localFallback(t);
  };

  const pauseRule = (t: string) => pauseRuleOf(ruleCtx, t);

  const dayRule = (t: string) => dayRuleOf(ruleCtx, t);

  const boardRule = (t: string) => boardRuleOf(ruleCtx, t);

  const schnellnotizRule = (t: string) => schnellnotizRuleOf(ruleCtx, t);

  const noteRule = (t: string) => noteRuleOf(ruleCtx, t);

  const bausteinRule = (t: string) => bausteinRuleOf(ruleCtx, t);

  /**
   * Ohne KI (oder wenn sie gerade nicht erreichbar ist): Einkaufsliste,
   * Wünsche und schnelle Ideen nach festen Regeln – sofort, mit Rückgängig.
   */
  const localFallback = (t: string): boolean => {
    if (!data || !today) return false;
    // "Was kann ich heute kochen?" / "Was mach ich mit Hack und Paprika?" → Ideen aus dem aktuellen Bestand
    const named = ingredientsFromQuestion(t);
    if (named || isCookIdeasRequest(t)) {
      startSpontan(t, [], named ?? []);
      return true;
    }
    const quick = isQuickRequest(t) ? quickReply() : null;
    const reply = shoppingReply(t) ?? calendarReply(t) ?? (quick ? { text: quick, undo: undefined } : null);
    if (reply) {
      setInput("");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: reply.text, local: true, undo: reply.undo }] }));
      return true;
    }
    // "Mathis wünscht sich Pfannkuchen" → Wunsch-Idee
    const wish = parseWish(t, data.profile.persons);
    if (wish) {
      setInput("");
      const created = addWish({ personId: wish.personId, who: wish.who, dish: wish.dish }, toIsoDate(today));
      setChat((c) => ({
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text: t, local: true },
          {
            role: "assistant",
            local: true,
            text: `Notiert ✓ ${wishLabel(wish.who)}: ${wish.dish} – steht ganz oben bei den Ideen.`,
            undo: () => {
              removeWish(created.id);
              setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – Wunsch ist wieder weg.", local: true }] }));
            },
          },
        ],
      }));
      return true;
    }
    return false;
  };

  const homeCommand = (t: string) => homeCommandOf(ruleCtx, t);

  /** Regeln, die vor der KI greifen (Einstellungen, Supermarkt, Backen, "Wir lieben …") */
  const localFirst = (t: string): boolean => {
    if (!data || !today) return false;
    // Startseite, Wochenplan, Einkaufsliste, "Mach das rückgängig" – sofort, mit Rückgängig
    if (homeCommand(t)) return true;
    // "Lies mir vor", "Nicht mehr vorlesen", "Sprich langsamer" (gilt für dieses Gerät)
    const reading = readingChange(t, speechSettings);
    if (reading) {
      setInput("");
      const before = speechSettings;
      unlockSpeech();
      saveSpeechSettings(reading.changes);
      if (reading.changes.mode === "aus") stopSpeaking();
      setChat((c) => ({
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text: t, local: true },
          {
            role: "assistant",
            local: true,
            text: reading.reply,
            undo: () => {
              saveSpeechSettings(before);
              setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – alles wie vorher.", local: true }] }));
            },
          },
        ],
      }));
      return true;
    }
    // Spontan: "Ich will doch mal planen" → nur diese Woche oder ab jetzt immer?
    if (spontanStyle && isPlanUnlockRequest(t)) {
      setInput("");
      const finish = (choice: UnlockChoice) => {
        const result = unlockPlanning(data.profile, today, choice);
        setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", local: true, text: result.text, undo: () => { result.undo(); setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Okay, alles wie vorher – weiter spontan.", local: true }] })); } }] }));
      };
      setChat((c) => ({
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text: t, local: true },
          {
            role: "assistant",
            local: true,
            text: "Gern! Nur diese Woche oder ab jetzt immer?",
            choices: [
              { label: "Nur diese Woche", onClick: () => finish({ kind: "woche" }) },
              {
                label: "Ab jetzt immer",
                onClick: () =>
                  setChat((c2) => ({
                    ...c2,
                    turns: [
                      ...c2.turns,
                      {
                        role: "assistant",
                        local: true,
                        text: "Mal so, mal so – oder richtig mit Wochenplan?",
                        choices: [
                          { label: "Mal so, mal so", onClick: () => finish({ kind: "immer", style: "mix" }) },
                          { label: "Ich plane gern", onClick: () => finish({ kind: "immer", style: "plan" }) },
                        ],
                      },
                    ],
                  })),
              },
            ],
          },
        ],
      }));
      return true;
    }
    // Einstellungen per Gespräch ("Jonne isst jetzt vegetarisch", "Mach die Ansicht dunkel")
    const setting = settingsChange(t, data.profile);
    if (setting) {
      setInput("");
      const before = data.profile;
      saveProfile(setting.profile);
      // Andere Art (Assistentin/Assistent) → passende Stimme statt der fest gewählten
      const voiceBefore = setting.profile.helper.art !== before.helper.art ? loadSpeechSettings().voice : null;
      if (voiceBefore !== null) saveSpeechSettings({ voice: "" });
      setChat((c) => ({
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text: t, local: true },
          {
            role: "assistant",
            local: true,
            text: setting.profile.helper.farbe !== before.helper.farbe && iconChangeHint() ? `${setting.reply} ${iconChangeHint()}` : setting.reply,
            undo: () => {
              saveProfile(before);
              if (voiceBefore !== null) saveSpeechSettings({ voice: voiceBefore });
              setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – alles wie vorher.", local: true }] }));
            },
          },
        ],
      }));
      return true;
    }
    // Im Supermarkt bzw. Backwunsch → kurze Antwort mit Karten (auch ohne KI)
    const special = marketTurn(t) ?? bakingTurn(t);
    if (special) {
      setInput("");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, special] }));
      return true;
    }
    // "Wir lieben Käse" → Lieblingszutaten merken
    const liked = extractLikeStatements(t);
    if (liked.length) {
      learnLikes(liked, LIKE_WEIGHTS.chat);
      const names = liked.length === 1 ? liked[0] : `${liked.slice(0, -1).join(", ")} und ${liked[liked.length - 1]}`;
      const reply: ChatTurnView = {
        role: "assistant",
        local: true,
        text: `Gemerkt ✓ ${names} ${liked.length === 1 ? "kommt" : "kommen"} auf eure Liste „Das mögt ihr“ – baue ich gern öfter ein.`,
      };
      // Reine Aussage → nur merken; steckt noch eine Frage drin, auch die KI fragen
      const more = /\?|plan|setz|woche|rezept|vorschlag|idee|koch/i.test(t);
      setInput("");
      if (!more || !ready) {
        setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, reply] }));
        return true;
      }
      void ask(t, undefined, localFallback).then(() => setChat((c) => ({ ...c, turns: [...c.turns, reply] })));
      return true;
    }
    return false;
  };

  // Panel geschlossen → eine noch laufende Aufnahme nicht mehr abschicken
  // (vor useSpeechInput, damit dieses Aufräumen zuerst läuft)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Gesprochenes dieser Aufnahme anzeigen; wenn sie endet, wird genau das abgeschickt
  const speech = useSpeechInput({
    onTranscript: (t) => setInput(t),
    onEnd: (t) => {
      setInput("");
      if (t && mounted.current) submit(t, true);
    },
  });

  const toggleMic = () => {
    // Erste Berührung schaltet auf dem iPhone auch die Sprachausgabe frei
    unlockSpeech();
    stopSpeaking();
    if (speech.supported === false) {
      // Fallback: Diktat über die Tastatur
      setDictationHint(true);
      inputRef.current?.focus();
      return;
    }
    if (speech.listening) {
      speech.stop();
    } else {
      // Wer spricht, braucht keine Beispiele mehr
      setSuggestionsGone(true);
      stopSpeaking();
      setInput("");
      speech.start();
    }
  };

  // Von der Startseite geöffnet: einmalig Mikrofon starten bzw. Frage stellen
  const latest = useRef({ submit, toggleMic });
  useEffect(() => {
    latest.current = { submit, toggleMic };
  });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !data || !today) return;
    started.current = true;
    if (initialAsk) latest.current.submit(initialAsk);
    else if (startListening) latest.current.toggleMic();
  }, [data, today, initialAsk, startListening]);

  // Schließen beendet das Vorlesen (Escape, Danebentippen, Zurück übernimmt das Fenster)
  useEffect(() => () => stopSpeaking(), []);

  // Neue Nachrichten sichtbar machen
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.turns.length, busy, chat.proposal]);

  // Antworten vorlesen: an, wenn eingeschaltet – im Standard, wenn per Mikrofon gefragt
  const readingOn = shouldRead(speechSettings.mode, viaVoice);


  // Neue Antworten von Lotte vorlesen (nicht, was beim Öffnen schon dastand)
  const speechRef = useRef(speechFor);
  useEffect(() => {
    speechRef.current = speechFor;
  });
  const spokenUpTo = useRef(chat.turns.length);
  useEffect(() => {
    const from = spokenUpTo.current;
    spokenUpTo.current = chat.turns.length;
    if (chat.turns.length <= from || !readingOn) return;
    const fresh = chat.turns.map((t, i) => ({ t, i })).slice(from).filter(({ t }) => t.role === "assistant");
    if (!fresh.length) return;
    speak(fresh.map(({ t }) => speechRef.current(t)).join(" "), { id: `turn-${fresh[fresh.length - 1].i}`, gender: voice });
  }, [chat.turns, readingOn, voice]);

  // Offene Ideen-Antwort (die letzte, solange Spontan kochen läuft) und eingeklappte frühere
  const spontanIndexes = chat.turns.flatMap((t, i) => (t.spontan ? [i] : []));
  const liveSpontan = chat.spontan !== null && spontanIndexes.length ? spontanIndexes[spontanIndexes.length - 1] : -1;
  // Nur der neueste Mail-Entwurf lässt sich ändern
  const lastMailIndex = chat.turns.map((t) => Boolean(t.mail)).lastIndexOf(true);
  const earlier = spontanIndexes.filter((i) => i !== liveSpontan);
  const firstEarlier = earlier[0] ?? -1;
  const earlierTitles = [...new Set(earlier.flatMap((i) => ideasFor(chat.turns[i]).map((idea) => idea.title)))];

  const newChat = () => {
    // Verlauf, offener Vorschlag, Spontan-Modus und geführte Fragen weg – gespeicherte Daten bleiben
    setChat({ turns: [], proposal: null, spontan: null });
    setGuided(null);
    setAdjusting(false);
    setInput("");
  };
  return (
    <Sheet
      title={name}
      onClose={onClose}
      fill
      layer="chat"
      inset={inset}
      height={`min(88dvh, calc(100dvh - ${inset}px - env(safe-area-inset-top) - 0.5rem))`}
      header={
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" onClick={newChat} aria-label="Neues Gespräch" className="hit flex h-10 w-10 items-center justify-center justify-self-start text-accent-strong active:opacity-60">
            <SquarePen className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
          <span className="flex min-w-0 items-center gap-2">
            <LotteAvatar size={32} />
            <h2 className="truncate text-[17px] font-extrabold">{name}</h2>
          </span>
          <button type="button" onClick={onClose} className="hit h-10 justify-self-end px-1 text-[17px] font-bold text-accent-strong active:opacity-60">
            Fertig
          </button>
        </div>
      }
    >
        {guided ? (
          <GuidedChat
            state={guided}
            onChange={setGuided}
            onFinish={() => {
              const added = guided.draft.persons.length > (data?.profile.persons.length ?? 0);
              saveProfile(finalizeProfile(guided));
              setGuided(null);
              if (added) {
                setChat((c) => ({
                  ...c,
                  turns: [...c.turns, { role: "assistant", text: "Gespeichert ✓ Ab jetzt plane ich mit.", local: true }],
                }));
              }
            }}
          />
        ) : (
          <>
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {status === undefined || data === undefined ? (
            <div className="h-20 animate-pulse rounded-card bg-surface" />
          ) : data === null ? (
            <p className={NOTE} role="note">
              <span>
                Leg zuerst euer{" "}
                <Link href="/profil" onClick={onClose} className="font-bold text-accent-strong underline">
                  Haushaltsprofil
                </Link>{" "}
                an – dann weiß ich, für wen ich plane.
              </span>
            </p>
          ) : (
            <p className="max-w-[85%] self-start rounded-card rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink">
              Hi, ich bin {name} – was steht an?
            </p>
          )}
          {status?.askCode && data && !codeLater && <AccessCodeCard onLater={() => setCodeLater(true)} />}
          {chat.turns.map((turn, i) => {
            const last = i === chat.turns.length - 1;
            const showBases = last && !busy && !chat.spontan && asksForBase(turn);
            // Ideen-Antworten: nur die letzte (im Spontan-Modus) ist offen, ältere eingeklappt
            if (turn.spontan) {
              if (i === liveSpontan && data) {
                const ideas = ideasFor(turn);
                const stock = stockFor(turn);
                return (
                  <div key={i} className="flex w-full flex-col items-start gap-2">
                    <SpontanAnswer
                      heading={headingFor(turn, ideas)}
                      ideas={ideas}
                      stock={stock}
                      nearlyEmpty={stockNearlyEmpty(stock)}
                      speaker={speechSupported() ? <SpeakButton speaking={speakingId === `turn-${i}`} onClick={() => toggleSpeak(speechFor(turn), `turn-${i}`, voice)} /> : null}
                      onToday={takeIdea}
                      onAdjust={() => setAdjusting2(turn)}
                      onMore={() => moreIdeas(turn)}
                      onNavigate={onClose}
                    />
                  </div>
                );
              }
              if (i !== firstEarlier) return null;
              return <EarlierIdeas key={i} titles={earlierTitles} />;
            }
            return (
              <ChatTurnItem
                key={i}
                turn={turn}
                last={last}
                data={data}
                showBases={showBases}
                mailActive={last || i === lastMailIndex}
                speaking={speakingId === `turn-${i}`}
                onSpeak={() => toggleSpeak(turn.text, `turn-${i}`, voice)}
                onSubmit={submit}
                onAsk={(text) => void ask(text)}
                onAcceptUnsure={(u) => acceptUnsure(i, u)}
                onMarketAdd={addMarketItems}
                onMarketPlan={planMarketIdea}
                onClose={onClose}
              />
            );
          })}

          {adjusting2 && data && (
            <AdjustSheet filters={adjusting2.ideaFilters ?? []} bases={data.profile.bases} onApply={(f) => applyFilters(adjusting2, f)} onClose={() => setAdjusting2(null)} />
          )}

          {/* Sanfter Gesundheits-Tipp (laut Einstellung, nie als Pop-up) */}
          {data && tipsOn && !chat.spontan && !busy && <TipBubble recipes={data.recipes} />}

          {busy &&
            (streaming ? (
              // Antwort erscheint Wort für Wort
              <p className={`${BUBBLE} self-start rounded-bl-md border border-line bg-surface text-ink`} aria-live="off">
                {streaming}
              </p>
            ) : (
              // Statt Lade-Text: nur der denkende Avatar mit Punkten, danach direkt die Antwort
              <div className="self-start pl-1 pt-2 pr-8" role="status" aria-label={`${name} denkt nach`}>
                <LotteAvatar size={44} />
              </div>
            ))}

          {chat.proposal && data && !busy && (
            <ProposalCard
              data={data}
              proposal={chat.proposal}
              adjusting={adjusting}
              onToggle={(id) =>
                setChat((c) => {
                  if (!c.proposal) return c;
                  const selected = new Set(c.proposal.selected);
                  if (selected.has(id)) selected.delete(id);
                  else selected.add(id);
                  return { ...c, proposal: { ...c.proposal, selected } };
                })
              }
              onApply={() => {
                if (!chat.proposal) return;
                // App-Bedienung, die die KI vorgeschlagen hat: nach "Übernehmen" mit den eigenen Regeln ausführen
                const commands = chat.proposal.ops.flatMap((op) => (op.type === "app_command" && chat.proposal!.selected.has(op.id) ? [op.text] : []));
                onApply(chat.proposal.selected);
                for (const text of commands) {
                  if (!rules(text)) setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: `„${text}“ kann ich in der App so nicht umsetzen – sag’s mir gern anders.`, local: true }] }));
                }
              }}
              onAdjust={() => {
                setAdjusting(true);
                inputRef.current?.focus();
              }}
              onDiscard={() => {
                setAdjusting(false);
                setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: "Okay, verworfen.", local: true }], proposal: null }));
              }}
            />
          )}
        </div>

        <footer className="safe-bottom flex flex-col gap-2 border-t border-line px-4 pt-3">
          {(speech.error || dictationHint) && (
            <p className="text-sm text-muted" role="note">
              {speech.error ||
                "Spracheingabe gibt es in diesem Browser nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach."}
            </p>
          )}
          {suggestions.length > 0 && (
            // Klar als Vorschläge erkennbar (keine Sprechblasen): antippen = als eigene Nachricht senden
            <div className="flex flex-col gap-1.5" aria-label="Vorschläge">
              <p className="text-xs font-semibold text-muted">Zum Beispiel:</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" data-no-swipe>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              // Selbst abgeschickt, während das Mikrofon läuft: Aufnahme verwerfen
              if (speech.listening) speech.cancel();
              submit(input);
            }}
          >
            {/* Mehrzeilig, damit eingefügte Mails ihre Absätze behalten; Enter schickt ab */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={!canType}
              enterKeyHint="send"
              aria-label="Nachricht schreiben"
              placeholder={`Sag ${name}, was ansteht …`}
              className={`${INPUT_BASE} field-sizing-content max-h-36 min-h-12 flex-1 resize-none px-4 py-3 leading-snug`}
            />
            {/* Mikrofon immer rechts; beim Tippen wird es zum Senden-Knopf */}
            {input.trim() ? (
            <button
              type="submit"
              disabled={!canType || busy || !input.trim()}
              aria-label="Senden"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
            ) : (
            <button
              type="button"
              onClick={toggleMic}
              disabled={!canType || busy}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Zuhören beenden" : "Frage einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md transition active:scale-95 disabled:opacity-40 ${
                speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""
              }`}
            >
              {speech.listening ? (
                <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden />
              ) : speech.supported === false ? (
                <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
              ) : (
                <Mic className="h-6 w-6" strokeWidth={2} aria-hidden />
              )}
            </button>
            )}
          </form>
        </footer>
          </>
        )}
    </Sheet>
  );
}
