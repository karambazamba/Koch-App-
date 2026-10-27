"use client";

import { useRef, useState } from "react";
import { ArrowUp, CircleHelp, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, chipClass, PAGE_PLUS, TILE_PLUS_DOT } from "@/components/ui/styles";
import { parseQuickAdd, type QuickAddUnsure } from "@/lib/einkauf/quickAdd";
import { addManualItem, removeManualItems, sectionFor, setItemShop, type ShoppingSettings } from "@/lib/einkauf/shoppingList";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { pushUndo } from "@/lib/core/undo";
import { openQuick } from "@/lib/core/schnelleingabe";


const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

/**
 * Rundes "+" (Trefferfläche 44×44): öffnet die Schnelleingabe „AUF DIE LISTE“.
 * „Mehr Details“ = das Einkauf-Fenster: Unsicheres als grauer Chip zum
 * Bestätigen, „Oft gekauft“ zum Antippen.
 */
export function QuickAddButton({
  weekStart,
  settings,
  small = false,
  quick = false,
  shop,
  className = "",
}: {
  weekStart: string;
  settings: ShoppingSettings;
  /** Kleinerer Kreis (Bento-Karte), Trefferfläche bleibt 44×44 */
  small?: boolean;
  /** Kleiner hell-oranger Schnell-Knopf (Kacheln auf der Startseite) */
  quick?: boolean;
  /** Offener Laden-Reiter: vorgewählt bei „Kommt auf die Liste für“ */
  shop?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => openQuick({ kind: "einkauf", shopping: { weekStart, ...(shop ? { shop } : {}) }, more: setOpen })}
        aria-label="Etwas auf die Einkaufsliste setzen"
        className={`flex h-11 w-11 items-center justify-center ${className}`}
      >
        {quick ? (
          <span className={TILE_PLUS_DOT}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
          </span>
        ) : (
          <span className={small ? TILE_PLUS_DOT : PAGE_PLUS}>
            <Plus className={small ? "h-3.5 w-3.5" : "h-5 w-5"} strokeWidth={2.75} aria-hidden />
          </span>
        )}
      </button>
      {open !== null && (
        <QuickAddSheet
          weekStart={weekStart}
          settings={settings}
          initialText={open}
          onClose={(added) => {
            setOpen(null);
            // Still: kein Rückgängig beim Hinzufügen ("Mach das rückgängig" geht trotzdem)
            if (added.length) pushUndo(`${sachen(added.length)} auf der Liste`, () => removeManualItems(weekStart, added));
          }}
        />
      )}
    </>
  );
}

function QuickAddSheet({ weekStart, settings, initialText, onClose }: { weekStart: string; settings: ShoppingSettings; initialText: string; onClose: (addedIds: string[]) => void }) {
  const inset = useKeyboardInset();
  const added = useRef<string[]>([]);
  return (
    <Sheet title="Auf die Liste" onClose={() => onClose(added.current)} inset={inset}>
      <QuickAddBody weekStart={weekStart} settings={settings} initialText={initialText} onAdded={onClose} onChange={(ids) => (added.current = ids)} />
    </Sheet>
  );
}

