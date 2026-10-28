"use client";

// /profil/tagesablauf ("Startseite & Tageszeiten"): Jetzt-Karte an/aus und
// ausgeblendete Themen zurücksetzen, Ruhe nach Feierabend, Zeiten der Phasen,
// Arbeitstage, Kochen-Modus und die Zeit-Vorschau "So tun, als wäre es …"
// (nur diese Sitzung, ändert keine Daten). Die Kachel-Anordnung ändert sich
// nie von selbst – darum gibt es hier keinen Modus mehr. Wirkt sofort.

import Link from "next/link";
import { useState } from "react";
import { BellOff, ChefHat, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PreviewBanner } from "@/components/heute/PreviewBanner";
import { CARD, CARD_LIST, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { DEFAULT_ROUTINE, WEEKDAY_SHORT, changeRoutine, setPreview, usePreview, useRoutine } from "@/lib/heute/tagesablauf";
import { resetJetztTopics, setJetztOn, useJetzt } from "@/lib/heute/jetztStore";
import { showToast } from "@/lib/core/toast";
import { SwitchRow } from "@/components/einstellungen/settings/SettingsParts";
import { useAssistantStatus } from "@/lib/begleitung/client";

const KOCHEN_MIN = [10, 15, 20, 30, 45];

export function DayRoutineView() {
  const routine = useRoutine();
  const preview = usePreview();
  const [clock, setClock] = useState(preview?.clock ?? "18:20");
  const [weekday, setWeekday] = useState<number | null>(preview?.weekday ?? null);
  const r = routine ?? DEFAULT_ROUTINE;
  const jetzt = useJetzt();
  // „So tun, als wäre es …“ nur im Testmodus (oder solange eine Vorschau läuft)
  const testMode = Boolean(useAssistantStatus(true)?.mock) || Boolean(preview);
  const anyHidden = jetzt.hidden.length > 0 || Object.keys(jetzt.weights).length > 0;
  const toggleDay = (d: number) => changeRoutine({ arbeitstage: r.arbeitstage.includes(d) ? r.arbeitstage.filter((x) => x !== d) : [...r.arbeitstage, d] });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Tagesablauf" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <PreviewBanner />
        <ul className={CARD_LIST}>
          <SwitchRow icon={Sparkles} title="Jetzt-Karte anzeigen" hint="Oben auf Heute: das Wichtigste für den Moment – die Kacheln bleiben, wo sie sind" checked={jetzt.on} onChange={(on) => setJetztOn(on)} />
          <li className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-[15px] text-muted">Ausgeblendete Themen und Gelerntes</span>
            <button
              type="button"
              disabled={!anyHidden}
              onClick={() => {
                resetJetztTopics();
                showToast({ text: "Zurückgesetzt", small: true });
              }}
              className={buttonClass("soft", "sm")}
            >
              Zurücksetzen
            </button>
          </li>
        </ul>

        <ul className={CARD_LIST}>
          <SwitchRow icon={BellOff} title="Ruhe nach Feierabend" hint="Im Feierabend machen Geschäftliches und Aufgaben Pause – auch bei Mitteilungen" checked={r.ruhe} onChange={(ruhe) => changeRoutine({ ruhe })} />
        </ul>

        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Tageszeiten">
          <h2 className="text-[15px] font-extrabold text-muted">Tageszeiten</h2>
          <label className="flex items-center gap-3">
            <span className="flex-1 text-base font-semibold">☀️ Morgens bis</span>
            <input type="time" value={r.morgenBis} onChange={(e) => e.target.value && changeRoutine({ morgenBis: e.target.value })} className={`${INPUT_BASE} h-11 w-36 px-3`} aria-label="Morgens bis" />
          </label>
          <label className="flex items-center gap-3">
            <span className="flex-1 text-base font-semibold">🌙 Feierabend ab</span>
            <input type="time" value={r.feierabendAb} onChange={(e) => e.target.value && changeRoutine({ feierabendAb: e.target.value })} className={`${INPUT_BASE} h-11 w-36 px-3`} aria-label="Feierabend ab" />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
            <input type="checkbox" checked={r.nachArbeit} onChange={(e) => changeRoutine({ nachArbeit: e.target.checked })} className="h-5 w-5 shrink-0 accent-accent" />
            <span>frühestens nach deinem letzten Arbeitstermin (Abenddienste)</span>
          </label>
        </section>

        <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Arbeitstage">
          <h2 className="text-[15px] font-extrabold text-muted">Arbeitstage</h2>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_SHORT.map((d, i) => (
              <button key={d} type="button" role="checkbox" aria-checked={r.arbeitstage.includes(i)} aria-label={`Arbeitstag ${d}`} onClick={() => toggleDay(i)} className={`${chipClass(r.arbeitstage.includes(i))} min-w-11 justify-center`}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">An freien Tagen ist Geschäftliches den ganzen Tag ausgeblendet.</p>
        </section>

        <ul className={CARD_LIST}>
          <SwitchRow icon={ChefHat} title="Kochen-Modus automatisch" hint="Vor der Essenszeit zeigt die Essen-Kachel die Schritte" checked={r.kochenAuto} onChange={(kochenAuto) => changeRoutine({ kochenAuto })} />
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

        {testMode && (
        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Zeit-Vorschau">
          <h2 className="text-[15px] font-extrabold text-muted">Zum Ausprobieren</h2>
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
        )}
        <p className="px-1 text-sm text-muted" role="status">
          Gilt sofort – nichts wird gelöscht.
        </p>
      </main>
    </div>
  );
}
