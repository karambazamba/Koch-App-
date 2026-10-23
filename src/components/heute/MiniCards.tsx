"use client";

// "Heute": TERMINE (blau) und AUFGABEN (grün) im gleichen Listen-Stil
// (Feinschliff nach Handy-Test, Tafel 58/59): je Kachel EIN weißes Feld mit
// feinen Trennlinien, Zeilen 30 px (die ganze Zeile tippbar, der Abhak-Kreis
// mit unsichtbar größerer Fläche), Kopf 26 px mit „+N weitere“ neben dem
// Plus, unten nichts. Menge je Größe S 2, M 4, L 6. Termine chronologisch mit
// Strich in Raumfarbe, Uhrzeit, Titel; der laufende bleibt 30 Min („läuft“),
// der nächste ist zart hervorgehoben („gleich“) – Logik in
// lib/heute/termineKachel.ts. Erledigte Aufgaben: ca. 1,5 s durchgestrichen,
// dann weich weg.

import { TaskFrom } from "@/components/kalender/abgeben/TaskFrom";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { TILE, TILE_INNER, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { clockLabel } from "@/lib/kalender/answers";
import { isUrgent, setDone, taskBadge, type DayItem } from "@/lib/kalender/model";
import type { TerminRow, TerminState } from "@/lib/heute/termineKachel";
import { UrgentMark } from "@/components/kalender/UrgentMark";
import type { TileSize } from "@/lib/core/homeLayout";
import { LEAVE_MS, act, buzz } from "@/components/heute/actions";
import { ItemMenu, roomBarProps } from "@/components/kalender/Items";
import { withoutEmoji } from "@/lib/core/text";
import dynamic from "next/dynamic";
import { openQuick } from "@/lib/core/schnelleingabe";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const TaskQuickAdd = dynamic(() => import("@/components/kalender/TaskQuickAdd").then((m) => m.TaskQuickAdd), { ssr: false });
const TerminQuickAdd = dynamic(() => import("@/components/kalender/TerminQuickAdd").then((m) => m.TerminQuickAdd), { ssr: false });
const EntryForm = dynamic(() => import("@/components/kalender/EntryForm").then((m) => m.EntryForm), { ssr: false });

/** Beispiel-Tag: Beispiele statt echter Einträge (Antippen erklärt, Abhaken nur hier) */
export type DemoProps = { label?: string | null; done?: string[]; onToggle?: (item: DayItem) => void; onGone?: (item: DayItem) => void; onOpen: (item: DayItem) => void };



function useSection() {
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  // Nach dem Abhaken: welche Einträge vorher da waren – neue gleiten herein
  const [before, setBefore] = useState<string[] | null>(null);
  const check = (item: DayItem, shown: DayItem[]) => {
    setBefore(shown.map((i) => i.key));
    act((list, stamp) => setDone(list, item, true, stamp), item.title, { done: true });
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

/** Kopf IN der Kachel (26 px, bei allen Kacheln gleich): Label (öffnet die Seite), „+N weitere“ neben dem Plus */
function TileHead({ title, more, href, action, moreLabel }: { title: string; more: number; href: string; action?: React.ReactNode; moreLabel?: string }) {
  return (
    <div className="flex h-[26px] items-center gap-2">
      {/* Label öffnet die Seite dazu (Tag bzw. Aufgaben) – keine Sackgasse */}
      <h2 className={TILE_LABEL}>
        <Link href={href} className="hit inline-flex h-[26px] items-center">
          {title}
        </Link>
      </h2>
      <span className="flex-1" />
      {more > 0 && (
        <Link href={href} className="hit flex h-[26px] items-center text-[12.5px] font-bold text-tile-accent">
          +{more} {moreLabel ?? "weitere"}
        </Link>
      )}
      {action && <span className="ml-1 flex items-center">{action}</span>}
    </div>
  );
}

/** Abhaken mit kurzer Bedenkzeit: ca. 2 s durchgestrichen, nochmal tippen = doch nicht */
export function useLeaving(onDone: (item: DayItem) => void, ms = LEAVE_MS) {
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
    }, ms);
  };
  return { leaving, start };
}

/** Leere Kachel: freundlich „+ eintragen“ */
function AddLine({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 items-center gap-1.5 self-start text-sm font-semibold text-muted" aria-label={label}>
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      {label}
    </button>
  );
}

