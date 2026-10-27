"use client";

// Ein Tag im Kalender (Tafel 74) – direkt unter dem Monat bzw. auf /tag, kein
// neuer Bildschirm: Kopf „Freitag, 30. Oktober“ + rechts klein „heute /
// morgen / in 7 Tagen“, darunter nur die Termine (Uhrzeit Blau, Titel, rechts
// kleiner Kreis der Person; antippen = Termin). Eintragen nur über ＋ (Launch
// 1.0: keine eigene Zeile „Termin am …“). „Schnell eintragen“ nur bei
// Wiederkehrendem. Kein Essen, keine Aufgaben.

import { GanztagMarke, zeitSpalte } from "@/components/kalender/GanztagMarke";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Bell } from "lucide-react";
import { reminderFor } from "@/lib/heute/mitteilungen/erinnerungen";
import { CARD } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { loadNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { AddedBy } from "@/components/konten/AddedBy";
import { ItemMenu } from "@/components/kalender/Items";
import { TipsDayList, useCalendarTips } from "@/components/tipps/CalendarTips";
import { clockLabel } from "@/lib/kalender/answers";
import { dayDistance, recurringSuggestions, termineOn, type Suggestion } from "@/lib/kalender/monat";
import { sanitizeEntry, upsertEntry, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { createEntry } from "@/lib/core/entries";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { changeEntries } from "@/lib/kalender/store";
import { useProfile } from "@/lib/einstellungen/useProfile";

const EntryForm = dynamic(() => import("@/components/kalender/EntryForm").then((m) => m.EntryForm), { ssr: false });

export type RoomFilter = "alles" | "familie" | "arbeit";

const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Wiederkehrendes mit einem Tipp eintragen – „Eingetragen · Rückgängig“ */
function addSuggestion(s: Suggestion, date: string) {
  const entry = sanitizeEntry(createEntry("termin", { title: s.title, date, start: s.time, reminder: loadNotify().defaultReminder, repeat: null, ...(s.label ? { label: s.label } : {}) }, { raum: s.room }) as CalendarEntry);
  if (!entry) return;
  const undo = pushUndo(`${s.title} eingetragen`, changeEntries((list) => upsertEntry(list, entry)));
  showToast({ text: "Eingetragen", undo, undoneText: "Wieder weg", seconds: 4, small: true });
}

export function DayPanel({ date, today, entries, filter = "alles", heading = true }: { date: string; today: string; entries: CalendarEntry[]; filter?: RoomFilter; heading?: boolean }) {
  const profile = useProfile();
  const persons = profile?.persons ?? [];
  const items = termineOn(entries, date, today).filter((i) => filter === "alles" || i.room === filter);
  const tips = useCalendarTips(today).byDay.get(date) ?? [];
  const chips = date >= today ? recurringSuggestions(entries, date, today) : [];
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  return (
    <section className="flex flex-col gap-2.5" aria-label="Gewählter Tag">
      {heading && (
        <div className="flex min-h-11 items-center justify-between px-1">
          <h2 className="text-[17px] font-extrabold">{LONG.format(new Date(`${date}T12:00:00Z`))}</h2>
          <span className="text-sm font-semibold text-muted">{dayDistance(date, today)}</span>
        </div>
      )}
      {items.length > 0 && (
        <ul className={`${CARD} flex flex-col divide-y divide-line px-4 py-1`} aria-label="Termine">
          {items.map((i) => {
            const ids = i.entry.typ === "termin" ? (i.entry.data.who ?? []) : [];
            const who = persons.find((p) => ids.includes(p.id) && p.name.trim());
            return (
              <li key={i.key}>
                <button type="button" onClick={() => setMenu(i)} className={`flex min-h-12 w-full items-center gap-3 text-left ${i.done ? "opacity-50" : ""}`} aria-label={`${i.title} – Möglichkeiten${i.time ? ` (${clockLabel(i.time)})` : ""}`}>
                  <span className={`${zeitSpalte(items.some((x) => !x.time), "gross")} shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums text-work`}>{i.time ? clockLabel(i.time) : <GanztagMarke title={i.title} label={i.label} />}</span>
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{i.title}</span>
                  {reminderFor(i) && <Bell className="h-[13px] w-[13px] shrink-0 text-muted" strokeWidth={2.25} aria-label="mit Erinnerung" />}
                  <AddedBy owner={i.entry.besitzer} />
                  {who && <PersonAvatar name={who.name} size={24} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {filter !== "arbeit" && <TipsDayList tips={tips} />}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1" aria-label="Schnell eintragen">
          <span className="text-sm font-semibold text-muted">Schnell eintragen</span>
          {chips.map((s) => (
            <button key={s.title} type="button" onClick={() => addSuggestion(s, date)} className="hit inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[14px] font-semibold active:scale-95">
              <span className="tabular-nums text-work">{clockLabel(s.time)}</span> {s.title}
            </button>
          ))}
        </div>
      )}
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
    </section>
  );
}
