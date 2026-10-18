"use client";

import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, PAGE_MAIN, SUBTLE, buttonClass } from "@/components/ui/styles";
import { helperName } from "@/lib/profile";
import { restoreNeverAgain } from "@/lib/ratings";
import { useProfile } from "@/lib/useProfile";

const DATE = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric", year: "numeric" });

/** /profil/nie-wieder: Gerichte mit 👎 – einzeln wiederherstellbar */
export function NeverAgainView() {
  const profile = useProfile();
  if (profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const list = profile ? [...profile.neverAgain].reverse() : [];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Nie wieder" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className={SUBTLE}>
          Diese Gerichte (und sehr ähnliche) schlägt {helperName(profile)} nie mehr vor. Wiederherstellen holt ein
          Rezept zurück ins Kochbuch.
        </p>
        {list.length === 0 ? (
          <p className={`${CARD} p-4 text-muted`}>Noch nichts – bisher hat euch alles geschmeckt. 😋</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((e) => (
              <li key={e.id} className={`${CARD} flex items-start gap-3 p-4`}>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-snug">{e.title}</p>
                  <p className="text-sm text-muted">
                    {e.reason ? `Grund: ${e.reason}` : "Ohne Grund"}
                    {e.addedAt && ` · seit ${DATE.format(new Date(`${e.addedAt}T12:00:00`))}`}
                  </p>
                  {e.ingredients.length > 0 && <p className="text-sm text-muted">Mit {e.ingredients.join(", ")}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => profile && restoreNeverAgain(profile, e.id)}
                  aria-label={`${e.title} wiederherstellen`}
                  className={buttonClass("secondary", "sm")}
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Zurückholen
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
