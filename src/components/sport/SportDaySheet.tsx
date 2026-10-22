"use client";

// Ein Tag auf der Sport-Kachel (Titel = Datum), vier Arten:
// - leer (vergangen/heute): groß "Wie letztes Mal: Laufen · 45 Min", sonst
//   Sportart + Dauer wählen, "Eintragen"
// - trainiert: die Trainings mit "Ändern", "+ Noch ein Training an diesem
//   Tag", "Löschen" (Gelöscht · Rückgängig)
// - geplant: Uhrzeit, Erinnerung, Wetter, "Erledigt", "Verschieben …",
//   "Absagen"
// - leer in der Zukunft: "Training planen" (Sportart, Zeit aus freien Lücken,
//   Dauer) → Termin mit Etikett Sport und Erinnerung 30 Min vorher
// Punkte, "2 von 3" und die Feier folgen sofort (gleiche Speicher).

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { EntryForm } from "@/components/kalender/EntryForm";
import { act, buzz } from "@/components/heute/actions";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import { removeItem, sanitizeEntry, setDone, upsertEntry, weekdayLong, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { createEntry } from "@/lib/core/entries";
import { showDeleted } from "@/lib/core/toast";
import { round } from "@/lib/wetter/forecast";
import type { Forecast } from "@/lib/wetter/forecast";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { addTraining, removeTraining, updateTraining } from "@/lib/sport/actions";
import { SPORTS, freeStarts, lastTraining, plannedOn, sportById, trainingsBetween, type SportState, type Training } from "@/lib/sport";
import { SportAddSheet } from "@/components/sport/SportAddSheet";

const DURATIONS = [30, 45, 60, 90];
const DATE = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "UTC" });
const dayTitle = (iso: string) => `${weekdayLong(iso)}, ${DATE.format(new Date(`${iso}T12:00:00Z`))}`;
const REMINDER_TEXT: Record<string, string> = { aus: "Keine Erinnerung", "15": "Erinnerung 15 Min vorher", "30": "Erinnerung 30 Min vorher", "60": "Erinnerung 1 Std vorher", vorabend: "Erinnerung am Vorabend" };
const plusMinutes = (t: string, m: number) => {
  const all = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + m;
  return `${String(Math.min(23, Math.floor(all / 60))).padStart(2, "0")}:${String(all % 60).padStart(2, "0")}`;
};

function SportChips({ value, onChange, recent }: { value: string; onChange: (id: string) => void; recent: string[] }) {
  const order = [...new Set([...recent, ...SPORTS.map((s) => s.id)])].filter((id) => SPORTS.some((s) => s.id === id)).slice(0, 6);
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sportart">
      {order.map((id) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={chipClass(value === id)} aria-pressed={value === id}>
          {sportById(id).emoji} {sportById(id).label}
        </button>
      ))}
    </div>
  );
}

function DurationChips({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dauer">
      {DURATIONS.map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)} className={chipClass(value === d)} aria-pressed={value === d}>
          {d} Min
        </button>
      ))}
    </div>
  );
}

const LEGEND = "text-[15px] font-extrabold text-muted";

