"use client";

import { useSchnellnotiz, useNotes } from "@/lib/notizen";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { onOpenHelper } from "@/lib/begleitung/open";
import { learnLikes, likesFromIngredients, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { useRecipes } from "@/lib/essen/cookbook";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { useShoppingLists } from "@/lib/einkauf/shoppingList";
import { useTextFieldFocused } from "@/lib/core/useMobileKeyboard";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { toIsoDate, useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { recordOpen } from "@/lib/core/activity";
import type { SpontanFilter } from "@/lib/essen/spontan";
import type { AssistantData } from "@/lib/begleitung/ops";
import { migrateOldTermine, useEntries } from "@/lib/kalender/store";
import { useHomeTiles } from "@/lib/core/homeLayout";
import { BegleitungBar } from "@/components/begleitung/BegleitungBar";
import { helperName } from "@/lib/einstellungen/profile";
import { removeRetiredKeys } from "@/lib/core/storage";
import { adoptLegacySpeech } from "@/lib/begleitung/speech";
import { adoptSchnellnotiz } from "@/lib/notizen/schnellnotiz";
import { spontanStartTurn, type ChatState } from "@/components/begleitung/chatTypes";
import { loadSpontanFilters } from "@/lib/essen/spontanFilters";
import dynamic from "next/dynamic";

// Das Gespräch (mit Mails, Backstube, Supermarkt …) wird erst gebraucht, wenn
// man es öffnet – eigener Teil, der nach dem Laden der Seite im Leerlauf vorgeholt wird
const loadPanel = () => import("@/components/begleitung/HelperPanel").then((m) => m.HelperPanel);
const HelperPanel = dynamic(loadPanel, { ssr: false });

/** Nur nach echtem Löschen: kleine Meldung "Gelöscht · Rückgängig" für 3 Sekunden */
const UNDO_SECONDS = 3;
const DELETING = new Set(["remove_entry", "remove_note", "remove_shopping", "clear_shopping", "clear_week"]);

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
  const notes = useNotes();
  const schnellnotiz = useSchnellnotiz();
  const data: AssistantData | null | undefined =
    profile === undefined || !weekPlans || !mealPlans || !recipes || !shopping || !entries || !home || !notes || !schnellnotiz
      ? undefined
      : profile === null
        ? null
        : { profile, weekPlans, mealPlans, recipes, shopping, entries, home, notes, schnellnotiz: schnellnotiz.text };

  // Gespräch im Leerlauf vorholen, damit es beim Antippen sofort da ist
  useEffect(() => {
    const preload = () => void loadPanel();
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(preload, { timeout: 4000 });
    else setTimeout(preload, 1500);
  }, []);

  // Alte Daten einmalig übernehmen, dann nicht mehr genutzte Schlüssel löschen
  useEffect(() => {
    migrateOldTermine();
    adoptLegacySpeech();
    adoptSchnellnotiz();
    removeRetiredKeys(localStorage, sessionStorage);
    // Sprachnachrichten aufräumen (IndexedDB) – erst bei Bedarf geladen
    void import("@/lib/pinnwand/memoAudio").then((m) => m.tidyMemos());
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

  const apply = async (selected: Set<string>) => {
    if (!data || !chat.proposal) return;
    const prompt = [...chat.turns].reverse().find((t) => t.role === "user")?.text ?? "";
    // Erst hier geladen (das Gespräch hat es schon geholt) – hält das Layout klein
    const { commitOps } = await import("@/lib/begleitung/client");
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
    // Hinzufügen/Ändern still; nur echtes Löschen bekommt "Rückgängig"
    const deleting = chat.proposal.ops.some((op) => selected.has(op.id) && (DELETING.has(op.type) || (op.type === "home" && op.change.action === "ausblenden")));
    if (deleting) setUndo({ run, key: Date.now() });
    setUndone(false);
  };

  // Kein schwebender Knopf beim ersten Kennenlernen (Vollbild-Gespräch) und
  // auf der Startseite (dort gibt es die Eingabeleiste)
  const hidden = (profile === null && pathname === "/profil") || pathname === "/";

  const bottom = "max(1rem, env(safe-area-inset-bottom))";

  return (
    <>
      {/* EIN Design: auf allen Seiten dieselbe helle Mia-Leiste wie auf der Startseite (dort zeichnet sie HomePager) */}
      {!open && !typing && !hidden && <BegleitungBar name={helperName(profile)} />}

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
          className="fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 overflow-hidden rounded-card border border-line bg-surface px-4 py-3 text-ink shadow-sheet"
          style={{ bottom: `calc(${bottom} + 4.5rem)` }}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-soft text-good-ink" aria-hidden>
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          {undo ? (
            <>
              <span className="flex-1 font-semibold">Gelöscht</span>
              <button
                type="button"
                onClick={() => {
                  undo.run();
                  setUndo(null);
                  setUndone(true);
                }}
                className="hit inline-flex h-10 items-center px-2 font-extrabold text-accent-strong"
              >
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
