"use client";

// Essen – die nächsten 7 Tage (Tafel 97): immer ab heute, über die
// Wochengrenze. Kleiner Umschalter rechts neben der Überschrift (Liste |
// Reihe, gemerkt), „Woche planen“ (Mia füllt freie Tage, Vorschau mit
// „Übernehmen“), „···“ für feste Gerichte und Vorlagen. Liste: halten
// (~300 ms) und auf einen anderen Tag ziehen = tauschen bzw. verschieben,
// „Getauscht · Rückgängig“. Jeder Tag öffnet dasselbe Fenster (`TagFenster`).
// Vergangenes fällt raus → „Zuletzt gegessen ›“.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleDot, GripVertical, List, Plus, Sparkles } from "lucide-react";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, CARD_LIST, SECTION_TITLE } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { TagFenster } from "@/components/essen/sieben/TagFenster";
import { dishOf } from "@/components/essen/useMeals";
import { buzz } from "@/components/heute/actions";
import type { HomeData } from "@/components/heute/useHomeData";
import { openHelper } from "@/lib/begleitung/open";
import { useFeature } from "@/lib/core/features";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { mealClockFor } from "@/lib/einstellungen/profile";
import { dishTone } from "@/lib/essen/dishLook";
import { useCookedDays } from "@/lib/essen/mealDone";
import { loadMealPlans, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { setEssenAnsicht, useEssenAnsicht } from "@/lib/essen/sieben/ansicht";
import { tagLabel, verschiebe, verschiebeText, zuletztGegessen } from "@/lib/essen/sieben";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort } from "@/lib/kalender/model";

const HALTEN_MS = 300;