export function SportDaySheet({ date, today, state, entries, me, forecast, onClose }: { date: string; today: string; state: SportState; entries: CalendarEntry[]; me: string | null; forecast: Forecast | null; onClose: () => void }) {
  const trainings = trainingsBetween(state, entries, date, date, today, me);
  const planned = date >= today ? plannedOn(entries, date, today, me) : [];
  const last = lastTraining(state, entries, today, me);
  const recent = [...new Set(trainingsBetween(state, entries, today.slice(0, 4) + "-01-01", today, today, me).reverse().map((t) => t.data.sport))];
  const [sport, setSport] = useState(last?.sport ?? recent[0] ?? "laufen");
  const [minutes, setMinutes] = useState(last?.minutes && DURATIONS.includes(last.minutes) ? last.minutes : 45);
  const starts = freeStarts(entries, date, today, minutes);
  const [time, setTime] = useState<string | null>(null);
  const [edit, setEdit] = useState<Training | "neu" | null>(null);
  const [move, setMove] = useState<DayItem | null>(null);
  const done = () => {
    buzz();
    onClose();
  };
  const save = (data: { sport: string; minutes: number }) => {
    addTraining({ ...data, date });
    done();
  };

  let body: React.ReactNode;
  if (trainings.length) {
    body = (
      <>
        <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
          {trainings.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-base font-semibold">
                {sportById(t.data.sport).emoji} {sportById(t.data.sport).label} · {t.data.minutes} Min{t.data.km ? ` · ${t.data.km} km` : ""}
              </span>
              <button type="button" onClick={() => setEdit(t)} className={buttonClass("ghost", "sm")}>
                Ändern
              </button>
              <button
                type="button"
                onClick={() => {
                  showDeleted(removeTraining(t));
                  onClose();
                }}
                className={buttonClass("ghost", "sm")}
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setEdit("neu")} className={buttonClass("soft", "md")}>
          + Noch ein Training an diesem Tag
        </button>
      </>
    );
  } else if (planned.length) {
    body = planned.map((p) => {
      const hour = p.time ? Number(p.time.slice(0, 2)) : null;
      const wx = hour !== null ? forecast?.hours.find((h) => h.date === date && h.hour === hour) : undefined;
      const reminder = p.entry.typ === "termin" ? p.entry.data.reminder : "aus";
      return (
        <div key={p.key} className="flex flex-col gap-3">
          <section className={`${CARD} flex flex-col gap-1 p-4`}>
            <span className="text-[22px] font-extrabold tabular-nums">
              {p.time ? clockLabel(p.time) : "Ohne Uhrzeit"}
              {p.end ? `–${clockLabel(p.end)}` : ""}
            </span>
            <span className="text-base font-semibold">{p.title}</span>
            <span className="text-sm text-muted">{REMINDER_TEXT[reminder] ?? ""}</span>
            {wx && (
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <WeatherSymbol code={wx.code} className="h-5 w-5" /> {round(wx.temp)}° zur Trainingszeit
              </span>
            )}
          </section>
          <button type="button" onClick={() => (act((l, s) => setDone(l, p, true, s), p.title), done())} className={buttonClass("primary", "lg")}>
            Erledigt
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMove(p)} className={buttonClass("secondary", "md")}>
              Verschieben …
            </button>
            <button type="button" onClick={() => (act((l, s) => removeItem(l, p.entry.id, s, p.entry.data.repeat ? date : undefined), `${p.title} abgesagt`, { deleted: true }), onClose())} className={buttonClass("ghost", "md")}>
              Absagen
            </button>
          </div>
        </div>
      );
    });
  } else if (date <= today) {
    body = (
      <>
        {last && (
          <button type="button" onClick={() => save({ sport: last.sport, minutes: last.minutes })} className="flex min-h-14 items-center justify-center rounded-card bg-sport px-4 text-[17px] font-bold text-on-accent">
            Wie letztes Mal: {sportById(last.sport).label} · {last.minutes} Min
          </button>
        )}
        <span className={LEGEND}>{last ? "Oder was anderes" : "Was?"}</span>
        <SportChips value={sport} onChange={setSport} recent={recent} />
        <span className={LEGEND}>Wie lange?</span>
        <DurationChips value={minutes} onChange={setMinutes} />
        <button type="button" onClick={() => save({ sport, minutes })} className={buttonClass("secondary", "lg")}>
          Eintragen
        </button>
      </>
    );
  } else {
    const chosen = time ?? starts.find((t) => t >= "17:00") ?? starts[0] ?? null;
    body = (
      <>
        <span className={LEGEND}>Training planen</span>
        <SportChips value={sport} onChange={setSport} recent={recent} />
        <span className={LEGEND}>Wann?</span>
        {starts.length ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Uhrzeit">
            {starts.map((t) => (
              <button key={t} type="button" onClick={() => setTime(t)} className={chipClass(chosen === t)} aria-pressed={chosen === t}>
                {clockLabel(t)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">An dem Tag ist es schon recht voll – vielleicht ein anderer?</p>
        )}
        <span className={LEGEND}>Wie lange?</span>
        <DurationChips value={minutes} onChange={setMinutes} />
        <button
          type="button"
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            const kind = sportById(sport);
            const entry = sanitizeEntry(createEntry("termin", { title: kind.label, date, start: chosen, end: plusMinutes(chosen, minutes), reminder: "30", repeat: null, label: "Sport", ...(me ? { who: [me] } : {}) }, { raum: "familie" }) as CalendarEntry);
            if (entry) act((l) => upsertEntry(l, entry), `${kind.label} geplant`);
            done();
          }}
          className={buttonClass("primary", "lg")}
        >
          Planen
        </button>
        <p className="-mt-1 text-center text-sm text-muted">Ich erinnere dich 30 Min vorher.</p>
      </>
    );
  }

  return (
    <>
      <Sheet title={dayTitle(date)} onClose={onClose}>
        <div className="flex flex-col gap-3 pb-3">{body}</div>
      </Sheet>
      {edit && (
        <SportAddSheet
          today={today}
          recent={recent}
          initial={edit === "neu" ? undefined : edit}
          initialDate={date}
          onClose={() => setEdit(null)}
          onSave={(data) => {
            if (edit === "neu") addTraining(data);
            else updateTraining(edit, data);
            setEdit(null);
            done();
          }}
        />
      )}
      {move && <EntryForm entry={move.entry} onClose={() => (setMove(null), onClose())} />}
    </>
  );
}
