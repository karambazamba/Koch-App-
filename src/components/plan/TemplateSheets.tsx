"use client";

// Bottom-Sheets des Wochenplans für Vorlagen und den Rückblick: Woche als
// Vorlage speichern, Vorlage laden und "Nochmal kochen".

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, CARD_LIST, INPUT, buttonClass } from "@/components/ui/styles";
import type { PlanDay, PlanWeek } from "@/lib/essen/mealPlan";
import { deleteTemplate, type TemplateDish, type WeekTemplate } from "@/lib/essen/templates";

/** "Woche als Vorlage speichern": Name vergeben */
export function SaveTemplateSheet({
  count,
  onClose,
  onSave,
}: {
  count: number;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("Lieblingswoche");
  return (
    <Sheet title="Woche als Vorlage speichern" onClose={onClose}>
      <p className="text-sm text-muted">
        {count} {count === 1 ? "Gericht" : "Gerichte"} kommen in die Vorlage. Später für eine kommende Woche laden.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        aria-label="Name der Vorlage"
        className={INPUT}
      />
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => onSave(name)}
        className={`${buttonClass("primary", "lg")} w-full`}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Speichern
      </button>
    </Sheet>
  );
}

/**
 * "Vorlage laden": Vorlage wählen, einzelne Tage an-/abwählen; sind gewählte
 * Tage schon belegt, wird nachgefragt.
 */
export function LoadTemplateSheet({
  templates,
  week,
  onClose,
  onApply,
}: {
  templates: WeekTemplate[];
  week: PlanWeek;
  onClose: () => void;
  onApply: (template: WeekTemplate, weekdays: string[]) => void;
}) {
  const [template, setTemplate] = useState<WeekTemplate | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  if (!template) {
    return (
      <Sheet title="Vorlage laden" onClose={onClose}>
        {templates.length === 0 ? (
          <p className={`${CARD} p-4 text-muted`}>Noch keine Vorlage – speichert eine gelungene Woche als Vorlage.</p>
        ) : (
          <ul className={CARD_LIST}>
            {templates.map((t) => (
              <li key={t.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setTemplate(t);
                    // Alle Tage der Vorlage, die es in dieser Woche gibt (ohne Ausflug)
                    setSelected(week.days.filter((d) => !d.away && t.days[d.weekday]).map((d) => d.weekday));
                  }}
                  className="flex min-h-14 flex-1 flex-col px-4 py-2 text-left active:bg-background"
                >
                  <span className="font-bold">{t.name}</span>
                  <span className="text-sm text-muted">{Object.keys(t.days).length} Gerichte</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(t.id)}
                  aria-label={`Vorlage ${t.name} löschen`}
                  className="flex h-12 w-12 items-center justify-center text-faint"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    );
  }

  const occupied = week.days.filter((d) => selected.includes(d.weekday) && d.slot.entry);
  const apply = (weekdays: string[]) => onApply(template, weekdays);

  if (confirm) {
    return (
      <Sheet title="Schon belegt" onClose={onClose}>
        <p className="text-base">
          {occupied.map((d) => `${d.weekday} (${d.slot.entry!.title})`).join(", ")}{" "}
          {occupied.length === 1 ? "ist" : "sind"} schon belegt. Überschreiben?
        </p>
        <button type="button" onClick={() => apply(selected)} className={`${buttonClass("primary", "lg")} w-full`}>
          Ja, überschreiben
        </button>
        <button
          type="button"
          onClick={() => apply(selected.filter((w) => !occupied.some((d) => d.weekday === w)))}
          className={`${buttonClass("secondary", "lg")} w-full`}
        >
          Nur freie Tage
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={`„${template.name}“ laden`} onClose={onClose}>
      <p className="text-sm text-muted">Tage abwählen, die ihr anders wollt.</p>
      <ul className={CARD_LIST}>
        {week.days.map((d) => {
          const dish: TemplateDish | undefined = template.days[d.weekday];
          const on = selected.includes(d.weekday);
          return (
            <li key={d.weekday}>
              <label className={`flex min-h-14 items-center gap-3 px-4 py-2 ${!dish || d.away ? "opacity-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!dish || d.away}
                  onChange={() => setSelected((s) => (on ? s.filter((w) => w !== d.weekday) : [...s, d.weekday]))}
                  className="h-5 w-5 shrink-0 accent-accent"
                  aria-label={`${d.weekday} übernehmen`}
                />
                <span className="w-9 shrink-0 font-bold">{d.weekday.slice(0, 2)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{d.away ? "Ausflug" : (dish?.title ?? "–")}</span>
                  {dish && d.slot.entry && !d.away && (
                    <span className="block truncate text-xs text-muted">belegt: {d.slot.entry.title}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={() => (occupied.length > 0 ? setConfirm(true) : apply(selected))}
        className={`${buttonClass("primary", "lg")} w-full`}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        {selected.length} {selected.length === 1 ? "Tag" : "Tage"} übernehmen
      </button>
    </Sheet>
  );
}

/** "Nochmal kochen": Gericht aus dem Rückblick auf einen Tag dieser oder nächster Woche */
export function CookAgainSheet({
  title,
  weeks,
  todayIso,
  onClose,
  onPick,
}: {
  title: string;
  weeks: { label: string; week: PlanWeek }[];
  todayIso: string;
  onClose: () => void;
  onPick: (week: PlanWeek, day: PlanDay) => void;
}) {
  const [confirm, setConfirm] = useState<{ week: PlanWeek; day: PlanDay } | null>(null);
  if (confirm) {
    return (
      <Sheet title="Schon belegt" onClose={onClose}>
        <p className="text-base">
          Am {confirm.day.weekday} steht schon „{confirm.day.slot.entry!.title}“. Durch „{title}“ ersetzen?
        </p>
        <button type="button" onClick={() => onPick(confirm.week, confirm.day)} className={`${buttonClass("primary", "lg")} w-full`}>
          Ja, ersetzen
        </button>
        <button type="button" onClick={() => setConfirm(null)} className={`${buttonClass("secondary", "lg")} w-full`}>
          Anderen Tag wählen
        </button>
      </Sheet>
    );
  }
  return (
    <Sheet title={`„${title}“ nochmal kochen`} onClose={onClose}>
      {weeks.map(({ label, week }) => {
        const days = week.days.filter((d) => !d.away && d.date >= todayIso);
        if (days.length === 0) return null;
        return (
          <section key={week.weekStart} className="flex flex-col gap-2">
            <h3 className="px-1 text-[15px] font-extrabold text-muted">{label}</h3>
            <ul className={CARD_LIST}>
              {days.map((d) => (
                <li key={d.date}>
                  <button
                    type="button"
                    onClick={() => (d.slot.entry ? setConfirm({ week, day: d }) : onPick(week, d))}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-background"
                  >
                    <span className="whitespace-nowrap font-bold">{d.weekday}</span>
                    <span className="truncate text-sm text-muted">{d.slot.entry ? d.slot.entry.title : "frei"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Sheet>
  );
}