function QuickAddBody({
  weekStart,
  settings,
  onAdded,
  onChange,
  initialText,
}: {
  weekStart: string;
  settings: ShoppingSettings;
  /** Alles erkannt bzw. „Fertig“ */
  onAdded: (addedIds: string[]) => void;
  onChange?: (addedIds: string[]) => void;
  initialText: string;
}) {
  const [input, setInput] = useState(initialText);
  const [added, setAddedState] = useState<string[]>([]);
  const setAdded = (next: string[] | ((a: string[]) => string[])) =>
    setAddedState((a) => {
      const v = typeof next === "function" ? next(a) : next;
      onChange?.(v);
      return v;
    });
  const finish = (ids: string[]) => {
    onAdded(ids);
    setAdded([]);
    setPicked([]);
  };
  const [unsure, setUnsure] = useState<QuickAddUnsure[]>([]);
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // "Oft gekauft": Stammartikel, am häufigsten gekaufte zuerst (angetippte verschwinden)
  const [picked, setPicked] = useState<string[]>([]);
  const frequent = settings.staples
    .filter((st) => st.active && !picked.includes(st.id))
    .sort((a, b) => b.purchases.length - a.purchases.length)
    .slice(0, 8);

  const add = (name: string, amount: string, shop: string) => {
    const id = addManualItem(weekStart, { name, amount, section: sectionFor(name) });
    if (shop) setItemShop(settings.products[name.toLowerCase()] ?? name, shop);
    return id;
  };

  const submit = (text: string) => {
    if (!text.trim()) return;
    const result = parseQuickAdd(text, settings);
    const ids = result.items.map((i) => add(i.name, i.amount, i.shop));
    setInput("");
    if (!ids.length && !result.unsure.length) {
      setHint("Sag z. B. „Milch, Windeln und Müsli von Rossmann“.");
      return;
    }
    const all = [...added, ...ids];
    setAdded(all);
    // Alles erkannt → kurz bestätigen (draußen) und schließen
    if (result.unsure.length === 0 && unsure.length === 0) return finish(all);
    setUnsure((u) => [...u, ...result.unsure]);
    setHint("");
  };

  const accept = (item: QuickAddUnsure, useSuggestion: boolean) => {
    const id = add(useSuggestion && item.suggestion ? item.suggestion : item.name, item.amount, item.shop);
    const all = [...added, id];
    const rest = unsure.filter((u) => u !== item);
    setAdded(all);
    setUnsure(rest);
    if (rest.length === 0) finish(all);
  };

  return (
    <>
        {added.length > 0 && unsure.length > 0 && (
          <p className="text-sm font-semibold text-accent-strong" role="status">
            {sachen(added.length)} hinzugefügt ✓
          </p>
        )}
        {unsure.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Soll das auch drauf?</p>
            <div className="flex flex-wrap gap-2">
              {unsure.map((u) => (
                <button key={`${u.name}|${u.amount}`} type="button" onClick={() => accept(u, true)} className={chipClass(false, "muted")}>
                  {u.suggestion ? `Meintest du ${u.suggestion}?` : `${u.name}?`}
                  <CircleHelp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </button>
              ))}
              {unsure.some((u) => u.suggestion) &&
                unsure
                  .filter((u) => u.suggestion)
                  .map((u) => (
                    <button key={`as-is|${u.name}`} type="button" onClick={() => accept(u, false)} className={chipClass(false, "muted")}>
                      „{u.name}“ so lassen
                    </button>
                  ))}
            </div>
            <button type="button" onClick={() => finish(added)} className="self-start text-sm font-semibold text-muted underline">
              Fertig
            </button>
          </div>
        )}
        {frequent.length > 0 && unsure.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted">Oft gekauft</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
              {frequent.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    const id = add(st.name, st.amount, "");
                    setAdded((a) => [...a, id]);
                    setPicked((p) => [...p, st.id]);
                  }}
                  className={`${chipClass(false)} shrink-0`}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  {st.name}
                </button>
              ))}
            </div>
            {picked.length > 0 && (
              <p className="text-sm font-semibold text-accent-strong" role="status">
                {sachen(added.length)} hinzugefügt ✓
              </p>
            )}
          </div>
        )}
        {hint && (
          <p className="text-sm text-muted" role="note">
            {hint}
          </p>
        )}

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            enterKeyHint="done"
            aria-label="Was soll auf die Liste?"
            placeholder="z. B. Milch, Windeln, Müsli von Rossmann"
            className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
          />
          <button type="submit" aria-label="Hinzufügen" aria-disabled={!input.trim()} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${input.trim() ? "" : "opacity-35"}`}>
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </form>
    </>
  );
}
