"use client";

// "Heute" kompakt: TERMINE als bis zu drei Kärtchen nebeneinander (eins =
// volle Breite), AUFGABEN als eine Karte mit bis zu drei schlanken Zeilen.
// Rechts "+ N weitere" und der kleine Schnell-Knopf "+". Titel antippen =
// Menü, Kästchen/Kreis = abhaken (Animation, Vibration); der nächste rückt nach.

import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { clockLabel } from "@/lib/aufgaben/answers";
import { setDone, taskBadge, type DayItem } from "@/lib/aufgaben/model";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TerminQuickAdd } from "./TerminQuickAdd";
import { act, buzz } from "./actions";
import { ItemMenu, roomBar } from "./Items";
import { EntryForm } from "./EntryForm";

const LEAVE_MS = 420;

function useSection() {
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  // Nach dem Abhaken: welche Kärtchen vorher da waren – neue gleiten herein
  const [before, setBefore] = useState<string[] | null>(null);
  const check = (item: DayItem, shown: DayItem[]) => {
    setBefore(shown.map((i) => i.key));
    act((list, stamp) => setDone(list, item, true, stamp), `Erledigt ✓ ${item.title}`);
    setTimeout(() => setBefore(null), 700);
  };
  const overlays = (
    <>
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
    </>
  );
  return { setMenu, check, before, overlays };
}

