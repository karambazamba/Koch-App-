"use client";

// "Heute" kompakt: Abschnitte TERMINE und AUFGABEN mit je höchstens zwei
// kleinen Kärtchen nebeneinander (eins = volle Breite, keins = Abschnitt
// weg), rechts "+ N weitere". Antippen = Menü, Abhaken mit kleiner
// Animation und Vibration; der nächste Eintrag gleitet ins Kärtchen.

import Link from "next/link";
import { useState } from "react";
import { Bell, Check, Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { clockLabel } from "@/lib/aufgaben/answers";
import { REMINDERS, setDone, taskBadge, type DayItem } from "@/lib/aufgaben/model";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { act, buzz } from "./actions";
import { ItemMenu, roomBar } from "./Items";
import { EntryForm } from "./EntryForm";

const LEAVE_MS = 420;

/** Graue Zeile eines Termins: Ort · Etikett · Erinnerung */
function terminLine(item: DayItem): string {
  const place = item.entry.typ === "termin" ? item.entry.data.place : undefined;
  return [item.end ? `bis ${clockLabel(item.end)}` : "", place ?? "", item.label ?? ""].filter(Boolean).join(" · ");
}

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
      {action}
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

/** TERMINE: die nächsten zwei anstehenden, "+ N weitere" → Tagesansicht */
export function TermineSection({ items, href }: { items: DayItem[]; href: string }) {
  const { setMenu, check, before, overlays } = useSection();
  const shown = items.slice(0, 2);
  const { leaving, start } = useLeaving((item) => check(item, shown));
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-1.5" aria-label="Termine">
      <SectionHead title="Termine" more={items.length - shown.length} href={href} />
      <ul className={`grid gap-2 ${shown.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {shown.map((item) => {
          const line = terminLine(item);
          const isLeaving = leaving === item.key;
          return (
            <MiniCard key={item.key} item={item} leaving={isLeaving} entering={Boolean(before && !before.includes(item.key))}>
              <button type="button" onClick={() => setMenu(item)} className="flex min-h-[78px] w-full flex-col items-start justify-center gap-0.5 py-2.5 pl-4 pr-10 text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
                <span className="text-[15px] font-extrabold leading-tight tabular-nums">{item.time ? clockLabel(item.time) : "–"}</span>
                <span className="w-full truncate text-[12.5px] font-bold leading-snug">{item.title}</span>
                {(line || item.reminder !== "aus") && (
                  <span className="flex w-full items-center gap-1 truncate text-[11.5px] leading-snug text-muted">
                    <span className="truncate">{line}</span>
                    {item.reminder !== "aus" && (
                      <span className="flex shrink-0 items-center gap-0.5">
                        {line && "·"}
                        <Bell className="h-3 w-3" strokeWidth={2} aria-label="Erinnerung" />
                        {!line && REMINDERS.find((r) => r.value === item.reminder)?.short}
                      </span>
                    )}
                  </span>
                )}
              </button>
              <button type="button" role="checkbox" aria-checked={isLeaving} aria-label={`${item.title} erledigt`} onClick={() => start(item)} className="absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-2.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${isLeaving ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
                  style={isLeaving ? { animation: "check-pop 0.4s ease-out" } : undefined}
                >
                  {isLeaving && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                </span>
              </button>
            </MiniCard>
          );
        })}
      </ul>
      {overlays}
    </section>
  );
}

/** Eine schlanke Aufgaben-Zeile: Kreis zum Abhaken, Titel (bis 2 Zeilen), rechts klein die Frist und der Punkt */
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
        <span className={`line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
        {badge && <span className="shrink-0 text-xs text-muted">{badge}</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBar(item.room)}`} aria-hidden />
      </button>
    </li>
  );
}

/** AUFGABEN: eine Karte mit den zwei dringendsten Zeilen, "+ N weitere", dunkler runder "+" */
export function AufgabenSection({ items, more, today, href = "/aufgaben" }: { items: DayItem[]; more: number; today: string; href?: string }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const shown = items.slice(0, 2);
  const { leaving, start } = useLeaving((item) => check(item, shown));
  const plus = (
    <button type="button" onClick={() => setAdding(true)} aria-label="Neue Aufgabe" className="flex h-8 w-8 items-center justify-center rounded-full bg-bar text-on-bar active:scale-95">
      <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
    </button>
  );
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
        <button type="button" onClick={() => setAdding(true)} className="flex h-11 items-center gap-1.5 self-start px-1 text-sm font-semibold text-muted" aria-label="Aufgabe hinzufügen">
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Aufgabe hinzufügen
        </button>
      )}
      {overlays}
      {adding && <TaskQuickAdd onClose={() => setAdding(false)} />}
    </>
  );
}
