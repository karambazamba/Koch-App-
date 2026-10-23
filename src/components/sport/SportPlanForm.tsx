"use client";

// Training planen oder ändern (Tafel 25): Sportart als Chips mit Linien-Icons
// (+ „Andere“, wird gemerkt), Wann? = bis zu 3 freie Vorschläge + „Andere“
// (natives Zeit-Rad, 5-Minuten-Schritte) mit Satz „Frei“ bzw. „Überschneidet
// sich mit …“ (trotzdem erlaubt), Wie lange? (30/45/60/90 + „Andere“),
// „Jede Woche“. Der Knopf zeigt das Ergebnis: „Planen · Sa 18:30“.

import { useRef, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { act } from "@/components/heute/actions";
import { INPUT, INPUT_INLINE, buttonClass, chipClass } from "@/components/ui/styles";
import { SportIcon } from "@/components/sport/SportIcon";
import { clockLabel } from "@/lib/kalender/answers";
import { now } from "@/lib/core/now";
import { upsertEntry, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { rememberSport } from "@/lib/sport/actions";
import { SPORTS, changePlanned, clashText, clashWith, freeStarts, lastTimeFor, plannedEntry, plannedMinutes, sportById, sportOfTitle, type SportState } from "@/lib/sport";

const DURATIONS = [30, 45, 60, 90];
const LEGEND = "text-[15px] font-extrabold text-muted";

type Props = { date: string; days?: string[]; today: string; entries: CalendarEntry[]; state: SportState; me: string | null; recent: string[]; editing?: DayItem; fallbackMinutes: number; onDone: () => void };

export function SportPlanForm({ date: initialDate, days, today, entries, state, me, recent, editing, fallbackMinutes, onDone }: Props) {
  const [sport, setSport] = useState(editing ? sportOfTitle(editing.title) : (recent[0] ?? "laufen"));
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [minutes, setMinutes] = useState(editing ? (plannedMinutes(editing) ?? 60) : fallbackMinutes);
  const [ownMinutes, setOwnMinutes] = useState(!DURATIONS.includes(minutes));
  const [time, setTime] = useState<string | null>(editing?.time ?? null);
  const [ownTime, setOwnTime] = useState(false);
  const [weekly, setWeekly] = useState(Boolean(editing?.repeat));
  const [scope, setScope] = useState<"diesmal" | "serie">("diesmal");
  const timeInput = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(initialDate);

  const at = now();
  const starts = freeStarts(entries, date, today, minutes || 30, 3, date === today ? at.getHours() * 60 + at.getMinutes() : -1);
  const chosen = time ?? lastTimeFor(entries, sport) ?? starts[0] ?? null;
  const chosenSport = otherOpen ? other.trim() : sport;
  const clash = chosen && minutes ? clashWith(entries, date, today, chosen, minutes, editing?.entry.id) : null;
  const ok = Boolean(chosen && chosenSport && minutes >= 5 && minutes <= 600);
  const series = Boolean(editing?.repeat);
  const known = new Set(SPORTS.map((s) => s.id));
  const chips = [...new Set([...recent, ...SPORTS.map((s) => s.id), ...state.custom, ...(known.has(sport) ? [] : [sport])])].slice(0, 9);

  const save = () => {
    if (!ok || !chosen) return;
    if (otherOpen) rememberSport(chosenSport);
    const plan = { sport: chosenSport, date, start: chosen, minutes, weekly: series ? weekly && scope === "serie" : weekly };
    if (editing) {
      act((l, stamp) => changePlanned(l, editing, plan, series ? scope : "serie", stamp, me), `${sportById(chosenSport).label} geändert`);
    } else {
      const entry = plannedEntry(plan, me);
      if (entry) act((l) => upsertEntry(l, entry), `${sportById(chosenSport).label} geplant`);
    }
    onDone();
  };

  return (
    <>
      {!editing && !days && <span className={LEGEND}>Training planen</span>}
      {days && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tag">
          {days.map((d) => (
            <button key={d} type="button" onClick={() => (setDate(d), setTime(null))} className={chipClass(date === d)} aria-pressed={date === d}>
              {d === today ? "Heute" : `${weekdayShort(d)} ${Number(d.slice(8))}.`}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sportart">
        {chips.map((id) => (
          <button key={id} type="button" onClick={() => (setSport(id), setOtherOpen(false))} className={chipClass(!otherOpen && sport === id)} aria-pressed={!otherOpen && sport === id}>
            <SportIcon sport={id} />
            {sportById(id).label}
          </button>
        ))}
        <button type="button" onClick={() => setOtherOpen(true)} className={chipClass(otherOpen)} aria-pressed={otherOpen}>
          Andere
        </button>
      </div>
      {otherOpen && <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="z. B. Tennis" maxLength={30} className={INPUT} aria-label="Andere Sportart" autoFocus />}

      <span className={LEGEND}>Wann?</span>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Uhrzeit">
        {starts.map((t) => (
          <button key={t} type="button" onClick={() => (setTime(t), setOwnTime(false))} className={chipClass(!ownTime && chosen === t)} aria-pressed={!ownTime && chosen === t}>
            {clockLabel(t)}
          </button>
        ))}
        {!ownTime && chosen && !starts.includes(chosen) && (
          <button type="button" onClick={() => setOwnTime(true)} className={chipClass(true)} aria-pressed>
            {clockLabel(chosen)}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOwnTime(true);
            // Zeit-Rad gleich öffnen (wo der Browser es kann)
            requestAnimationFrame(() => {
              timeInput.current?.focus();
              try {
                timeInput.current?.showPicker?.();
              } catch {
                // dann reicht das Feld
              }
            });
          }}
          className={chipClass(ownTime)}
          aria-pressed={ownTime}
        >
          Andere
        </button>
        {ownTime && <input ref={timeInput} type="time" step={300} value={chosen ?? ""} onChange={(e) => setTime(e.target.value || null)} className={`${INPUT_INLINE} w-36`} aria-label="Eigene Uhrzeit" />}
      </div>
      {chosen && (
        <p className={`-mt-1 flex items-center gap-1.5 text-sm font-semibold ${clash ? "text-muted" : "text-good-ink"}`} role="status">
          {clash ? <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> : <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />}
          {clashText(clash)}
        </p>
      )}

      <span className={LEGEND}>Wie lange?</span>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Dauer">
        {DURATIONS.map((d) => (
          <button key={d} type="button" onClick={() => (setMinutes(d), setOwnMinutes(false))} className={chipClass(!ownMinutes && minutes === d)} aria-pressed={!ownMinutes && minutes === d}>
            {d} Min
          </button>
        ))}
        <button type="button" onClick={() => setOwnMinutes(true)} className={chipClass(ownMinutes)} aria-pressed={ownMinutes}>
          Andere
        </button>
        {ownMinutes && (
          <input inputMode="numeric" value={minutes || ""} onChange={(e) => setMinutes(Math.min(600, Number(e.target.value.replace(/\D/g, "")) || 0))} placeholder="Min" className={`${INPUT_INLINE} w-24`} aria-label="Eigene Dauer in Minuten" autoFocus />
        )}
      </div>

      {series ? (
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Was ändern?">
          {(["diesmal", "serie"] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => (setScope(s), setWeekly(true))} className={`${chipClass(scope === s)} justify-center`}>
              {s === "diesmal" ? "Nur diesmal" : "Jede Woche"}
            </button>
          ))}
        </div>
      ) : (
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-base font-semibold">Jede Woche</span>
          <input type="checkbox" role="switch" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-6 w-6 shrink-0 accent-accent" aria-label="Jede Woche" />
        </label>
      )}

      <button type="button" disabled={!ok} onClick={save} className={buttonClass("primary", "lg")}>
        {editing ? "Speichern" : "Planen"}
        {chosen ? ` · ${weekdayShort(date)} ${clockLabel(chosen)}` : ""}
      </button>
      <p className="-mt-1 text-center text-sm text-muted">30 Min vorher steht es oben auf Heute.</p>
    </>
  );
}
