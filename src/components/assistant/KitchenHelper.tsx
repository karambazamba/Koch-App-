"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { commitOps } from "@/lib/lotte/client";
import { onOpenHelper } from "@/lib/lotte/open";
import { learnLikes, likesFromIngredients, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { useRecipes } from "@/lib/essen/cookbook";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { useShoppingLists } from "@/lib/einkauf/shoppingList";
import { useTextFieldFocused } from "@/lib/core/useMobileKeyboard";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { toIsoDate, useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { recordOpen } from "@/lib/core/activity";
import type { SpontanFilter } from "@/lib/essen/spontan";
import type { AssistantData } from "@/lib/lotte/ops";
import { migrateOldTermine, useEntries } from "@/lib/aufgaben/store";
import { useHomeTiles } from "@/lib/core/homeLayout";
import { LotteBar } from "@/components/alltag/HomePager";
import { readDevFlag } from "@/lib/core/features";
import { helperName } from "@/lib/einstellungen/profile";
import { HelperPanel, spontanStartTurn, type ChatState } from "./HelperPanel";
import { loadSpontanFilters } from "./SpontanBoard";

const UNDO_SECONDS = 10;

/** Höhe einer sichtbaren Fuß-Leiste (StickyActions), damit der Knopf darüber schwebt */
function useStickyActionsHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Versteckte Seiten (Activity) haben kein offsetParent
        const bar = [...document.querySelectorAll<HTMLElement>("[data-sticky-actions]")].find((el) => el.offsetParent !== null);
        setHeight(bar ? bar.offsetHeight : 0);
      });
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return height;
}

const EMPTY_CHAT: ChatState = { turns: [], proposal: null, spontan: null };

/**
 * Küchenhelfer: schwebender Knopf unten rechts auf allen Seiten, Panel mit
 * Chat und Vorschlags-Vorschau, nach dem Übernehmen 10 Sekunden "Rückgängig".
 */
export function KitchenHelper() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<ChatState>(EMPTY_CHAT);
  const [undo, setUndo] = useState<{ run: () => void; key: number } | null>(null);
  const [undone, setUndone] = useState(false);
  const typing = useTextFieldFocused();
  const stickyHeight = useStickyActionsHeight();
  const fabRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // Von der Startseite: Mikrofon direkt starten bzw. gleich fragen
  const [start, setStart] = useState<{ listen?: boolean; ask?: string } | null>(null);

  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const shopping = useShoppingLists();
  const entries = useEntries();
  const home = useHomeTiles();
  const data: AssistantData | null | undefined =
    profile === undefined || !weekPlans || !mealPlans || !recipes || !shopping || !entries || !home
      ? undefined
      : profile === null
        ? null
        : { profile, weekPlans, mealPlans, recipes, shopping, entries, home };

  // Alte Termine (wasgibts.termine) einmalig ins neue Modell übernehmen;
  // Entwicklungsansicht nur über /?legacy=1 (nirgends verlinkt)
  useEffect(() => {
    migrateOldTermine();
    readDevFlag(window.location.search);
  }, []);

  // App geöffnet (für "Willkommen zurück" nach 3+ Tagen)
  const today = useToday();
  useEffect(() => {
    if (today) recordOpen(toIsoDate(today));
  }, [today]);

  // Von außen öffnen, z. B. "Spontan kochen" → Spontan-Modus (Filter der Sitzung)
  useEffect(
    () =>
      onOpenHelper((mode, ask, filters) => {
        setOpen(true);
        if (mode === "voice" || ask) setStart({ listen: mode === "voice", ask });
        if (mode !== "spontan") return;
        setChat((c) => {
          const active = (filters as SpontanFilter[] | undefined) ?? c.spontan ?? loadSpontanFilters();
          return { ...c, spontan: active, turns: [...c.turns, spontanStartTurn(active)] };
        });
      }),
    [],
  );

  // "Rückgängig" verschwindet nach 10 Sekunden
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [undo]);
  useEffect(() => {
    if (!undone) return;
    const timer = setTimeout(() => setUndone(false), 2500);
    return () => clearTimeout(timer);
  }, [undone]);

  const apply = (selected: Set<string>) => {
    if (!data || !chat.proposal) return;
    const prompt = [...chat.turns].reverse().find((t) => t.role === "user")?.text ?? "";
    const { undo: run, notes } = commitOps(data, chat.proposal.ops, selected, prompt);
    // Gewählte Gerichte → deren Zutaten zählen als Vorliebe
    const chosen = chat.proposal.ops
      .filter((op) => selected.has(op.id))
      .flatMap((op) =>
        op.type === "add_recipe"
          ? op.recipe.ingredients
          : op.type === "set_meal" && op.dish.kind === "recipe"
            ? (data.recipes[op.dish.recipeId]?.ingredients ?? [])
            : [],
      );
    learnLikes(likesFromIngredients(chosen), LIKE_WEIGHTS.chosen);
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: ["Übernommen ✓", ...notes].join(" "), local: true }], proposal: null }));
    setUndo({ run, key: Date.now() });
    setUndone(false);
  };

  // Kein schwebender Knopf beim ersten Kennenlernen (Vollbild-Gespräch) und
  // auf der Startseite (dort gibt es die Eingabeleiste)
  const hidden = (profile === null && pathname === "/profil") || pathname === "/";

  const bottom = `calc(max(1rem, env(safe-area-inset-bottom)) + ${stickyHeight}px)`;

  return (
    <>
      {/* EIN Design: auf allen Seiten dieselbe dunkle Leiste wie auf der Startseite (dort zeichnet sie HomePager) */}
      {!open && !typing && !hidden && <LotteBar name={helperName(profile)} bottom={stickyHeight ? `${stickyHeight}px` : undefined} />}

      {open && (
        <HelperPanel
          data={data}
          chat={chat}
          setChat={setChat}
          onApply={apply}
          startListening={start?.listen}
          initialAsk={start?.ask}
          onClose={() => {
            setOpen(false);
            setStart(null);
            // Spontan-Modus endet mit dem Schließen
            setChat((c) => (c.spontan ? { ...c, spontan: null } : c));
            // Fokus zurück auf den Knopf
            setTimeout(() => fabRef.current?.focus(), 0);
          }}
        />
      )}

      {(undo || undone) && (
        <div
          role="status"
          className="fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-ink px-4 py-3 text-background shadow-lg"
          style={{ bottom: `calc(${bottom} + 4.5rem)` }}
        >
          {undo ? (
            <>
              <span className="flex-1 font-semibold">Übernommen ✓</span>
              <button
                type="button"
                onClick={() => {
                  undo.run();
                  setUndo(null);
                  setUndone(true);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-background/15 px-3 font-bold"
              >
                <Undo2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                Rückgängig
              </button>
              {/* Restzeit */}
              <span
                key={undo.key}
                className="absolute bottom-0 left-0 h-1 w-full origin-left bg-accent"
                style={{ animation: `shrink ${UNDO_SECONDS}s linear forwards` }}
                aria-hidden
              />
            </>
          ) : (
            <span className="flex-1 font-semibold">Rückgängig gemacht – alles wie vorher.</span>
          )}
        </div>
      )}

    </>
  );
}
