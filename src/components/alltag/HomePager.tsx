"use client";

// Startseite mit drei Seiten: Kalender · Heute · Essen (Heute in der Mitte).
// Wechsel per Tipp auf die Leiste oben oder seitlichem Wischen; hoch/runter
// scrollt normal. Die Seite steht in der Adresse, ohne neuen
// Verlaufseintrag (?seite=kalender, alt ?seite=woche). Unten immer dieselbe Mia-Leiste.

import { wakeAvatar } from "@/lib/core/avatarState";
import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mic, Settings } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { CARD } from "@/components/ui/styles";
import { useEntries } from "@/lib/aufgaben/store";
import { useMinutes } from "@/lib/core/now";
import { expectReplace } from "@/lib/core/navigation";
import { helperName } from "@/lib/einstellungen/profile";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
import { TodayPage } from "./TodayPage";
import { CalendarPage } from "@/components/kalender/CalendarPage";
import { FoodPage } from "./FoodPage";
import { PreviewBanner } from "./PreviewBanner";
import { clockMinutes, usePreview } from "@/lib/tagesablauf/settings";

type HomeTab = "kalender" | "heute" | "essen";
const TABS: { value: HomeTab; label: string }[] = [
  { value: "kalender", label: "Kalender" },
  { value: "heute", label: "Heute" },
  { value: "essen", label: "Essen" },
];

// "woche" = alter Name des Kalenders (Links und Lesezeichen bleiben gültig)
const tabFrom = (v: string | null): HomeTab => (v === "kalender" || v === "woche" ? "kalender" : v === "essen" ? "essen" : "heute");

/** Wischen nur auf freier Fläche bzw. nicht in Eingabefeldern und markierten Bereichen */
const ignoreSwipe = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest("input, textarea, select, [data-no-swipe], [role=dialog]"));

export function HomePager({ data }: { data: HomeData }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFrom(params.get("seite"));
  const entries = useEntries();
  const realMinutes = useMinutes();
  // Zeit-Vorschau ("So tun, als wäre es …") wirkt nur hier auf der Startseite – Daten bleiben
  const preview = usePreview();
  const minutes = preview && realMinutes !== undefined ? clockMinutes(preview.clock) : realMinutes;
  const [direction, setDirection] = useState<1 | -1>(1);
  const scrolls = useRef<Partial<Record<HomeTab, number>>>({});
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const pendingScroll = useRef<number | null>(null);

  const go = (next: HomeTab) => {
    if (next === tab) return;
    scrolls.current[tab] = window.scrollY;
    setDirection(TABS.findIndex((t) => t.value === next) > TABS.findIndex((t) => t.value === tab) ? 1 : -1);
    pendingScroll.current = scrolls.current[next] ?? 0;
    expectReplace();
    router.replace(next === "heute" ? pathname : `${pathname}?seite=${next}`, { scroll: false });
  };

  // Nach dem Wechsel: Scrollhöhe der Seite wiederherstellen (sonst oben)
  useEffect(() => {
    if (pendingScroll.current === null) return;
    window.scrollTo(0, pendingScroll.current);
    pendingScroll.current = null;
  }, [tab]);

  const onTouchStart = (e: TouchEvent) => {
    touch.current = ignoreSwipe(e.target) || e.touches.length > 1 ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || e.timeStamp - start.t > 800) return;
    const index = TABS.findIndex((t) => t.value === tab);
    const next = TABS[index + (dx < 0 ? 1 : -1)];
    if (next) go(next.value);
  };

  const ready = entries !== undefined && minutes !== undefined;
  return (
    <>
      <main
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-x-hidden px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+6.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <nav className="flex items-center gap-2" aria-label="Seiten">
          <div role="tablist" aria-label="Kalender, Heute, Essen" className="flex flex-1 rounded-card bg-segment p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => go(t.value)}
                className={`hit h-10 flex-1 rounded-field text-[15px] font-bold transition ${tab === t.value ? "bg-surface text-ink shadow-card" : "text-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link href="/profil" aria-label="Einstellungen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-fill">
            <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
          </Link>
        </nav>
        <PreviewBanner />
        <div key={tab} role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.label} className="motion-page" style={{ animation: `${direction > 0 ? "page-from-right" : "page-from-left"} 0.22s ease-out` }}>
          {!ready ? (
            <div className={`${CARD} h-48 animate-pulse`} />
          ) : tab === "heute" ? (
            <TodayPage data={data} entries={entries} minutes={minutes} realMinutes={realMinutes} onOpenFood={() => go("essen")} />
          ) : tab === "kalender" ? (
            <CalendarPage today={data.todayIso} entries={entries} name={helperName(data.profile)} />
          ) : (
            <FoodPage data={data} minutes={minutes} />
          )}
        </div>
      </main>
      <LotteBar name={helperName(data.profile)} />
    </>
  );
}

/** Lotte-Leiste unten: hell und schwebend, Avatar links, oranges Mikrofon rechts */
export function LotteBar({ name, bottom }: { name: string; bottom?: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-background via-background/90 to-transparent px-4 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={bottom ? { bottom } : undefined}
      data-lotte-leiste
    >
      <div className="pointer-events-auto mx-auto flex h-14 max-w-lg items-center gap-2.5 rounded-[28px] border border-line bg-surface pl-2 pr-1.5 shadow-bar">
        <button type="button" onClick={() => (wakeAvatar(), openHelper())} aria-label={`Sag ${name}, was ansteht … (${name} öffnen)`} className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left">
          <LotteAvatar size={40} groesse="klein" />
          <span className="truncate text-[15px] text-muted">Sag {name}, was ansteht …</span>
        </button>
        <button
          type="button"
          onClick={() => (wakeAvatar(), openHelper("voice"))}
          aria-label={`${name} etwas sagen`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition active:scale-95"
        >
          <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