function CheckBox({ item, checked, onClick, round = false }: { item: DayItem; checked: boolean; onClick: () => void; round?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={`${item.title} erledigt`} onClick={onClick} className="flex h-11 w-11 shrink-0 items-center justify-center">
      <span
        className={`flex items-center justify-center border-2 transition ${round ? "h-[22px] w-[22px] rounded-full" : "h-[18px] w-[18px] rounded-md"} ${checked ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}
        style={checked ? { animation: "check-pop 0.4s ease-out" } : undefined}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

const entersAnim = (before: string[] | null, key: string) => (before && !before.includes(key) ? { animation: "card-in 0.32s ease-out" } : undefined);

/** Wie viele Zeilen je Größe – Termine und Aufgaben gleich: S 2, M 4, L 6 */
const ROW_COUNT = { S: 2, M: 4, L: 6 } as const;
/** Erledigte Aufgabe: so lange durchgestrichen, dann weich weg */
const TASK_LEAVE_MS = 1500;
const TASK_FADE = { animation: `card-out 0.4s ease-in ${TASK_LEAVE_MS - 400}ms forwards` };
const LIST = `${TILE_INNER} flex flex-col divide-y divide-line overflow-hidden`;

const STATE_LABEL: Record<Exclude<TerminState, null | "naechster">, string> = { laeuft: "läuft", gleich: "gleich" };

/** Termin-Zeile (30 px): Strich in Raumfarbe, Uhrzeit (feste Breite), Titel einzeilig, rechts „läuft“/„gleich“ */
function TerminLine({ row, entering, onOpen }: { row: TerminRow; entering?: React.CSSProperties; onOpen: () => void }) {
  const { item, state } = row;
  const next = state === "gleich" || state === "naechster";
  return (
    <li className={next ? "bg-accent-soft/60" : undefined} style={entering} data-item={item.key} data-state={state ?? undefined} data-zeile>
      <button type="button" onClick={onOpen} className="flex h-[30px] w-full items-center gap-2 pl-2.5 pr-3 text-left" aria-label={`${item.time ? clockLabel(item.time) : "ganztägig"} ${item.title}${state === "laeuft" ? " – läuft" : state === "gleich" ? " – gleich" : ""} – Möglichkeiten`}>
        <span className={`h-3.5 w-[3px] shrink-0 rounded-full ${roomBarProps(item).className}`} style={roomBarProps(item).style} aria-hidden />
        <span className="w-[38px] shrink-0 text-[13.5px] font-extrabold tabular-nums text-tile-accent">{item.time ? clockLabel(item.time) : "Tag"}</span>
        <span className={`min-w-0 flex-1 truncate text-[13.5px] leading-tight ${next ? "font-bold" : "font-semibold"}`}>{withoutEmoji(item.title)}</span>
        {(state === "laeuft" || state === "gleich") && <span className={`shrink-0 text-[11px] font-bold ${state === "gleich" ? "text-accent-strong" : "text-muted"}`}>{STATE_LABEL[state]}</span>}
      </button>
    </li>
  );
}

/**
 * TERMINE – eine weiße Liste, chronologisch: S 2, M 4, L 6 Zeilen, „+N weitere“
 * im Kopf. Alles vorbei → „Morgen · Sa“ mit den ersten Terminen von morgen.
 */
export function TermineSection({ rows, label, href, today, size = "M", half = false, demo }: { rows: TerminRow[]; label?: string | null; href: string; today?: string; size?: TileSize; half?: boolean; demo?: DemoProps }) {
  const { setMenu, before, overlays } = useSection();
  const [adding, setAdding] = useState<string | null>(null);
  const shown = rows.slice(0, ROW_COUNT[size]);
  const sheet = adding !== null && <TerminQuickAdd onClose={() => setAdding(null)} defaultDate={today} initialText={adding} />;
  const plus = <QuickButton icon={Plus} label="Neuer Termin" onClick={() => openQuick({ kind: "termin", date: today, more: setAdding })} />;
  const rest = rows.length - shown.length;
  return (
    <section className={`${TILE} flex flex-col gap-[7px] px-3 py-2.5`} aria-label="Termine">
      <TileHead title={demo?.label ?? label ?? "Termine"} more={half ? 0 : rest} href={href} action={plus} />
      {rows.length ? (
        <ul className={LIST}>
          {shown.map((row) => (
            <TerminLine key={row.item.key} row={row} entering={entersAnim(before, row.item.key)} onOpen={() => (demo ? demo.onOpen(row.item) : setMenu(row.item))} />
          ))}
        </ul>
      ) : (
        <AddLine label="Termin eintragen" onClick={() => openQuick({ kind: "termin", date: today, more: setAdding })} />
      )}
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
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`min-w-0 truncate text-[15px] font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
          <TaskFrom item={item} className="text-xs text-muted" />
        </span>
        {badge && <span className={`shrink-0 text-xs ${badge === "heute" ? "font-semibold text-accent-strong" : "text-muted"}`}>{badge}</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBarProps(item).className}`} style={roomBarProps(item).style} aria-hidden />
      </button>
    </li>
  );
}

/** Aufgaben-Zeile (30 px): Kreis 20 px (Tippfläche 44 × 30), Titel, rechts „heute“/„bis Fr“/„diese Woche“, „!“ bei dringend */
function TaskField({ item, today, leaving, entering, onOpen, onDone }: { item: DayItem; today: string; leaving: boolean; entering?: React.CSSProperties; onOpen: () => void; onDone: () => void }) {
  const badge = taskBadge(item, today);
  return (
    <li className="flex min-w-0 items-center" style={leaving ? TASK_FADE : entering} data-item={item.key} data-zeile>
      <button type="button" role="checkbox" aria-checked={leaving} aria-label={`${item.title} erledigt`} onClick={onDone} className="flex h-[30px] w-11 shrink-0 items-center justify-center">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${leaving ? "border-good bg-good text-on-color" : "border-line-strong"}`} style={leaving ? { animation: "check-pop 0.4s ease-out" } : undefined}>
          {leaving && <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />}
        </span>
      </button>
      <button type="button" onClick={onOpen} className="flex h-[30px] min-w-0 flex-1 items-center gap-1 pr-3 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        {isUrgent(item) && !leaving && <UrgentMark />}
        <span className={`min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-tight ${leaving ? "text-muted line-through" : ""}`}>{withoutEmoji(item.title)}</span>
        <TaskFrom item={item} className="shrink-0 text-[11px] text-muted" />
        {badge && <span className={`shrink-0 text-[11px] ${badge === "heute" ? "font-bold text-accent-strong" : "text-muted"}`}>{badge}</span>}
      </button>
    </li>
  );
}