function SectionHead({ title, more, href, action }: { title: string; more: number; href: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-2 px-1">
      {/* Überschrift öffnet die Seite dazu (Tag bzw. Aufgaben) – keine Sackgasse */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
        <Link href={href} className="-my-2 inline-flex h-11 items-center">
          {title}
        </Link>
      </h2>
      <span className="flex-1" />
      {more > 0 && (
        <Link href={href} className="-my-2 flex h-11 items-center text-[13px] font-bold text-accent-strong">
          + {more} weitere
        </Link>
      )}
      {action && <span className="ml-1 flex items-center">{action}</span>}
    </div>
  );
}

/** Kärtchen-Hülle: Farbstreifen links, Ausblenden beim Abhaken, Hereingleiten für Neue */
function MiniCard({ item, leaving, entering, children }: { item: DayItem; leaving: boolean; entering: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`${CARD} relative min-w-0 overflow-hidden transition duration-300 ${leaving ? "scale-95 opacity-0" : ""}`}
      style={entering ? { animation: "card-in 0.32s ease-out" } : undefined}
      data-item={item.key}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${roomBar(item.room)}`} aria-hidden />
      {children}
    </li>
  );
}

function useLeaving(onDone: (item: DayItem) => void) {
  const [leaving, setLeaving] = useState<string | null>(null);
  const start = (item: DayItem) => {
    if (leaving) return;
    buzz();
    setLeaving(item.key);
    setTimeout(() => {
      setLeaving(null);
      onDone(item);
    }, LEAVE_MS);
  };
  return { leaving, start };
}

/** Dezente Zeile statt einer leeren Kachel ("+ Termin hinzufügen") */
function AddLine({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 items-center gap-1.5 self-start px-1 text-sm font-semibold text-muted" aria-label={label}>
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      {label}
    </button>
  );
}

/** TERMINE: die nächsten drei anstehenden nebeneinander, "+ N weitere" → Tagesansicht, "+" = neuer Termin */
export function TermineSection({ items, href, today }: { items: DayItem[]; href: string; today?: string }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const shown = items.slice(0, 3);
  const { leaving, start } = useLeaving((item) => check(item, shown));
  const sheet = adding && <TerminQuickAdd onClose={() => setAdding(false)} defaultDate={today} />;
  if (!items.length)
    return (
      <>
        <AddLine label="Termin hinzufügen" onClick={() => setAdding(true)} />
        {sheet}
      </>
    );
  return (
    <section className="flex flex-col gap-1.5" aria-label="Termine">
      <SectionHead title="Termine" more={items.length - shown.length} href={href} action={<QuickButton icon={Plus} label="Neuer Termin" onClick={() => setAdding(true)} />} />
      <ul className={`grid gap-2 ${shown.length === 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {shown.map((item) => {
          const isLeaving = leaving === item.key;
          return (
            <MiniCard key={item.key} item={item} leaving={isLeaving} entering={Boolean(before && !before.includes(item.key))}>
              <button type="button" onClick={() => setMenu(item)} className="flex w-full flex-col items-start gap-0.5 py-2.5 pl-3.5 pr-2.5 text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
                <span className="pr-6 text-[14px] font-extrabold leading-tight tabular-nums">{item.time ? clockLabel(item.time) : "–"}</span>
                <span className="line-clamp-2 w-full hyphens-auto break-words text-[11.5px] font-semibold leading-snug">
                  {item.title}
                </span>
              </button>
              <button type="button" role="checkbox" aria-checked={isLeaving} aria-label={`${item.title} erledigt`} onClick={() => start(item)} className="absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-2">
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-md border-2 transition ${isLeaving ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
                  style={isLeaving ? { animation: "check-pop 0.4s ease-out" } : undefined}
                >
                  {isLeaving && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                </span>
              </button>
            </MiniCard>
          );
        })}
      </ul>
      {overlays}
      {sheet}
    </section>
  );
}

/** Eine schlanke Aufgaben-Zeile: Kreis zum Abhaken, Titel einzeilig ("…"), rechts klein die Frist ("heute" orange) und der Punkt */
export function TaskLine({ item, today, onOpen, onDone, leaving, entering }: { item: DayItem; today: string; onOpen: (i: DayItem) => void; onDone: (i: DayItem) => void; leaving?: boolean; entering?: boolean }) {
  const badge = taskBadge(item, today);
  const checked = item.done || leaving;
  return (
    <li
      className={`flex items-center gap-1 py-1 pr-3 transition duration-300 ${leaving ? "opacity-0" : ""}`}
      style={entering ? { animation: "card-in 0.32s ease-out" } : undefined}
      data-item={item.key}
    >
      <button type="button" role="checkbox" aria-checked={Boolean(checked)} aria-label={`${item.title} erledigt`} onClick={() => onDone(item)} className="flex h-11 w-11 shrink-0 items-center justify-center">
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition ${checked ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
          style={leaving ? { animation: "check-pop 0.4s ease-out" } : undefined}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <button type="button" onClick={() => onOpen(item)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
        {badge && <span className={`shrink-0 text-xs ${badge === "heute" ? "font-semibold text-accent-strong" : "text-muted"}`}>{badge}</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBar(item.room)}`} aria-hidden />
      </button>
    </li>
  );
}

/** AUFGABEN: eine Karte mit den drei dringendsten Zeilen, "+ N weitere", kleiner "+" */
export function AufgabenSection({ items, more, today, href = "/aufgaben" }: { items: DayItem[]; more: number; today: string; href?: string }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const shown = items.slice(0, 3);
  const { leaving, start } = useLeaving((item) => check(item, shown));
  const plus = <QuickButton icon={Plus} label="Neue Aufgabe" onClick={() => setAdding(true)} />;
  return (
    <>
      {items.length > 0 ? (
        <section className="flex flex-col gap-1.5" aria-label="Aufgaben">
          <SectionHead title="Aufgaben" more={more} href={href} action={plus} />
          <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
            {shown.map((item) => (
              <TaskLine key={item.key} item={item} today={today} onOpen={setMenu} onDone={start} leaving={leaving === item.key} entering={Boolean(before && !before.includes(item.key))} />
            ))}
          </ul>
        </section>
      ) : (
        <AddLine label="Aufgabe hinzufügen" onClick={() => setAdding(true)} />
      )}
      {overlays}
      {adding && <TaskQuickAdd onClose={() => setAdding(false)} />}
    </>
  );
}
