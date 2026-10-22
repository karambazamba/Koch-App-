"use client";

// Detail eines Tipps: Icon/Bild, Titel, Datum + Uhrzeit, Etiketten, Ort mit
// Entfernung, Eintritt, Kurztext, „Wer kommt mit?“ (Familie) und „In unseren
// Kalender“ (ein normaler Familientermin mit Ort, Link und Notiz „aus Tipps“).
// Daneben „Pinnwand“ und „Merken“. Unten Quelle, Lizenz und Urheber.

import { useState } from "react";
import { Bookmark, CalendarPlus, Check, MapPin, Pin, Ticket } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { personLabel } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { needsAttribution, type TipView } from "@/lib/tipps/model";
import { isTaken, pinTip, takeTip, toggleRemember, useTipSettings } from "@/lib/tipps/client";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { KarambaLine, SampleMark, TipIcon, TipTags, dayTitle, tipMeta } from "@/components/tipps/TipBits";

export function TipSheet({ tip, onClose }: { tip: TipView; onClose: () => void }) {
  const profile = useProfile();
  const settings = useTipSettings();
  const persons = sortBy(profile?.persons ?? [], ...PERSONS);
  const [who, setWho] = useState<string[]>(() => persons.map((p) => p.id));
  const [taken, setTaken] = useState(() => isTaken(tip.id));
  const [pinned, setPinned] = useState(false);
  const remembered = settings.gemerkt.includes(tip.id);
  const me = (profile?.persons[0] && personLabel(profile.persons[0], profile.persons)) || "Ich";
  const time = tip.ganztags ? "ganztägig" : `${tip.beginn.slice(11, 16).replace(/^0/, "")}${tip.ende ? `–${tip.ende.slice(11, 16).replace(/^0/, "")}` : ""} Uhr`;
  const toggle = (id: string) => setWho((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  return (
    <Sheet title="Tipp" onClose={onClose} tall>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-start gap-3">
          {tip.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- offen lizenziertes Bild der Quelle
            <img src={tip.bild_url} alt="" className="h-16 w-16 shrink-0 rounded-field object-cover" />
          ) : (
            <TipIcon tip={tip} size={64} />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {tip.karamba && <KarambaLine />}
            <h2 className="text-[22px] font-extrabold leading-tight">{tip.titel}</h2>
            <p className="text-sm font-semibold text-muted">
              {dayTitle(tip.beginn.slice(0, 10))} · {time}
            </p>
            {tip.quelle === "demo" && (
              <span className="self-start">
                <SampleMark />
              </span>
            )}
          </div>
        </div>
        <TipTags tip={tip} max={4} />
        <ul className="flex flex-col gap-2 text-[15px]">
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-tipp" strokeWidth={2} aria-hidden />
            <span>
              {tip.adresse ? `${tip.adresse}, ` : ""}
              {tip.ort_name} <span className="text-muted">· {tipMeta(tip).split(" · ").pop()}</span>
            </span>
          </li>
          {tip.preis_text && (
            <li className="flex items-start gap-2">
              <Ticket className="mt-0.5 h-4.5 w-4.5 shrink-0 text-tipp" strokeWidth={2} aria-hidden />
              <span>{tip.preis_text}</span>
            </li>
          )}
        </ul>
        {tip.kurztext && <p className="text-[15px] leading-relaxed">{tip.kurztext}</p>}

        {persons.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Wer kommt mit?">
            <h3 className="text-[15px] font-extrabold">Wer kommt mit?</h3>
            <div className="flex flex-wrap gap-2">
              {persons.map((p) => {
                const name = personLabel(p, persons);
                const on = who.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle(p.id)} className={`flex flex-col items-center gap-1 rounded-field px-1.5 py-1 ${on ? "" : "opacity-40"}`}>
                    <PersonAvatar name={name} size={40} />
                    <span className="max-w-16 truncate text-xs font-semibold">{name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button
          type="button"
          disabled={taken}
          onClick={() => {
            takeTip(tip, who);
            setTaken(true);
          }}
          className={`${buttonClass("primary", "lg")} w-full`}
        >
          {taken ? <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden /> : <CalendarPlus className="h-5 w-5" strokeWidth={2} aria-hidden />}
          {taken ? "Steht im Kalender" : "In unseren Kalender"}
        </button>
        <div className="flex gap-2">
          <button type="button" disabled={pinned} onClick={() => setPinned(pinTip(tip, me))} className={`${chipClass(pinned)} flex-1 justify-center`}>
            <Pin className="h-4 w-4" strokeWidth={2} aria-hidden />
            {pinned ? "An der Pinnwand" : "Pinnwand"}
          </button>
          <button type="button" aria-pressed={remembered} onClick={() => toggleRemember(tip.id)} className={`${chipClass(remembered)} flex-1 justify-center`}>
            <Bookmark className="h-4 w-4" strokeWidth={2} aria-hidden />
            {remembered ? "Gemerkt" : "Merken"}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-muted" data-testid="tipp-quelle">
          {tip.quelle === "demo" ? (
            "Quelle: Beispieldaten (Testbetrieb)"
          ) : tip.url ? (
            <a href={tip.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-strong underline">
              Quelle: {tip.veranstalter ?? "Veranstaltungskalender"}
            </a>
          ) : (
            `Quelle: ${tip.veranstalter ?? "Tourismus-Agentur Schleswig-Holstein"}`
          )}
          {` · Lizenz: ${tip.lizenz}`}
          {needsAttribution(tip.lizenz) && tip.urheber ? ` · Urheber: ${tip.urheber}` : ""}
        </p>
      </div>
    </Sheet>
  );
}
