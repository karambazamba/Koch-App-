"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleHelp, Mic, MicOff, Plus, Square, X } from "lucide-react";
import { ICON_BUTTON, INPUT_BASE, chipClass } from "@/components/ui/styles";
import { parseQuickAdd, type QuickAddUnsure } from "@/lib/einkauf/quickAdd";
import { addManualItem, removeManualItems, sectionFor, setItemShop, type ShoppingSettings } from "@/lib/einkauf/shoppingList";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";

type Toast = { text: string; ids: string[]; key: number };

const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

/**
 * Rundes "+" (Trefferfläche 44×44): öffnet von unten ein kleines Feld mit
 * Mikrofon. Erkanntes landet direkt auf der Liste ("3 Sachen hinzugefügt ✓"
 * mit Rückgängig), Unsicheres kommt als grauer Chip zum Bestätigen.
 */
export function QuickAddButton({
  weekStart,
  settings,
  small = false,
  dark = false,
  className = "",
}: {
  weekStart: string;
  settings: ShoppingSettings;
  /** Kleinerer Kreis (Bento-Karte), Trefferfläche bleibt 44×44 */
  small?: boolean;
  /** Dunkler Kreis wie das "+" bei den Aufgaben (Startseite) */
  dark?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Etwas auf die Einkaufsliste setzen"
        className={`flex h-11 w-11 items-center justify-center ${className}`}
      >
        <span className={`flex items-center justify-center rounded-full ${dark ? "bg-bar text-on-bar" : "bg-accent text-on-accent"} shadow-sm transition active:scale-95 ${small ? "h-7 w-7" : "h-9 w-9"}`}>
          <Plus className={small ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.75} aria-hidden />
        </span>
      </button>
      {open && (
        <QuickAddSheet
          weekStart={weekStart}
          settings={settings}
          onClose={(added) => {
            setOpen(false);
            if (added.length) setToast({ text: `${sachen(added.length)} hinzugefügt ✓`, ids: added, key: Date.now() });
          }}
        />
      )}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-background shadow-lg"
        >
          <span className="flex-1 font-semibold">{toast.text}</span>
          <button
            type="button"
            onClick={() => {
              removeManualItems(weekStart, toast.ids);
              setToast({ text: "Wieder runtergenommen.", ids: [], key: Date.now() });
            }}
            className={toast.ids.length ? "h-10 rounded-xl bg-background/15 px-3 font-bold" : "hidden"}
          >
            Rückgängig
          </button>
        </div>
      )}
    </>
  );
}

function QuickAddSheet({
  weekStart,
  settings,
  onClose,
}: {
  weekStart: string;
  settings: ShoppingSettings;
  onClose: (addedIds: string[]) => void;
}) {
  const inset = useKeyboardInset();
  const [input, setInput] = useState("");
  const [added, setAdded] = useState<string[]>([]);
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
    if (result.unsure.length === 0 && unsure.length === 0) return onClose(all);
    setUnsure((u) => [...u, ...result.unsure]);
    setHint("");
  };

  const accept = (item: QuickAddUnsure, useSuggestion: boolean) => {
    const id = add(useSuggestion && item.suggestion ? item.suggestion : item.name, item.amount, item.shop);
    const all = [...added, id];
    const rest = unsure.filter((u) => u !== item);
    setAdded(all);
    setUnsure(rest);
    if (rest.length === 0) onClose(all);
  };

  // Sheet zu → laufende Aufnahme nicht mehr abschicken
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const speech = useSpeechInput({
    onTranscript: (t) => setInput(t),
    onEnd: (t) => {
      setInput("");
      if (t && mounted.current) submit(t);
    },
  });

  const toggleMic = () => {
    if (speech.supported === false) {
      setHint("Spracheingabe gibt es hier nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach.");
      inputRef.current?.focus();
      return;
    }
    if (speech.listening) speech.stop();
    else {
      setInput("");
      speech.start();
    }
  };

  // Escape schließt; Seite dahinter nicht mitscrollen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(added);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, added]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label="Auf die Einkaufsliste">
      <button type="button" aria-label="Schließen" onClick={() => onClose(added)} className="absolute inset-0 bg-black/25" />
      <div
        className="safe-bottom absolute inset-x-0 mx-auto flex w-full max-w-lg flex-col gap-3 rounded-t-3xl bg-background px-4 pt-2 shadow-sheet"
        style={{ bottom: inset }}
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-stone-300" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight">Auf die Liste</h2>
          <button type="button" onClick={() => onClose(added)} aria-label="Schließen" className={ICON_BUTTON}>
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        {added.length > 0 && unsure.length > 0 && (
          <p className="text-sm font-semibold text-accent-strong" role="status">
            {sachen(added.length)} hinzugefügt ✓{" "}
            <button
              type="button"
              onClick={() => {
                removeManualItems(weekStart, added);
                setAdded([]);
              }}
              className="font-semibold text-muted underline"
            >
              Rückgängig
            </button>
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
            <button type="button" onClick={() => onClose(added)} className="self-start text-sm font-semibold text-muted underline">
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
            placeholder={speech.listening ? speech.interim || "Ich höre zu …" : "z. B. Milch, Windeln, Müsli von Rossmann"}
            className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
          />
          {input.trim() ? (
            <button type="submit" aria-label="Hinzufügen" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent shadow-sm active:scale-95">
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Zuhören beenden" : "Einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md active:scale-95 ${
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
      </div>
    </div>
  );
}
