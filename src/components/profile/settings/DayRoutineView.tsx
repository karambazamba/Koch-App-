"use client";

// /profil/tagesablauf: Startseite mitdenkend oder immer gleich (zwei große
// Karten mit Mini-Vorschau), Ruhe nach Feierabend, Zeiten der Phasen,
// Arbeitstage, Kochen-Modus und die Zeit-Vorschau "So tun, als wäre es …"
// (nur diese Sitzung, ändert keine Daten). Wirkt sofort.

import Link from "next/link";
import { useState } from "react";
import { BellOff, ChefHat } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PreviewBanner } from "@/components/alltag/PreviewBanner";
import { CARD, CARD_LIST, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { DEFAULT_ROUTINE, HOME_MODES, WEEKDAY_SHORT, changeRoutine, setPreview, usePreview, useRoutine, type HomeMode } from "@/lib/tagesablauf/settings";
import { SwitchRow } from "./SettingsParts";

const KOCHEN_MIN = [10, 15, 20, 30, 45];

export function DayRoutineView() {
  const routine = useRoutine();
  const preview = usePreview();
  const [clock, setClock] = useState(preview?.clock ?? "18:20");
  const [weekday, setWeekday] = useState<number | null>(preview?.weekday ?? null);
  const r = routine ?? DEFAULT_ROUTINE;
  const think = r.mode === "mitdenkend";
  const toggleDay = (d: number) => changeRoutine({ arbeitstage: r.arbeitstage.includes(d) ? r.arbeitstage.filter((x) => x !== d) : [...r.arbeitstage, d] });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Tagesablauf" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <PreviewBanner />
        <p className="px-1 text-lg font-bold">Wie soll sich deine Startseite verhalten?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Startseite">
          {HOME_MODES.map((m) => (
            <ModeCard key={m.value} mode={m.value} chosen={r.mode === m.value} onPick={() => changeRoutine({ mode: m.value })} />
          ))}
        </div>

        <ul className={CARD_LIST}>
          <SwitchRow icon={BellOff} title="Ruhe nach Feierabend" hint="Im Feierabend keine Mitteilungen zu Arbeit und Aufgaben" checked={r.ruhe} onChange={(ruhe) => changeRoutine({ ruhe })} />
        </ul>

        {think && (
          <>
            <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Tageszeiten">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Tageszeiten</h2>
              <label className="flex items-center gap-3">
                <span className="flex-1 text-base font-semibold">☀️ Morgen bis</span>
                <input type="time" value={r.morgenBis} onChange={(e) => e.target.value && changeRoutine({ morgenBis: e.target.value })} className={`${INPUT_BASE} h-11 w-36 px-3`} aria-label="Morgen bis" />
              </label>
              <label className="flex items-center gap-3">
                <span className="flex-1 text-base font-semibold">🌙 Feierabend ab</span>
                <input type="time" value={r.feierabendAb} onChange={(e) => e.target.value && changeRoutine({ feierabendAb: e.target.value })} className={`${INPUT_BASE} h-11 w-36 px-3`} aria-label="Feierabend ab" />
              </label>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input type="checkbox" checked={r.nachArbeit} onChange={(e) => changeRoutine({ nachArbeit: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-accent" />
                <span>frühestens nach deinem letzten Arbeitstermin (Abenddienste)</span>
              </label>
            </section>

            <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Arbeitstage">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Arbeitstage</h2>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_SHORT.map((d, i) => (
                  <button key={d} type="button" role="checkbox" aria-checked={r.arbeitstage.includes(i)} aria-label={`Arbeitstag ${d}`} onClick={() => toggleDay(i)} className={`${chipClass(r.arbeitstage.includes(i))} min-w-11 justify-center`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">An freien Tagen ist Arbeit den ganzen Tag ausgeblendet.</p>
            </section>

            <ul className={CARD_LIST}>
              <SwitchRow icon={ChefHat} title="Kochen-Modus automatisch" hint="Vor der Essenszeit stehen Rezept und Timer oben" checked={r.kochenAuto} onChange={(kochenAuto) => changeRoutine({ kochenAuto })} />
              {r.kochenAuto && (
                <li className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-base font-semibold">Minuten vorher</span>
                  <div className="flex gap-1" role="radiogroup" aria-label="Minuten vorher">
                    {KOCHEN_MIN.map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={r.kochenMin === m} onClick={() => changeRoutine({ kochenMin: m })} className={`${chipClass(r.kochenMin === m)} min-w-11 justify-center px-2`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </li>
              )}
            </ul>

            <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Zeit-Vorschau">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Zum Ausprobieren</h2>
              <p className="text-base font-semibold">So tun, als wäre es …</p>
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" value={clock} onChange={(e) => setClock(e.target.value)} className={`${INPUT_BASE} h-11 w-36 px-3`} aria-label="Vorschau-Uhrzeit" />
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => setWeekday(null)} className={chipClass(weekday === null)} aria-pressed={weekday === null}>
                    Heute
                  </button>
                  {WEEKDAY_SHORT.map((d, i) => (
                    <button key={d} type="button" onClick={() => setWeekday(i)} className={`${chipClass(weekday === i)} px-2.5`} aria-pressed={weekday === i} aria-label={`Vorschau ${d}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => clock && setPreview({ clock, weekday })} className={buttonClass("soft", "sm")}>
                  Vorschau starten
                </button>
                {preview && (
                  <Link href="/" className={buttonClass("secondary", "sm")}>
                    Zur Startseite
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted">Ändert keine Daten – gilt nur, bis du die Vorschau beendest.</p>
            </section>
          </>
        )}
        <p className="px-1 text-sm text-muted" role="status">
          Gilt sofort – nichts wird gelöscht.
        </p>
      </main>
    </div>
  );
}

/** Große Auswahlkarte mit Mini-Vorschau */
function ModeCard({ mode, chosen, onPick }: { mode: HomeMode; chosen: boolean; onPick: () => void }) {
  const m = HOME_MODES.find((x) => x.value === mode)!;
  const bar = (w: string, tone = "bg-line") => <span className={`block h-1.5 rounded-full ${tone} ${w}`} />;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      aria-label={`${m.label} – ${m.text}`}
      onClick={onPick}
      className={`flex flex-col gap-2 rounded-card border p-3 text-left transition active:scale-[0.98] ${chosen ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
    >
      {/* Mini-Startseite */}
      <span className="flex h-24 flex-col gap-1 rounded-xl bg-background p-2" aria-hidden>
        {mode === "mitdenkend" ? (
          <>
            <span className="self-start rounded-full bg-phase-kochen px-1.5 text-[9px] font-bold text-phase-kochen-ink">🍳 Kochen</span>
            <span className="flex flex-col gap-1 rounded-md bg-surface p-1.5 shadow-card">
              {bar("w-2/3", "bg-accent/60")}
              {bar("w-1/2")}
            </span>
            <span className="flex h-4 items-center rounded-md bg-surface px-1.5 shadow-card">{bar("w-3/4")}</span>
          </>
        ) : (
          <>
            <span className="self-end text-[10px]">📌</span>
            <span className="flex h-5 items-center rounded-md bg-surface px-1.5 shadow-card">{bar("w-2/3")}</span>
            <span className="flex h-5 items-center rounded-md bg-surface px-1.5 shadow-card">{bar("w-1/2")}</span>
            <span className="grid grid-cols-2 gap-1">
              <span className="h-4 rounded-md bg-surface shadow-card" />
              <span className="h-4 rounded-md bg-surface shadow-card" />
            </span>
          </>
        )}
      </span>
      <span className={`text-base font-bold leading-tight ${chosen ? "text-accent-strong" : "text-ink"}`}>
        {m.emoji} {m.label}
      </span>
      <span className="text-[13px] leading-snug text-muted">{m.text}</span>
    </button>
  );
}
