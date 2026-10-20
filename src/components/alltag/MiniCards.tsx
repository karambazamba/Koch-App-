"use client";

// "Heute": TERMINE und AUFGABEN je Größe – S: der nächste Termin bzw. die
// wichtigste Aufgabe, M: 3 Kärtchen nebeneinander bzw. 3 Zeilen, L: alle
// Termine des Tages bzw. 6 Zeilen. Rechts "+ N weitere" und der kleine
// Schnell-Knopf "+". Titel antippen = Menü, Kästchen/Kreis = abhaken: bleibt
// ca. 1 s durchgestrichen (nochmal tippen = doch nicht), dann rückt der
// nächste nach – still, ohne Meldung.

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { clockLabel } from "@/lib/aufgaben/answers";
import { isUrgent, setDone, taskBadge, type DayItem } from "@/lib/aufgaben/model";
import { UrgentMark } from "./UrgentMark";
import type { TileSize } from "@/lib/core/homeLayout";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TerminQuickAdd } from "./TerminQuickAdd";
import { act, buzz } from "./actions";
import { ItemMenu, roomBar } from "./Items";
import { EntryForm } from "./EntryForm";

const LEAVE_MS = 1000;

function useSection() {
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  // Nach dem Abhaken: welche Einträge vorher da waren – neue gleiten herein
  const [before, setBefore] = useState<string[] | null>(null);
  const check = (item: DayItem, shown: DayItem[]) => {
    setBefore(shown.map((i) => i.key));
    act((list, stamp) => setDone(list, item, true, stamp), item.title);
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

function SectionHead({ title, more, href, action, moreLabel }: { title: string; more: number; href: string; action?: React.ReactNode; moreLabel?: string }) {
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
          + {more} {moreLabel ?? "weitere"}
        </Link>
      )}
      {action && <span className="ml-1 flex items-center">{action}</span>}
    </div>
  );
}

