"use client";

// Termine und Aufgaben eines Tages: Zeile (Uhrzeit, farbiger Strich, Titel,
// Unterzeile, Kästchen), Karte mit "+ N weitere" und eingeklapptem
// Erledigten, Menü beim Antippen. Ruhig: keine Zähler, nichts "Offenes".

import Link from "next/link";
import { useRef, useState } from "react";
import { Bell, Check, ChevronDown, ChevronRight, Pencil, Repeat2, Trash2, CalendarArrowUp, CheckCircle2, Circle } from "lucide-react";
import { CARD, chipClass } from "@/components/ui/styles";
import { Sheet } from "@/components/plan/Sheet";
import { clockLabel } from "@/lib/aufgaben/answers";
import { isUrgent, moveItem, REMINDERS, removeItem, repeatLabel, setDone, setReminder, setUrgent, type DayItem } from "@/lib/aufgaben/model";
import { UrgentMark } from "./UrgentMark";
import { addDays } from "@/lib/core/now";
import { act, buzz } from "./actions";
import { EntryForm } from "./EntryForm";

/** Unterzeile: Etikett · Erinnerung · Frist · "von gestern" · Wiederholung */
function subline(item: DayItem): string[] {
  return [
    item.label ?? "",
    item.carried ?? "",
    item.dueLabel ?? "",
    item.end ? `bis ${clockLabel(item.end)}` : "",
    item.repeat ? repeatLabel(item.repeat, item.entry.data.date ?? undefined) : "",
  ].filter(Boolean);
}

/** Farbe des Strichs: Orange = Familie, Blau = Arbeit */
export const roomBar = (room: DayItem["room"]) => (room === "arbeit" ? "bg-work" : "bg-accent");

