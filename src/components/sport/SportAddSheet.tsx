"use client";

// Training eintragen (Fenster von unten): WAS? (zuletzt genutzte zuerst, +
// andere) · WIE LANGE? (20/30/45/60/90, eigene) · WANN? (Heute/Gestern/📅) ·
// optional km · "Eintragen". Auch zum Ändern eines Trainings.

import { useState } from "react";
import { Sheet } from "@/components/plan/Sheet";
import { INPUT, buttonClass, chipClass } from "@/components/ui/styles";
import { addDays } from "@/lib/core/now";
import { SPORTS, sportById, type Training, type TrainingData } from "@/lib/sport";

const DURATIONS = [20, 30, 45, 60, 90];

export function SportAddSheet({ today, recent, initial, onClose, onSave }: { today: string; recent: string[]; initial?: Training; onClose: () => void; onSave: (data: TrainingData) => void }) {
  const start = initial?.data;
  const [sport, setSport] = useState(start?.sport ?? recent[0] ?? "laufen");
  const [other, setOther] = useState(start && !SPORTS.some((s) => s.id === start.sport) ? start.sport : "");
  const [minutes, setMinutes] = useState(String(start?.minutes ?? 45));
  const [date, setDate] = useState(start?.date ?? today);
  const [km, setKm] = useState(start?.km ? String(start.km) : "");
  const order = [...new Set([...recent, ...SPORTS.map((s) => s.id)])].filter((id) => SPORTS.some((s) => s.id === id));
  const min = Number(minutes);
  const kmValue = Number(km.replace(",", "."));
  const chosen = sport === "andere" ? other.trim() : sport;
  const ok = Boolean(chosen) && Number.isFinite(min) && min > 0 && min <= 600 && Boolean(date);
  const yesterday = addDays(today, -1);
  return (
    <Sheet title={initial ? "Training ändern" : "Training eintragen"} onClose={onClose}>
      <form
        className="flex flex-col gap-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          onSave({ ...(start ?? {}), sport: chosen, minutes: Math.round(min), date, ...(km && kmValue > 0 ? { km: kmValue } : { km: undefined }) });
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Was?</legend>
          <div className="flex flex-wrap gap-1.5">
            {order.map((id) => {
              const s = sportById(id);
              return (
                <button key={id} type="button" onClick={() => setSport(id)} className={chipClass(sport === id)} aria-pressed={sport === id}>
                  {s.emoji} {s.label}
                </button>
              );
            })}
            <button type="button" onClick={() => setSport("andere")} className={chipClass(sport === "andere")} aria-pressed={sport === "andere"}>
              + andere
            </button>
          </div>
          {sport === "andere" && <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="z. B. Tennis" maxLength={30} className={INPUT} aria-label="Andere Sportart" autoFocus />}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Wie lange?</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            {DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => setMinutes(String(d))} className={chipClass(minutes === String(d))} aria-pressed={minutes === String(d)}>
                {d} Min
              </button>
            ))}
            <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} className={`${INPUT} w-24`} aria-label="Minuten" />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Wann?</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setDate(today)} className={chipClass(date === today)} aria-pressed={date === today}>
              Heute
            </button>
            <button type="button" onClick={() => setDate(yesterday)} className={chipClass(date === yesterday)} aria-pressed={date === yesterday}>
              Gestern
            </button>
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${INPUT} w-44`} aria-label="Datum" />
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Kilometer (optional)</span>
          <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="z. B. 5" className={`${INPUT} w-32`} aria-label="Kilometer" />
        </label>
        <button type="submit" disabled={!ok} className={buttonClass("primary", "lg")}>
          {initial ? "Speichern" : "Eintragen"}
        </button>
      </form>
    </Sheet>
  );
}
