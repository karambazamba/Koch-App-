"use client";

// Termin oder Aufgabe anlegen/bearbeiten – wie auf dem iPhone: oben
// "Abbrechen | Titel | Sichern", darunter gruppierte Zeilen (Titel/Ort ·
// Tag/Uhrzeit · Familie/Arbeit/Für wen/Etikett · Wiederholen/Erinnerung),
// unten rot "Löschen". Mia ist der Hauptweg – das Formular dient zum
// Nachschauen und Feinjustieren.

import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD_LIST, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { mondayOf, REMINDERS, removeItem, sanitizeEntry, upsertEntry, weekdayIndex, type CalendarEntry, type Reminder, type Repeat } from "@/lib/aufgaben/model";
import { todayIso } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { act } from "./actions";

const LABEL_SUGGESTIONS = ["Kita", "Schule", "Arzt", "Sport", "Café", "Geburtstag"];
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
type RepeatKind = "nie" | Repeat["kind"];
const REPEATS: { value: RepeatKind; label: string }[] = [
  { value: "nie", label: "Nie" },
  { value: "taeglich", label: "Täglich" },
  { value: "woechentlich", label: "Wöchentlich" },
  { value: "monatlich", label: "Monatlich" },
  { value: "wochentage", label: "An Wochentagen" },
];
const FIELD = "min-w-0 flex-1 bg-transparent text-right text-base text-ink outline-none placeholder:text-faint";

/** Eine Zeile in der Gruppe: Beschriftung links, Wert rechts */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-h-12 items-center gap-3 px-4 py-1.5">
      <span className="shrink-0 text-base">{label}</span>
      {children}
    </label>
  );
}