/** AUFGABEN – eine weiße Checkliste: S 2, M 4, L 6 Zeilen, „+N weitere“ im Kopf neben dem Plus */
export function AufgabenSection({ items, total, today, href = "/aufgaben", size = "M", half = false, demo }: { items: DayItem[]; total?: number; today: string; href?: string; size?: TileSize; half?: boolean; demo?: DemoProps }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState<string | null>(null);
  // Erledigtes steht nicht herum (auch nicht im Beispiel-Tag)
  const open = demo?.done ? items.filter((i) => !demo.done!.includes(i.entry.id)) : items;
  const shown = open.slice(0, ROW_COUNT[size]);
  const { leaving, start } = useLeaving((item) => (demo ? demo.onGone?.(item) : check(item, shown)), TASK_LEAVE_MS);
  const plus = <QuickButton icon={Plus} label="Neue Aufgabe" onClick={() => openQuick({ kind: "aufgabe", date: today, more: setAdding })} />;
  const rest = Math.max(0, Math.max(total ?? 0, open.length) - shown.length);
  return (
    <>
      <section className={`${TILE} flex flex-col gap-[7px] px-3 py-2.5`} aria-label="Aufgaben">
        <TileHead title="Aufgaben" more={half ? 0 : rest} href={href} action={plus} />
        {open.length > 0 ? (
          <ul className={LIST}>
            {shown.map((item) => (
              <TaskField key={item.key} item={item} today={today} leaving={leaving === item.key} entering={entersAnim(before, item.key)} onOpen={() => (demo ? demo.onOpen(item) : setMenu(item))} onDone={() => start(item)} />
            ))}
          </ul>
        ) : (
          <AddLine label="Aufgabe eintragen" onClick={() => openQuick({ kind: "aufgabe", date: today, more: setAdding })} />
        )}
      </section>
      {overlays}
      {adding !== null && <TaskQuickAdd initialText={adding} onClose={() => setAdding(null)} />}
    </>
  );
}
