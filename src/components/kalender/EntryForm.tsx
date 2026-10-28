"use client";

// Termin oder Aufgabe anlegen/bearbeiten – das EINE Formular (Launch 1.0,
// auch „Mehr Details“ der Schnelleingabe): oben Titel + ✕, darunter
// gruppierte Zeilen (Titel/Ort · Tag/Uhrzeit · Für/Wer/Etikett ·
// Wiederholen/Erinnerung), am Ende oranges „Speichern“ und bei Bestehendem
// rot "Löschen". Getippter Satz (`initialText`) füllt Titel, Tag und Uhrzeit
// vor. Mia ist der Hauptweg – das Formular dient zum Feinjustieren.

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD_LIST, buttonClass, chipClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { ExternalLink } from "lucide-react";
import { aufgabeExtras, REMINDERS, removeItem, sanitizeEntry, sourceLabel, terminExtras, upsertEntry, weekdayIndex, type CalendarEntry, type Reminder, type Repeat } from "@/lib/kalender/model";
import { berlinTime, nowIso, todayIso } from "@/lib/core/now";
import { isPast, timeLabel } from "@/lib/kalender/sentence";
import { quickTaskData, readQuickText, readTerminText, type When } from "@/lib/kalender/quick";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { act } from "@/components/heute/actions";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

const LABEL_SUGGESTIONS = ["Kita", "Schule", "Arzt", "Sport", "Café", "Geburtstag"];
const DAYS = WEEKDAYS_SHORT_MO;
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

/** Link zur Quelle (z. B. Termin aus Tipps): „Mehr dazu · eutin.de“ */
function SourceLink({ href, note }: { href: string; note?: string }) {
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 px-4 py-1.5">
      <span className="shrink-0 text-base">Mehr dazu</span>
      <span className="ml-auto flex min-w-0 items-center gap-1.5 text-base text-accent-strong">
        <span className="truncate">
          {host}
          {note ? <span className="text-muted"> · {note}</span> : null}
        </span>
        <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      </span>
    </a>
  );
}

const minutesNow = () => berlinTime().minutes;

/** Neu aus der Schnelleingabe: was der Satz schon sagt (Titel, Tag, Uhrzeit, Raum, Etikett) */
function vorbelegt(kind: "termin" | "aufgabe", text: string, date: string | undefined, when: When): CalendarEntry | undefined {
  if (!text.trim()) return undefined;
  const today = todayIso();
  if (kind === "termin") {
    const r = readTerminText(text, today);
    return { id: "", typ: "termin", raum: r.room, besitzer: "", erstellt: "", geaendert: "", data: { title: r.title, date: r.date ?? date ?? today, start: r.time ?? "", label: r.label, repeat: r.repeat ?? null, reminder: "aus" } } as unknown as CalendarEntry;
  }
  const q = readQuickText(text, today);
  const data = quickTaskData(q.title, q.when ?? (date ? { date } : when), today, { time: q.time, label: q.label, dringend: q.urgent });
  return { id: "", typ: "aufgabe", raum: q.room, besitzer: "", erstellt: "", geaendert: "", data } as unknown as CalendarEntry;
}

