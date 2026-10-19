"use client";

// Termin oder Aufgabe anlegen/bearbeiten (Formular von unten). Lotte ist
// der Hauptweg – das Formular dient zum Nachschauen und Feinjustieren.

import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useState } from "react";
import { Sheet } from "@/components/plan/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { INPUT, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { mondayOf, REMINDERS, sanitizeEntry, upsertEntry, weekdayIndex, type CalendarEntry, type Reminder, type Repeat } from "@/lib/aufgaben/model";
import { todayIso } from "@/lib/core/now";
import { act } from "./actions";

const LABEL_SUGGESTIONS = ["Kita", "Schule", "Arzt", "Sport", "Café", "Geburtstag"];
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
type RepeatKind = "nie" | Repeat["kind"];
const REPEATS: { value: RepeatKind; label: string }[] = [
  { value: "nie", label: "Einmal" },
  { value: "taeglich", label: "Täglich" },
  { value: "woechentlich", label: "Wöchentlich" },
  { value: "monatlich", label: "Monatlich" },
  { value: "wochentage", label: "An Wochentagen" },
];

export function EntryForm({ entry, date, kind, onClose }: { entry?: CalendarEntry; date?: string; kind?: "termin" | "aufgabe"; onClose: () => void }) {
  const d = entry?.data;
  const [typ, setTyp] = useState<"termin" | "aufgabe">(entry?.typ ?? kind ?? "termin");
  const [title, setTitle] = useState(d?.title ?? "");
  // Neue Aufgabe von der Aufgaben-Seite: ohne Tag ("Irgendwann")
  const [day, setDay] = useState(d?.date ?? date ?? (kind === "aufgabe" ? "" : todayIso()));
  const [week, setWeek] = useState(entry?.typ === "aufgabe" ? (entry.data.week ?? "") : "");
  const [time, setTime] = useState(entry?.typ === "termin" ? entry.data.start : entry?.typ === "aufgabe" ? (entry.data.time ?? "") : "");
  const [end, setEnd] = useState(entry?.typ === "termin" ? (entry.data.end ?? "") : "");
  const [due, setDue] = useState(entry?.typ === "aufgabe" ? (entry.data.due ?? "") : "");
  const [place, setPlace] = useState(entry?.typ === "termin" ? (entry.data.place ?? "") : "");
  const [room, setRoom] = useState<Room>(entry?.raum ?? "familie");
  const [label, setLabel] = useState(d?.label ?? "");
  const [repeat, setRepeat] = useState<RepeatKind>(d?.repeat?.kind ?? "nie");
  const [days, setDays] = useState<number[]>(d?.repeat?.kind === "wochentage" ? d.repeat.days : [weekdayIndex(day || todayIso())]);
  const [reminder, setReminder] = useState<Reminder>(d?.reminder ?? "aus");
  const [hint, setHint] = useState("");
  const workRoom = useWorkRoom() || room === "arbeit";

  const save = () => {
    if (!title.trim()) return setHint("Wie heißt es? Ein Wort reicht.");
    if (typ === "termin" && !time) return setHint("Für einen Termin brauche ich eine Uhrzeit – ohne Uhrzeit ist es eine Aufgabe.");
    if (typ === "termin" && !day) return setHint("An welchem Tag?");
    const rep: Repeat | null = repeat === "nie" ? null : repeat === "wochentage" ? { kind: "wochentage", days: days.length ? days : [weekdayIndex(day || todayIso())] } : { kind: repeat };
    const keep = { doneDates: d?.doneDates ?? [], skipDates: d?.skipDates ?? [] };
    const data =
      typ === "termin"
        ? { title, date: day, start: time, end: end || undefined, place: place || undefined, label: label || undefined, repeat: rep, reminder, who: entry?.typ === "termin" ? entry.data.who : undefined, ...keep }
        : { title, date: day || undefined, due: due || undefined, week: !day && !due && week ? week : undefined, time: time || undefined, label: label || undefined, repeat: rep, reminder, doneOn: entry?.typ === "aufgabe" ? entry.data.doneOn : null, ...keep };
    const base = entry ? { ...entry, typ, raum: room, data } : createEntry(typ, data, { raum: room });
    const clean = sanitizeEntry({ ...base, geaendert: new Date().toISOString() });
    if (!clean) return setHint("Das hat nicht geklappt – schau bitte nochmal auf Datum und Uhrzeit.");
    act((list) => upsertEntry(list, clean), clean.data.title);
    onClose();
  };

  return (
    <Sheet title={entry ? "Bearbeiten" : "Neu"} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <Segmented
          label="Art"
          value={typ}
          onChange={setTyp}
          options={[
            { value: "termin", label: "Termin" },
            { value: "aufgabe", label: "Aufgabe" },
          ]}
        />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Was?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={typ === "termin" ? "z. B. Steuerberater" : "z. B. Kita-Formular"} className={INPUT} autoFocus={!entry} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{typ === "termin" ? "Tag" : "Tag (optional)"}</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{typ === "termin" ? "Uhrzeit" : "Uhrzeit (optional)"}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} />
          </label>
          {typ === "termin" ? (
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Bis (optional)</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Bis spätestens (optional)</span>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
            </label>
          )}
        </div>
        {typ === "aufgabe" && !day && !due && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wann ungefähr?">
            {[
              { value: "", label: "Irgendwann" },
              { value: mondayOf(todayIso()), label: "Diese Woche" },
            ].map((o) => (
              <button key={o.label} type="button" role="radio" aria-checked={week === o.value} onClick={() => setWeek(o.value)} className={chipClass(week === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        {workRoom && (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Für</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Für">
              {(["familie", "arbeit"] as const).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={room === r} onClick={() => setRoom(r)} className={chipClass(room === r)}>
                  <span className={`h-2.5 w-2.5 rounded-full ${r === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />
                  {r === "familie" ? "Familie" : "Arbeit"}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Etikett (optional)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Kita, Arzt, Café" className={INPUT} />
          <span className="flex flex-wrap gap-2">
            {LABEL_SUGGESTIONS.filter((l) => l !== label).slice(0, 5).map((l) => (
              <button key={l} type="button" onClick={() => setLabel(l)} className={chipClass(false)}>
                {l}
              </button>
            ))}
          </span>
        </label>
        {typ === "termin" && (
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Ort oder Notiz (optional)</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} className={INPUT} />
          </label>
        )}
        <div className="flex flex-col gap-2">
          <span className={LABEL}>Wiederholen</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wiederholen">
            {REPEATS.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={repeat === r.value} onClick={() => setRepeat(r.value)} className={chipClass(repeat === r.value)}>
                {r.label}
              </button>
            ))}
          </div>
          {repeat === "wochentage" && (
            <div className="flex gap-1.5" aria-label="Wochentage">
              {DAYS.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={days.includes(i)}
                  onClick={() => setDays((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort()))}
                  className={`h-10 flex-1 rounded-xl border text-sm font-bold ${days.includes(i) ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-surface"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={LABEL}>Erinnerung</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Erinnerung">
            {REMINDERS.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={reminder === r.value} onClick={() => setReminder(r.value)} className={chipClass(reminder === r.value)}>
                {r.value === "aus" ? "Keine" : r.label}
              </button>
            ))}
          </div>
        </div>
        {hint && (
          <p className="text-sm font-semibold text-accent-strong" role="status">
            {hint}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={`${buttonClass("secondary")} flex-1`}>
            Abbrechen
          </button>
          <button type="button" onClick={save} className={`${buttonClass("primary")} flex-1`}>
            {entry ? "Speichern" : "Eintragen"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
