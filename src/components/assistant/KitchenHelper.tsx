"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { commitOps } from "@/lib/assistant/client";
import { useRecipes } from "@/lib/cookbook";
import { useMealPlans } from "@/lib/mealPlan";
import { useShoppingLists } from "@/lib/shoppingList";
import { useTextFieldFocused } from "@/lib/useMobileKeyboard";
import { useProfile } from "@/lib/useProfile";
import { useWeekPlans } from "@/lib/weekPlan";
import type { AssistantData } from "@/lib/assistant/ops";
import { helperName, helperTitle } from "@/lib/profile";
import { HelperAvatar } from "./HelperAvatar";
import { HelperPanel, type ChatState } from "./HelperPanel";
import { useHelperHint } from "./useHelperHint";

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

const EMPTY_CHAT: ChatState = { turns: [], proposal: null };

/** Sprechblase höchstens einmal pro App-Start (Modul-Zustand = bis zum Neuladen) */
let bubbleDone = false;
const BUBBLE_SECONDS = 5;

/**
 * Nur auf der Startseite: kleine Sprechblase neben dem Knopf ("Frag Lotte"
 * bzw. ein aktueller Hinweis). Klappt nach 5 Sekunden oder beim Scrollen zu.
 */
function HelperBubble({ text, bottom, onOpen }: { text: string; bottom: string; onOpen: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const hide = () => {
      bubbleDone = true;
      setVisible(false);
    };
    const timer = setTimeout(hide, BUBBLE_SECONDS * 1000);
    window.addEventListener("scroll", hide, { passive: true, once: true });
    return () => {
      bubbleDone = true;
      clearTimeout(timer);
      window.removeEventListener("scroll", hide);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      data-kuechenhelfer-blase
      style={{ bottom: `calc(${bottom} + 0.5rem)` }}
      className={`fixed right-[5.25rem] z-20 max-w-[calc(100vw-6.5rem)] origin-right rounded-2xl rounded-br-md border border-line bg-surface px-3.5 py-2 text-left text-sm font-semibold text-ink shadow-card transition duration-300 ${
        visible ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
      }`}
    >
      {text}
    </button>
  );
}

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
  const hint = useHelperHint();

  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const shopping = useShoppingLists();
  const data: AssistantData | null | undefined =
    profile === undefined || !weekPlans || !mealPlans || !recipes || !shopping
      ? undefined
      : profile === null
        ? null
        : { profile, weekPlans, mealPlans, recipes, shopping };

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
    const run = commitOps(data, chat.proposal.ops, selected, prompt);
    setChat((c) => ({ turns: [...c.turns, { role: "assistant", text: "Übernommen ✓", local: true }], proposal: null }));
    setUndo({ run, key: Date.now() });
    setUndone(false);
  };

  // Beim ersten Kennenlernen (Vollbild-Gespräch) kein schwebender Knopf
  const onboarding = profile === null && pathname === "/profil";

  const bottom = `calc(max(1rem, env(safe-area-inset-bottom)) + ${stickyHeight}px)`;

  return (
    <>
      {!open && !typing && !onboarding && (
        <button
          ref={fabRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${helperName(profile)} öffnen – ${helperTitle(profile)}`}
          data-kuechenhelfer-knopf
          style={{ bottom }}
          className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg ring-4 ring-background transition active:scale-95"
        >
          <HelperAvatar size={38} />
        </button>
      )}
      {!open && !typing && !bubbleDone && pathname === "/" && hint && (
        <HelperBubble text={hint} bottom={bottom} onOpen={() => setOpen(true)} />
      )}

      {open && (
        <HelperPanel
          data={data}
          chat={chat}
          setChat={setChat}
          onApply={apply}
          onClose={() => {
            setOpen(false);
            // Fokus zurück auf den Knopf
            setTimeout(() => fabRef.current?.focus(), 0);
          }}
        />
      )}

      {(undo || undone) && (
        <div
          role="status"
          className="fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-ink px-4 py-3 text-white shadow-lg"
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
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 font-bold"
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
