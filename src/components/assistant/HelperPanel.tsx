"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowUp, CircleHelp, Mic, MicOff, Square, Volume2, VolumeX, X } from "lucide-react";
import { baseLabel, bumpBase, sortedBases, type BaseId } from "@/lib/bases";
import { parseLeftovers, type ParsedLeftover } from "@/lib/leftovers/parser";
import { addPantryItems, formatPantryItem } from "@/lib/pantry";
import { ingredientsFromQuestion, isCookIdeasRequest, mergeStock, realStock, soonToUse, stockItem } from "@/lib/dishIdeas";
import { useStock } from "@/lib/useStock";
import { effectivePlanStyle, hasKids, helperName, helperTitle, mealClockFor, saveProfile } from "@/lib/profile";
import { addWish, parseWish, removeWish, wishLabel } from "@/lib/wishes";
import { settingsChange } from "@/lib/settingsChat";
import { isPlanUnlockRequest, unlockPlanning, type UnlockChoice } from "@/lib/planUnlock";
import { finalizeProfile, startAddPerson, type OnboardingState } from "@/lib/onboarding/engine";
import { noteUserAction } from "@/lib/activity";
import { isAddPersonRequest } from "@/lib/onboarding/recognize";
import { GuidedChat } from "@/components/onboarding/GuidedChat";
import { HelperAvatar } from "./HelperAvatar";
import { askAssistant, FALLBACK_TEXT, saveAccessCode, useAssistantStatus } from "@/lib/assistant/client";
import {
  saveSpeechSettings,
  shouldRead,
  speak,
  speechSupported,
  stopSpeaking,
  toggleSpeak,
  unlockSpeech,
  useSpeakingId,
  useSpeechSettings,
} from "@/lib/speech";
import { readingChange } from "@/lib/speechChat";
import type { AssistantData, ChangeOp } from "@/lib/assistant/ops";
import type { ChatTurn } from "@/lib/assistant/protocol";
import { useKeyboardInset } from "@/lib/useMobileKeyboard";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { DEFAULT_SHOPPING_DAY, addDays, planningWeekStart, toIsoDate, useToday, weekStartFor } from "@/lib/weekPlan";
import { addManualItem, removeManualItems, sectionFor, setItemShop, setProduct, useShoppingSettings } from "@/lib/shoppingList";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import { isMarketSituation, marketIdeas, marketProduct, marketTargetDay, type MarketAnswer, type MarketIdea } from "@/lib/market";
import { bakingIdeas, isBakingRequest } from "@/lib/baking";
import type { Recipe } from "@/lib/cookbook";
import { isShoppingRequest, parseProductStatement, parseShoppingText } from "@/lib/shoppingParse";
import { SPONTAN_FILTERS, isQuickRequest, isSnackRequest, parsePauseRequest, pauseLabel, quickIdeas, snackReply, type SpontanFilter, type SpontanIdea } from "@/lib/spontan";
import { takeForDay, takeForToday } from "@/lib/spontanTake";
import { composeWeek, replaceMealPlans } from "@/lib/mealPlan";
import { SpontanBoard } from "./SpontanBoard";
import { MarketBoard, type MarketTarget } from "./MarketBoard";
import { BakingBoard } from "./BakingBoard";
import { ICON_BUTTON, INPUT_BASE, NOTE, buttonClass, chipClass } from "@/components/ui/styles";
import { ProposalCard } from "./ProposalCard";
import { TipBubble } from "./TipBubble";
import { tipsShown, useTipStore } from "@/lib/healthTips";
import { extractLikeStatements, learnFromRecipe, learnLikes, LIKE_WEIGHTS } from "@/lib/likes";

export type ChatTurnView = ChatTurn & {
  /** Fehlermeldung – wird nicht an die KI geschickt */
  error?: boolean;
  /** Nur in der App erzeugt ("Übernommen ✓") – wird nicht an die KI geschickt */
  local?: boolean;
  /** An die KI geschickt statt `text` (z. B. Reste + Basis ausführlich) */
  send?: string;
  /** Spontan kochen: erkannte bzw. schon notierte Zutaten als Chips */
  items?: string[];
  /** Spontan kochen: unbekannte Wörter ("Meintest du …?") */
  unsure?: ParsedLeftover[];
  /** Darunter die Spontan-Ideen (nur beim letzten solchen Eintrag, live) */
  spontan?: boolean;
  /** "Rückgängig" für eine gerade gemachte Änderung */
  undo?: () => void;
  /** Im Supermarkt: Ideen zum Produkt, darunter Liste und "Statt <Tag>" */
  market?: MarketAnswer & { target: MarketTarget | null };
  /** Backwunsch: passende Rezepte mit "Zusammen backen" */
  baking?: Recipe[];
  /** Antwort-Knöpfe unter der Nachricht (nur beim letzten Eintrag) */
  choices?: { label: string; onClick: () => void }[];
};

