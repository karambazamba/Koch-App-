"use client";

// Bearbeiten-Ansichten der Einstellungen: Lieblingsgerichte, warm essen,
// Wochenvorlage, Haushalt, Einkaufstag, Basen, "Das mögt ihr" und
// Gesundheits-Tipps. Kochstil und Pause stehen in CookingEditViews.tsx.

import { useState } from "react";
import { Info, Plus, X } from "lucide-react";
import { CARD, INPUT, INPUT_BASE, SUBTLE, buttonClass, chipClass, tileClass } from "@/components/ui/styles";
import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import { FavoritesEditor, NOTE, STANDARD_WEEK_HINT, WarmMealEditor, WeekRulesEditor, WishDayEditor, tooManyDays, withWishDay } from "@/components/profile/editors";
import { NumberStepper } from "@/components/form/NumberStepper";
import { sortedBases } from "@/lib/essen/bases";
import { LIKE_WEIGHTS, likeLevel, sortedLikes, withLikes, withoutLike } from "@/lib/essen/likes";
import { HEALTH_TIP_LEVELS, HOUSEHOLD_TYPES, hasKids, wishDayActive, WEEKDAYS, planningWeekLabel, standardWeekDays } from "@/lib/einstellungen/profile";

export { CookingStyleEditView, PauseEditView } from "@/components/profile/CookingEditViews";

export function FavoritesEditView() {
  return (
    <ProfileEditPage title="Lieblingsgerichte" intro="Was bei euch immer geht – das plane ich gern öfter ein.">
      {(draft, setDraft) => (
        <FavoritesEditor
          values={draft.favoriteDishes}
          onChange={(favoriteDishes) => setDraft((d) => ({ ...d, favoriteDishes }))}
        />
      )}
    </ProfileEditPage>
  );
}

