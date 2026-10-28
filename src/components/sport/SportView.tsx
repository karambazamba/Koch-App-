"use client";

// /sport als Stempelkarte (A-044, Tafel 132): nur was rein muss. Karte
// „Diese Woche“ (Felder = Wochenziel, ohne Ziel 3; Stempel, geplant
// gestrichelt mit „Do 8:00“, Bonus-Stempel klein daneben), zwei Sätze, der
// große Knopf „Training eintragen“, darunter „Planen“, und „Letzte Wochen“
// (3 Zeilen, Punkte je Training, ohne Serien und Summen). Alles andere liegt
// im „•••“ (`SportMenu`). Ein Stempel öffnet Ändern/Löschen, ein geplantes
// Feld sein Tag-Fenster, eine Woche ihre Trainings.

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, CARD_LIST, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { useEntries } from "@/lib/kalender/store";
import { weekdayShort } from "@/lib/kalender/model";
import { addDays, toIsoDate, useMinutes, useToday } from "@/lib/core/now";
import { useHomeTiles } from "@/lib/core/homeLayout";
import { showDeleted } from "@/lib/core/toast";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { removeTraining, updateTraining } from "@/lib/sport/actions";
import { sportById, trainingsBetween, useSport, type Training } from "@/lib/sport";
import { letzteWochen, stempelkarte, zielFrageFaellig, type Feld, type WochenZeile } from "@/lib/sport/stempel";
import { useForecast } from "@/lib/wetter/client";
import { buzz } from "@/components/heute/actions";
import { SportAddSheet } from "@/components/sport/SportAddSheet";
import { SportDaySheet } from "@/components/sport/SportDaySheet";
import { SportEintragen, SportZielFrage } from "@/components/sport/SportEintragen";
import { SportMenu } from "@/components/sport/SportMenu";
import { SportPlanForm } from "@/components/sport/SportPlanForm";
import { StempelFeld, StempelZeichen, feldText, useNeueStempel } from "@/components/sport/Stempel";

