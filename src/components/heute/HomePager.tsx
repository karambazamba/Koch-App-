"use client";

// Startseite mit drei Seiten: Kalender · Heute · Essen (Heute in der Mitte).
// Wechsel per Tipp auf die Leiste oben oder seitlichem Wischen – die Seiten
// liegen nebeneinander und folgen dem Finger (`usePagerSwipe`), der Schalter
// oben gleitet mit. Hoch/runter scrollt normal, Scrollhöhe je Seite bleibt.
// Verlauf: von Heute zu Kalender/Essen EIN Eintrag, zwischen Kalender und
// Essen nur ersetzen – Zurück (Pfeil, Safari-Geste, Android) führt immer zu
// Heute. (?seite=kalender, alt ?seite=woche.) Unten immer dieselbe Mia-Leiste.

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { House, Settings } from "lucide-react";
import { MiaButton } from "@/components/begleitung/MiaButton";
import { CARD, FAB_CLEARANCE } from "@/components/ui/styles";
import { useCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { useMinutes } from "@/lib/core/now";
import { expectReplace, expectTabSwitch, previousUrl } from "@/lib/core/navigation";
import { helperName } from "@/lib/einstellungen/profile";
import type { HomeData } from "@/components/heute/useHomeData";
import { TodayPage } from "@/components/heute/TodayPage";
import { CalendarPage } from "@/components/kalender/CalendarPage";
import { FoodPage } from "@/components/essen/FoodPage";
import { PreviewBanner } from "@/components/heute/PreviewBanner";
import { PAGER_MS, slideTo, usePagerSwipe } from "@/components/heute/usePagerSwipe";
import { clockMinutes, usePreview } from "@/lib/heute/tagesablauf";

type HomeTab = "kalender" | "heute" | "essen";
const TABS: { value: HomeTab; label: string }[] = [
  { value: "kalender", label: "Kalender" },
  { value: "heute", label: "Heute" },
  { value: "essen", label: "Essen" },
];
const indexOf = (t: HomeTab) => TABS.findIndex((x) => x.value === t);

// "woche" = alter Name des Kalenders (Links und Lesezeichen bleiben gültig)
const tabFrom = (v: string | null): HomeTab => (v === "kalender" || v === "woche" ? "kalender" : v === "essen" ? "essen" : "heute");

/** Nachbarseite so legen, als wäre sie auf ihrer gemerkten Höhe gescrollt */
const placeAt = (el: HTMLElement, top: number) => {
  el.style.top = `${top}px`;
};

export function HomePager({ data }: { data: HomeData }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlTab = tabFrom(params.get("seite"));
  const [tab, setTab] = useState<HomeTab>(urlTab);
  const tabRef = useRef(tab);
  const entries = useCalendarEntries();
  const realMinutes = useMinutes();
  // Zeit-Vorschau ("So tun, als wäre es …") wirkt nur hier auf der Startseite – Daten bleiben
  const preview = usePreview();
  const minutes = preview && realMinutes !== undefined ? clockMinutes(preview.clock) : realMinutes;
  const scrolls = useRef<Partial<Record<HomeTab, number>>>({});
  const mainRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Partial<Record<HomeTab, HTMLDivElement | null>>>({});
  const thumbRef = useRef<HTMLSpanElement>(null);
  // Nachbarseiten erst kurz nach dem Start (oder beim ersten Anfassen) rendern – danach bleiben sie
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setWarm(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Adresse geändert (Zurück-Geste, Link) → Seite folgt
  useEffect(() => {
    if (urlTab === tabRef.current) return;
    scrolls.current[tabRef.current] = window.scrollY;
    tabRef.current = urlTab;
    setTab(urlTab);
  }, [urlTab]);

  // Scrollhöhe je Seite merken
  useEffect(() => {
    const onScroll = () => {
      scrolls.current[tabRef.current] = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Nach dem Wechsel: alles auf Ruhelage, Scrollhöhe der Seite zurück (vor dem Zeichnen)
  useLayoutEffect(() => {
    for (const el of Object.values(panelRefs.current)) {
      if (!el) continue;
      el.style.transition = "none";
      el.style.transform = "";
      el.style.visibility = "";
      el.style.top = "";
    }
    if (thumbRef.current) {
      thumbRef.current.style.transition = "none";
      thumbRef.current.style.transform = `translateX(${indexOf(tab) * 100}%)`;
    }
    window.scrollTo(0, scrolls.current[tab] ?? 0);
  }, [tab]);

  /** Verlauf: Heute → Kalender/Essen = ein Eintrag; dazwischen ersetzen; zu Heute = zurück */
  const navigate = (from: HomeTab, next: HomeTab) => {
    const url = next === "heute" ? pathname : `${pathname}?seite=${next}`;
    expectTabSwitch();
    if (next === "heute" && from !== "heute" && previousUrl() === pathname) return router.back();
    if (from === "heute") return router.push(url, { scroll: false });
    expectReplace();
    router.replace(url, { scroll: false });
  };

  const commit = (next: HomeTab) => {
    const from = tabRef.current;
    if (next === from) return;
    scrolls.current[from] = window.scrollY;
    tabRef.current = next;
    setTab(next);
    navigate(from, next);
  };

  const neighbor = (step: -1 | 1) => TABS[indexOf(tabRef.current) + step]?.value ?? null;
  const handles = {
    panels: () => {
      const p = neighbor(-1);
      const n = neighbor(1);
      return { current: panelRefs.current[tabRef.current] ?? null, prev: p ? (panelRefs.current[p] ?? null) : null, next: n ? (panelRefs.current[n] ?? null) : null };
    },
    prepare: () => {
      const current = panelRefs.current[tabRef.current];
      if (!current) return;
      const top = current.getBoundingClientRect().top;
      for (const step of [-1, 1] as const) {
        const t = neighbor(step);
        const el = t ? panelRefs.current[t] : null;
        if (t && el) placeAt(el, top + window.scrollY - (scrolls.current[t] ?? 0));
      }
    },
    progress: (share: number, animate: boolean) => {
      const thumb = thumbRef.current;
      if (!thumb) return;
      thumb.style.transition = animate ? `transform ${PAGER_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : "none";
      thumb.style.transform = `translateX(${(indexOf(tabRef.current) + Math.max(-1, Math.min(1, share))) * 100}%)`;
    },
    commit: (step: -1 | 1) => {
      const t = neighbor(step);
      if (t) commit(t);
    },
    warm: () => setWarm(true),
  };
  usePagerSwipe(mainRef, handles, true);

  const go = (next: HomeTab) => {
    const step = indexOf(next) - indexOf(tabRef.current);
    if (!step) return;
    if (Math.abs(step) === 1 && warm) slideTo(handles, step as -1 | 1);
    else commit(next);
  };

  // Auf Kalender und Essen bleibt die Leiste oben; beim Runterscrollen schmal mit Weichzeichner (Tafel 73)
  const away = tab !== "heute";
  const [slim, setSlim] = useState(false);
  useEffect(() => {
    if (!away) return;
    const onScroll = () => setSlim(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [away]);
  const compact = away && slim;

  const ready = entries !== undefined && minutes !== undefined;
  const content = (t: HomeTab) => {
    if (!ready) return t === tab ? <div className={`${CARD} h-48 animate-pulse`} /> : null;
    if (t === "heute") return <TodayPage data={data} entries={entries} minutes={minutes} realMinutes={realMinutes} onOpenFood={() => go("essen")} />;
    if (t === "kalender") return <CalendarPage today={data.todayIso} entries={entries} />;
    return <FoodPage data={data} minutes={minutes} />;
  };
  return (
    <>
      <main
        ref={mainRef}
        className={`mx-auto flex w-full max-w-lg flex-1 touch-pan-y touch-pinch-zoom flex-col gap-3 overflow-x-clip px-4 ${FAB_CLEARANCE} pt-[calc(env(safe-area-inset-top)+0.75rem)]`}
      >
        <nav
          className={`z-20 -mx-4 flex items-center gap-2 px-4 transition-[padding,background-color] duration-300 ${away ? "sticky top-0" : "relative"} ${compact ? "bg-background/80 pb-1.5 pt-[calc(env(safe-area-inset-top)+0.375rem)] shadow-card backdrop-blur-[14px]" : "bg-background"}`}
          aria-label="Seiten"
          data-schmal={compact || undefined}
        >
          <div role="tablist" aria-label="Kalender, Heute, Essen" className="relative flex flex-1 rounded-card bg-segment p-1">
            <span className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)]" aria-hidden>
              <span ref={thumbRef} className="block h-full w-full rounded-field bg-surface shadow-card" style={{ transform: `translateX(${indexOf(tab) * 100}%)` }} />
            </span>
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                aria-label={t.value === "heute" && away ? "Zur Startseite" : undefined}
                onClick={() => go(t.value)}
                className={`hit relative flex flex-1 items-center justify-center gap-1 rounded-field text-[15px] font-bold transition-colors ${compact ? "h-7" : "h-10"} ${tab === t.value ? "text-ink" : t.value === "heute" ? "text-accent-strong" : "text-muted"}`}
              >
                {t.value === "heute" && away && <House className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
                {t.label}
              </button>
            ))}
          </div>
          <Link href="/profil" aria-label="Einstellungen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-fill">
            <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
          </Link>
        </nav>
        <PreviewBanner />
        {/* Die sichtbare Seite steht im DOM zuerst (gleiche keys – nichts wird neu aufgebaut) */}
        {[...TABS].sort((a, b) => Number(b.value === tab) - Number(a.value === tab)).map((t) => {
          const active = t.value === tab;
          if (!active && !warm) return null;
          return (
            <div
              key={t.value}
              ref={(el) => {
                panelRefs.current[t.value] = el;
              }}
              role={active ? "tabpanel" : undefined}
              aria-label={active ? t.label : undefined}
              aria-hidden={active ? undefined : true}
              inert={!active}
              data-seite={t.value}
              className={active ? "pager-page relative" : "pager-page pointer-events-none invisible fixed inset-x-0 top-0"}
            >
              <div className={active ? undefined : "mx-auto max-w-lg px-4"}>{content(t.value)}</div>
            </div>
          );
        })}
      </main>
      <MiaButton name={helperName(data.profile)} />
    </>
  );
}

