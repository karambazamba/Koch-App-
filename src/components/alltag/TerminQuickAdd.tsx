"use client";

// "+" bei Termine: Fenster "Neuer Termin" mit Textfeld (Mikrofon rechts),
// WANN (Heute · Morgen · nächster Wochentag · Datum), UHRZEIT (häufige zuerst ·
// andere), FÜR WEN (Avatare der Familie), Familie | Arbeit und "Mehr Optionen"
// (Ort, Erinnerung – Standard 30 Min vorher). Steht Tag/Uhrzeit im Text
// ("Morgen 19:30 Elternabend"), werden die Chips gesetzt und der Titel
// bereinigt. Ohne Uhrzeit: "Dann lieber als Aufgabe".

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, Mic, Square } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { sanitizeEntry, upsertEntry, type CalendarEntry, type Reminder } from "@/lib/aufgaben/model";
import { dayChipLabel, frequentTimes, quickTaskData, readTerminText, terminDay } from "@/lib/aufgaben/quick";
import { useEntries } from "@/lib/aufgaben/store";
import { addDays, todayIso } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";
import { act } from "./actions";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useProfile } from "@/lib/einstellungen/useProfile";

const REMINDER_CHIPS: { value: Reminder; label: string }[] = [
  { value: "aus", label: "keine" },
  { value: "30", label: "30 Min vorher" },
  { value: "60", label: "1 Std" },
  { value: "vorabend", label: "am Vortag" },
];

