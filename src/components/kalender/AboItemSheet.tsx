"use client";

// Termin aus einem verbundenen Kalender (Google/Apple, nur lesen): wann, wo,
// aus welchem Kalender – und „In unseren Kalender kopieren“ (eigener Termin,
// frei änderbar). Ändern und Löschen geht im Original; es kommt von selbst an.

import { CalendarPlus, ExternalLink } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { NOTE, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import { repeatLabel, weekdayShort, type DayItem } from "@/lib/kalender/model";
import { changeEntries } from "@/lib/kalender/store";
import { aboOf } from "@/lib/kalender/abo/store";
import { copyToOwn } from "@/lib/kalender/abo/model";
import { showToast } from "@/lib/core/toast";

export function AboItemSheet({ item, onClose }: { item: DayItem; onClose: () => void }) {
  const abo = aboOf(item.entry);
  const d = item.entry.data;
  const [, m, day] = item.date.split("-");
  const when = [`${weekdayShort(item.date)} ${Number(day)}.${Number(m)}.`, item.time ? `${clockLabel(item.time)}${item.end ? `–${clockLabel(item.end)}` : ""}` : "ganztägig", item.repeat ? repeatLabel(item.repeat, d.date) : ""].filter(Boolean).join(" · ");
  const place = item.entry.typ === "termin" ? item.entry.data.place : undefined;
  const task = item.entry.typ === "aufgabe";
  const todoist = task && item.label === "Todoist";
  const copy = () => {
    changeEntries((list) => [...list, copyToOwn(item.entry)]);
    showToast({ text: task ? "Zu deinen Aufgaben kopiert" : "In euren Kalender kopiert", small: true, seconds: 3 });
    onClose();
  };
  return (
    <Sheet title={item.title} onClose={onClose}>
      <div className="mb-3 flex flex-col gap-1 px-1">
        <p className="text-base font-semibold">{when}</p>
        {place && <p className="text-base text-muted">{place}</p>}
        <p className="text-sm text-muted">aus {abo ? `„${abo.name}“` : task ? "einer verbundenen Liste" : "einem verbundenen Kalender"} · nur lesen</p>
      </div>
      <p className={`${NOTE} mb-3`}>{todoist ? "Abhaken, ändern und löschen geht in Todoist – das kommt hier von selbst an." : "Ändern und löschen geht im Original – das kommt hier von selbst an."}</p>
      {todoist && (
        <a href="https://todoist.com/app" target="_blank" rel="noopener noreferrer" className={`${buttonClass("primary")} mb-2 w-full`}>
          <ExternalLink className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          In Todoist öffnen
        </a>
      )}
      <button type="button" onClick={copy} className={`${buttonClass(todoist ? "secondary" : "primary")} mb-2 w-full`}>
        <CalendarPlus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        {task ? "Zu meinen Aufgaben kopieren" : "In unseren Kalender kopieren"}
      </button>
    </Sheet>
  );
}
