"use client";

// Seite /tipps: großer Titel „Tipps“, Ort + Umkreis („Eutin + 20 km · Ändern“),
// Heute | Wochenende | Diese Woche, Filter-Chips und darunter nach Tag
// gruppiert; gemerkte Tipps (ab heute) stehen oben unter „Gemerkt“. Unten
// klein die Datenquelle. ?tipp=<id> öffnet einen Tipp direkt
// (z. B. aus der Jetzt-Karte). Keine Zähler, keine roten Markierungen.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { toIsoDate, todayIso, useToday } from "@/lib/core/now";
import { TIP_CHIPS, type TipFilter } from "@/lib/tipps/categories";
import { groupByDay, inRange, matchesFilters, rangeFor, rememberedTips, type TipRange, type TipView } from "@/lib/tipps/model";
import { changeTipSettings, forgetTips, useTipPlace, useTipSettings, useTipsMode, useTipsWindow } from "@/lib/tipps/client";
import { TipRow, dayTitle } from "./TipBits";
import { TipSheet } from "./TipSheet";

const RANGES: { value: TipRange; label: string }[] = [
  { value: "heute", label: "Heute" },
  { value: "wochenende", label: "Wochenende" },
  { value: "woche", label: "Diese Woche" },
];

export function TipsView() {
  const params = useSearchParams();
  const day = useToday();
  const today = day ? toIsoDate(day) : todayIso();
  const mode = useTipsMode();
  const settings = useTipSettings();
  const place = useTipPlace();
  const data = useTipsWindow(today, mode !== undefined && mode !== "off");
  const [range, setRange] = useState<TipRange>((params.get("zeit") as TipRange) || "wochenende");
  const [filters, setFilters] = useState<TipFilter[]>([]);
  const [openId, setOpenId] = useState<string | null>(params.get("tipp"));
  const { von, bis } = rangeFor(range, today);
  const shown = (data?.tips ?? []).filter((t) => inRange(t, von, bis) && matchesFilters(t, filters));
  const open = data?.tips.find((t) => t.id === openId) ?? null;
  const remembered = rememberedTips(data?.tips ?? [], settings.gemerkt, today);
  const toggle = (f: TipFilter) => setFilters((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));
  const wider = () => {
    const next = settings.km < 40 ? (settings.km === 5 ? 10 : settings.km === 10 ? 20 : 40) : 40;
    changeTipSettings((s) => ({ ...s, km: next }));
    forgetTips();
  };

  if (mode === "off")
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Tipps" />
        <main className={PAGE_MAIN}>
          <p className="text-base text-muted">Tipps aus der Region gibt es hier noch nicht.</p>
        </main>
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Tipps" />
      <main className={`${PAGE_MAIN} gap-4`}>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-tipp-soft px-3 py-1.5 text-sm font-bold text-tipp" data-testid="tipp-ort">
            {data?.ort ?? place} + {settings.km} km
          </span>
          <Link href="/profil/regiontipps" className="hit text-sm font-semibold text-accent-strong">
            Ändern
          </Link>
        </div>
        {remembered.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Gemerkt">
            <h2 className={`${SECTION_TITLE} flex items-center gap-1.5 px-1`}>
              <Bookmark className="h-4 w-4 text-tipp" strokeWidth={2.25} aria-hidden />
              Gemerkt
            </h2>
            <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`}>
              {remembered.map((t) => (
                <li key={t.id}>
                  <TipRow tip={t} onOpen={() => setOpenId(t.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <Segmented value={range} options={RANGES} onChange={setRange} label="Zeitraum" />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" data-no-swipe role="group" aria-label="Filter">
          {TIP_CHIPS.map((c) => (
            <button key={c.id} type="button" aria-pressed={filters.includes(c.id)} onClick={() => toggle(c.id)} className={`${chipClass(filters.includes(c.id))} shrink-0`}>
              {c.label}
            </button>
          ))}
        </div>

        {data === undefined ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : shown.length === 0 ? (
          <section className={`${CARD} flex flex-col items-start gap-3 p-4`} aria-label="Keine Tipps">
            <p className="text-base">Gerade nichts in eurer Nähe. Größeren Umkreis wählen?</p>
            {settings.km < 40 && (
              <button type="button" onClick={wider} className={buttonClass("secondary", "sm")}>
                Umkreis vergrößern
              </button>
            )}
          </section>
        ) : (
          groupByDay(shown).map((g) => (
            <section key={g.date} className="flex flex-col gap-2" aria-label={dayTitle(g.date)}>
              <h2 className={`${SECTION_TITLE} px-1`}>{dayTitle(g.date)}</h2>
              <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`}>
                {g.tips.map((t: TipView) => (
                  <li key={t.id}>
                    <TipRow tip={t} onOpen={() => setOpenId(t.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="px-1 text-center text-xs text-muted" data-testid="tipp-daten">
          {data?.mode === "demo" ? "Beispieldaten (Testbetrieb) · später: Tourismus-Agentur Schleswig-Holstein" : "Daten: Tourismus-Agentur Schleswig-Holstein · Veranstaltungskalender der Region"}
        </p>
      </main>
      {open && <TipSheet tip={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