export type Proposal = { ops: ChangeOp[]; selected: Set<string> };
/** `spontan`: Spontan kochen ("mit dem, was da ist") mit gewählten Filtern; null = aus */
/** `extra`: eben im Chat genannte Zutaten ("Was mach ich mit Hack und Paprika?") – zählen für die Ideen, landen nicht im Vorrat */
export type ChatState = { turns: ChatTurnView[]; proposal: Proposal | null; spontan: SpontanFilter[] | null; extra?: string[] };

/** Erster Eintrag im Spontan-Modus */
export function spontanStartTurn(hasPantry: boolean): ChatTurnView {
  return {
    role: "assistant",
    local: true,
    spontan: true,
    text: hasPantry
      ? "Mit dem, was da ist:"
      : "Was ist noch da? Erzähl einfach. Bis dahin drei schnelle Sachen, die meistens gehen:",
  };
}

/** Fragt die KI nach der Basis? Dann Basis-Chips anbieten */
function asksForBase(turn: ChatTurnView | undefined): boolean {
  return Boolean(turn && turn.role === "assistant" && !turn.local && !turn.error && /basis/i.test(turn.text) && turn.text.includes("?"));
}

const BUBBLE = "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base leading-snug";

const EXAMPLES = ["Morgen gibt's Lachs", "Ich hab 4 Portionen Chili eingefroren", "Wir brauchen Milch und Eier"];

/** Ohne KI: Beispiele, die die App selbst versteht */
const LOCAL_EXAMPLES = ["Was gibt's heute Schnelles?", "Wir brauchen Milch und Eier", "Was ist noch da?"];

