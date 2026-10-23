"use client";

// „Mehr Details“ der Schnelleingabe bei Aufgaben: Fenster von unten mit Textfeld, WANN
// (Heute · Morgen · Diese Woche · Irgendwann – steht ein Tag im Text, wird er
// übernommen), WO (Familie · Arbeit, vorgeschlagen) und klein "+ Uhrzeit oder
// Erinnerung". Enter fügt hinzu und lässt das Fenster für die nächste offen.

import { useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { REMINDERS, sanitizeEntry, upsertEntry, type CalendarEntry, type Reminder } from "@/lib/kalender/model";
import { quickTaskData, readQuickText, WHEN_CHOICES, whenLabel, type When } from "@/lib/kalender/quick";
import { todayIso } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { act } from "@/components/heute/actions";
import { UrgentMark } from "@/components/kalender/UrgentMark";

const sameWhen = (a: When, b: When) => (typeof a === "string" || typeof b === "string" ? a === b : a.date === b.date && a.due === b.due);

export function TaskQuickAdd({ onClose, defaultWhen = "heute", initialText = "" }: { onClose: () => void; defaultWhen?: When; initialText?: string }) {
  const today = todayIso();
  const [text, setText] = useState(initialText);
  const [picked, setPicked] = useState<When | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [more, setMore] = useState(false);
  const [time, setTime] = useState("");
  // null = wie im Text erkannt ("Dringend: …", "… ist wichtig")
  const [urgent, setUrgent] = useState<boolean | null>(null);
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


  // Kein doppeltes Absenden (zweimal schnell Enter/Tippen)
  const sending = useRef(false);
  const add = () => {
    const title = read.title.trim();
    if (!title || sending.current) return;
    sending.current = true;
    setTimeout(() => (sending.current = false), 400);
    const data = quickTaskData(title, when, today, { time: time || read.time, reminder, label: read.label, dringend: urgent ?? read.urgent });
    const entry = sanitizeEntry(createEntry("aufgabe", data, { raum: where }) as CalendarEntry);
    if (!entry) return;
    act((list) => upsertEntry(list, entry), entry.data.title);
    setAdded((a) => [...a, entry.data.title]);
    // Bereit für die nächste – WANN/WO bleiben, Text und Extras leer
    setText("");
    setTime("");
    setReminder("aus");
    setUrgent(null);
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
            value={text}
            onChange={(e) => change(e.target.value)}
            placeholder="z. B. Malersachen kaufen"
            aria-label="Aufgabe"
            autoFocus
            enterKeyHint="done"
            className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
          />
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

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Wichtig?</span>
          <div className="flex gap-2">
            <button type="button" aria-pressed={urgent ?? read.urgent} onClick={() => setUrgent(!(urgent ?? read.urgent))} className={chipClass(urgent ?? read.urgent)}>
              <UrgentMark /> Dringend
            </button>
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