function ItemRow({ item, onOpen }: { item: DayItem; onOpen: (item: DayItem) => void }) {
  // Abhaken: ca. 1 s durchgestrichen (nochmal tippen = doch nicht), dann wandert der Eintrag nach unten
  const [popping, setPopping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checked = item.done || popping;
  const toggle = () => {
    buzz();
    if (popping) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      return setPopping(false);
    }
    if (item.done) return act((list, stamp) => setDone(list, item, false, stamp));
    setPopping(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      act((list, stamp) => setDone(list, item, true, stamp));
      setPopping(false);
    }, 1000);
  };
  const sub = subline(item);
  return (
    <li className="flex items-center gap-3 py-2.5" data-item={item.key}>
      <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        <span className={`w-11 shrink-0 text-sm font-bold tabular-nums ${checked ? "text-muted" : "text-ink"}`}>{item.time ? clockLabel(item.time) : ""}</span>
        <span className={`h-9 w-1 shrink-0 rounded-full ${roomBar(item.room)} ${checked ? "opacity-40" : ""}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 truncate text-base font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>
            {isUrgent(item) && !checked && <UrgentMark />}
            <span className="truncate">{item.title}</span>
          </span>
          {(sub.length > 0 || item.reminder !== "aus") && (
            <span className="flex items-center gap-1 truncate text-sm text-muted">
              {sub.join(" · ")}
              {item.reminder !== "aus" && (
                <>
                  {sub.length > 0 && " · "}
                  <Bell className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-label="Erinnerung" />
                  {REMINDERS.find((r) => r.value === item.reminder)?.short}
                </>
              )}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${item.title} erledigt`}
        onClick={toggle}
        className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${checked ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
          style={popping ? { animation: "check-pop 0.4s ease-out" } : undefined}
        >
          {checked && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
        </span>
      </button>
    </li>
  );
}

/**
 * Karte mit den Einträgen eines Tages: höchstens `limit` sichtbar, dann
 * "+ N weitere"; Erledigtes darunter eingeklappt ("✓ N erledigt"). Ist alles
 * erledigt: "Alles erledigt für heute 🌙". Ohne Einträge: keine Karte.
 */
export function DayItemsCard({ items, title, limit = 3, allDoneText = "Alles erledigt für heute 🌙", titleHref }: { items: DayItem[]; title: string; limit?: number; allDoneText?: string; titleHref?: string }) {
  const [more, setMore] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  if (!items.length) return null;
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const shown = more ? open : open.slice(0, limit);
  return (
    <section className={`${CARD} px-4 pt-3 pb-2`} aria-label={title}>
      {titleHref ? (
        <Link href={titleHref} className="-my-2 flex h-10 items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
          <h2>{title}</h2>
          <span className="flex items-center gap-0.5 normal-case tracking-normal">
            Tag öffnen <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
        </Link>
      ) : (
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      )}
      {open.length === 0 && <p className="py-3 text-lg font-bold">{allDoneText}</p>}
      {shown.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {shown.map((item) => (
            <ItemRow key={item.key} item={item} onOpen={setMenu} />
          ))}
        </ul>
      )}
      {open.length > shown.length && (
        <button type="button" onClick={() => setMore(true)} className="flex h-10 items-center gap-1 text-sm font-bold text-accent-strong">
          + {open.length - shown.length} weitere <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {done.length > 0 && (
        <div className="border-t border-line">
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex h-10 items-center gap-1 text-sm font-semibold text-muted">
            ✓ {done.length} erledigt <ChevronDown className={`h-4 w-4 transition ${showDone ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
          </button>
          {showDone && (
            <ul className="flex flex-col divide-y divide-line">
              {done.map((item) => (
                <ItemRow key={item.key} item={item} onOpen={setMenu} />
              ))}
            </ul>
          )}
        </div>
      )}
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
    </section>
  );
}


const MENU_ROW = "flex h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold active:bg-stone-100";

/** Antippen eines Eintrags: Erledigt · Auf morgen · Erinnerung ändern · Bearbeiten · Löschen */
export function ItemMenu({ item, onClose, onEdit }: { item: DayItem; onClose: () => void; onEdit: () => void }) {
  const [step, setStep] = useState<"menu" | "erinnerung" | "loeschen">("menu");
  const series = Boolean(item.repeat);
  const close = (fn: () => void) => () => {
    fn();
    onClose();
  };
  return (
    <Sheet title={item.title} onClose={onClose}>
      {step === "menu" && (
        <div className={`${CARD} mb-2 flex flex-col divide-y divide-line overflow-hidden`}>
          <button type="button" className={MENU_ROW} onClick={close(() => (buzz(), act((l, s) => setDone(l, item, !item.done, s))))}>
            {item.done ? <Circle className="h-5 w-5 text-muted" strokeWidth={2} aria-hidden /> : <CheckCircle2 className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />}
            {item.done ? "Doch nicht erledigt" : "Erledigt"}
          </button>
          {!item.done && (
            <button type="button" className={MENU_ROW} onClick={close(() => act((l, s) => moveItem(l, item, addDays(item.date, 1), s), `${item.title} auf morgen`))}>
              <CalendarArrowUp className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Auf morgen
            </button>
          )}
          {item.entry.typ === "aufgabe" && !item.done && (
            <button type="button" className={MENU_ROW} onClick={close(() => act((l, s) => setUrgent(l, item.entry.id, !isUrgent(item), s), `${item.title} ${isUrgent(item) ? "nicht mehr dringend" : "dringend"}`))}>
              <UrgentMark className="mx-[3px]" />
              {isUrgent(item) ? "Nicht mehr dringend" : "Als dringend markieren"}
            </button>
          )}
          <button type="button" className={MENU_ROW} onClick={() => setStep("erinnerung")}>
            <Bell className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            <span className="flex-1">Erinnerung ändern</span>
            <span className="text-sm font-semibold text-accent-strong">{REMINDERS.find((r) => r.value === item.reminder)?.short}</span>
          </button>
          <button type="button" className={MENU_ROW} onClick={onEdit}>
            <Pencil className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            Bearbeiten
          </button>
          <button type="button" className={`${MENU_ROW} text-red-600`} onClick={() => (series ? setStep("loeschen") : close(() => act((l, s) => removeItem(l, item.entry.id, s), `das Löschen von ${item.title}`, { deleted: true }))())}>
            <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
            Löschen
          </button>
        </div>
      )}
      {step === "erinnerung" && (
        <div className="mb-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Erinnerung">
          {REMINDERS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={item.reminder === r.value}
              className={chipClass(item.reminder === r.value)}
              onClick={close(() => act((l, s) => setReminder(l, item.entry.id, r.value, s), `die Erinnerung für ${item.title}`))}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {step === "loeschen" && (
        <div className="mb-2 flex flex-col gap-2">
          <p className="flex items-center gap-2 text-base text-muted">
            <Repeat2 className="h-5 w-5" strokeWidth={2} aria-hidden /> Wiederholt sich {repeatLabel(item.repeat, item.entry.data.date ?? undefined)}.
          </p>
          <button type="button" className={`${CARD} ${MENU_ROW}`} onClick={close(() => act((l, s) => removeItem(l, item.entry.id, s, item.date), `das Löschen von ${item.title}`, { deleted: true }))}>
            Nur diesen Tag
          </button>
          <button type="button" className={`${CARD} ${MENU_ROW} text-red-600`} onClick={close(() => act((l, s) => removeItem(l, item.entry.id, s), `das Löschen von ${item.title}`, { deleted: true }))}>
            Alle – die ganze Reihe
          </button>
        </div>
      )}
    </Sheet>
  );
}