/** Spontan: Beispiele ohne Planung */
const SPONTAN_EXAMPLES = ["Was gibt's heute Schnelles?", "Mathis wünscht sich Pfannkuchen", "Setz Milch und Haferflocken auf die Einkaufsliste"];

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
  const today = useToday();
  const inset = useKeyboardInset();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const speechSettings = useSpeechSettings();
  const speakingId = useSpeakingId();
  // Zuletzt per Mikrofon gefragt? Dann liest Lotte (Standard "automatisch") vor
  const [viaVoice, setViaVoice] = useState(Boolean(startListening));
  const [dictationHint, setDictationHint] = useState(false);
  // Zugangscode "Später" – gilt, bis das Panel wieder geöffnet wird
  const [codeLater, setCodeLater] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const collected = useRef("");

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

  /** KI gerade nicht da: erst die eigenen Regeln, sonst der freundliche Satz */
  const notUnderstood = (said: string, local?: (t: string) => boolean) => {
    if (local?.(said)) return;
    setChat((c) => ({
      ...c,
      turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: FALLBACK_TEXT, error: true }],
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
      const result = await askAssistant(history, chat.proposal?.ops ?? [], { ...data, pantry: pantry ?? [] }, toIsoDate(today), weekStart, tipsShown(weekStart, tipStore));
      setChat((c) => {
        // Bisher abgewählte Punkte bleiben abgewählt, neue sind ausgewählt
        const previous = new Set(c.proposal?.ops.map((op) => op.id));
        const selected = new Set(
          result.ops.filter((op) => !previous.has(op.id) || c.proposal?.selected.has(op.id)).map((op) => op.id),
        );
        return {
          ...c,
          turns: [...c.turns, { role: "assistant", text: result.reply }],
          proposal: result.ops.length > 0 ? { ops: result.ops, selected } : null,
        };
      });
    } catch {
      // Offline, kein Guthaben, Limit, falscher Code …: nie Technik-Texte – die Frage
      // wandert an die eigenen Regeln (ohne KI), sonst der freundliche Satz
      setChat((c) => ({ ...c, turns: c.turns.slice(0, -1) }));
      notUnderstood(display ?? question, local);
    } finally {
      setBusy(false);
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
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        { role: "user", text, local: true },
        {
          role: "assistant",
          local: true,
          spontan: true,
          text: known.length ? "Notiert ✓ Damit geht:" : "Das kenne ich nicht ganz:",
          items: known.map(formatPantryItem),
          unsure,
        },
      ],
    }));
    return true;
  };

  /** Spontan-Modus starten (Kachel, Knopf, "Was ist noch da?") */
  const startSpontan = (said?: string, filters: SpontanFilter[] = [], extra: string[] = []) => {
    setInput("");
    setChat((c) => ({
      ...c,
      spontan: filters,
      extra,
      turns: [
        ...c.turns,
        ...(said ? [{ role: "user" as const, text: said, local: true }] : []),
        extra.length
          ? { role: "assistant" as const, local: true, spontan: true, text: `Mit ${extra.join(", ")} und dem, was sonst da ist:` }
          : spontanStartTurn(realStock(pantry ?? []).length > 0),
      ],
    }));
  };

  /** Bestand für die Ideen: Vorrat + Gekauftes + eben Genanntes */
  const stockWithExtra = () => mergeStock(pantry ?? [], (chat.extra ?? []).map((n) => stockItem(n, "s", today ? toIsoDate(today) : "")));

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

  /** Mit KI: andere Ideen zum Vorrat */
  const askMoreIdeas = () => {
    const soon = new Set(soonToUse(pantry ?? [], today ? toIsoDate(today) : "").map((p) => p.name));
    const items = stockWithExtra().map((p) => `${formatPantryItem(p)}${soon.has(p.name) ? " (bald verbrauchen)" : ""}`);
    const filters = (chat.spontan ?? [])
      .map((f) => (f.startsWith("basis:") ? `Basis ${baseLabel(f.slice(6) as BaseId)}` : SPONTAN_FILTERS.find((x) => x.value === f)?.label))
      .filter(Boolean);
    setChat((c) => ({ ...c, spontan: null }));
    void ask(
      `Spontan kochen mit dem, was da ist: ${items.join(", ") || "(nichts notiert)"}.${filters.length ? ` Wünsche: ${filters.join(", ")}.` : ""} Bitte genau 3 schnelle Ideen ohne Einkauf, schnellste zuerst.`,
      "Andere Ideen?",
    );
  };

  /** Unbekanntes Wort übernehmen (Vorschlag oder wie gehört) */
  const acceptUnsure = (turnIndex: number, item: ParsedLeftover) => {
    if (!today) return;
    addPantryItems([{ name: item.suggestion ?? item.name, amount: item.amount, unit: item.unit }], toIsoDate(today));
    setChat((c) => ({
      ...c,
      turns: c.turns.map((t, i) =>
        i === turnIndex
          ? { ...t, unsure: t.unsure?.filter((u) => u !== item), items: [...(t.items ?? []), formatPantryItem({ ...item, name: item.suggestion ?? item.name })] }
          : t,
      ),
    }));
  };

  /** Spontan-Hilfe und Pause per Chat → erledigen und Antwort */
  const spontanReply = (t: string): string | null => {
    if (!data || !today) return null;
    if (isSnackRequest(t)) return snackReply(pantry ?? []);
    const pause = parsePauseRequest(t, today);
    if (pause?.kind === "end") {
      if (!data.profile.pause) return "Schön, dass ihr da seid! 😊";
      saveProfile({ ...data.profile, pause: null });
      return "Willkommen zurück! 😊 Pause ist beendet – sag einfach, wenn ich was vorbereiten soll.";
    }
    if (pause?.kind === "start") {
      saveProfile({ ...data.profile, pause: pause.pause });
      return `Alles klar – Pause ${pauseLabel(pause.pause)} ☀️ Genießt die Zeit, ich plane da nichts und halte mich zurück.`;
    }
    return null;
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
    return {
      text: `Steht drauf ✓ ${names.join(", ")}`,
      undo: () => {
        removeManualItems(weekStart, ids);
        setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – wieder runter von der Liste.", local: true }] }));
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
    const now = new Date();
    const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
      text: kidsWanted ? "Oh ja, backen wir zusammen! 🧁 Das klappt gut mit Kindern:" : "Gern! 🧁 Wie wär's damit:",
      baking: recipes,
    };
  };

  /** Eingabe abschicken: neue Person, Reste-Modus oder Frage an die KI (`byVoice` = per Mikrofon) */
  const submit = (text: string, byVoice = false) => {
    const t = text.trim();
    if (!t || busy || !data || !today) return;
    setViaVoice(byVoice);
    noteUserAction(toIsoDate(today));
    if (isAddPersonRequest(t)) {
      setInput("");
      setGuided(startAddPerson(data.profile, t));
      return;
    }
    if (chat.spontan) {
      void spontanInput(t).then((handled) => {
        if (handled) return;
        // Keine Zutaten → normale Frage, Spontan-Modus endet
        setChat((c) => ({ ...c, spontan: null }));
        submitNormal(t);
      });
      return;
    }
    // "Was ist noch da?", "Reste", "Spontan kochen" → Spontan-Modus
    if (/^(was ist noch da|reste( verwerten)?|was kann ich aus (den |meinen |unseren )?resten|spontan (was )?kochen)/i.test(t)) {
      startSpontan(t);
      return;
    }
    submitNormal(t);
  };

  /** Alles außer Spontan-Modus und neuer Person */
  const submitNormal = (t: string) => {
    if (!data || !today) return;
    // "Zeig mir unsere Rezepte" / "Was haben wir im Vorrat?" → hinführen
    const page = /\b(zeig|öffne|wo sind|wo finde)\w*\b.*\b(rezepte|kochbuch)\b/i.test(t) ? "/kochbuch" : /\b(zeig|öffne)\w*\b.*\b(vorrat|tiefkühler|kühlschrank)\b/i.test(t) ? "/vorrat" : null;
    if (page) {
      setInput("");
      router.push(page);
      onClose();
      return;
    }
    // Pause, Ausflugs-Snacks und "Wir nehmen immer Alsan statt Butter" direkt erledigen
    const direct = spontanReply(t) ?? productReply(t);
    if (direct) {
      setInput("");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: direct, local: true }] }));
      return;
    }
    if (localFirst(t)) return;
    // Alles andere versteht die KI (Vorschlag mit "Übernehmen"); ist sie nicht da, die eigenen Regeln
    if (ready) {
      void ask(t, undefined, localFallback);
      return;
    }
    setInput("");
    notUnderstood(t, localFallback);
  };

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
    const reply = shoppingReply(t) ?? (quick ? { text: quick, undo: undefined } : null);
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

  /** Regeln, die vor der KI greifen (Einstellungen, Supermarkt, Backen, "Wir lieben …") */
  const localFirst = (t: string): boolean => {
    if (!data || !today) return false;
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
      setChat((c) => ({
        ...c,
        turns: [
          ...c.turns,
          { role: "user", text: t, local: true },
          {
            role: "assistant",
            local: true,
            text: setting.reply,
            undo: () => {
              saveProfile(before);
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

  // Gesprochenes sammeln; wenn die Aufnahme endet, wird es abgeschickt
  const speech = useSpeechInput({
    onFinal: (t) => {
      collected.current = `${collected.current} ${t}`.trim();
      setInput(collected.current);
    },
    onEnd: () => {
      const t = collected.current;
      collected.current = "";
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
      stopSpeaking();
      collected.current = "";
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

  // Escape schließt, Seite dahinter scrollt nicht mit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      stopSpeaking();
    };
  }, [onClose]);

  // Neue Nachrichten sichtbar machen
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.turns.length, busy, chat.proposal]);

  // Antworten vorlesen: an, wenn eingeschaltet – im Standard, wenn per Mikrofon gefragt
  const readingOn = shouldRead(speechSettings.mode, viaVoice);
  const toggleVoice = () => {
    unlockSpeech();
    if (readingOn) {
      saveSpeechSettings({ mode: "aus" });
      stopSpeaking();
    } else saveSpeechSettings({ mode: "an" });
  };

  // Neue Antworten von Lotte vorlesen (nicht, was beim Öffnen schon dastand)
  const spokenUpTo = useRef(chat.turns.length);
  useEffect(() => {
    const from = spokenUpTo.current;
    spokenUpTo.current = chat.turns.length;
    if (chat.turns.length <= from || !readingOn) return;
    const fresh = chat.turns.map((t, i) => ({ t, i })).slice(from).filter(({ t }) => t.role === "assistant");
    if (!fresh.length) return;
    speak(fresh.map(({ t }) => t.text).join(" "), { id: `turn-${fresh[fresh.length - 1].i}`, gender: voice });
  }, [chat.turns, readingOn, voice]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label={`${name} – ${helperTitle(data?.profile)}`}>
      <button type="button" aria-label="Küchenhelfer schließen" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <section
        className="absolute inset-x-0 mx-auto flex w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-sheet"
        style={{
          bottom: inset,
          height: `min(88dvh, calc(100dvh - ${inset}px - env(safe-area-inset-top) - 0.5rem))`,
        }}
      >
        <header className="flex flex-col gap-2 px-4 pt-2">
          <span className="mx-auto h-1 w-10 rounded-full bg-stone-300" aria-hidden />
          <div className="flex items-center gap-3">
            <HelperAvatar size={44} variant="badge" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-extrabold leading-tight tracking-tight">
                {name}
                {status?.mock && (
                  <span className="ml-2 align-middle rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">Testmodus</span>
                )}
              </h2>
              <p className="text-sm text-muted">{helperTitle(data?.profile)}</p>
            </div>
            {speechSupported() && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={readingOn}
                aria-label="Antworten vorlesen"
                className={ICON_BUTTON}
              >
                {readingOn ? (
                  <Volume2 className="h-5 w-5 text-accent" strokeWidth={2.25} aria-hidden />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted" strokeWidth={2.25} aria-hidden />
                )}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

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
                an – dann weiß der Küchenhelfer, für wen er plant.
              </span>
            </p>
          ) : (
            <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink">
              Hi, ich bin {name} – was steht an?
            </p>
          )}
          {status?.askCode && data && !codeLater && <AccessCodeCard onLater={() => setCodeLater(true)} />}
          {data && today && chat.turns.length === 0 && (
            <div className="flex flex-col items-start gap-2">
              {(ready ? (spontanStyle ? SPONTAN_EXAMPLES : EXAMPLES) : LOCAL_EXAMPLES).map((example) => (
                <button key={example} type="button" onClick={() => submit(example)} className={`${chipClass(false)} text-left`}>
                  „{example}“
                </button>
              ))}
            </div>
          )}

          {chat.turns.map((turn, i) => {
            const last = i === chat.turns.length - 1;
            const showBases = last && !busy && !chat.spontan && asksForBase(turn);
            const lastSpontan = chat.spontan !== null && turn.spontan && !chat.turns.slice(i + 1).some((t) => t.spontan);
            return (
              <div key={i} className={`flex flex-col gap-2 ${turn.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`flex w-full items-end gap-1 ${turn.role === "user" ? "justify-end" : ""}`}>
                <div
                  className={`${BUBBLE} ${
                    turn.role === "user"
                      ? "rounded-br-md bg-accent text-on-accent"
                      : "rounded-bl-md border border-line bg-surface text-ink"
                  }`}
                >
                  {turn.text}
                  {(turn.items?.length || turn.unsure?.length) ? (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {turn.items?.map((item) => (
                        <span key={item} className={chipClass(true)}>
                          {item}
                        </span>
                      ))}
                      {turn.unsure?.map((u) => (
                        <button
                          key={u.heard}
                          type="button"
                          onClick={() => acceptUnsure(i, u)}
                          className={chipClass(false, "muted")}
                        >
                          {u.suggestion ? `Meintest du ${u.suggestion}?` : `${u.name} übernehmen?`}
                          <CircleHelp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                        </button>
                      ))}
                    </span>
                  ) : null}
                  {turn.items?.length ? (
                    <Link href="/vorrat" onClick={onClose} className="mt-2 block text-sm font-semibold text-accent-strong underline">
                      Im Vorrat ansehen
                    </Link>
                  ) : null}
                </div>
                {turn.role === "assistant" && speechSupported() && (
                  <SpeakButton speaking={speakingId === `turn-${i}`} onClick={() => toggleSpeak(turn.text, `turn-${i}`, voice)} />
                )}
                </div>
                {turn.choices && last && (
                  <div className="flex flex-wrap gap-2">
                    {turn.choices.map((c) => (
                      <button key={c.label} type="button" onClick={c.onClick} className={chipClass(false)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                {turn.undo && last && (
                  <button type="button" onClick={turn.undo} className={chipClass(false, "muted")}>
                    Rückgängig
                  </button>
                )}
                {turn.market && (
                  <MarketBoard
                    answer={turn.market}
                    target={turn.market.target}
                    onAdd={(idea) => addMarketItems(turn.market!.product, idea)}
                    onPlan={planMarketIdea}
                  />
                )}
                {turn.baking && data && <BakingBoard recipes={turn.baking} withKids={hasKids(data.profile)} onNavigate={onClose} />}
                {lastSpontan && data && (
                  <SpontanBoard
                    recipes={data.recipes}
                    pantry={stockWithExtra()}
                    neverAgain={data.profile.neverAgain}
                    baseCounts={data.profile.bases}
                    filters={chat.spontan ?? []}
                    helperName={name}
                    ready={ready}
                    onToggle={(f) => {
                      // Gewählte Basis zählt für die Beliebtheit
                      const on = !chat.spontan?.includes(f);
                      if (on && f.startsWith("basis:")) saveProfile({ ...data.profile, bases: bumpBase(data.profile.bases, f.slice(6) as BaseId) });
                      setChat((c) => ({ ...c, spontan: c.spontan?.includes(f) ? c.spontan.filter((x) => x !== f) : [...(c.spontan ?? []), f] }));
                    }}
                    onTake={takeIdea}
                    onAskMore={askMoreIdeas}
                    onNavigate={onClose}
                  />
                )}
                {showBases && data && (
                  <div className="flex flex-wrap gap-2" aria-label="Basis wählen">
                    {sortedBases(data.profile.bases).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          saveProfile({ ...data.profile, bases: bumpBase(data.profile.bases, b.id) });
                          void ask(b.label);
                        }}
                        className={chipClass(false)}
                      >
                        {b.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void ask("Egal")}
                      className={chipClass(false, "muted")}
                    >
                      Egal
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Sanfter Gesundheits-Tipp (laut Einstellung, nie als Pop-up) */}
          {data && !chat.spontan && !busy && <TipBubble recipes={data.recipes} />}

          {busy && (
            <p className="self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-muted" role="status">
              <span className="animate-pulse">Moment …</span>
            </p>
          )}

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
              onApply={() => chat.proposal && onApply(chat.proposal.selected)}
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
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <button
              type="button"
              onClick={toggleMic}
              disabled={!canType || busy}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Zuhören beenden" : "Frage einsprechen"}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md transition active:scale-95 disabled:opacity-40 ${
                speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""
              }`}
            >
              {speech.listening ? (
                <Square className="h-6 w-6 fill-current" strokeWidth={2} aria-hidden />
              ) : speech.supported === false ? (
                <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
              ) : (
                <Mic className="h-7 w-7" strokeWidth={2} aria-hidden />
              )}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!canType}
              enterKeyHint="send"
              aria-label="Nachricht an den Küchenhelfer"
              placeholder={
                speech.listening
                  ? speech.interim || "Ich höre zu …"
                  : chat.spontan
                    ? "Was ist noch da? z. B. 2 Karotten, Reis"
                    : adjusting
                        ? "Was soll anders sein?"
                        : `Frag ${name} …`
              }
              className={`${INPUT_BASE} h-12 flex-1 px-4`}
            />
            <button
              type="submit"
              disabled={!canType || busy || !input.trim()}
              aria-label="Senden"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </form>
        </footer>
          </>
        )}
      </section>
    </div>
  );
}

/** Einmal den Zugangscode der Familie eingeben – danach versteht Lotte ganze Sätze */
function AccessCodeCard({ onLater }: { onLater: () => void }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "falsch" | "offline">("idle");
  const unlock = async () => {
    setState("busy");
    const ok = await saveAccessCode(code);
    setState(ok ? "idle" : ok === null ? "offline" : "falsch");
  };
  return (
    <form
      className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card"
      aria-label="Zugangscode"
      onSubmit={(e) => {
        e.preventDefault();
        void unlock();
      }}
    >
      <p className="font-bold">Damit ich ganze Sätze verstehe, brauch ich einmal euren Zugangscode.</p>
      <p className="text-sm text-muted">Ich merke ihn mir auf diesem Gerät. Ohne Code helfe ich trotzdem – nur etwas einfacher.</p>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        aria-label="Zugangscode"
        placeholder="Zugangscode"
        className={`${INPUT_BASE} h-12 px-4`}
      />
      {state === "falsch" && <p className="text-sm text-muted" role="status">Der Code passt noch nicht – schau nochmal nach.</p>}
      {state === "offline" && <p className="text-sm text-muted" role="status">Gerade komme ich nicht durch – probier es gleich nochmal.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!code.trim() || state === "busy"} className={buttonClass("primary", "sm")}>
          Freischalten
        </button>
        <button type="button" onClick={onLater} className={buttonClass("ghost", "sm")}>
          Später
        </button>
      </div>
    </form>
  );
}

/** Kleiner Lautsprecher an Lottes Nachricht: liest vor, nochmal Tippen stoppt */
function SpeakButton({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={speaking}
      aria-label={speaking ? "Vorlesen stoppen" : "Vorlesen"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${speaking ? "bg-accent-soft text-accent-strong" : "text-muted"}`}
    >
      {speaking ? <Square className="h-4 w-4 fill-current" strokeWidth={2} aria-hidden /> : <Volume2 className="h-5 w-5" strokeWidth={2} aria-hidden />}
    </button>
  );
}
