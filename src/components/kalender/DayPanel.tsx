"use client";

// Ein Tag im Kalender (Tafel 74) – direkt unter dem Monat bzw. auf /tag, kein
// neuer Bildschirm: Kopf „Freitag, 30. Oktober“ + rechts klein „heute /
// morgen / in 7 Tagen“, darunter nur die Termine (Uhrzeit Blau, Titel, rechts
// kleiner Kreis der Person; antippen = Termin). Dann die große Zeile „Termin
// am Fr, 30. Okt“ (zart Orange, gestrichelt) → Schnelleingabe mit diesem Tag.
// „Schnell eintragen“ nur bei Wiederkehrendem. Kein Essen, keine Aufgaben.

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { AddedBy } from "@/components/konten/AddedBy";
import { ItemMenu } from "@/components/kalender/Items";
import { TipsDayList, useCalendarTips } from "@/components/tipps/CalendarTips";
import { clockLabel } from "@/lib/kalender/answers";
import { dayDistance, recurringSuggestions, termineOn, type Suggestion } from "@/lib/kalender/monat";
import { sanitizeEntry, upsertEntry, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { createEntry } from "@/lib/core/entries";
import { openQuick, shortDay } from "@/lib/core/schnelleingabe";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { changeEntries } from "@/lib/kalender/store";
import { useProfile } from "@/lib/einstellungen/useProfile";

const EntryForm = dynamic(() => import("@/components/kalender/EntryForm").then((m) => m.EntryForm), { ssr: false });
const TerminQuickAdd = dynamic(() => import("@/components/kalender/TerminQuickAdd").then((m) => m.TerminQuickAdd), { ssr: false });

export type RoomFilter = "alles" | "familie" | "arbeit";

const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Wiederkehrendes mit einem Tipp eintragen – „Eingetragen · Rückgängig“ */
function addSuggestion(s: Suggestion, date: string) {
  const entry = sanitizeEntry(createEntry("termin", { title: s.title, date, start: s.time, reminder: "30", repeat: null, ...(s.label ? { label: s.label } : {}) }, { raum: s.room }) as CalendarEntry);
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
  const [form, setForm] = useState<string | null>(null);
  const day = shortDay(date);
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
                  <span className="w-12 shrink-0 text-[15px] font-bold tabular-nums text-work">{i.time ? clockLabel(i.time) : "ganzt."}</span>
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{i.title}</span>
                  <AddedBy owner={i.entry.besitzer} />
                  {who && <PersonAvatar name={who.name} size={24} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {filter !== "arbeit" && <TipsDayList tips={tips} />}
      <button
        type="button"
        onClick={() => openQuick({ kind: "termin", date, more: setForm })}
        className="flex min-h-14 w-full items-center gap-3 rounded-card border-2 border-dashed border-accent/40 bg-accent-soft/60 px-4 py-2 text-left active:scale-[0.99]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-base font-bold text-accent-strong">Termin am {day}</span>
          <span className="text-sm text-muted">Antippen und eintragen</span>
        </span>
      </button>
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
      {form !== null && <TerminQuickAdd defaultDate={date} initialText={form} onClose={() => setForm(null)} />}
    </section>
  );
}
