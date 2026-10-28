"use client";

// Rezept-Vorschau (A-038, Tafel 122): ein Vorschlag angetippt → Fenster über
// der Bühne bzw. Seite mit Bild, Zeit, Personen, „alles im Haus“ / „auf die
// Liste: …“, Zutaten (für den Haushalt) und „So geht’s“ (Kurz | Ausführlich)
// – dieselben Bausteine wie die Rezeptseite, nur zum Lesen. Unten fest
// „Zurück zu den Ideen“ und „Nehmen“. Ohne Rezept schreibt Mia es erst
// („Mia schreibt das Rezept …“), Fehler: „Hat grad nicht geklappt. Nochmal?“.

import { useCallback, useEffect, useReducer, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { RezeptZutaten } from "@/components/essen/rezepte/RezeptZutaten";
import { RezeptSchritte } from "@/components/essen/rezepte/RezeptSchritte";
import { dishTone } from "@/lib/essen/dishLook";
import { matchStock, realStock, stockLine } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { useRecipes } from "@/lib/essen/cookbook";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, useWeekPlans } from "@/lib/essen/weekPlan";
import { useShoppingLists } from "@/lib/einkauf/shoppingList";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import { haushaltOf } from "@/lib/core/haushalt";
import { beispielPersonen } from "@/lib/essen/demoDish";
import { now, todayIso } from "@/lib/core/now";
import { askAssistant } from "@/lib/begleitung/client";
import { ladeReducer, vorschauRezept, type Vorschlag } from "@/lib/essen/vorschau";
import { ladeRezept, rezeptAusOps, type GeladenesRezept } from "@/lib/essen/vorschau/laden";

export function RezeptVorschau({ vorschlag, onNehmen, onClose }: { vorschlag: Vorschlag; onNehmen?: () => void; onClose: () => void }) {
  const recipes = useRecipes();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const shopping = useShoppingLists();
  const stock = useStock();
  const [geladen, setGeladen] = useState<GeladenesRezept | null>(null);
  const rezept = geladen?.rezept ?? (recipes ? vorschauRezept(vorschlag, recipes) : undefined);
  const [stand, melde] = useReducer(ladeReducer, "fertig");
  const bereit = Boolean(recipes && profile && weekPlans && mealPlans && shopping);

  const schreiben = useCallback(() => {
    if (!profile || !weekPlans || !mealPlans || !recipes || !shopping) return;
    melde("start");
    const data = { profile, weekPlans, mealPlans, recipes, shopping };
    const woche = planningWeekStart(now(), profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
    void ladeRezept(vorschlag.title, async (bitte) => rezeptAusOps((await askAssistant([{ role: "user", text: bitte }], [], data, todayIso(), woche, 0, { messen: false })).ops, vorschlag.title)).then((fertig) => {
      if (!fertig) return melde("fehlgeschlagen");
      setGeladen(fertig);
      melde("geschafft");
    });
  }, [profile, weekPlans, mealPlans, recipes, shopping, vorschlag.title]);

  // Kein Rezept da (KI-Vorschlag nur mit Name/Zeit): einmal schreiben lassen
  const fehlt = bereit && !rezept && stand === "fertig";
  useEffect(() => {
    if (fehlt) schreiben();
  }, [fehlt, schreiben]);

  const persons = vorschlag.persons ?? (profile ? beispielPersonen(haushaltOf(profile.householdType), profile.persons.length) : null);
  const minutes = rezept?.prepMinutes ?? vorschlag.minutes;
  const vorrat = rezept && stock && realStock(stock).length ? stockLine(matchStock(rezept.ingredients.map((i) => i.name), stock, todayIso())) : stockLine({ needs: vorschlag.needs ?? [], unsure: vorschlag.unsure });
  const name = helperName(profile);

  return (
    <Sheet title={vorschlag.title} onClose={onClose} layer="above" tall>
      <div className="flex flex-col gap-3" data-vorschau={vorschlag.title}>
        <div className="relative -mx-4 h-44 shrink-0 overflow-hidden">
          <DishPicture title={vorschlag.title} ingredients={vorschlag.ingredients} category={vorschlag.category ?? rezept?.category ?? null} tone={dishTone(vorschlag.title, vorschlag.category ?? rezept?.category ?? null)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <p className="text-[15px] text-muted">
          {[minutes ? `${minutes} Min` : null, persons ? `für ${persons}` : null].filter(Boolean).join(" · ")}
          {minutes || persons ? " · " : ""}
          <span className={`font-semibold ${vorrat.tone === "gut" ? "text-good-ink" : vorrat.tone === "liste" ? "text-accent-strong" : ""}`}>{vorrat.text}</span>
        </p>
        {rezept ? (
          <>
            <RezeptZutaten recipe={rezept} scaleTo={persons} kopfRechts={null} vorschau />
            <RezeptSchritte recipe={rezept} kids={false} vorschau />
          </>
        ) : stand === "fehler" ? (
          <div className="flex flex-col items-start gap-2 py-2" role="status">
            <p className="text-base">Hat grad nicht geklappt. Nochmal?</p>
            <button type="button" onClick={schreiben} className={buttonClass("secondary", "sm")}>
              Nochmal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-2" role="status" data-schreibt>
            <h2 className={SECTION_TITLE}>Zutaten</h2>
            <p className="vorschau-schreibt text-base font-semibold text-accent-strong">{name} schreibt das Rezept …</p>
          </div>
        )}
      </div>
      <div className={`sticky bottom-0 -mx-4 mt-auto grid ${onNehmen ? "grid-cols-[1fr_1.2fr]" : "grid-cols-1"} gap-2 border-t border-line bg-background px-4 pb-3 pt-3`} data-vorschau-fuss>
        <button type="button" onClick={onClose} className={buttonClass("secondary", "lg")}>
          Zurück zu den Ideen
        </button>
        {onNehmen && (
          <button type="button" onClick={onNehmen} className={buttonClass("primary", "lg")}>
            Nehmen
          </button>
        )}
      </div>
    </Sheet>
  );
}
