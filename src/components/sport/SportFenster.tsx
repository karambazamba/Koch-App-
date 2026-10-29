"use client";

// Sport-Fenster vom Sport-Kreis oben (A-050, Tafel 137/2): Kopf „Sport · diese
// Woche“ mit „Ziel 2× · Mo geschafft, Do geplant“, die Stempel dieser Woche
// (geplant gestrichelt mit „Do 8:00“), darunter „Woche planen“: Mo–So als
// Kreise (geschafft = voll mit Symbol, geplant = gestrichelt mit Symbol, frei
// = Plus). Tag tippen → orange → Sportart-Chips (eigene zuerst) und
// Uhrzeit-Chips (8:00, 10:00, 18:00, andere) → großer Knopf „Sa 10:00
// Volleyball planen“ legt einen Termin im Raum „Ich“ an (Etikett Sport,
// Erinnerung 30 Min vorher, mit Rückgängig). „Schon trainiert? Eintragen“ und
// „Alles zu Sport ›“ führen weiter. Keine Zähler, kein Druck.

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_INLINE, buttonClass, chipClass } from "@/components/ui/styles";
import { FensterKopf } from "@/components/heute/kreise/FensterKopf";
import { StempelFeld } from "@/components/sport/Stempel";
import { SportIcon, sportSymbol } from "@/components/sport/SportIcon";
import { SportEintragen } from "@/components/sport/SportEintragen";
import { act } from "@/components/heute/actions";
import { addDays } from "@/lib/core/now";
import { clockLabel } from "@/lib/kalender/answers";
import { upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { SPORTS, lastTimeFor, nextTraining, plannedEntry, sportById, sportOfTitle, trainingsBetween, useSport } from "@/lib/sport";
import { stempelkarte } from "@/lib/sport/stempel";
import { PLAN_ZEITEN, planenText, sportChips, wochenTage, wochenUnterzeile, type WochenTag } from "@/lib/sport/wochePlanen";
import type { KachelFarbe } from "@/lib/heute/kachelFarben";

/** Dauer eines im Fenster geplanten Trainings (Minuten) */
const PLAN_MINUTEN = 60;

type Props = { entries: CalendarEntry[]; today: string; minutes: number; me: string | null; farbe?: KachelFarbe; onClose: () => void };

export function SportFenster({ entries, today, minutes, me, farbe, onClose }: Props) {
  const sport = useSport();
  const [tag, setTag] = useState<string | null>(null);
  const [art, setArt] = useState<string | null>(null);
  const [zeit, setZeit] = useState<string | null>(null);
  const [andere, setAndere] = useState(false);
  const [eintragen, setEintragen] = useState(false);
  const recent = useMemo(() => (sport ? [...new Set(trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse().map((t) => t.data.sport))] : []), [sport, entries, today, me]);
  if (!sport) return null;
  const karte = stempelkarte(sport, entries, today, minutes, me);
  const tage = wochenTage(sport, entries, today, karte.monday, me);
  const naechstes = nextTraining(entries, today, minutes, me);
  const chips = sportChips(recent, sport.custom, SPORTS.map((s) => s.id));
  const gewaehlt = art ?? chips[0] ?? "laufen";
  const uhr = zeit ?? lastTimeFor(entries, gewaehlt) ?? null;
  const planen = () => {
    if (!tag || !uhr) return;
    const entry = plannedEntry({ sport: gewaehlt, date: tag, start: uhr, minutes: PLAN_MINUTEN, weekly: false }, me, "ich");
    if (entry) act((l) => upsertEntry(l, entry), `${sportById(gewaehlt).label} geplant`);
    setTag(null);
    setZeit(null);
    setAndere(false);
  };
  return (
    <>
      <Sheet
        title="Sport"
        onClose={onClose}
        header={<FensterKopf icon={sportSymbol(naechstes ? sportOfTitle(naechstes.title) : null)} tone="sport" titel="Sport · diese Woche" unter={wochenUnterzeile(karte, today)} onClose={onClose} />}
      >
        <div className="flex flex-col gap-4 pb-4" data-tone="sport" data-farbe={farbe} data-sport-fenster>
          <ol className="flex flex-wrap gap-3" aria-label="Diese Woche">
            {[...karte.felder.map((f, i) => ({ f, key: f.art === "stempel" ? f.stempel.id : `feld-${i}` }))].map(({ f, key }) => (
              <li key={key}>
                <StempelFeld feld={f} groesse="m" />
              </li>
            ))}
          </ol>
          <section className="flex flex-col gap-2" aria-label="Woche planen">
            <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-muted">Woche planen</h3>
            <div className="grid grid-cols-7 gap-1" role="group" aria-label="Tag wählen">
              {tage.map((t) => (
                <TagKreis key={t.date} tag={t} gewaehlt={tag === t.date} onTap={() => (setTag(tag === t.date ? null : t.date), setZeit(null), setAndere(false))} />
              ))}
            </div>
            {tag && (
              <div className="flex flex-col gap-2 rounded-card bg-fill p-3" data-sport-planen>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sportart">
                  <span className="w-7 text-[14px] font-bold text-muted">{tage.find((t) => t.date === tag)?.kurz}</span>
                  {chips.map((id) => (
                    <button key={id} type="button" onClick={() => setArt(id)} aria-pressed={gewaehlt === id} className={chipClass(gewaehlt === id)}>
                      <SportIcon sport={id} />
                      {sportById(id).label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Uhrzeit">
                  <span className="w-7 text-[14px] font-bold text-muted">um</span>
                  {PLAN_ZEITEN.map((z) => (
                    <button key={z} type="button" onClick={() => (setZeit(z), setAndere(false))} aria-pressed={uhr === z && !andere} className={chipClass(uhr === z && !andere)}>
                      {clockLabel(z)}
                    </button>
                  ))}
                  {andere ? (
                    <input type="time" step={300} value={uhr ?? ""} onChange={(e) => setZeit(e.target.value || null)} aria-label="Andere Uhrzeit" className={INPUT_INLINE} autoFocus />
                  ) : (
                    <button type="button" onClick={() => setAndere(true)} aria-pressed={Boolean(uhr && !PLAN_ZEITEN.includes(uhr))} className={chipClass(Boolean(uhr && !PLAN_ZEITEN.includes(uhr)))}>
                      {uhr && !PLAN_ZEITEN.includes(uhr) ? clockLabel(uhr) : "andere"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
          {tag && (
            <button type="button" onClick={planen} disabled={!uhr} className={buttonClass("primary", "lg")} data-sport-planen-knopf>
              {uhr ? planenText(tag, uhr, gewaehlt, today) : "Uhrzeit wählen"}
            </button>
          )}
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setEintragen(true)} className="hit text-[15px] font-bold text-accent-strong">
              Schon trainiert? Eintragen
            </button>
            <Link href="/sport" onClick={onClose} className="hit flex items-center gap-0.5 text-[15px] font-semibold text-muted">
              Alles zu Sport
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </div>
      </Sheet>
      {eintragen && <SportEintragen today={today} recent={recent} onClose={() => setEintragen(false)} />}
    </>
  );
}

/** Ein Tag der Woche: geschafft = voll mit Symbol, geplant = gestrichelt mit Symbol, frei = Plus; gewählt = orange */
function TagKreis({ tag, gewaehlt, onTap }: { tag: WochenTag; gewaehlt: boolean; onTap: () => void }) {
  const text = `${tag.kurz}: ${tag.art === "geschafft" ? `${sportById(tag.sport ?? "").label} geschafft` : tag.art === "geplant" ? `${sportById(tag.sport ?? "").label} geplant` : tag.vorbei ? "vorbei" : "frei, planen"}`;
  const kreis =
    gewaehlt ? "bg-accent text-on-accent" : tag.art === "geschafft" ? "bg-tile-accent text-surface" : tag.art === "geplant" ? "border-2 border-dashed border-tile-accent text-tile-accent" : "border-2 border-dashed border-line-strong text-muted";
  return (
    <button type="button" onClick={onTap} disabled={tag.vorbei && tag.art === "frei"} aria-label={text} aria-pressed={gewaehlt} className="flex flex-col items-center gap-1 disabled:opacity-40" data-tag={tag.art}>
      <span className="text-[13px] font-bold text-muted">{tag.kurz}</span>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${kreis}`} aria-hidden>
        {gewaehlt || tag.art === "frei" ? <Plus className="h-4 w-4" strokeWidth={2.5} /> : <SportIcon sport={tag.sport ?? ""} />}
      </span>
    </button>
  );
}