export function EntryForm({ entry, date, kind, initialText = "", when = "heute", onClose }: { entry?: CalendarEntry; date?: string; kind?: "termin" | "aufgabe"; initialText?: string; when?: When; onClose: () => void }) {
  const raum = useRaumName();
  const [pre] = useState(() => (entry ? undefined : vorbelegt(kind ?? "termin", initialText, date, when)));
  const d = entry?.data ?? pre?.data;
  const profile = useProfile();
  const persons = sortBy((profile?.persons ?? []).filter((p) => p.name.trim()), ...PERSONS);
  const src = entry ?? pre;
  const [typ, setTyp] = useState<"termin" | "aufgabe">(entry?.typ ?? kind ?? "termin");
  const [title, setTitle] = useState(d?.title ?? "");
  // Alles ist heute (Tafel 103): neue Aufgaben ohne genannten Tag gehören zu heute
  const [day, setDay] = useState(d?.date ?? date ?? (entry ? "" : todayIso()));
  const [time, setTime] = useState(src?.typ === "termin" ? src.data.start : src?.typ === "aufgabe" ? (src.data.time ?? "") : "");
  const [end, setEnd] = useState(entry?.typ === "termin" ? (entry.data.end ?? "") : "");
  const [due, setDue] = useState(src?.typ === "aufgabe" ? (src.data.due ?? "") : "");
  const [place, setPlace] = useState(entry?.typ === "termin" ? (entry.data.place ?? "") : "");
  const [who, setWho] = useState<string[]>(entry?.typ === "termin" ? (entry.data.who ?? []) : []);
  const [room, setRoom] = useState<Room>(src?.raum ?? "familie");
  const [label, setLabel] = useState(d?.label ?? "");
  const [liste, setListe] = useState(entry?.typ === "aufgabe" ? (entry.data.liste ?? "") : "");
  const [repeat, setRepeat] = useState<RepeatKind>(d?.repeat?.kind ?? "nie");
  const [days, setDays] = useState<number[]>(d?.repeat?.kind === "wochentage" ? d.repeat.days : [weekdayIndex(day || todayIso())]);
  const [reminder, setReminder] = useState<Reminder>(d?.reminder ?? "aus");
  const [hint, setHint] = useState("");
  const workRoom = useWorkRoom() || room === "arbeit";

  const save = () => {
    if (!title.trim()) return setHint("Wie heißt es? Ein Wort reicht.");
    // Ohne Uhrzeit = ganztägig (wie in der Schnelleingabe)
    if (typ === "termin" && !day) return setHint("An welchem Tag?");
    // Nie still in der Vergangenheit speichern (nur Neues)
    if (!entry && typ === "termin" && isPast(day, time, todayIso(), minutesNow())) return setHint(`${timeLabel(time)} ist heute schon vorbei.`);
    // Gleiche Art wie vorher → Feinheiten (z. B. „alle 2 Wochen“ aus Google) bleiben
    const rep: Repeat | null = repeat === "nie" ? null : repeat === "wochentage" ? { kind: "wochentage", days: days.length ? days : [weekdayIndex(day || todayIso())] } : d?.repeat?.kind === repeat ? d.repeat : { kind: repeat };
    const keep = { doneDates: d?.doneDates ?? [], skipDates: d?.skipDates ?? [] };
    const data =
      typ === "termin"
        ? { title, date: day, start: time, end: end || undefined, place: place || undefined, label: label || undefined, repeat: rep, reminder, who: who.length ? who : undefined, ...terminExtras(entry?.typ === "termin" ? entry.data : undefined), ...keep }
        : { title, date: day || undefined, due: due || undefined, time: time || undefined, label: label || undefined, repeat: rep, reminder, doneOn: entry?.typ === "aufgabe" ? entry.data.doneOn : null, ...aufgabeExtras(src?.typ === "aufgabe" ? src.data : undefined), liste: liste.trim() || undefined, ...keep };
    const base = entry ? { ...entry, typ, raum: room, data } : createEntry(typ, data, { raum: room });
    const clean = sanitizeEntry({ ...base, geaendert: nowIso() });
    if (!clean) return setHint("Das hat nicht geklappt – schau bitte nochmal auf Datum und Uhrzeit.");
    act((list) => upsertEntry(list, clean), clean.data.title);
    onClose();
  };

  const heading = entry ? (typ === "termin" ? "Termin" : "Aufgabe") : typ === "termin" ? "Neuer Termin" : "Neue Aufgabe";
  return (
    <Sheet title={heading} onClose={onClose}    >
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
          {typ === "aufgabe" && entry?.typ === "aufgabe" && entry.data.liste !== undefined && (
            <input value={liste} onChange={(e) => setListe(e.target.value)} placeholder="Liste, z. B. Haus" aria-label="Liste" className="h-12 w-full bg-transparent px-4 text-base outline-none placeholder:text-faint" />
          )}
          {typ === "termin" && <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ort" aria-label="Ort" className="h-12 w-full bg-transparent px-4 text-base outline-none placeholder:text-faint" />}
          {entry?.typ === "termin" && entry.data.link && <SourceLink href={entry.data.link} note={entry.data.note} />}
          {entry?.typ === "termin" && entry.data.source && <p className="px-4 py-3 text-sm text-muted">{sourceLabel(entry.data.source)}</p>}
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
        </div>

        <div className={CARD_LIST}>
          {workRoom && (
            <div className="flex min-h-12 items-center gap-3 px-4 py-1.5">
              <span className="shrink-0 text-base">Für</span>
              <div className="ml-auto w-48">
                <Segmented
                  label={`${raum} oder Arbeit`}
                  value={room}
                  onChange={setRoom}
                  options={[
                    { value: "familie", label: raum },
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
                  {r.label}
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
        <button type="button" onClick={save} className={`${buttonClass("primary")} w-full`}>
          Speichern
        </button>
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
