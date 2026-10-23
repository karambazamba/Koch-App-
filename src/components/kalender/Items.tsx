"use client";

// Termine und Aufgaben: Farbe des Strichs (Raum bzw. verbundener Kalender)
// und das Menü beim Antippen eines Eintrags. Ruhig: keine Zähler, nichts "Offenes".

import { GiveRows } from "@/components/kalender/abgeben/GiveRows";
import { useState, type CSSProperties } from "react";
import { Bell, Pencil, Repeat2, Trash2, CalendarArrowUp, CheckCircle2, Circle } from "lucide-react";
import { CARD, chipClass } from "@/components/ui/styles";
import { Sheet } from "@/components/ui/Sheet";
import { isUrgent, moveItem, REMINDERS, removeItem, repeatLabel, setDone, setReminder, setUrgent, type DayItem } from "@/lib/kalender/model";
import { UrgentMark } from "@/components/kalender/UrgentMark";
import { addDays } from "@/lib/core/now";
import { act, buzz } from "@/components/heute/actions";
import dynamic from "next/dynamic";
import { aboOf } from "@/lib/kalender/abo/store";
import { isAboEntry } from "@/lib/kalender/abo/model";
import { avatarHex } from "@/lib/einstellungen/profileHelper";

const AboItemSheet = dynamic(() => import("@/components/kalender/AboItemSheet").then((m) => m.AboItemSheet), { ssr: false });


/** Farbe des Strichs: Orange = Familie, Blau = Arbeit */
const roomBar = (room: DayItem["room"]) => (room === "arbeit" ? "bg-work" : "bg-accent");

/** Strich bzw. Punkt: Raum-Farbe, bei Terminen aus verbundenen Kalendern deren Farbe */
export function roomBarProps(item: Pick<DayItem, "room" | "entry">): { className: string; style?: CSSProperties } {
  const abo = aboOf(item.entry);
  return abo ? { className: "", style: { backgroundColor: avatarHex(abo.color) } } : { className: roomBar(item.room) };
}

const MENU_ROW = "flex h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold active:bg-fill";

/** Antippen eines Eintrags: Erledigt · Auf morgen · Erinnerung ändern · Bearbeiten · Löschen */
export function ItemMenu({ item, onClose, onEdit }: { item: DayItem; onClose: () => void; onEdit: () => void }) {
  const [step, setStep] = useState<"menu" | "erinnerung" | "loeschen">("menu");
  const series = Boolean(item.repeat);
  const close = (fn: () => void) => () => {
    fn();
    onClose();
  };
  // Aus einem verbundenen Kalender: nur lesen, kopieren
  if (isAboEntry(item.entry)) return <AboItemSheet item={item} onClose={onClose} />;
  return (
    <Sheet title={item.title} onClose={onClose}>
      {step === "menu" && (
        <div className={`${CARD} mb-2 flex flex-col divide-y divide-line overflow-hidden`}>
          <button type="button" className={MENU_ROW} onClick={close(() => (buzz(), item.done ? act((l, s) => setDone(l, item, false, s)) : act((l, s) => setDone(l, item, true, s), item.title, { done: true })))}>
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
          <GiveRows item={item} row={MENU_ROW} onDone={onClose} />
          <button type="button" className={MENU_ROW} onClick={() => setStep("erinnerung")}>
            <Bell className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            <span className="flex-1">Erinnerung ändern</span>
            <span className="text-sm font-semibold text-accent-strong">{REMINDERS.find((r) => r.value === item.reminder)?.short}</span>
          </button>
          <button type="button" className={MENU_ROW} onClick={onEdit}>
            <Pencil className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            Bearbeiten
          </button>
          <button type="button" className={`${MENU_ROW} text-danger`} onClick={() => (series ? setStep("loeschen") : close(() => act((l, s) => removeItem(l, item.entry.id, s), `das Löschen von ${item.title}`, { deleted: true }))())}>
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
          <button type="button" className={`${CARD} ${MENU_ROW} text-danger`} onClick={close(() => act((l, s) => removeItem(l, item.entry.id, s), `das Löschen von ${item.title}`, { deleted: true }))}>
            Alle – die ganze Reihe
          </button>
        </div>
      )}
    </Sheet>
  );
}