export function SiebenTage({ data, tage }: { data: HomeData; tage: PlanDay[] }) {
  const ansicht = useEssenAnsicht();
  const router = useRouter();
  const planOn = useFeature("wochenplan");
  const [offen, setOffen] = useState<PlanDay | null>(null);
  const [zuletzt, setZuletzt] = useState(false);
  const cooked = useCookedDays();
  const gegessen = cooked ? zuletztGegessen(cooked, data.todayIso) : [];

  return (
    <section className="flex flex-col gap-2" aria-label="Die nächsten 7 Tage" id="woche" data-wochenkarte>
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className={`${SECTION_TITLE} flex-1 whitespace-nowrap`}>Die nächsten 7 Tage</h2>
        <div className="flex rounded-full bg-segment p-0.5" role="radiogroup" aria-label="Ansicht">
          {(
            [
              ["liste", List, "Liste"],
              ["reihe", CircleDot, "Reihe"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={ansicht === value}
              aria-label={label}
              onClick={() => setEssenAnsicht(value)}
              className={`hit flex h-8 w-9 items-center justify-center rounded-full ${ansicht === value ? "bg-surface text-ink shadow-card" : "text-muted"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => openHelper(undefined, "Plan mir die freien Tage der nächsten 7 Tage.")} className="hit flex h-8 items-center gap-1 rounded-full bg-accent-soft px-3 text-[13px] font-bold text-accent-strong">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Woche planen
        </button>
        {planOn && <MoreMenu title="Essen planen" items={[{ label: "Feste Gerichte und Vorlagen", icon: List, onClick: () => router.push("/wochenplan") }]} />}
      </div>

      {ansicht === "reihe" ? <Reihe data={data} tage={tage} onOpen={setOffen} /> : <Liste data={data} tage={tage} onOpen={setOffen} />}

      {gegessen.length > 0 && (
        <button type="button" onClick={() => setZuletzt(true)} className="flex h-11 items-center gap-0.5 self-start px-1 text-[15px] font-bold text-accent-strong">
          Zuletzt gegessen <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      )}

      {offen && <TagFenster data={data} day={offen} tage={tage} onClose={() => setOffen(null)} />}
      {zuletzt && (
        <Sheet title="Zuletzt gegessen" onClose={() => setZuletzt(false)}>
          <ul className={`${CARD_LIST} mb-3`}>
            {gegessen.map((g) => (
              <li key={g.date} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <DishPicture title={g.title} tone={dishTone(g.title)} alt="" small className="h-10 w-10 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{g.title}</span>
                <span className="text-sm text-muted">{tagLabel(g.date, data.todayIso, weekdayShort)}</span>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </section>
  );
}

/** Reihe: 7 runde Bilder mit Wochentag, heute orange umrandet */
function Reihe({ data, tage, onOpen }: { data: HomeData; tage: PlanDay[]; onOpen: (d: PlanDay) => void }) {
  return (
    <ol className={`${CARD} grid grid-cols-7 gap-1 p-2`}>
      {tage.map((day) => {
        const dish = dishOf(day);
        const heute = day.date === data.todayIso;
        return (
          <li key={day.date}>
            <button type="button" onClick={() => onOpen(day)} aria-label={`${weekdayShort(day.date)}: ${dish ?? (day.away ? "kein Kochtag" : "noch frei")}`} className="flex w-full flex-col items-center gap-1 rounded-field py-1.5" aria-current={heute ? "date" : undefined} data-tag={day.date}>
              <span className={`text-[12px] font-bold ${heute ? "text-accent-strong" : "text-muted"}`}>{weekdayShort(day.date)}</span>
              <Rund day={day} heute={heute} size="h-10 w-10" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Rund({ day, heute, size }: { day: PlanDay; heute: boolean; size: string }) {
  const dish = dishOf(day);
  if (dish) return <DishPicture title={dish} category={day.slot.entry?.category} tone={dishTone(dish, day.slot.entry?.category)} alt="" small className={`${size} shrink-0 rounded-full ${heute ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`} />;
  if (day.away) return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-fill text-[11px] text-muted`}>–</span>;
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full border-2 border-dashed text-faint ${heute ? "border-accent" : "border-line-strong"}`}>
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </span>
  );
}

/** Liste: Bild 52 px, „Heute · Di 27.“, Name, Zeit/Anlass, Griff; halten und ziehen = tauschen/verschieben */
function Liste({ data, tage, onOpen }: { data: HomeData; tage: PlanDay[]; onOpen: (d: PlanDay) => void }) {
  const gezogen = useHintSeen("essen-ziehen");
  const [zug, setZug] = useState<{ von: string; ueber: string | null; y: number } | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; date: string; startY: number; aktiv: boolean } | null>(null);
  const rows = useRef<Map<string, HTMLLIElement>>(new Map());
  const liste = useRef<HTMLOListElement>(null);
  // Während des Ziehens scrollt die Seite nicht mit (iPhone: nur ein nicht-passives touchmove hält sie fest)
  useEffect(() => {
    const el = liste.current;
    if (!el) return;
    const halt = (e: TouchEvent) => {
      if (press.current?.aktiv) e.preventDefault();
    };
    el.addEventListener("touchmove", halt, { passive: false });
    return () => el.removeEventListener("touchmove", halt);
  }, []);
  const shoppingDay = data.profile.shoppingDay || "Montag";

  const tagUnter = (y: number) => {
    for (const [date, el] of rows.current) {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) return date;
    }
    return null;
  };
  const ablegen = (von: string, nach: string | null) => {
    const a = tage.find((t) => t.date === von);
    const b = tage.find((t) => t.date === nach);
    if (!a || !b || a.date === b.date) return;
    const before = loadMealPlans();
    const next = verschiebe(before, a, b, shoppingDay);
    if (!next) return;
    replaceMealPlans(next);
    buzz();
    markHintSeen("essen-ziehen");
    const text = verschiebeText(b);
    showToast({ text, undo: pushUndo(text, () => replaceMealPlans(before)), undoneText: "Wieder wie vorher", seconds: 4, small: true });
  };

  return (
    <>
      <ol ref={liste} className={`${CARD_LIST} select-none`} data-no-swipe={zug ? true : undefined} data-sieben-liste>
        {tage.map((day) => {
          const dish = dishOf(day);
          const heute = day.date === data.todayIso;
          const clock = clockLabel(mealClockFor(data.profile, day.weekday));
          const minuten = day.slot.entry?.recipeId ? data.recipes[day.slot.entry.recipeId]?.prepMinutes : null;
          const zeile2 = dish ? [clock, minuten ? `${minuten} Min` : null].filter(Boolean).join(" · ") : day.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei";
          const istQuelle = zug?.von === day.date;
          const istZiel = zug && zug.ueber === day.date && !istQuelle;
          return (
            <li
              key={day.date}
              ref={(el) => {
                if (el) rows.current.set(day.date, el);
                else rows.current.delete(day.date);
              }}
              className={`relative transition-colors ${istZiel ? "bg-accent-soft" : ""} ${istQuelle ? "opacity-60" : ""}`}
              data-tag={day.date}
            >
              <button
                type="button"
                onClick={() => !zug && onOpen(day)}
                onPointerDown={(e) => {
                  if (!dish) return;
                  const startY = e.clientY;
                  const timer = setTimeout(() => {
                    if (!press.current) return;
                    press.current.aktiv = true;
                    buzz();
                    setZug({ von: day.date, ueber: day.date, y: startY });
                  }, HALTEN_MS);
                  press.current = { timer, date: day.date, startY, aktiv: false };
                }}
                onPointerMove={(e) => {
                  const p = press.current;
                  if (!p) return;
                  if (!p.aktiv) {
                    if (Math.abs(e.clientY - p.startY) > 8) {
                      clearTimeout(p.timer);
                      press.current = null;
                    }
                    return;
                  }
                  setZug({ von: p.date, ueber: tagUnter(e.clientY), y: e.clientY });
                }}
                onPointerUp={() => {
                  const p = press.current;
                  press.current = null;
                  if (!p) return;
                  clearTimeout(p.timer);
                  if (p.aktiv && zug) ablegen(zug.von, zug.ueber);
                  setTimeout(() => setZug(null), 0);
                }}
                onPointerCancel={() => {
                  if (press.current) clearTimeout(press.current.timer);
                  press.current = null;
                  setZug(null);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex min-h-[68px] w-full items-center gap-3 px-3 py-2 text-left [-webkit-touch-callout:none] ${zug ? "touch-none" : ""}`}
                aria-label={`${tagLabel(day.date, data.todayIso, weekdayShort)}: ${dish ?? zeile2}`}
              >
                <Rund day={day} heute={heute} size="h-[52px] w-[52px]" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-bold ${heute ? "text-accent-strong" : "text-muted"}`}>{tagLabel(day.date, data.todayIso, weekdayShort)}</span>
                  <span className="block truncate text-[17px] font-bold">{dish ?? zeile2}</span>
                  {dish && zeile2 && <span className="block truncate text-[13px] text-muted">{zeile2}</span>}
                </span>
                {dish && <GripVertical className="h-5 w-5 shrink-0 text-faint" strokeWidth={2} aria-hidden data-griff />}
              </button>
            </li>
          );
        })}
      </ol>
      {gezogen === false && tage.some((t) => dishOf(t)) && <p className="px-1 text-[13px] text-muted">Halten &amp; ziehen, um Tage zu tauschen.</p>}
    </>
  );
}