/** Kärtchen-Hülle: Farbstreifen links, Hereingleiten für Neue */
function MiniCard({ item, entering, children }: { item: DayItem; entering: boolean; children: React.ReactNode }) {
  return (
    <li className={`${CARD} relative min-w-0 overflow-hidden`} style={entering ? { animation: "card-in 0.32s ease-out" } : undefined} data-item={item.key}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${roomBar(item.room)}`} aria-hidden />
      {children}
    </li>
  );
}

/** Abhaken mit kurzer Bedenkzeit: ca. 1 s durchgestrichen, nochmal tippen = doch nicht */
export function useLeaving(onDone: (item: DayItem) => void) {
  const [leaving, setLeaving] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = (item: DayItem) => {
    if (leaving === item.key) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setLeaving(null);
      return;
    }
    if (leaving) return;
    buzz();
    setLeaving(item.key);
    timer.current = setTimeout(() => {
      timer.current = null;
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

function CheckBox({ item, checked, onClick, round = false }: { item: DayItem; checked: boolean; onClick: () => void; round?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={`${item.title} erledigt`} onClick={onClick} className="flex h-11 w-11 shrink-0 items-center justify-center">
      <span
        className={`flex items-center justify-center border-2 transition ${round ? "h-[22px] w-[22px] rounded-full" : "h-[18px] w-[18px] rounded-md"} ${checked ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
        style={checked ? { animation: "check-pop 0.4s ease-out" } : undefined}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

/**
 * TERMINE – S: der nächste + "+2 weitere heute"; M: die nächsten drei
 * nebeneinander; L: alle Termine des Tages als Liste. "+" = neuer Termin.
 */
export function TermineSection({ items, all, href, today, size = "M" }: { items: DayItem[]; all?: DayItem[]; href: string; today?: string; size?: TileSize }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const list = size === "L" ? (all ?? items) : items;
  const shown = size === "S" ? list.slice(0, 1) : size === "M" ? list.slice(0, 3) : list;
  const { leaving, start } = useLeaving((item) => check(item, shown));
  const sheet = adding && <TerminQuickAdd onClose={() => setAdding(false)} defaultDate={today} />;
  const plus = <QuickButton icon={Plus} label="Neuer Termin" onClick={() => setAdding(true)} />;
  if (!list.length)
    return (
      <>
        <AddLine label="Termin hinzufügen" onClick={() => setAdding(true)} />
        {sheet}
      </>
    );
  if (size === "S") {
    const item = shown[0];
    const isLeaving = leaving === item.key;
    return (
      <section className={`${CARD} relative flex min-h-[92px] flex-col overflow-hidden p-3.5 pl-4`} aria-label="Termine">
        <span className={`absolute inset-y-0 left-0 w-1.5 ${roomBar(item.room)}`} aria-hidden />
        <div className="flex items-center gap-1 pr-6">
          <Link href={href} className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Termine
          </Link>
        </div>
        <span className="absolute right-3.5 top-3">{plus}</span>
        <button type="button" onClick={() => setMenu(item)} className="mt-1 flex flex-col items-start text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
          <span className="text-[15px] font-extrabold tabular-nums leading-tight">{item.time ? clockLabel(item.time) : "–"}</span>
          <span className={`line-clamp-2 text-[13px] font-semibold leading-snug ${isLeaving ? "text-muted line-through" : ""}`}>{item.title}</span>
        </button>
        {list.length > 1 && (
          <Link href={href} className="mt-0.5 text-xs font-bold text-accent-strong">
            +{list.length - 1} weitere heute
          </Link>
        )}
        {overlays}
        {sheet}
      </section>
    );
  }
  if (size === "L") {
    return (
      <section className="flex flex-col gap-1.5" aria-label="Termine">
        <SectionHead title="Termine" more={0} href={href} action={plus} />
        <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
          {shown.map((item) => {
            const checked = item.done || leaving === item.key;
            return (
              <li key={item.key} className="flex items-center gap-1 py-0.5 pr-3" data-item={item.key} style={before && !before.includes(item.key) ? { animation: "card-in 0.32s ease-out" } : undefined}>
                <CheckBox item={item} checked={checked} onClick={() => (item.done ? undefined : start(item))} />
                <button type="button" onClick={() => setMenu(item)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
                  <span className="w-12 shrink-0 text-[14px] font-extrabold tabular-nums">{item.time ? clockLabel(item.time) : "–"}</span>
                  <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${roomBar(item.room)}`} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        {overlays}
        {sheet}
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-1.5" aria-label="Termine">
      <SectionHead title="Termine" more={list.length - shown.length} href={href} action={plus} />
      <ul className={`grid gap-2 ${shown.length === 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {shown.map((item) => {
          const isLeaving = leaving === item.key;
          return (
            <MiniCard key={item.key} item={item} entering={Boolean(before && !before.includes(item.key))}>
              <button type="button" onClick={() => setMenu(item)} className="flex w-full flex-col items-start gap-0.5 py-2.5 pl-3.5 pr-2.5 text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
                <span className="pr-6 text-[14px] font-extrabold leading-tight tabular-nums">{item.time ? clockLabel(item.time) : "–"}</span>
                <span className={`line-clamp-2 w-full hyphens-auto break-words text-[11.5px] font-semibold leading-snug ${isLeaving ? "text-muted line-through" : ""}`}>{item.title}</span>
              </button>
              <span className="absolute right-0 top-0 [&>button]:items-start [&>button]:justify-end [&>button]:p-2">
                <CheckBox item={item} checked={isLeaving} onClick={() => start(item)} />
              </span>
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
  const checked = Boolean(item.done || leaving);
  return (
    <li className="flex items-center gap-1 py-1 pr-3" style={entering ? { animation: "card-in 0.32s ease-out" } : undefined} data-item={item.key}>
      <CheckBox item={item} checked={checked} onClick={() => onDone(item)} round />
      <button type="button" onClick={() => onOpen(item)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        {isUrgent(item) && !checked && <UrgentMark />}
        <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
        {badge && <span className={`shrink-0 text-xs ${badge === "heute" ? "font-semibold text-accent-strong" : "text-muted"}`}>{badge}</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBar(item.room)}`} aria-hidden />
      </button>
    </li>
  );
}

/** AUFGABEN – S: Anzahl + die wichtigste; M: 3 Zeilen; L: 6 Zeilen. "+ N weitere", kleiner "+" */
export function AufgabenSection({ items, more, today, href = "/aufgaben", size = "M" }: { items: DayItem[]; more: number; today: string; href?: string; size?: TileSize }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const count = size === "S" ? 1 : size === "L" ? 6 : 3;
  const shown = items.slice(0, count);
  const total = more + Math.min(3, items.length);
  const { leaving, start } = useLeaving((item) => check(item, shown));
  const plus = <QuickButton icon={Plus} label="Neue Aufgabe" onClick={() => setAdding(true)} />;
  const rest = Math.max(0, total - shown.length);
  return (
    <>
      {items.length > 0 ? (
        size === "S" ? (
          <section className={`${CARD} relative flex min-h-[92px] flex-col p-3.5`} aria-label="Aufgaben">
            <Link href={href} className="pr-6 text-[11px] font-bold uppercase tracking-wider text-muted">
              {total === 1 ? "1 Aufgabe" : `${total} Aufgaben`}
            </Link>
            <span className="absolute right-3.5 top-3">{plus}</span>
            <ul className="-mx-3 -mb-2 mt-0.5">
              {shown.map((item) => (
                <TaskLine key={item.key} item={item} today={today} onOpen={setMenu} onDone={start} leaving={leaving === item.key} entering={Boolean(before && !before.includes(item.key))} />
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex flex-col gap-1.5" aria-label="Aufgaben">
            <SectionHead title="Aufgaben" more={rest} href={href} action={plus} />
            <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
              {shown.map((item) => (
                <TaskLine key={item.key} item={item} today={today} onOpen={setMenu} onDone={start} leaving={leaving === item.key} entering={Boolean(before && !before.includes(item.key))} />
              ))}
            </ul>
          </section>
        )
      ) : (
        <AddLine label="Aufgabe hinzufügen" onClick={() => setAdding(true)} />
      )}
      {overlays}
      {adding && <TaskQuickAdd onClose={() => setAdding(false)} />}
    </>
  );
}