export function EntryForm({ entry, date, kind, onClose }: { entry?: CalendarEntry; date?: string; kind?: "termin" | "aufgabe"; onClose: () => void }) {
  const d = entry?.data;
  const profile = useProfile();
  const persons = (profile?.persons ?? []).filter((p) => p.name.trim());
  const [typ, setTyp] = useState<"termin" | "aufgabe">(entry?.typ ?? kind ?? "termin");
  const [title, setTitle] = useState(d?.title ?? "");
  // Neue Aufgabe von der Aufgaben-Seite: ohne Tag ("Irgendwann")
  const [day, setDay] = useState(d?.date ?? date ?? (kind === "aufgabe" ? "" : todayIso()));
  const [week, setWeek] = useState(entry?.typ === "aufgabe" ? (entry.data.week ?? "") : "");
  const [time, setTime] = useState(entry?.typ === "termin" ? entry.data.start : entry?.typ === "aufgabe" ? (entry.data.time ?? "") : "");
  const [end, setEnd] = useState(entry?.typ === "termin" ? (entry.data.end ?? "") : "");
  const [due, setDue] = useState(entry?.typ === "aufgabe" ? (entry.data.due ?? "") : "");
  const [place, setPlace] = useState(entry?.typ === "termin" ? (entry.data.place ?? "") : "");
  const [who, setWho] = useState<string[]>(entry?.typ === "termin" ? (entry.data.who ?? []) : []);
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
        ? { title, date: day, start: time, end: end || undefined, place: place || undefined, label: label || undefined, repeat: rep, reminder, who: who.length ? who : undefined, ...keep }
        : { title, date: day || undefined, due: due || undefined, week: !day && !due && week ? week : undefined, time: time || undefined, label: label || undefined, repeat: rep, reminder, doneOn: entry?.typ === "aufgabe" ? entry.data.doneOn : null, ...keep };
    const base = entry ? { ...entry, typ, raum: room, data } : createEntry(typ, data, { raum: room });
    const clean = sanitizeEntry({ ...base, geaendert: new Date().toISOString() });
    if (!clean) return setHint("Das hat nicht geklappt – schau bitte nochmal auf Datum und Uhrzeit.");
    act((list) => upsertEntry(list, clean), clean.data.title);
    onClose();
  };

  const heading = entry ? (typ === "termin" ? "Termin" : "Aufgabe") : typ === "termin" ? "Neuer Termin" : "Neue Aufgabe";
  return (
    <Sheet
      title={heading}
      onClose={onClose}
      header={
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" onClick={onClose} className="hit justify-self-start text-[17px] font-semibold text-accent-strong">
            Abbrechen
          </button>
          <h2 className="text-[17px] font-extrabold">{heading}</h2>
          <button type="button" onClick={save} className="hit justify-self-end text-[17px] font-extrabold text-accent-strong">
            Sichern
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-3">
        {!entry && (
          <Segmented
            label="Art"
            value={typ}
            onChange={setTyp}
            options={[
              { value: "termin", label: "Termin" },
              { value: "aufgabe", label: "Aufgabe" },
            ]}
          />
        )}
        <div className={CARD_LIST}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={typ === "termin" ? "Titel, z. B. Steuerberater" : "Titel, z. B. Kita-Formular"} aria-label="Titel" className="h-12 w-full bg-transparent px-4 text-base font-semibold outline-none placeholder:font-normal placeholder:text-faint" autoFocus={!entry} />
          {typ === "termin" && <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ort" aria-label="Ort" className="h-12 w-full bg-transparent px-4 text-base outline-none placeholder:text-faint" />}
        </div>

        <div className={CARD_LIST}>
          <Row label="Tag">
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={FIELD} />
          </Row>
          <Row label={typ === "termin" ? "Beginn" : "Uhrzeit"}>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
          </Row>
          {typ === "termin" ? (
            <Row label="Ende">
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} />
            </Row>
          ) : (
            <Row label="Bis spätestens">
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={FIELD} />
            </Row>
          )}
          {typ === "aufgabe" && !day && !due && (
            <div className="flex flex-wrap gap-2 px-4 py-2.5" role="radiogroup" aria-label="Wann ungefähr?">
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
        </div>

        <div className={CARD_LIST}>
          {workRoom && (
            <div className="flex min-h-12 items-center gap-3 px-4 py-1.5">
              <span className="shrink-0 text-base">Für</span>
              <div className="ml-auto w-48">
                <Segmented
                  label="Familie oder Arbeit"
                  value={room}
                  onChange={setRoom}
                  options={[
                    { value: "familie", label: "Familie" },
                    { value: "arbeit", label: "Arbeit" },
                  ]}
                />
              </div>
            </div>
          )}
          {typ === "termin" && persons.length > 1 && (
            <div className="flex flex-col gap-2 px-4 py-2.5">
              <span className="text-base">Wer ist dabei?</span>
              <div className="flex flex-wrap gap-3" role="group" aria-label="Wer ist dabei?">
                {persons.map((p) => {
                  const on = who.includes(p.id);
                  return (
                    <button key={p.id} type="button" aria-pressed={on} onClick={() => setWho((w) => (on ? w.filter((x) => x !== p.id) : [...w, p.id]))} className="flex w-14 flex-col items-center gap-1">
                      <span className={`rounded-full p-0.5 ${on ? "ring-2 ring-accent" : "opacity-60"}`}>
                        <PersonAvatar name={p.name} size={36} />
                      </span>
                      <span className={`w-full truncate text-center text-[12px] ${on ? "font-bold" : "text-muted"}`}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 px-4 py-2.5">
            <Row label="Etikett">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Kita" className={FIELD} />
            </Row>
            <span className="-mt-1 flex flex-wrap gap-2">
              {LABEL_SUGGESTIONS.filter((l) => l !== label).slice(0, 5).map((l) => (
                <button key={l} type="button" onClick={() => setLabel(l)} className={chipClass(false)}>
                  {l}
                </button>
              ))}
            </span>
          </div>
        </div>

        <div className={CARD_LIST}>
          <Row label="Wiederholen">
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatKind)} className={`${FIELD} appearance-none text-accent-strong`}>
              {REPEATS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Row>
          {repeat === "wochentage" && (
            <div className="flex gap-1.5 px-4 py-2.5" aria-label="Wochentage">
              {DAYS.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={days.includes(i)}
                  onClick={() => setDays((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort()))}
                  className={`hit h-10 flex-1 rounded-field border text-sm font-bold ${days.includes(i) ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-surface"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <Row label="Erinnerung">
            <select value={reminder} onChange={(e) => setReminder(e.target.value as Reminder)} className={`${FIELD} appearance-none text-accent-strong`}>
              {REMINDERS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value === "aus" ? "Keine" : r.label}
                </option>
              ))}
            </select>
          </Row>
        </div>

        {hint && (
          <p className="text-sm font-semibold text-accent-strong" role="status">
            {hint}
          </p>
        )}
        {entry && (
          <button
            type="button"
            onClick={() => {
              act((l, s) => removeItem(l, entry.id, s), `das Löschen von ${entry.data.title}`, { deleted: true });
              onClose();
            }}
            className={`${CARD_LIST} h-12 text-base font-semibold text-danger`}
          >
            Löschen
          </button>
        )}
      </div>
    </Sheet>
  );
}
