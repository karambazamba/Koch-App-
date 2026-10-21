"use client";

// /sport: die Woche Mo–So (grüne Kreise, heute oranger Ring) mit einem
// freundlichen Satz, "Zuletzt" (antippen = ändern oder löschen), Packlisten
// und das Wochenziel. Ohne Zähler und Serien – Erfolge zeigen, Versäumnisse nicht.

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, CARD_LIST, INPUT, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { useEntries } from "@/lib/aufgaben/store";
import { weekdayIndex, weekdayShort } from "@/lib/aufgaben/model";
import { addDays, useToday, toIsoDate } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import { addTraining, removeTraining, setPack, setSportGoal, updateTraining } from "@/lib/sport/actions";
import { packFor, sportById, statusLine, trainingsBetween, useSport, weekDots, weekStatus, type Training } from "@/lib/sport";
import { useForecast } from "@/lib/wetter/client";
import { PagePlus } from "@/components/ui/QuickButton";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { SportDaySheet } from "./SportDaySheet";
import { SportWeekRow } from "./SportWeekRow";
import { buzz } from "@/components/alltag/actions";
import { SportAddSheet } from "./SportAddSheet";

export function SportView() {
  const sport = useSport();
  const { forecast } = useForecast();
  const entries = useEntries();
  const profile = useProfile();
  const day = useToday();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [menu, setMenu] = useState<Training | null>(null);
  const [pack, setPackFor] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  if (!sport || !entries || !day) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const today = toIsoDate(day);
  const me = profile?.persons[0]?.id ?? null;
  const week = weekStatus(sport, entries, today, me);
  const lastWeek = weekStatus(sport, entries, today, me, addDays(week.monday, -7));
  const myName = profile?.persons[0]?.name.trim() || "Ich";
  const list = trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse();
  const recent = [...new Set(list.map((t) => t.data.sport))];
  const used = [...new Set([...recent, "laufen", "fitness"])].slice(0, 6);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Sport" backHref="/" action={<PagePlus label="Training eintragen" onClick={() => setAdding(true)} />} />
      <main className={PAGE_MAIN}>
        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Diese Woche">
          <SportWeekRow dots={weekDots(sport, entries, today, me)} onDay={setOpenDay} big />
          <p className="text-base font-semibold" role="status">
            {statusLine(week, weekdayIndex(today), lastWeek.reached)}
          </p>
        </section>

        <section className="flex flex-col gap-2" aria-label="Zuletzt">
          <h2 className={`px-1 ${SECTION_TITLE}`}>Zuletzt</h2>
          {list.length ? (
            <ul className={CARD_LIST}>
              {list.slice(0, 40).map((t) => {
                const s = sportById(t.data.sport);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setMenu(t)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background">
                      <PersonAvatar name={myName} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base font-bold">{t.data.note && t.data.terminKey ? t.data.note : s.label}</span>
                        <span className="text-sm text-muted">
                          {t.data.date === today ? "Heute" : t.data.date === addDays(today, -1) ? "Gestern" : `${weekdayShort(t.data.date)} ${Number(t.data.date.slice(8))}.${Number(t.data.date.slice(5, 7))}.`} · {t.data.minutes} Min
                          {t.data.km ? ` · ${t.data.km} km` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-1 text-base text-muted">Das erste Training kommt bestimmt. Einfach „+“ oder sag {profile ? helperName(profile) : "mir"}: „War heute 5 km laufen“.</p>
          )}
        </section>

        <section className="flex flex-col gap-2" aria-label="Packlisten">
          <h2 className={`px-1 ${SECTION_TITLE}`}>Packlisten</h2>
          <ul className={CARD_LIST}>
            {used.map((id) => {
              const s = sportById(id);
              return (
                <li key={id}>
                  <button type="button" onClick={() => setPackFor(id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background" aria-label={`Packliste ${s.label} bearbeiten`}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-base font-bold">{s.label}</span>
                      <span className="truncate text-sm text-muted">{packFor(sport, id).join(", ")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2" aria-label="Wochenziel">
          <h2 className={`px-1 ${SECTION_TITLE}`}>Wie oft pro Woche?</h2>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Wochenziel">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={sport.goal === n}
                aria-label={`${n}× pro Woche`}
                onClick={() => {
                  setSportGoal(n);
                  buzz();
                }}
                className={`${chipClass(sport.goal === n)} min-w-11 justify-center`}
              >
                {n}×
              </button>
            ))}
          </div>
        </section>
      </main>

      {adding && (
        <SportAddSheet
          today={today}
          recent={recent}
          onClose={() => setAdding(false)}
          onSave={(data) => {
            addTraining(data);
            buzz();
            setAdding(false);
          }}
        />
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
      {menu && (
        <Sheet title={sportById(menu.data.sport).label} onClose={() => setMenu(null)}>
          <div className="flex flex-col gap-2 pb-3">
            <button type="button" onClick={() => (setEditing(menu), setMenu(null))} className={buttonClass("secondary", "lg")}>
              Ändern
            </button>
            <button
              type="button"
              onClick={() => {
                showDeleted(removeTraining(menu));
                setMenu(null);
              }}
              className={buttonClass("danger", "lg")}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden /> Löschen
            </button>
          </div>
        </Sheet>
      )}
      {openDay && <SportDaySheet date={openDay} today={today} state={sport} entries={entries} me={me} forecast={forecast} onClose={() => setOpenDay(null)} />}
      {pack && <PackSheet sport={pack} items={packFor(sport, pack)} onClose={() => setPackFor(null)} />}
    </div>
  );
}

function PackSheet({ sport, items, onClose }: { sport: string; items: string[]; onClose: () => void }) {
  const [text, setText] = useState(items.join(", "));
  return (
    <Sheet title={`Packliste ${sportById(sport).label}`} onClose={onClose}>
      <form
        className="flex flex-col gap-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPack(sport, text.split(/[,\n]/));
          buzz();
          onClose();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Was kommt mit? (mit Komma getrennt)</span>
          <input value={text} onChange={(e) => setText(e.target.value)} className={INPUT} aria-label="Packliste" />
        </label>
        <button type="submit" className={buttonClass("primary", "lg")}>
          Speichern
        </button>
      </form>
    </Sheet>
  );
}
