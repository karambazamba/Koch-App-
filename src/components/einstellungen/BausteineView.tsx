"use client";

// Einstellungen → "Mehr Funktionen – Was <Name> noch kann": jede zusätzliche Funktion
// mit Icon, Name, einem Satz und An/Aus. Eingeschaltet fügt sie sich ins
// Design ein (Essen-Seite, Kachel auf Heute, Satz oben auf Heute); aus heißt
// nur ausgeblendet – Daten bleiben.

import { BookOpen, CalendarDays, CalendarPlus, Cake, Carrot, ChefHat, Lightbulb, MapPin, MessageCircle, Refrigerator, Sun, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { BAUSTEINE, TIPS_BAUSTEIN, setFeature, useBausteine, type Baustein } from "@/lib/core/features";
import { unlockHomeTile } from "@/lib/core/homeLayout";
import { useTipsMode } from "@/lib/tipps/client";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

const BAUSTEIN_ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  calendarPlus: CalendarPlus,
  fridge: Refrigerator,
  book: BookOpen,
  cake: Cake,
  carrot: Carrot,
  bulb: Lightbulb,
  sun: Sun,
  chef: ChefHat,
  message: MessageCircle,
  map: MapPin,
};

/** Baustein schalten – mit Hinweis, wo er steht, und Rückgängig */
function toggleBaustein(b: Baustein, on: boolean) {
  if (!setFeature(b.feature, on)) return;
  // Tipps aus der Region: eingeschaltet kommt die Kachel auf die Startseite
  if (on && b.feature === "regiontipps") unlockHomeTile("tipps");
  showToast({
    text: on ? b.where : `${b.name} ist aus – die Daten bleiben.`,
    undo: pushUndo(`${b.name} ${on ? "an" : "aus"}`, () => setFeature(b.feature, !on)),
    undoneText: "Rückgängig gemacht.",
  });
}

export function BausteineView() {
  const on = useBausteine();
  const profile = useProfile();
  const name = helperName(profile);
  const tipsMode = useTipsMode();
  const list = tipsMode && tipsMode !== "off" ? [...BAUSTEINE, TIPS_BAUSTEIN] : BAUSTEINE;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Mehr Funktionen" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className="text-base text-muted">Was {name} noch kann. Eingeschaltet fügt sich alles in Kalender · Heute · Essen ein; ausschalten blendet nur aus – nichts wird gelöscht.</p>
        <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`} aria-label="Mehr Funktionen">
          {list.map((b) => {
            const Icon = BAUSTEIN_ICONS[b.icon] ?? Lightbulb;
            const active = Boolean(on?.includes(b.feature));
            return (
              <li key={b.feature}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent" aria-hidden>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold">{b.name}</span>
                    <span className="block text-sm text-muted">{b.text}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={b.name}
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
