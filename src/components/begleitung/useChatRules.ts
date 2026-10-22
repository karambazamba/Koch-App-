"use client";

// Feste Regeln des Chats in fester Reihenfolge (ohne KI – oder wenn die KI
// per `app_befehl` darum bittet): Mail, Pinnwand, Tag, Notizen, neue Person,
// Spontan-Ideen, Bausteine, Seiten, Pause, Snacks/Produkte, dann die früheren
// „Regeln vor der KI“ (Startseite, Vorlesen, Planen, Einstellungen, Supermarkt,
// Backen, "Wir lieben …") und zuletzt Einkauf, Termine, Wünsche.

import type { Dispatch, SetStateAction } from "react";
import { baseLabel, type BaseId } from "@/lib/essen/bases";
import { ingredientsFromQuestion, isCookIdeasRequest } from "@/lib/essen/dishIdeas";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { addWish, parseWish, removeWish, wishLabel } from "@/lib/essen/wishes";
import { settingsChange } from "@/lib/begleitung/settingsChat";
import { iconChangeHint } from "@/lib/core/homescreen";
import { isPlanUnlockRequest, unlockPlanning, type UnlockChoice } from "@/lib/essen/planUnlock";
import { startAddPerson, type OnboardingState } from "@/lib/einstellungen/onboarding/engine";
import { isAddPersonRequest } from "@/lib/einstellungen/onboarding/recognize";
import { householdIntroReply, parseHouseholdIntro } from "@/lib/einstellungen/householdIntro";
import { calendarChat, changeEntries } from "@/lib/kalender";
import { loadCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { pushUndo } from "@/lib/core/undo";
import { loadSpeechSettings, saveSpeechSettings, stopSpeaking, unlockSpeech, type SpeechSettings } from "@/lib/begleitung/speech";
import { readingChange } from "@/lib/begleitung/speechChat";
import { bakingAnswer, marketAnswer, quickAnswer } from "@/lib/begleitung/localAnswers";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate } from "@/lib/essen/weekPlan";
import { addManualItem, removeManualItems, sectionFor, setItemShop, setProduct, useShoppingSettings } from "@/lib/einkauf/shoppingList";
import type { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { isShoppingRequest, parseProductStatement, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { filtersFromText, isIdeaFilterRequest, isQuickRequest, isSnackRequest, snackReply } from "@/lib/essen/spontan";
import { extractLikeStatements, learnLikes, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { saveSpontanFilters } from "@/lib/essen/spontanFilters";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";
import { pauseRule, dayRule, boardRule, schnellnotizRule, noteRule, bausteinRule, calendarImportRule, homeCommand, shopModeRule, memoPlayRule, type RuleContext } from "@/components/begleitung/localRules";
import { mailRule } from "@/components/begleitung/mailRules";
import type { SpontanChat } from "@/components/begleitung/useSpontanChat";

type Options = {
  ruleCtx: RuleContext;
  chat: ChatState;
  setGuided: Dispatch<SetStateAction<OnboardingState | null>>;
  startSpontan: SpontanChat["startSpontan"];
  pantry: PantryItem[] | undefined;
  shopping: ReturnType<typeof useWeekShoppingList>;
  shoppingSettings: ReturnType<typeof useShoppingSettings>;
  speechSettings: SpeechSettings;
  spontanStyle: boolean;
  ready: boolean;
  ask: (text: string, display?: string, local?: (t: string) => boolean) => Promise<void>;
};

/** Die festen Regeln; `rules(t)` = true, wenn erledigt */
export function useChatRules({ ruleCtx, chat, setGuided, startSpontan, pantry, shopping, shoppingSettings, speechSettings, spontanStyle, ready, ask }: Options) {
  const { data, today, setChat, setInput, router, onClose } = ruleCtx;

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
    const reply = calendarChat(t, loadCalendarEntries(), toIsoDate(today), data.profile.persons);
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
    const answer = marketAnswer(t, data, today, pantry ?? [], shopping?.list.items ?? [], spontanStyle);
    return answer ? { role: "assistant", local: true, text: answer.text, market: answer.market } : null;
  };

  /** Backwunsch → eigene Backrezepte und die eingebaute Backstube */
  const bakingTurn = (t: string): ChatTurnView | null => {
    const answer = bakingAnswer(t, data);
    return answer ? { role: "assistant", local: true, text: answer.text, baking: answer.baking } : null;
  };

  /** Feste Regeln (ohne KI, oder wenn die KI ein `app_befehl` schickt). true = erledigt */
  const rules = (t: string): boolean => {
    if (!data || !today) return false;
    if (mailRule(ruleCtx, chat.turns, t)) return true;
    if (boardRule(ruleCtx, t)) return true;
    if (dayRule(ruleCtx, t)) return true;
    if (schnellnotizRule(ruleCtx, t)) return true;
    if (noteRule(ruleCtx, t)) return true;
    // „Ich bin Felix, wir sind Lisa und drei Kinder“ → Vorschlag mit „Übernehmen“
    const intro = parseHouseholdIntro(t);
    if (intro) {
      setInput("");
      const op = { id: "haushalt-1", type: "set_household", intro } as const;
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: householdIntroReply(intro), local: true }], proposal: { ops: [op], selected: new Set([op.id]) } }));
      return true;
    }
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
    // „Übernimm meinen Google-Kalender“ → Weg erklären und „Kalender übernehmen“ öffnen
    if (calendarImportRule(ruleCtx, t)) return true;
    // Ausgeschalteter Baustein ("Zeig mir den Vorrat") → einschalten, bevor eine Seite geöffnet wird
    if (bausteinRule(ruleCtx, t)) return true;
    // "Zeig mir unsere Rezepte" / "Was haben wir im Vorrat?" → hinführen
    const page = /(?<![a-zäöüß])(zeig|öffne|wo sind|wo finde)\w*\b.*\b(rezepte|kochbuch)\b/i.test(t) ? "/kochbuch" : /(?<![a-zäöüß])(zeig|öffne)\w*\b.*\b(vorrat|tiefkühler|kühlschrank)\b/i.test(t) ? "/vorrat" : null;
    if (page) {
      setInput("");
      router.push(page);
      onClose();
      return true;
    }
    if (pauseRule(ruleCtx, t)) return true;
    // Ausflugs-Snacks und "Wir nehmen immer Alsan statt Butter" direkt erledigen
    const direct = (isSnackRequest(t) ? snackReply(pantry ?? []) : null) ?? productReply(t);
    if (direct) {
      setInput("");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: direct, local: true }] }));
      return true;
    }
    return localFirst(t) || localFallback(t);
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
    const quick = isQuickRequest(t) ? quickAnswer(data) : null;
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

  /** Regeln, die vor der KI greifen (Einstellungen, Supermarkt, Backen, "Wir lieben …") */
  const localFirst = (t: string): boolean => {
    if (!data || !today) return false;
    // Startseite, Wochenplan, Einkaufsliste, "Mach das rückgängig" – sofort, mit Rückgängig
    if (homeCommand(ruleCtx, t)) return true;
    // "Ich bin bei REWE" → Einkaufsmodus
    if (shopModeRule(ruleCtx, t)) return true;
    // "Spiel das Memo von Lisa ab" – direkt im Antippen (sonst spielt das iPhone nicht ab)
    if (memoPlayRule(ruleCtx, t)) return true;
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

  return { rules };
}
