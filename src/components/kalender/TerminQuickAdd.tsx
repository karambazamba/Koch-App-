"use client";

// "+" bei Termine – ein Satz genügt (Tafel 26): Text oder Sprache ist der
// Hauptweg („Mittwoch 12.30 Zahnarzt“). Darunter zwei Pillen [Tag] [Uhrzeit]
// zeigen, was erkannt wurde, und dienen nur zum Korrigieren (Tag: Heute,
// Morgen, Wochentage, Datum; Uhrzeit: Zeit-Rad oder ganztägig). Ohne Uhrzeit
// Vorschläge („Heute noch frei“). Erkannte Wörter sind im Feld orange
// hinterlegt und verschwinden beim Speichern aus dem Titel. Von Hand geändert
// schlägt Automatik („×“ = wieder automatisch). Zeit schon vorbei → Hinweis.
// Unten klebt die Leiste („Familie · Erinnerung 30 Min“ = mehr Optionen,
// „Eintragen“) über der Tastatur.

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock, Mic, MicOff, Square, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { TimeWheel } from "@/components/ui/TimeWheel";
import { INPUT_BASE, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { REMINDERS, itemsForDay, sanitizeEntry, upsertEntry, type CalendarEntry, type Reminder } from "@/lib/kalender/model";
import { dayChipLabel, readTerminText } from "@/lib/kalender/quick";
import { isPast, readSentence, timeLabel, timeSuggestions, type Sentence } from "@/lib/kalender/sentence";
import { useEntries } from "@/lib/kalender/store";
import { addDays, now, todayIso } from "@/lib/core/now";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { act } from "@/components/heute/actions";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { MIC_BLOCKED, MicStrip } from "@/components/ui/MicPermission";

const REMINDER_CHIPS: { value: Reminder; label: string }[] = [
  { value: "aus", label: "keine" },
  { value: "30", label: "30 Min vorher" },
  { value: "60", label: "1 Std" },
  { value: "vorabend", label: "am Vortag" },
];

/** Pille: leer/automatisch weiß, mit Wert orange getönt; kurzes Ploppen bei neuem Wert */
const pill = (filled: boolean, pop: boolean) =>
  `hit relative inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold transition-transform duration-200 ${pop ? "scale-[1.04]" : ""} ${filled ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line bg-surface text-ink"}`;

/** Text mit hinterlegten Stellen (liegt genau hinter dem Eingabefeld) */
function Highlight({ text, spans, shift }: { text: string; spans: Sentence["spans"]; shift: number }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  spans.forEach((s, i) => {
    if (s.start > at) parts.push(text.slice(at, s.start));
    parts.push(
      <mark key={i} className="bg-accent-soft text-transparent">
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  });
  parts.push(text.slice(at));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden px-4 text-base leading-[3rem] whitespace-pre text-transparent" aria-hidden>
      <div style={{ transform: `translateX(${-shift}px)` }}>{parts}</div>
    </div>
  );
}

export function TerminQuickAdd({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const today = todayIso();
  const entries = useEntries();
  const [text, setText] = useState("");
  const [read, setRead] = useState<Sentence>({ title: "", spans: [] });
  const [manualDate, setManualDate] = useState<string | null>(null);
  /** von Hand: Uhrzeit oder "" = ganztägig; null = automatisch */
  const [manualTime, setManualTime] = useState<string | null>(null);
  const [picker, setPicker] = useState<"tag" | "zeit" | null>(null);
  const [wheel, setWheel] = useState("12:00");
  const [pastOk, setPastOk] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [reminder, setReminder] = useState<Reminder>("30");
  const [who, setWho] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [more, setMore] = useState(false);
  const [pop, setPop] = useState(false);
  const [shift, setShift] = useState(0);
  const profile = useProfile();
  const persons = sortBy((profile?.persons ?? []).filter((p) => p.name.trim()), ...PERSONS);
  const workRoom = useWorkRoom() || room === "arbeit";
  const inset = useKeyboardInset();
  const dateInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRead = useRef<Sentence>({ title: "", spans: [] });

  const extra = readTerminText(text, today);
  const day = manualDate ?? read.date ?? defaultDate ?? today;
  const clock = manualTime !== null ? manualTime || null : (read.time ?? null);
  const where: Room = room ?? extra.room;
  const title = (extra.repeat ? extra.title : read.title).trim();
  const at = now();
  const nowMin = at.getHours() * 60 + at.getMinutes();
  const recognized = Boolean((read.date && manualDate === null) || (read.time && manualTime === null));
  const past = isPast(day, clock, today, nowMin) && !pastOk;
  const busy = (entries ? itemsForDay(entries, day, today) : []).flatMap((i) => (i.time ? [Number(i.time.slice(0, 2)) * 60 + Number(i.time.slice(3, 5))] : []));
  const suggestions = timeSuggestions(day, today, nowMin, 6)
    .filter((t) => !busy.some((b) => Math.abs(b - (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)))) < 45))
    .slice(0, 4);

  // Erkennung: beim Tippen kurz verzögert, nach dem Sprechen sofort
  const reread = (value: string, instant = false) => {
    if (timer.current) clearTimeout(timer.current);
    const run = () => {
      const next = readSentence(value, today);
      const prev = lastRead.current;
      lastRead.current = next;
      setRead(next);
      if (next.date !== prev.date || next.time !== prev.time) {
        setPop(true);
        setTimeout(() => setPop(false), 220);
      }
    };
    if (instant) run();
    else timer.current = setTimeout(run, 250);
  };
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const change = (value: string, instant = false) => {
    setText(value);
    setPastOk(false);
    reread(value, instant);
  };
  // Nach dem Diktat NICHT speichern – „Eintragen“ bleibt der letzte Tipp
  const speech = useSpeechInput({ onTranscript: (t) => change(t, true), onEnd: (t) => t && change(t, true) });

  const save = () => {
    if (!title || past) return;
    speech.reset();
    const entry = sanitizeEntry(
      createEntry(
        "termin",
        { title: title.slice(0, 120), date: day, start: clock ?? "", reminder: clock ? reminder : "aus", repeat: extra.repeat ?? null, ...(extra.label ? { label: extra.label } : {}), ...(who.length ? { who } : {}), ...(place.trim() ? { place: place.trim().slice(0, 120) } : {}) },
        { raum: where },
      ) as CalendarEntry,
    );
    if (!entry) return;
    act((list) => upsertEntry(list, entry), entry.data.title);
    onClose();
  };

  const dayLabel = day === today ? "Heute" : day === addDays(today, 1) ? "Morgen" : dayChipLabel(day);
  const reminderShort = (REMINDERS.find((r) => r.value === reminder)?.short ?? "").replace(/ vorher$/, "");
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <Sheet title="Neuer Termin" onClose={onClose} inset={inset}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <MicStrip />
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            {!speech.listening && <Highlight text={text} spans={read.spans} shift={shift} />}
            <input
              value={speech.listening ? speech.interim || text : text}
              onChange={(e) => change(e.target.value)}
              onScroll={(e) => setShift(e.currentTarget.scrollLeft)}
              placeholder="z. B. Mittwoch 12.30 Zahnarzt"
              aria-label="Termin"
              autoFocus
              enterKeyHint="done"
              className={`${INPUT_BASE} relative h-12 w-full bg-transparent px-4`}
            />
          </div>
          {speech.supported !== false && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören beenden" : "Einsprechen"}
              aria-pressed={speech.listening}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${speech.blocked ? MIC_BLOCKED : "bg-accent text-on-accent"} active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.blocked ? <MicOff className="h-5 w-5" strokeWidth={2.25} aria-hidden /> : speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="relative inline-flex">
            <button type="button" onClick={() => setPicker("tag")} className={pill(day !== today || manualDate !== null || Boolean(read.date), pop && manualDate === null && Boolean(read.date))} aria-label={`Tag: ${dayLabel} – ändern`}>
              <CalendarDays className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {dayLabel}
              {manualDate === null && <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
            </button>
            {manualDate !== null && (
              <button type="button" onClick={() => setManualDate(null)} aria-label="Tag wieder automatisch" className="hit -ml-7 flex h-11 w-7 items-center justify-center text-accent-strong">
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </span>
          <span className="relative inline-flex">
            <button
              type="button"
              onClick={() => (setWheel(clock ?? suggestions[0] ?? "12:00"), setPicker("zeit"))}
              className={pill(Boolean(clock), pop && manualTime === null && Boolean(read.time))}
              aria-label={`Uhrzeit: ${clock ? timeLabel(clock) : "ganztägig"} – ändern`}
            >
              <Clock className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {clock ? timeLabel(clock) : text.trim() ? "ganztägig" : "Uhrzeit"}
              {manualTime === null && <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
            </button>
            {manualTime !== null && (
              <button type="button" onClick={() => setManualTime(null)} aria-label="Uhrzeit wieder automatisch" className="hit -ml-7 flex h-11 w-7 items-center justify-center text-accent-strong">
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </span>
        </div>
        {recognized && (
          <p className="-mt-1 flex items-center gap-1 px-1 text-[13px] font-semibold text-good-ink" role="status">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> Erkannt aus deinem Text
          </p>
        )}

        {past && (
          <div className="flex flex-col gap-2 rounded-field bg-warn-soft p-3" role="status">
            <p className="text-[15px] font-semibold text-warn-ink">{timeLabel(clock!)} ist heute schon vorbei.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setManualDate(addDays(today, 1))} className={buttonClass("secondary", "sm")}>
                Morgen {timeLabel(clock!)}
              </button>
              <button type="button" onClick={() => setPastOk(true)} className={buttonClass("ghost", "sm")}>
                Trotzdem heute
              </button>
            </div>
          </div>
        )}

        {!clock && (
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{day === today ? "Heute noch frei" : "Vorschläge"}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Zeit-Vorschläge">
              {suggestions.map((t) => (
                <button key={t} type="button" onClick={() => setManualTime(t)} className={chipClass(false)}>
                  {timeLabel(t)}
                </button>
              ))}
              <button type="button" onClick={() => (setWheel(suggestions[0] ?? "12:00"), setPicker("zeit"))} className={chipClass(false)}>
                Andere
              </button>
            </div>
          </div>
        )}

        {more && (
          <div className="flex flex-col gap-3 rounded-card bg-surface p-3">
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
          </div>
        )}

        {/* Leiste klebt unten im Fenster – das Fenster sitzt über der Tastatur */}
        <div className="safe-bottom sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-background px-4 pt-2.5">
          <button type="button" onClick={() => setMore((m) => !m)} className="hit flex min-h-11 min-w-0 flex-1 items-center text-left text-[14px] text-muted" aria-expanded={more} aria-label="Mehr Optionen">
            <span className="truncate">
              {where === "arbeit" ? "Arbeit" : "Familie"} · {clock ? `Erinnerung ${reminderShort}` : "ganztägig"}
            </span>
          </button>
          <button type="submit" disabled={!title || past} className={`${buttonClass("primary")} shrink-0 px-6`}>
            Eintragen
          </button>
        </div>
      </form>

      {picker === "tag" && (
        <Sheet title="Welcher Tag?" onClose={() => setPicker(null)} layer="above">
          <div className="flex flex-wrap gap-2 pb-3" role="group" aria-label="Tag wählen">
            {days.map((d) => (
              <button key={d} type="button" onClick={() => (setManualDate(d), setPastOk(false), setPicker(null))} className={chipClass(d === day)}>
                {d === today ? "Heute" : d === addDays(today, 1) ? "Morgen" : dayChipLabel(d, true)}
              </button>
            ))}
            <button type="button" onClick={() => dateInput.current?.showPicker?.() ?? dateInput.current?.focus()} className={`relative ${chipClass(false)}`}>
              <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
              Datum wählen
              <input ref={dateInput} type="date" min={today} value={day} onChange={(e) => e.target.value && (setManualDate(e.target.value), setPicker(null))} aria-label="Datum wählen" className="absolute inset-0 opacity-0" tabIndex={-1} />
            </button>
          </div>
        </Sheet>
      )}
      {picker === "zeit" && (
        <Sheet title="Uhrzeit" onClose={() => setPicker(null)} layer="above">
          <div className="flex flex-col gap-3 pb-3">
            <TimeWheel value={wheel} onChange={setWheel} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => (setManualTime(""), setPicker(null))} className={buttonClass("secondary", "md")}>
                ganztägig
              </button>
              <button type="button" onClick={() => (setManualTime(wheel), setPastOk(false), setPicker(null))} className={buttonClass("primary", "md")}>
                Übernehmen
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}
