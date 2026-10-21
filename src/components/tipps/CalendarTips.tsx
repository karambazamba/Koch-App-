"use client";

// Tipps im Kalender – eine eigene lila Ebene, nie als Termin: Chip „Tipps“
// neben dem Monat (an/aus), lila Ring-Punkt an Tagen mit Tipps und in der
// Tagesliste Tipps mit gestricheltem lila Streifen + „Übernehmen“ (höchstens
// 3, dann „+ weitere Tipps“ → /tipps). Übernommen = normaler Termin.

import Link from "next/link";
import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { useEntries } from "@/lib/aufgaben/store";
import { tipDate, type TipView } from "@/lib/tipps/model";
import { changeTipSettings, takeTip, takenIds, useTipSettings, useTipsOn, useTipsWindow } from "@/lib/tipps/client";
import { TipRow } from "./TipBits";
import { TipSheet } from "./TipSheet";

/** Tipps je Tag für den Kalender (leer, wenn aus) */
export function useCalendarTips(today: string): { available: boolean; shown: boolean; byDay: Map<string, TipView[]> } {
  const on = useTipsOn();
  const settings = useTipSettings();
  const entries = useEntries();
  const data = useTipsWindow(today, on);
  const byDay = new Map<string, TipView[]>();
  if (on && settings.kalender && data) {
    const taken = takenIds(settings, entries);
    for (const t of data.tips) {
      if (taken.has(t.id)) continue;
      const d = tipDate(t);
      byDay.set(d, [...(byDay.get(d) ?? []), t]);
    }
  }
  return { available: on, shown: on && settings.kalender, byDay };
}

/** Chip „Tipps“ oben neben dem Monat (lila, nur wenn Tipps eingeschaltet sind) */
export function TipsChip({ shown }: { shown: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={() => changeTipSettings((s) => ({ ...s, kalender: !s.kalender }))}
      className={`hit flex h-8 items-center gap-1 rounded-full border px-2.5 text-[13px] font-bold ${shown ? "border-tipp bg-tipp-soft text-tipp" : "border-line text-muted"}`}
    >
      <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      Tipps {shown ? "an" : "aus"}
    </button>
  );
}

/** Lila Ring-Punkt im Monat */
export const TipDot = () => <span className="h-1.5 w-1.5 rounded-full border-[1.5px] border-tipp" data-tipp-punkt />;

/** Tipps eines Tages in der Tagesliste */
export function TipsDayList({ tips }: { tips: TipView[] }) {
  const [open, setOpen] = useState<TipView | null>(null);
  const [done, setDone] = useState<string[]>([]);
  if (!tips.length) return null;
  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Tipps">
      <h3 className="px-4 pt-3 text-[13px] font-extrabold uppercase tracking-wide text-tipp">Tipps</h3>
      <ul className="flex flex-col">
        {tips.slice(0, 3).map((t) => (
          <li key={t.id} className="relative ml-3 border-l-[3px] border-dashed border-tipp" data-tipp-zeile>
            <TipRow
              tip={t}
              onOpen={() => setOpen(t)}
              action={
                done.includes(t.id) ? (
                  <Check className="h-5 w-5 shrink-0 text-good" strokeWidth={2.5} aria-label="Übernommen" />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      takeTip(t);
                      setDone((d) => [...d, t.id]);
                    }}
                    className="hit shrink-0 rounded-full bg-tipp-soft px-3 py-1.5 text-[13px] font-bold text-tipp"
                  >
                    Übernehmen
                  </button>
                )
              }
            />
          </li>
        ))}
      </ul>
      {tips.length > 3 && (
        <Link href="/tipps" className="block px-4 pb-3 pt-1 text-sm font-semibold text-tipp">
          + weitere Tipps
        </Link>
      )}
      {open && <TipSheet tip={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
