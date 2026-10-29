"use client";

// Einstellungen → "Mehr Funktionen – Was <Name> noch kann": jede zusätzliche Funktion
// mit Icon, Name, einem Satz und An/Aus. Eingeschaltet fügt sie sich ins
// Design ein (Essen-Seite, Kachel auf Heute, Satz oben auf Heute); aus heißt
// nur ausgeblendet – Daten bleiben.

import { BookOpen, Cake, CalendarDays, CalendarPlus, Carrot, ChefHat, Dumbbell, Flag, Gift, HandCoins, Lightbulb, Mail, MapPin, MessageCircle, Pin, Refrigerator, StickyNote, Sun, Wind, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { BAUSTEINE, TIPS_BAUSTEIN, launchSichtbar, setFeature, useBausteine, type Baustein } from "@/lib/core/features";
import { unlockHomeTile } from "@/lib/core/homeLayout";
import { setWasLos, useWasLosAn, useWasLosDaten } from "@/lib/region/client";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { wundertueteName } from "@/lib/wundertuete/sorten";

const BAUSTEIN_ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  calendarPlus: CalendarPlus,
  fridge: Refrigerator,
  book: BookOpen,
  cake: Cake,
  carrot: Carrot,
  bulb: Lightbulb,
  sun: Sun,
  dumbbell: Dumbbell,
  note: StickyNote,
  pin: Pin,
  coins: HandCoins,
  chef: ChefHat,
  message: MessageCircle,
  map: MapPin,
  flag: Flag,
  mail: Mail,
  gift: Gift,
  wind: Wind,
};

/** Baustein schalten – mit Hinweis, wo er steht, und Rückgängig */
function toggleBaustein(b: Baustein, on: boolean) {
  // „Was los?“ (Standard je Wohnort): aus bleibt aus, auch in Ostholstein
  const schalten = (an: boolean) => (b.feature === "regiontipps" ? setWasLos(an) : setFeature(b.feature, an));
  if (!schalten(on)) return;
  // Wundertüte: eingeschaltet kommt die Kachel auf die Startseite
  if (on && b.feature === "wundertuete") unlockHomeTile("wundertuete");
  showToast({
    text: on ? b.where : `${b.name} ist aus – die Daten bleiben.`,
    undo: pushUndo(`${b.name} ${on ? "an" : "aus"}`, () => schalten(!on)),
    undoneText: "Rückgängig gemacht.",
  });
}

export function BausteineView() {
  const on = useBausteine();
  const profile = useProfile();
  const name = helperName(profile);
  const wasLos = useWasLosDaten();
  const wasLosAn = useWasLosAn();
  // Launch 1.0: Ausgeblendetes nur, wenn es schon an ist (zum Ausschalten); „Was los?“ nur mit laufender Quelle
  const list = (wasLos && wasLos.quelle !== "aus" ? [...BAUSTEINE, TIPS_BAUSTEIN] : BAUSTEINE).filter((b) => launchSichtbar(b.feature, on ?? []));
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Mehr Funktionen" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className="text-base text-muted">Was {name} noch kann. Eingeschaltet fügt sich alles in Kalender · Heute · Essen ein; ausschalten blendet nur aus – nichts wird gelöscht.</p>
        <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`} aria-label="Mehr Funktionen">
          {list.map((b) => {
            const Icon = BAUSTEIN_ICONS[b.icon] ?? Lightbulb;
            const active = b.feature === "regiontipps" ? Boolean(wasLosAn) : Boolean(on?.includes(b.feature));
            const titel = b.feature === "wundertuete" ? wundertueteName(name) : b.name;
            return (
              <li key={b.feature}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent" aria-hidden>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold">{titel}</span>
                    <span className="block text-sm text-muted">{b.text}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={titel}
                    checked={active}
                    disabled={on === undefined}
                    onChange={(e) => toggleBaustein(b, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-accent" : "bg-line-strong"} after:absolute after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-surface after:shadow after:transition ${active ? "after:left-[1.375rem]" : "after:left-0.5"} peer-focus-visible:ring-2 peer-focus-visible:ring-accent`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">Auch per Gespräch: „Hab Hähnchen gekauft“, „Ich brauche die Tipps nicht“ oder „Was kannst du noch?“</p>
      </main>
    </div>
  );
}