export function WarmMealEditView() {
  return (
    <ProfileEditPage title="Zusammen warm essen" intro="Wann es das warme Essen gibt – danach richte ich Uhrzeit und Personenzahl.">
      {(draft, setDraft) => (
        <>
          <WarmMealEditor
            warmMeal={draft.warmMeal}
            onChange={(warmMeal) => setDraft((d) => ({ ...d, warmMeal }))}
          />
          <div className={`${CARD} flex flex-col gap-3 p-4`}>
            <p className="text-lg font-bold">Um wie viel Uhr ungefähr?</p>
            {(["mittags", "abends"] as const).map((time) => (
              <label key={time} className="flex items-center justify-between gap-3">
                <span className="font-semibold">{time === "mittags" ? "Mittags" : "Abends"}</span>
                <input
                  type="time"
                  value={draft.mealClock[time]}
                  onChange={(e) => e.target.value && setDraft((d) => ({ ...d, mealClock: { ...d.mealClock, [time]: e.target.value } }))}
                  aria-label={`Uhrzeit ${time}`}
                  className={`${INPUT_BASE} h-12 w-32 px-3`}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </ProfileEditPage>
  );
}

export function StandardWeekEditView() {
  return (
    <ProfileEditPage
      title="Wochenvorlage"
      intro="Eure typische Woche – damit starte ich jede neue Planung."
      canSave={(d) => !tooManyDays(d.weekRules, standardWeekDays(d))}
    >
      {(draft, setDraft) => (
        <>
          <p className={NOTE}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />
            {STANDARD_WEEK_HINT}
          </p>
          <WeekRulesEditor
            rules={draft.weekRules}
            onChange={(changes) =>
              setDraft((d) => ({ ...d, weekRules: { ...d.weekRules, ...changes } }))
            }
            available={standardWeekDays(draft)}
            blockedWeekdays={wishDayActive(draft) ? [draft.wishDay.weekday] : []}
          />
          {hasKids(draft) && (
            <WishDayEditor
              profile={draft}
              onChange={(wishDay) => setDraft((d) => withWishDay(d, wishDay))}
            />
          )}
        </>
      )}
    </ProfileEditPage>
  );
}

export function HouseholdNameEditView() {
  return (
    <ProfileEditPage title="Für wen kochst du?" intro="Danach richte ich Mengen, Einkauf und Ideen aus.">
      {(draft, setDraft) => (
        <>
        <p className="text-lg font-bold">Für wen kochst du?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Für wen kochst du?">
          {HOUSEHOLD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={draft.householdType === t.value}
              onClick={() => setDraft((d) => ({ ...d, householdType: t.value }))}
              className={tileClass(draft.householdType === t.value)}
            >
              <span className="text-2xl" aria-hidden>
                {t.emoji}
              </span>
              <span className="text-sm font-bold leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
        <p className={SUBTLE}>
          Danach richte ich Portionen, Einkauf und Ideen aus – Kinder-Sachen wie den Wunschtag gibt es nur mit Kindern.
        </p>
        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className="text-base font-bold">{draft.householdType === "single" ? "Name deines Haushalts (optional)" : draft.householdType === "wg" ? "Name eurer WG (optional)" : "Name eures Haushalts (optional)"}</span>
          <input
            type="text"
            value={draft.householdName}
            onChange={(e) => {
              const householdName = e.target.value;
              setDraft((d) => ({ ...d, householdName }));
            }}
            placeholder={draft.householdType === "familie" ? "z. B. Familie Müller" : draft.householdType === "wg" ? "z. B. Villa Kunterbunt" : "z. B. Lisas Küche"}
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={INPUT}
          />
        </label>
        </>
      )}
    </ProfileEditPage>
  );
}

export function ShoppingDayEditView() {
  return (
    <ProfileEditPage title="Einkaufstag" intro="Ab diesem Tag plane ich immer eine Woche.">
      {(draft, setDraft) => (
        <>
          <fieldset className={`${CARD} p-4`}>
            <legend className="sr-only">Einkaufstag</legend>
            <p className="mb-1 text-base font-bold" aria-hidden>
              An welchem Tag kauft ihr ein?
            </p>
            <p className={`mb-3 ${SUBTLE}`}>
              Ab diesem Tag läuft eure Planungswoche 7 Tage – für Wochenplan und Wochen-Check.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map((day) => {
                const selected = draft.shoppingDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Einkaufstag ${day}`}
                    onClick={() => setDraft((d) => ({ ...d, shoppingDay: day }))}
                    className={tileClass(selected)}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className={NOTE} role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />
            Planungswoche: {planningWeekLabel(draft.shoppingDay)}
          </p>
        </>
      )}
    </ProfileEditPage>
  );
}

/** "Eure Lieblings-Basen": wie oft welche Basis gewählt bzw. gut bewertet wurde */
export function BasesEditView() {
  return (
    <ProfileEditPage title="Lieblings-Basen" intro="Kartoffeln, Reis, Nudeln & Co. – was ihr am liebsten dazu esst.">
      {(draft, setDraft) => (
        <>
          <p className={SUBTLE}>
            Merke ich mir, wenn ihr bei Reste-Ideen oder neuen Rezepten eine Basis wählt oder ein Gericht gut bewertet.
            Die beliebtesten schlage ich zuerst vor.
          </p>
          <div className={`${CARD} flex flex-col divide-y divide-line px-4`}>
            {sortedBases(draft.bases).map((b) => (
              <div key={b.id} className="py-2">
                <NumberStepper
                  variant="plain"
                  label={b.label}
                  hint={draft.bases[b.id] === 1 ? "1-mal gewählt" : `${draft.bases[b.id]}-mal gewählt`}
                  value={draft.bases[b.id]}
                  min={0}
                  max={999}
                  onChange={(value) => setDraft((d) => ({ ...d, bases: { ...d.bases, [b.id]: value } }))}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </ProfileEditPage>
  );
}

/** "Das mögt ihr": gelernte Lieblingszutaten, gewichtet – entfernen und ergänzen */
export function LikesEditView() {
  const [input, setInput] = useState("");
  return (
    <ProfileEditPage title="Das mögt ihr" intro="Lieblingszutaten, die ich gern einbaue. Lerne ich mit, ihr könnt alles ändern.">
      {(draft, setDraft) => {
        const likes = sortedLikes(draft.likes);
        const add = () => {
          const names = input.split(/,|\bund\b/).map((n) => n.trim()).filter(Boolean);
          if (names.length) setDraft((d) => withLikes(d, names, LIKE_WEIGHTS.manual, true));
          setInput("");
        };
        return (
          <>
            <p className={SUBTLE}>
              Lerne ich aus euren Bewertungen, gekochten Gerichten und dem, was ihr mir erzählt. Kommt bevorzugt in
              neue Rezepte – auch in Entdecker-Rezepte: neu, aber nicht fremd.
            </p>
            <div className={`${CARD} flex flex-col gap-3 p-4`}>
              {likes.length === 0 ? (
                <p className="text-sm text-muted">Noch nichts gelernt. Sag mir einfach „Wir lieben Käse“ – oder trag es hier ein.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {likes.map((l) => {
                    const level = likeLevel(l, likes);
                    return (
                      <span key={l.name} className={chipClass(level === 3)}>
                        <span className={level === 1 ? "font-medium" : "font-bold"}>{l.name}</span>
                        <span className="text-xs text-accent" aria-label={`Stufe ${level} von 3`}>
                          {"♥".repeat(level)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraft((d) => withoutLike(d, l.name))}
                          aria-label={`${l.name} entfernen`}
                          className="-mr-1 ml-0.5 rounded-full p-0.5 text-muted"
                        >
                          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="z. B. Käse, Knoblauch"
                  aria-label="Zutat hinzufügen"
                  className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
                />
                <button type="submit" disabled={!input.trim()} className={buttonClass("primary")}>
                  <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  Dazu
                </button>
              </form>
            </div>
          </>
        );
      }}
    </ProfileEditPage>
  );
}

/** Tipps auf Lottes Platz: aus / ab und zu / täglich */
export function HealthTipsEditView() {
  return (
    <ProfileEditPage title="Gesundheits-Tipps" intro="Ab und zu ein freiwilliger, leckerer Tausch – nie belehrend.">
      {(draft, setDraft) => (
        <>
          <p className={SUBTLE}>
            Ab und zu schlage ich einen kleinen Tausch vor, z. B. „Halbe Sahne durch Joghurt ersetzen“ – immer freiwillig,
            nur für das eine Rezept. Nie beim Cheat Day oder Wunschessen.
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Gesundheits-Tipps">
            {HEALTH_TIP_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={draft.healthTips === level.value}
                onClick={() => setDraft((d) => ({ ...d, healthTips: level.value }))}
                className={tileClass(draft.healthTips === level.value)}
              >
                <span className="flex flex-col self-stretch px-2 text-left">
                  <span className="text-base font-bold">{level.label}</span>
                  <span className="text-sm text-muted">{level.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </ProfileEditPage>
  );
}
