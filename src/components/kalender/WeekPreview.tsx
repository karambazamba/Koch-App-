"use client";

// „Deine Woche“ (Tafel 36, Bild 2/3): eine ruhige Zeile pro Sache (Punkt in
// Raumfarbe · Tag · Uhrzeit · Titel · Etikett nur bei Vorschlägen · Haken),
// Fragen als kleine Chip-Reihe darunter, Zeile antippen = kleine Karte zum
// Ändern (Tag, Uhrzeit, Dauer, Raum-Chips wie überall, Weglassen).

import { useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT, INPUT_INLINE, buttonClass, chipClass } from "@/components/ui/styles";
import { addDays } from "@/lib/core/now";
import { timeLabel } from "@/lib/kalender/sentence";
import { weekDayLabel, type WeekItem, type WeekRoom } from "@/lib/kalender/wochencheck";
import { ARBEIT, ICH, sichtRaum } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { raumZumSpeichern } from "@/lib/kalender/raum/wahl";
import { RaumChips } from "@/components/ui/RaumChips";

const DOT: Record<WeekRoom | "sport" | "aufgabe", string> = { familie: "bg-accent", ich: "bg-ich", arbeit: "bg-work", sport: "bg-good", aufgabe: "bg-line-strong" };
const dotOf = (i: WeekItem) => (i.art === "sport" ? DOT.sport : i.art === "aufgabe" ? DOT.aufgabe : DOT[i.raum]);

/** Kleine Legende über der Liste */
export function WeekLegend() {
  const items: [string, string][] = [
    [DOT.familie, "Familie"],
    [DOT.ich, ICH],
    [DOT.arbeit, ARBEIT],
    [DOT.sport, "Sport"],
    [DOT.aufgabe, "Aufgabe"],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-muted" aria-hidden>
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${c}`} />
          {l}
        </span>
      ))}
    </div>
  );
}

export function WeekRow({ item, today, on, onToggle, onOpen, onAnswer }: { item: WeekItem; today: string; on: boolean; onToggle: () => void; onOpen: () => void; onAnswer: (time: string | null) => void }) {
  return (
    <li className={item.already ? "opacity-50" : ""}>
      <div className="flex min-h-11 items-center gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left" aria-label={`${item.title} ändern`} disabled={item.already}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotOf(item)}`} aria-hidden />
          <span className="w-12 shrink-0 text-[13px] font-semibold text-muted">{weekDayLabel(item, today)}</span>
          <span className="w-10 shrink-0 text-[13px] tabular-nums text-muted">{item.time ? timeLabel(item.time) : ""}</span>
          <span className="truncate text-[15px] font-semibold">{item.title}</span>
          {item.suggestion && <span className="shrink-0 rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-bold text-good-ink">Vorschlag · {item.suggestion}</span>}
          {item.already && <span className="shrink-0 text-[12px] text-muted">schon drin</span>}
        </button>
        {!item.already && (
          <button type="button" role="checkbox" aria-checked={on} onClick={onToggle} aria-label={on ? `${item.title} nicht übernehmen` : `${item.title} übernehmen`} className={`hit flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
            {on && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
          </button>
        )}
      </div>
      {item.question && on && (
        <div className="mb-1 ml-[4.6rem] flex flex-wrap gap-1.5" role="group" aria-label={`${item.title}: Uhrzeit`}>
          {item.question.map((q) => (
            <button key={q} type="button" onClick={() => onAnswer(/^\d/.test(q) ? q : null)} className={`${chipClass(false)} min-h-9 px-3 text-[13px]`}>
              {/^\d/.test(q) ? timeLabel(q) : q}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** Kleine Karte zum Ändern einer Zeile */
export function WeekItemCard({ item, today, onSave, onDrop, onClose }: { item: WeekItem; today: string; onSave: (i: WeekItem) => void; onDrop: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(item);
  const haushalt = useHaushalt();
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  const set = (patch: Partial<WeekItem>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Sheet title="Ändern" onClose={onClose} layer="above">
      <div className="flex flex-col gap-3 pb-3">
        <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className={INPUT} aria-label="Titel" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tag">
          {days.map((d) => (
            <button key={d} type="button" onClick={() => set({ date: d, due: undefined })} className={chipClass(draft.date === d)} aria-pressed={draft.date === d}>
              {weekDayLabel({ ...draft, date: d, due: undefined }, today)}
            </button>
          ))}
        </div>
        {draft.art !== "aufgabe" && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Uhrzeit und Dauer">
            <input type="time" step={300} value={draft.time ?? ""} onChange={(e) => set({ time: e.target.value || undefined, question: e.target.value ? undefined : draft.question })} className={`${INPUT_INLINE} w-32`} aria-label="Uhrzeit" />
            {[30, 60, 90, 120].map((m) => (
              <button key={m} type="button" onClick={() => set({ minutes: m })} className={chipClass((draft.minutes ?? 60) === m)} aria-pressed={(draft.minutes ?? 60) === m}>
                {m < 60 ? `${m} Min` : `${m / 60} Std`}
              </button>
            ))}
          </div>
        )}
        <RaumChips value={sichtRaum(draft.raum, haushalt)} haushalt={haushalt} onChange={(r) => set({ raum: raumZumSpeichern(r, { art: draft.art === "aufgabe" ? "aufgabe" : "termin", vorher: item.raum, vorschlag: item.raum, haushalt }) })} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDrop} className={buttonClass("ghost", "md")}>
            Weglassen
          </button>
          <button type="button" onClick={() => onSave(draft)} className={buttonClass("primary", "md")}>
            Fertig
          </button>
        </div>
      </div>
    </Sheet>
  );
}
