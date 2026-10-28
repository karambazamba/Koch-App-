"use client";

// Das EINE Fenster „Neuer Termin“ (Tafel 114, Bild 4) – auch zum Ändern
// („Termin“). EIN Feld („Zahnarzt Freitag 13 Uhr“): Tag, Uhrzeit und Dauer
// werden herausgelesen und stehen als blaue Chips zum Ändern darunter. Ohne
// Uhrzeit ist der Chip „Uhrzeit?“ hervorgehoben – gespeichert wird erst
// danach (oder ganztägig über „Mehr“). Gleiche Zeile wie bei Aufgaben:
// Raum | Glocke (Erinnern vorher) | „Mehr ›“ (Ort, Wiederholen, ganztägig,
// Personen). Return = speichern, Feld leer und auf für den nächsten.

import { useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD_LIST, INPUT_INLINE, buttonClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { raumWahl } from "@/lib/core/haushalt";
import { berlinTime, todayIso, useMinutes } from "@/lib/core/now";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { askForNotifications } from "@/lib/heute/mitteilungen/geraet";
import { loadEntries } from "@/lib/kalender/store";
import { arbeitsWorte } from "@/lib/kalender/parse";
import { isPast, splitTermine } from "@/lib/kalender/sentence";
import type { Reminder, Termin } from "@/lib/kalender/model";
import { serie, WIEDERHOLEN, wiederholenLabel, wiederholenVon, type Wiederholen } from "@/lib/kalender/eintragen/aufgabe";
import { DAUER_WAHL, STANDARD_DAUER, UHR_WAHL, VORHER_WAHL, dauerLabel, dauerVon, terminBereit, terminDaten, terminLesen, vorherText } from "@/lib/kalender/eintragen/termin";
import { raumZumSpeichern, schalterRaum, startRaum } from "@/lib/kalender/eintragen/raum";
import { letzterRaum, raumMerken } from "@/lib/kalender/eintragen/raumStore";
import { tagKurz, tagWahl, uhr } from "@/lib/kalender/eintragen/tage";
import { REMINDERS, sourceLabel } from "@/lib/kalender/model";
import { useArbeitRuht } from "@/components/kalender/useArbeitRuht";
import { EintragFeld, EintragZeile, ErinnernZeile, HINWEIS, MehrZeile, Wahl, halten } from "@/components/kalender/eintragen/EintragTeile";
import { eintragSpeichern } from "@/components/kalender/eintragen/speichern";

type Auf = "glocke" | "tag" | "uhr" | "dauer" | null;
const CHIP = "hit inline-flex min-h-10 items-center rounded-full px-3.5 text-[15px] font-bold active:scale-95";

export function TerminFenster({ entry, date, onClose }: { entry?: Termin; date?: string; onClose: () => void }) {
  const today = todayIso();
  const minutes = useMinutes() ?? berlinTime().minutes;
  const haushalt = useHaushalt();
  const notify = useNotify();
  const profile = useProfile();
  const persons = sortBy((profile?.persons ?? []).filter((p) => p.name.trim()), ...PERSONS);
  const [all] = useState(() => loadEntries());
  const worte = useMemo(() => arbeitsWorte(all), [all]);
  const { ruht, feierabend } = useArbeitRuht(all, today);
  const inset = useKeyboardInset();
  const field = useRef<HTMLInputElement>(null);
  const d = entry?.data;

  const [text, setText] = useState(d?.title ?? "");
  const [hand, setHand] = useState<Room | null>(entry ? entry.raum : null);
  // Von Hand gewählt (undefined = was der Satz sagt bzw. der gespeicherte Wert)
  const [tag, setTag] = useState<string | undefined>(d?.date);
  const [zeit, setZeit] = useState<string | null | undefined>(d ? d.start || null : undefined);
  const [dauer, setDauer] = useState<number | null | undefined>(d ? dauerVon(d.start, d.end) : undefined);
  const [ganztaegig, setGanztaegig] = useState(Boolean(d && !d.start));
  const [reminder, setReminder] = useState<Reminder | undefined>(d?.reminder);
  const [wieder, setWieder] = useState<Wiederholen>(wiederholenVon(d?.repeat));
  const [ort, setOrt] = useState(d?.place ?? "");
  const [who, setWho] = useState<string[]>(d?.who ?? []);
  const [auf, setAuf] = useState<Auf>(null);
  const [mehr, setMehr] = useState(false);
  const [mehrZeile, setMehrZeile] = useState<"ort" | "wieder" | "personen" | null>(null);
  const [hint, setHint] = useState("");

  const gelesen = entry ? null : terminLesen(text, today, worte);
  const title = entry ? text.trim() : (gelesen?.title ?? "");
  const datum = tag ?? gelesen?.date ?? date ?? today;
  const time = ganztaegig ? null : zeit !== undefined ? zeit : (gelesen?.time ?? null);
  const minuten = dauer !== undefined ? dauer : (gelesen?.dauer ?? null);
  const standard = notify?.defaultReminder ?? "30";
  const erinnern: Reminder = reminder ?? (time ? standard : "aus");
  const start = startRaum({ letzte: letzterRaum(), feierabend: feierabend || ruht, haushalt });
  const raum = schalterRaum({ hand, ausText: gelesen?.raum ?? null, start, haushalt });
  const bereit = terminBereit({ title, time, ganztaegig });
  const zeigeChips = Boolean(entry || text.trim() || date);

  const reset = () => {
    setText("");
    setHand(null);
    setTag(undefined);
    setZeit(undefined);
    setDauer(undefined);
    setGanztaegig(false);
    setReminder(undefined);
    setWieder("nie");
    setOrt("");
    setWho([]);
    setAuf(null);
    setMehr(false);
    setMehrZeile(null);
    setHint("");
    field.current?.focus();
  };

  const save = (schliessen: boolean) => {
    if (!title) return;
    if (!bereit) return void (setAuf("uhr"), setHint("Wann geht’s los? Uhrzeit antippen."));
    if (!entry && isPast(datum, time, today, minutes)) return void setHint(`${uhr(time!)} ist heute schon vorbei.`);
    const gespeichert = raumZumSpeichern(raum, entry?.raum ?? null, haushalt);
    const daten = (t: string, dt: string, tm: string | null) => terminDaten({ title: t, date: dt, time: tm, ganztaegig, dauer: minuten, reminder: erinnern, repeat: serie(wieder, d?.repeat), place: ort, who, label: gelesen?.label, vorher: d });
    // Mehrere Termine in einem Satz („Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr“): jeder wird ein eigener
    const teile = entry ? [] : splitTermine(text, today).map((t) => terminLesen(t, today, worte)).filter((t) => t.title && t.date);
    const neue = entry
      ? [{ ...entry, raum: gespeichert, data: daten(title, datum, time) }]
      : teile.length > 1
        ? teile.map((t) => createEntry("termin", daten(t.title, t.date!, t.time), { raum: gespeichert }))
        : [createEntry("termin", daten(title, datum, time), { raum: gespeichert })];
    if (!eintragSpeichern(neue as Termin[], !entry)) return void setHint("Das hat nicht geklappt. Schau bitte nochmal auf Tag und Uhrzeit.");
    if (!entry) raumMerken(raum);
    // Termin mit Uhrzeit: der passende Moment für Mias Frage nach Erinnerungen
    if (!entry && time && erinnern !== "aus") askForNotifications("erster-termin");
    if (schliessen || entry) onClose();
    else reset();
  };

  const chip = (id: Exclude<Auf, "glocke" | null>, label: string, hervor = false) => (
    <button
      key={id}
      type="button"
      onPointerDown={halten}
      onClick={() => setAuf(auf === id ? null : id)}
      aria-expanded={auf === id}
      aria-label={`${label} – ändern`}
      data-chip={id}
      className={`${CHIP} ${hervor ? "border-2 border-dashed border-accent bg-accent-soft text-accent-strong" : "bg-work-soft text-work"}`}
    >
      {label}
    </button>
  );

  return (
    <Sheet title={entry ? "Termin" : "Neuer Termin"} onClose={onClose} inset={inset}>
      <form
        className="flex flex-col gap-3 pb-3"
        data-fenster="termin"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <EintragFeld ref={field} value={text} onChange={(v) => (setText(v), setHint(""))} placeholder="Zahnarzt Freitag 13 Uhr" label={entry ? "Termin" : "Neuer Termin"} bereit={bereit} />
        <EintragZeile
          raeume={raumWahl(haushalt)}
          raum={raum}
          haushalt={haushalt}
          onRaum={setHand}
          glockeAn={erinnern !== "aus"}
          glockeAuf={auf === "glocke"}
          onGlocke={() => setAuf(auf === "glocke" ? null : "glocke")}
          mehrAuf={mehr}
          onMehr={() => setMehr((v) => !v)}
        />
        {auf === "glocke" && (
          <Wahl label="Erinnern vorher" value={erinnern} options={VORHER_WAHL.map((r) => ({ value: r, label: REMINDERS.find((x) => x.value === r)!.short }))} onPick={(r) => (setReminder(r), setAuf(null))} />
        )}
        {erinnern !== "aus" && (time || ganztaegig) && <ErinnernZeile text={vorherText(erinnern)} onWeg={() => setReminder("aus")} />}
        {zeigeChips && (
          <div className="flex flex-wrap gap-2" aria-label="Erkannt" data-termin-chips>
            {chip("tag", tagKurz(datum))}
            {ganztaegig ? chip("uhr", "ganztägig") : chip("uhr", time ? uhr(time) : "Uhrzeit?", !time)}
            {time && chip("dauer", dauerLabel(minuten ?? STANDARD_DAUER))}
          </div>
        )}
        {auf === "tag" && (
          <div className="flex flex-col gap-2">
            <Wahl label="Tag" value={datum} options={tagWahl(today).map((x) => ({ value: x.iso, label: x.label }))} onPick={(iso) => (setTag(iso), setAuf(null))} />
            <input type="date" value={datum} onChange={(e) => e.target.value && setTag(e.target.value)} aria-label="Anderer Tag" className={`${INPUT_INLINE} w-44`} />
          </div>
        )}
        {auf === "uhr" && (
          <div className="flex flex-col gap-2">
            <Wahl label="Uhrzeit" value={time} options={UHR_WAHL.map((t) => ({ value: t, label: uhr(t) }))} onPick={(t) => (setZeit(t), setGanztaegig(false), setHint(""), setAuf(null))} />
            <input type="time" value={time ?? ""} onChange={(e) => e.target.value && (setZeit(e.target.value), setGanztaegig(false), setHint(""))} aria-label="Andere Uhrzeit" className={`${INPUT_INLINE} w-36`} />
          </div>
        )}
        {auf === "dauer" && <Wahl label="Dauer" value={String(minuten ?? STANDARD_DAUER)} options={DAUER_WAHL.map((m) => ({ value: String(m), label: dauerLabel(m) }))} onPick={(m) => (setDauer(Number(m)), setAuf(null))} />}
        {hint ? (
          <p className="px-1 text-[15px] font-semibold text-accent-strong" role="status">
            {hint}
          </p>
        ) : (
          !mehr && <p className={HINWEIS}>{gelesen && (gelesen.date || gelesen.time) ? "Tag und Uhrzeit hab ich rausgelesen. Antippen = ändern." : "Ein Satz reicht. Return = speichern."}</p>
        )}
        {d?.source && <p className={HINWEIS}>{sourceLabel(d.source)}</p>}
        {d?.link && (
          <a href={d.link} target="_blank" rel="noopener noreferrer" className="hit self-start px-1 text-[15px] font-semibold text-accent-strong">
            Mehr dazu ›
          </a>
        )}
        {mehr && (
          <>
            <div className={CARD_LIST} data-mehr-zeilen>
              <MehrZeile label="Ort" wert={ort.trim() || "Kein Ort"} auf={mehrZeile === "ort"} onClick={() => setMehrZeile(mehrZeile === "ort" ? null : "ort")}>
                <input value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="z. B. Praxis Dr. Krüger" aria-label="Ort" className={`${INPUT_INLINE} w-full`} />
              </MehrZeile>
              <MehrZeile label="Wiederholen" wert={wiederholenLabel(serie(wieder, d?.repeat))} auf={mehrZeile === "wieder"} onClick={() => setMehrZeile(mehrZeile === "wieder" ? null : "wieder")}>
                <Wahl label="Wiederholen" value={wieder} options={WIEDERHOLEN} onPick={(w) => (setWieder(w), setMehrZeile(null))} />
              </MehrZeile>
              <button type="button" role="switch" aria-checked={ganztaegig} onClick={() => (setGanztaegig((v) => !v), setHint(""))} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold">
                <span className="flex-1">Ganztägig</span>
                <span className={ganztaegig ? "text-accent-strong" : "text-muted"}>{ganztaegig ? "Ja" : "Nein"}</span>
              </button>
              {persons.length > 1 && (
                <MehrZeile label="Personen" wert={who.length ? persons.filter((p) => who.includes(p.id)).map((p) => p.name).join(", ") : "Alle"} auf={mehrZeile === "personen"} onClick={() => setMehrZeile(mehrZeile === "personen" ? null : "personen")}>
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
                </MehrZeile>
              )}
            </div>
            <button type="button" onClick={() => save(true)} aria-disabled={!bereit} className={`${buttonClass("primary")} w-full ${bereit ? "" : "opacity-50"}`}>
              Speichern
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
}