export function SportView() {
  const sport = useSport();
  const entries = useEntries();
  const profile = useProfile();
  const day = useToday();
  const minutes = useMinutes();
  const tiles = useHomeTiles();
  const { forecast } = useForecast();
  const [adding, setAdding] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [menu, setMenu] = useState<Training | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [woche, setWoche] = useState<WochenZeile | null>(null);
  if (!sport || !entries || !day || minutes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const today = toIsoDate(day);
  const me = profile?.persons[0]?.id ?? null;
  const karte = stempelkarte(sport, entries, today, minutes, me);
  const wochen = letzteWochen(sport, entries, today, me);
  const recent = [...new Set(trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse().map((t) => t.data.sport))];
  const farbe = tiles?.find((t) => t.id === "sport")?.farbe;
  const tap = (f: Feld) => (f.art === "stempel" ? setMenu(f.training) : f.art === "geplant" ? setOpenDay(f.date) : setAdding(true));
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Sport" backHref="/" action={<SportMenu state={sport} recent={recent} />} />
      <main className={PAGE_MAIN}>
        <section
          data-tone="sport"
          data-farbe={farbe}
          data-geschafft={karte.geschafft ? "" : undefined}
          className={`flex flex-col gap-4 rounded-card border-2 border-dashed border-tile-accent/30 p-4 shadow-card ${karte.geschafft ? "bg-tile" : "bg-surface"}`}
          aria-label="Diese Woche"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Diese Woche</h2>
            <span className="text-[14px] font-bold text-tile-accent">{karte.ziel === null ? "Ohne Ziel" : `Ziel: ${karte.ziel}×`}</span>
          </div>
          <Karte felder={karte.felder} bonus={karte.bonus} onTap={tap} />
          <div className="flex flex-col gap-0.5" role="status">
            <p className="text-[26px] font-extrabold leading-tight tracking-tight">{karte.satz}</p>
            {karte.klein && <p className="text-[15px] text-muted">{karte.klein}</p>}
          </div>
        </section>

        <div className="flex flex-col items-center gap-1">
          <button type="button" onClick={() => setAdding(true)} className={`${buttonClass("primary", "lg")} w-full text-[18px]`}>
            Training eintragen
          </button>
          <button type="button" onClick={() => setPlanning(true)} className="hit min-h-11 px-4 text-[16px] font-bold text-accent-strong">
            Planen
          </button>
        </div>

        {wochen.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Letzte Wochen">
            <h2 className={`px-1 ${SECTION_TITLE}`}>Letzte Wochen</h2>
            <ul className={CARD_LIST} data-tone="sport" data-farbe={farbe}>
              {wochen.map((w) => (
                <li key={w.monday}>
                  <button type="button" onClick={() => setWoche(w)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background" aria-label={`${w.label}${w.geschafft ? ", geschafft" : ""}: öffnen`}>
                    <span className="w-28 shrink-0 text-[15px] tabular-nums">{w.label}</span>
                    <span className="flex flex-1 flex-wrap items-center gap-1.5" aria-hidden>
                      {Array.from({ length: w.punkte }, (_, i) => (
                        <span key={`p${i}`} className="h-4 w-4 rounded-full bg-tile-accent" data-punkt="training" />
                      ))}
                      {Array.from({ length: w.leer }, (_, i) => (
                        <span key={`l${i}`} className="h-4 w-4 rounded-full border-2 border-dashed border-tile-accent/45" data-punkt="leer" />
                      ))}
                    </span>
                    {w.geschafft && <span className="shrink-0 text-[14px] font-bold text-good-ink">geschafft</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {adding && <SportEintragen today={today} recent={recent} onClose={() => setAdding(false)} />}
      {!adding && zielFrageFaellig(sport) && <SportZielFrage onClose={() => undefined} />}
      {planning && (
        <Sheet title="Training planen" onClose={() => setPlanning(false)}>
          <div className="flex flex-col gap-3 pb-3">
            <SportPlanForm date={today} days={Array.from({ length: 7 }, (_, i) => addDays(today, i))} today={today} entries={entries} state={sport} me={me} recent={recent} fallbackMinutes={45} onDone={() => (buzz(), setPlanning(false))} />
          </div>
        </Sheet>
      )}
      {editing && (
        <SportAddSheet
          today={today}
          recent={recent}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            updateTraining(editing, data);
            buzz();
            setEditing(null);
          }}
        />
      )}
      {menu && <TrainingSheet training={menu} onEdit={() => (setEditing(menu), setMenu(null))} onClose={() => setMenu(null)} />}
      {woche && <WocheSheet woche={woche} trainings={trainingsBetween(sport, entries, woche.monday, addDays(woche.monday, 6), today, me)} onPick={(t) => (setWoche(null), setMenu(t))} onClose={() => setWoche(null)} />}
      {openDay && <SportDaySheet date={openDay} today={today} state={sport} entries={entries} me={me} forecast={forecast} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

function Karte({ felder, bonus, onTap }: { felder: Feld[]; bonus: ReturnType<typeof stempelkarte>["bonus"]; onTap: (f: Feld) => void }) {
  const neu = useNeueStempel([...felder.flatMap((f) => (f.art === "stempel" ? [f.stempel.id] : [])), ...bonus.map((b) => b.stempel.id)]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ol className="contents" aria-label="Felder">
        {felder.map((f, i) => (
          <li key={f.art === "stempel" ? f.stempel.id : `feld-${i}`}>
            <button type="button" onClick={() => onTap(f)} className="flex rounded-full" aria-label={`${feldText(f)}: ${f.art === "frei" ? "Training eintragen" : "öffnen"}`}>
              <StempelFeld feld={f} groesse="gross" neu={f.art === "stempel" && neu(f.stempel.id)} />
            </button>
          </li>
        ))}
      </ol>
      {bonus.length > 0 && (
        <ol className="flex flex-wrap items-center gap-2" aria-label="Bonus">
          {bonus.map((b) => (
            <li key={b.stempel.id} data-bonus>
              <button type="button" onClick={() => onTap({ art: "stempel", ...b })} className="hit flex rounded-full" aria-label={`Bonus: ${b.stempel.label}, öffnen`}>
                <StempelZeichen stempel={b.stempel} groesse="bonus" neu={neu(b.stempel.id)} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TrainingSheet({ training, onEdit, onClose }: { training: Training; onEdit: () => void; onClose: () => void }) {
  const t = training.data;
  return (
    <Sheet title={`${weekdayShort(t.date)}: ${t.terminKey && t.note ? t.note : sportById(t.sport).label}`} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-3">
        <p className="text-[15px] text-muted">
          {t.minutes} Min{t.km ? ` · ${t.km} km` : ""}
        </p>
        <button type="button" onClick={onEdit} className={buttonClass("secondary", "lg")}>
          Ändern
        </button>
        <button
          type="button"
          onClick={() => {
            showDeleted(removeTraining(training));
            onClose();
          }}
          className={buttonClass("danger", "lg")}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden /> Löschen
        </button>
      </div>
    </Sheet>
  );
}

function WocheSheet({ woche, trainings, onPick, onClose }: { woche: WochenZeile; trainings: Training[]; onPick: (t: Training) => void; onClose: () => void }) {
  return (
    <Sheet title={woche.label} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-3">
        {trainings.length ? (
          <ul className={CARD_LIST}>
            {trainings.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onPick(t)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background">
                  <span className="w-8 text-[15px] font-bold text-muted">{weekdayShort(t.data.date)}</span>
                  <span className="flex-1 text-base font-bold">{t.data.terminKey && t.data.note ? t.data.note : sportById(t.data.sport).label}</span>
                  <span className="text-sm text-muted">{t.data.minutes} Min</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-muted">Die Woche war frei.</p>
        )}
      </div>
    </Sheet>
  );
}