export function TerminQuickAdd({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const today = todayIso();
  const entries = useEntries();
  const [text, setText] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [reminder, setReminder] = useState<Reminder>("30");
  const [askTask, setAskTask] = useState(false);
  const [who, setWho] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [more, setMore] = useState(false);
  const profile = useProfile();
  const persons = (profile?.persons ?? []).filter((p) => p.name.trim());
  const dateInput = useRef<HTMLInputElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  const workRoom = useWorkRoom() || room === "arbeit";
  const read = readTerminText(text, today);
  // Selbst gewählt geht vor; sonst was im Text steht; sonst der Standard
  const day = terminDay(text, read.date, date, defaultDate, today);
  const clock = time ?? read.time ?? null;
  const where: Room = room ?? read.room;
  const times = useMemo(() => frequentTimes((entries ?? []).flatMap((e) => (e.typ === "termin" ? [e.data.start] : []))), [entries]);
  const later = addDays(today, 2);
  const dayChips = [
    { iso: today, label: "Heute" },
    { iso: addDays(today, 1), label: "Morgen" },
    { iso: later, label: dayChipLabel(later, true) },
  ];
  const otherDay = !dayChips.some((c) => c.iso === day);
  const otherTime = Boolean(clock && !times.includes(clock));

  // Neuer Text mit eigenem Tag/Uhrzeit geht vor einer früheren Wahl
  const change = (value: string) => {
    const next = readTerminText(value, today);
    if (next.date && next.date !== read.date) setDate(null);
    if (next.time && next.time !== read.time) setTime(null);
    setAskTask(false);
    setText(value);
  };
  const speech = useSpeechInput({ onTranscript: change, onEnd: (t) => t && change(t) });

  const save = () => {
    const title = read.title.trim();
    if (!title) return;
    if (!clock) return setAskTask(true);
    speech.reset();
    const entry = sanitizeEntry(createEntry("termin", { title: title.slice(0, 120), date: day, start: clock, reminder, repeat: read.repeat ?? null, ...(read.label ? { label: read.label } : {}), ...(who.length ? { who } : {}), ...(place.trim() ? { place: place.trim().slice(0, 120) } : {}) }, { raum: where }) as CalendarEntry);
    if (!entry) return;
    act((list) => upsertEntry(list, entry), entry.data.title);
    onClose();
  };
  const saveAsTask = () => {
    const title = read.title.trim();
    if (!title) return;
    speech.reset();
    const entry = sanitizeEntry(createEntry("aufgabe", quickTaskData(title, { date: day }, today, { label: read.label }), { raum: where }) as CalendarEntry);
    if (!entry) return;
    act((list) => upsertEntry(list, entry), entry.data.title);
    onClose();
  };

  return (
    <Sheet title="Neuer Termin" onClose={onClose}>
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-center gap-2">
          <input
            value={speech.listening ? speech.interim || text : text}
            onChange={(e) => change(e.target.value)}
            placeholder="z. B. Morgen 19:30 Elternabend"
            aria-label="Termin"
            autoFocus
            enterKeyHint="done"
            className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
          />
          {speech.supported !== false && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.listening ? "Zuhören beenden" : "Einsprechen"}
              aria-pressed={speech.listening}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
            </button>
          )}
        </div>
        {read.title && read.title !== text.trim() && (
          <p className="-mt-2 px-1 text-sm text-muted">
            Titel: {read.title}
            {read.repeat ? " · wiederkehrend" : ""}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Wann</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wann">
            {dayChips.map((c) => (
              <button key={c.iso} type="button" role="radio" aria-checked={day === c.iso} onClick={() => setDate(c.iso)} className={chipClass(day === c.iso)}>
                {c.label}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={otherDay} onClick={() => dateInput.current?.showPicker?.() ?? dateInput.current?.focus()} className={`relative ${chipClass(otherDay)}`}>
              <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
              {otherDay ? dayChipLabel(day) : "Datum"}
              <input ref={dateInput} type="date" min={today} value={day} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Datum wählen" className="absolute inset-0 opacity-0" tabIndex={-1} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Uhrzeit</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Uhrzeit">
            {times.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={clock === t} onClick={() => (setTime(t), setAskTask(false))} className={chipClass(clock === t)}>
                {t}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={otherTime} onClick={() => timeInput.current?.showPicker?.() ?? timeInput.current?.focus()} className={`relative ${chipClass(otherTime)}`}>
              <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
              {otherTime ? clock : "andere"}
              <input ref={timeInput} type="time" value={clock ?? ""} onChange={(e) => e.target.value && (setTime(e.target.value), setAskTask(false))} aria-label="Uhrzeit wählen" className="absolute inset-0 opacity-0" tabIndex={-1} />
            </button>
          </div>
        </div>

        {persons.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Für wen</span>
            <div className="flex flex-wrap gap-3" role="group" aria-label="Für wen">
              {persons.map((p) => {
                const on = who.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => setWho((w) => (on ? w.filter((x) => x !== p.id) : [...w, p.id]))} className="flex w-14 flex-col items-center gap-1">
                    <span className={`rounded-full p-0.5 ${on ? "ring-2 ring-accent" : "opacity-60"}`}>
                      <PersonAvatar name={p.name} size={40} />
                    </span>
                    <span className={`w-full truncate text-center text-[12px] ${on ? "font-bold text-ink" : "text-muted"}`}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {workRoom && (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Familie oder Arbeit</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Familie oder Arbeit">
              {(["familie", "arbeit"] as const).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={where === r} onClick={() => setRoom(r)} className={chipClass(where === r)}>
                  <span className={`h-2.5 w-2.5 rounded-full ${r === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />
                  {r === "familie" ? "Familie" : "Arbeit"}
                </button>
              ))}
            </div>
          </div>
        )}

        {more ? (
          <>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Ort</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="z. B. Praxis am Markt" className={`${INPUT_BASE} h-12 px-4`} />
            </label>
            <div className="flex flex-col gap-2">
          <span className={LABEL}>Erinnerung</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Erinnerung">
            {REMINDER_CHIPS.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={reminder === r.value} onClick={() => setReminder(r.value)} className={chipClass(reminder === r.value)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="hit -my-1 self-start text-[15px] font-semibold text-accent-strong">
            Mehr Optionen
          </button>
        )}

        {askTask ? (
          <div className="flex flex-col gap-2 rounded-card bg-accent-soft p-3" role="status">
            <p className="text-[15px] text-accent-strong">Ohne Uhrzeit? Dann lieber als Aufgabe.</p>
            <button type="button" onClick={saveAsTask} className={buttonClass("primary", "sm")}>
              Als Aufgabe speichern
            </button>
          </div>
        ) : (
          <button type="submit" disabled={!read.title.trim()} className={buttonClass("primary")}>
            Eintragen
          </button>
        )}
      </form>
    </Sheet>
  );
}
