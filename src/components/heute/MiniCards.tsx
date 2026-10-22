"use client";

// "Heute": TERMINE (blau) und AUFGABEN (grün) als Pastell-Kacheln – Kopf
// mit Label, „+N weitere“ und Plus IN der Kachel. Die Größe ändert nur die
// Menge, nie das Aussehen (S ≤ M ≤ L): Termine als schlanke Kärtchen ohne
// Kästchen (S 1, M bis 4, L bis 6, höchstens 2 nebeneinander), Aufgaben im
// 2er-Raster (S 2 – halb untereinander –, M 2×2, L 2×4). Antippen = Menü,
// Kreis = abhaken: ca. 2 s durchgestrichen (nochmal tippen = doch nicht).

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { TILE, TILE_INNER, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { clockLabel } from "@/lib/kalender/answers";
import { isUrgent, setDone, taskBadge, type DayItem } from "@/lib/kalender/model";
import { UrgentMark } from "@/components/kalender/UrgentMark";
import type { TileSize } from "@/lib/core/homeLayout";
import { LEAVE_MS, act, buzz } from "@/components/heute/actions";
import { ItemMenu, roomBarProps } from "@/components/kalender/Items";
import { withoutEmoji } from "@/lib/core/text";
import dynamic from "next/dynamic";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const TaskQuickAdd = dynamic(() => import("@/components/kalender/TaskQuickAdd").then((m) => m.TaskQuickAdd), { ssr: false });
const TerminQuickAdd = dynamic(() => import("@/components/kalender/TerminQuickAdd").then((m) => m.TerminQuickAdd), { ssr: false });
const EntryForm = dynamic(() => import("@/components/kalender/EntryForm").then((m) => m.EntryForm), { ssr: false });

/** Beispiel-Tag: Beispiele statt echter Einträge (Antippen erklärt, Abhaken nur hier) */
export type DemoProps = { label?: string | null; done?: string[]; onToggle?: (item: DayItem) => void; onGone?: (item: DayItem) => void; onOpen: (item: DayItem) => void };

/** Abgehakt: kurz vor dem Verschwinden weich ausblenden */
const FADE = { animation: `card-out 0.4s ease-in ${LEAVE_MS - 400}ms forwards` };


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

/** Kopf IN der Kachel: Label (öffnet die Seite), „+N weitere“, Plus */
function TileHead({ title, more, href, action, moreLabel }: { title: string; more: number; href: string; action?: React.ReactNode; moreLabel?: string }) {
  return (
    <div className="flex h-6 items-center gap-2">
      {/* Label öffnet die Seite dazu (Tag bzw. Aufgaben) – keine Sackgasse */}
      <h2 className={TILE_LABEL}>
        <Link href={href} className="-my-2 inline-flex h-11 items-center">
          {title}
        </Link>
      </h2>
      <span className="flex-1" />
      {more > 0 && (
        <Link href={href} className="-my-2 flex h-11 items-center text-[12px] font-bold text-tile-accent">
          +{more} {moreLabel ?? "weitere"}
        </Link>
      )}
      {action && <span className="ml-1 flex items-center">{action}</span>}
    </div>
  );
}

/** Abhaken mit kurzer Bedenkzeit: ca. 2 s durchgestrichen, nochmal tippen = doch nicht */
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

/** Termin-Kärtchen (ohne Kästchen): Uhrzeit fett, Titel bis 2 Zeilen ohne Emojis, Farbstreifen links (Familie/Arbeit) */
function TerminCard({ item, entering, onOpen }: { item: DayItem; entering?: React.CSSProperties; onOpen: () => void }) {
  return (
    <li className={`${TILE_INNER} relative min-w-0 overflow-hidden`} style={entering} data-item={item.key}>
      <span className={`absolute inset-y-0 left-0 w-1 ${roomBarProps(item).className}`} style={roomBarProps(item).style} aria-hidden />
      <button type="button" onClick={onOpen} className="flex min-h-[46px] w-full flex-col justify-center py-1.5 pl-3 pr-3 text-left" aria-label={`${item.time ? clockLabel(item.time) : ""} ${item.title} – Möglichkeiten`}>
        <span className="text-[13.5px] font-extrabold leading-tight tabular-nums">{item.time ? clockLabel(item.time) : "–"}</span>
        <span className="line-clamp-2 w-full break-words text-[12.5px] font-semibold leading-snug">{withoutEmoji(item.title)}</span>
      </button>
    </li>
  );
}

/** Wie viele Termine je Größe (höchstens 2 nebeneinander): S 1, M bis 4 (2×2), L bis 6 (2×3) */
const TERMIN_COUNT = { S: 1, M: 4, L: 6 } as const;
/** Wie viele Aufgaben-Felder je Größe: S 2, M 2×2, L 2×4 */
const TASK_COUNT = { S: 2, M: 4, L: 8 } as const;

/**
 * TERMINE – Pastell-Kachel mit schlanken Kärtchen, höchstens 2 nebeneinander:
 * S 1 (mit „+N weitere heute“), M bis 4 (2×2), L bis 6 (2×3). Plus = neuer Termin.
 */
export function TermineSection({ items, all, href, today, size = "M", half = false, demo }: { items: DayItem[]; all?: DayItem[]; href: string; today?: string; size?: TileSize; half?: boolean; demo?: DemoProps }) {
  const { setMenu, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const list = size === "L" && !demo ? (all ?? items).filter((i) => !i.done) : items;
  const shown = list.slice(0, TERMIN_COUNT[size]);
  const sheet = adding && <TerminQuickAdd onClose={() => setAdding(false)} defaultDate={today} />;
  const plus = <QuickButton icon={Plus} label="Neuer Termin" onClick={() => setAdding(true)} />;
  const rest = list.length - shown.length;
  const cols = size === "S" || shown.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <section className={`${TILE} flex flex-col gap-2 p-3.5`} aria-label="Termine">
      <TileHead title={demo?.label ?? "Termine"} more={half ? 0 : rest} moreLabel={size === "S" ? "weitere heute" : undefined} href={href} action={plus} />
      {list.length ? (
        <ul className={`grid gap-2 ${cols}`}>
          {shown.map((item) => (
            <TerminCard key={item.key} item={item} entering={entersAnim(before, item.key)} onOpen={() => (demo ? demo.onOpen(item) : setMenu(item))} />
          ))}
        </ul>
      ) : (
        <AddLine label="Termin eintragen" onClick={() => setAdding(true)} />
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
        <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
        {badge && <span className={`shrink-0 text-xs ${badge === "heute" ? "font-semibold text-accent-strong" : "text-muted"}`}>{badge}</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBarProps(item).className}`} style={roomBarProps(item).style} aria-hidden />
      </button>
    </li>
  );
}

/** Ein Feld im Aufgaben-Raster (~44 px): Kreis 17 px, evtl. rotes „!“, Titel fett einzeilig, darunter Punkt + Frist */
function TaskField({ item, today, leaving, fading = false, entering, onOpen, onDone }: { item: DayItem; today: string; leaving: boolean; fading?: boolean; entering?: React.CSSProperties; onOpen: () => void; onDone: () => void }) {
  const badge = taskBadge(item, today);
  return (
    <li className={`${TILE_INNER} relative flex min-w-0 items-center`} style={fading ? FADE : entering} data-item={item.key}>
      <button type="button" role="checkbox" aria-checked={leaving} aria-label={`${item.title} erledigt`} onClick={onDone} className="hit flex h-11 w-9 shrink-0 items-center justify-end pr-1">
        <span className={`flex h-[17px] w-[17px] items-center justify-center rounded-full border-2 ${leaving ? "border-tile-accent bg-tile-accent text-on-color" : "border-line-strong"}`} style={leaving ? { animation: "check-pop 0.4s ease-out" } : undefined}>
          {leaving && <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />}
        </span>
      </button>
      <button type="button" onClick={onOpen} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-[7px] pr-[10px] pl-1 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        <span className="flex w-full min-w-0 items-center gap-1">
          {isUrgent(item) && !leaving && <UrgentMark />}
          <span className={`min-w-0 flex-1 truncate text-[13px] font-bold leading-tight ${leaving ? "text-muted line-through" : ""}`}>{withoutEmoji(item.title)}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] leading-tight">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${roomBarProps(item).className}`} style={roomBarProps(item).style} aria-hidden />
          {badge && <span className={badge === "heute" ? "font-semibold text-tile-accent" : "text-muted"}>{badge}</span>}
        </span>
      </button>
    </li>
  );
}

/** AUFGABEN – Pastell-Kachel mit 2er-Raster: S 2 Felder, M 2×2, L 2×4; „+N weitere“ und Plus im Kopf */
export function AufgabenSection({ items, total, today, href = "/aufgaben", size = "M", half = false, demo }: { items: DayItem[]; total?: number; today: string; href?: string; size?: TileSize; half?: boolean; demo?: DemoProps }) {
  const { setMenu, check, before, overlays } = useSection();
  const [adding, setAdding] = useState(false);
  const shown = items.slice(0, TASK_COUNT[size]);
  const { leaving, start } = useLeaving((item) => (demo ? demo.onGone?.(item) : check(item, shown)));
  const plus = <QuickButton icon={Plus} label="Neue Aufgabe" onClick={() => setAdding(true)} />;
  const rest = Math.max(0, Math.max(total ?? 0, items.length) - shown.length);
  const oneCol = size === "S" && half;
  return (
    <>
      <section className={`${TILE} flex flex-col gap-2 p-3.5`} aria-label="Aufgaben">
        <TileHead title="Aufgaben" more={half ? 0 : rest} href={href} action={plus} />
        {items.length > 0 ? (
          <ul className={`grid gap-1.5 ${oneCol ? "grid-cols-1" : "grid-cols-2"}`}>
            {shown.map((item) => (
              <TaskField key={item.key} item={item} today={today} leaving={leaving === item.key || Boolean(demo?.done?.includes(item.entry.id))} fading={leaving === item.key} entering={entersAnim(before, item.key)} onOpen={() => (demo ? demo.onOpen(item) : setMenu(item))} onDone={() => (demo?.done?.includes(item.entry.id) ? demo.onToggle?.(item) : start(item))} />
            ))}
          </ul>
        ) : (
          <AddLine label="Aufgabe eintragen" onClick={() => setAdding(true)} />
        )}
      </section>
      {overlays}
      {adding && <TaskQuickAdd onClose={() => setAdding(false)} />}
    </>
  );
}
