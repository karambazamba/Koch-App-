"use client";

// /sport: Wochenziel (1–7× pro Woche), Verlauf (4 Wochen + Monat), die
// Trainings (antippen = ändern oder löschen) und die Packlisten je Sportart.
// Erfolge zeigen, Versäumnisse nicht.

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/plan/Sheet";
import { CARD, CARD_LIST, INPUT, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { useEntries } from "@/lib/aufgaben/store";
import { weekdayIndex, weekdayShort } from "@/lib/aufgaben/model";
import { addDays, useToday, toIsoDate } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import { addTraining, removeTraining, setPack, setSportGoal, updateTraining } from "@/lib/sport/actions";
import { hoursLabel, monthName, monthStats, packFor, sportById, statusLine, trainingsBetween, useSport, weekStatus, weekStreak, weeksHistory, type Training } from "@/lib/sport";
import { buzz } from "@/components/alltag/actions";
import { SportAddSheet } from "./SportAddSheet";

export function SportView() {
  const sport = useSport();
  const entries = useEntries();
  const profile = useProfile();
  const day = useToday();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [menu, setMenu] = useState<Training | null>(null);
  const [pack, setPackFor] = useState<string | null>(null);
  if (!sport || !entries || !day) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const today = toIsoDate(day);
  const me = profile?.persons[0]?.id ?? null;
  const week = weekStatus(sport, entries, today, me);
  const lastWeek = weekStatus(sport, entries, today, me, addDays(week.monday, -7));
  const streak = weekStreak(sport, entries, today, me);
  const history = weeksHistory(sport, entries, today, me);
  const month = monthStats(sport, entries, today, me);
  const list = trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse();
  const recent = [...new Set(list.map((t) => t.data.sport))];
  const maxBar = Math.max(week.goal, ...history.map((h) => h.count), 1);
  const used = [...new Set([...recent, "laufen", "fitness"])].slice(0, 6);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Sport" backHref="/" />
      <main className={PAGE_MAIN}>
        <section className="flex flex-col gap-2 rounded-card border border-sport-line bg-linear-to-br from-sport-soft to-sport-2 p-4" aria-label="Diese Woche">
          <span className="text-xs font-bold uppercase tracking-wider text-sport-ink">Diese Woche</span>
          <span className="text-3xl font-extrabold tabular-nums">
            {week.count} / {week.goal}
          </span>
          <p className="text-base font-semibold" role="status">
            {statusLine(week, weekdayIndex(today), lastWeek.reached)}
          </p>
          <button type="button" onClick={() => setAdding(true)} className={`${buttonClass("primary", "md")} self-start`}>
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Training eintragen
          </button>
        </section>

        <section className="flex flex-col gap-2" aria-label="Wochenziel">
          <h2 className="px-1 text-lg font-bold">Wie oft pro Woche?</h2>
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

        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Verlauf">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Verlauf</h2>
          <div className="flex h-24 items-end gap-3">
            {history.map((h) => (
              <div key={h.monday} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold tabular-nums">{h.count}</span>
                <span className={`w-full rounded-t-lg ${h.current ? "bg-sport" : "bg-sport/35"}`} style={{ height: `${Math.max(4, (h.count / maxBar) * 56)}px` }} />
                <span className="text-xs text-muted">KW {h.kw}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold">
            {monthName(today)}: {month.count} {month.count === 1 ? "Einheit" : "Einheiten"} · {hoursLabel(month.minutes)}
            {month.km ? ` · ${month.km} km` : ""}
            {streak >= 2 ? ` · 🔥 ${streak} Wochen in Folge` : ""}
          </p>
        </section>

        <section className="flex flex-col gap-2" aria-label="Trainings">
          <h2 className="px-1 text-lg font-bold">Trainings</h2>
          {list.length ? (
            <ul className={CARD_LIST}>
              {list.slice(0, 40).map((t) => {
                const s = sportById(t.data.sport);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setMenu(t)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-stone-50">
                      <span className="text-xl" aria-hidden>
                        {s.emoji}
                      </span>
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
            <p className="px-1 text-base text-muted">Noch kein Training eingetragen – das erste kommt bestimmt. Einfach „+“ oder sag {profile ? helperName(profile) : "mir"}: „War heute 5 km laufen“.</p>
          )}
        </section>

        <section className="flex flex-col gap-2" aria-label="Packlisten">
          <h2 className="px-1 text-lg font-bold">Packlisten</h2>
          <ul className={CARD_LIST}>
            {used.map((id) => {
              const s = sportById(id);
              return (
                <li key={id}>
                  <button type="button" onClick={() => setPackFor(id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-stone-50" aria-label={`Packliste ${s.label} bearbeiten`}>
                    <span className="text-xl" aria-hidden>
                      {s.emoji}
                    </span>
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
