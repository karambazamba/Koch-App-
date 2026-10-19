"use client";

// "+" bei Aufgaben: Fenster von unten mit Textfeld (und Mikrofon), WANN
// (Heute · Morgen · Diese Woche · Irgendwann – steht ein Tag im Text, wird er
// übernommen), WO (Familie · Arbeit, vorgeschlagen) und klein "+ Uhrzeit oder
// Erinnerung". Enter fügt hinzu und lässt das Fenster für die nächste offen.

import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { INPUT_BASE, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { REMINDERS, sanitizeEntry, upsertEntry, type CalendarEntry, type Reminder } from "@/lib/aufgaben/model";
import { quickTaskData, readQuickText, WHEN_CHOICES, whenLabel, type When } from "@/lib/aufgaben/quick";
import { todayIso } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";
import { act } from "./actions";

const sameWhen = (a: When, b: When) => (typeof a === "string" || typeof b === "string" ? a === b : a.date === b.date && a.due === b.due);

export function TaskQuickAdd({ onClose, defaultWhen = "heute" }: { onClose: () => void; defaultWhen?: When }) {
  const today = todayIso();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<When | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [more, setMore] = useState(false);
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState<Reminder>("aus");
  const [added, setAdded] = useState<string[]>([]);
  const workRoom = useWorkRoom() || room === "arbeit";
  const read = readQuickText(text, today);
  // Selbst gewählt geht vor; sonst was im Text steht; sonst der Standard
  const when: When = picked ?? read.when ?? defaultWhen;
  const textDate = read.when && typeof read.when !== "string" ? read.when : null;
  const where: Room = room ?? read.room;

  // Neuer Text mit eigenem Tag ("… morgen") geht vor einer früher getippten Wahl
  const change = (value: string) => {
    const next = readQuickText(value, today).when;
    if (next && JSON.stringify(next) !== JSON.stringify(read.when)) setPicked(null);
    setText(value);
  };

  const speech = useSpeechInput({
    onTranscript: change,
    onEnd: (t) => t && change(t),
  });

  const add = () => {
    const title = read.title.trim();
    if (!title) return;
    const data = quickTaskData(title, when, today, { time: time || read.time, reminder, label: read.label });
    const entry = sanitizeEntry(createEntry("aufgabe", data, { raum: where }) as CalendarEntry);
    if (!entry) return;
    act((list) => upsertEntry(list, entry), entry.data.title);
    setAdded((a) => [...a, entry.data.title]);
    // Bereit für die nächste – WANN/WO bleiben, Text und Extras leer
    setText("");
    setTime("");
    setReminder("aus");
  };

  return (
    <Sheet title="Neue Aufgabe" onClose={onClose}>
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="flex items-center gap-2">
          <input
            value={speech.listening ? speech.interim || text : text}
            onChange={(e) => change(e.target.value)}
            placeholder="z. B. Malersachen kaufen"
            aria-label="Aufgabe"
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

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Wann</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wann">
            {textDate && (
              <button type="button" role="radio" aria-checked={sameWhen(when, textDate)} onClick={() => setPicked(textDate)} className={chipClass(sameWhen(when, textDate))}>
                {whenLabel(textDate)}
              </button>
            )}
            {WHEN_CHOICES.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={when === c.id} onClick={() => setPicked(c.id)} className={chipClass(when === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {workRoom && (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Wo</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Wo">
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
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3">
              <span className={`${LABEL} w-16`}>Uhrzeit</span>
              <input type="time" value={time || read.time || ""} onChange={(e) => setTime(e.target.value)} className={`${INPUT_BASE} h-11 flex-1 px-3`} />
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Erinnerung">
              {REMINDERS.map((r) => (
                <button key={r.value} type="button" role="radio" aria-checked={reminder === r.value} onClick={() => setReminder(r.value)} className={chipClass(reminder === r.value)}>
                  {r.value === "aus" ? "Keine Erinnerung" : r.short}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="self-start text-sm font-semibold text-muted underline">
            + Uhrzeit oder Erinnerung
          </button>
        )}

        <button type="submit" disabled={!read.title.trim()} className={buttonClass("primary")}>
          Hinzufügen
        </button>
        {added.length > 0 && <p className="text-center text-sm text-muted" role="status">Schon drin: {added.join(", ")}</p>}
      </form>
    </Sheet>
  );
}
