"use client";

// Bearbeiten-Ansichten der Einstellungen für den Kochstil (Plan oder spontan,
// Gefühl oder Rezept, wie viel Neues, Küchenmaschine) und den Pause-Modus.

import { CARD, INPUT_BASE, SECTION_TITLE, SUBTLE, tileClass } from "@/components/ui/styles";
import { ProfileEditPage } from "@/components/einstellungen/ProfileEditPage";
import { ChoiceCards } from "@/components/einstellungen/settings/SettingsParts";
import { COOKING_STYLES, PLAN_STYLES, MIX_SUGGESTS, helperName, NEW_DISHES_OPTIONS, type KitchenMachine } from "@/lib/einstellungen/profile";
import { now } from "@/lib/core/now";

/** So kocht ihr: nach Gefühl oder nach Rezept, wie viel Neues pro Woche */
export function CookingStyleEditView() {
  return (
    <ProfileEditPage title="Kochstil" intro="Mit Plan oder spontan, nach Gefühl oder Rezept, wie viel Neues – und ob eine Küchenmaschine mitkocht.">
      {(draft, setDraft) => (
        <>
          <h2 className={`${SECTION_TITLE} px-1`}>Wie kocht ihr meistens?</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Planen oder spontan">
            {PLAN_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                role="radio"
                aria-checked={draft.planStyle === style.value}
                onClick={() => setDraft((d) => ({ ...d, planStyle: style.value, planWeek: null }))}
                className={tileClass(draft.planStyle === style.value)}
              >
                <span className="flex flex-col self-stretch px-2 text-left">
                  <span className="text-base font-bold">{style.label}</span>
                  <span className="text-sm text-muted">{style.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {draft.planStyle === "spontan" && <p className={`${SUBTLE} px-1`}>Wochenplan & Co. blende ich dann aus – gespeichert bleibt alles.</p>}
          {draft.planStyle === "mix" && (
            <>
              <h2 className={`${SECTION_TITLE} mt-2 px-1`}>Darf ich von mir aus was vorschlagen?</h2>
              <ChoiceCards label={`${helperName(draft)} darf vorschlagen`} value={draft.mixSuggest} onChange={(mixSuggest) => setDraft((d) => ({ ...d, mixSuggest }))} options={MIX_SUGGESTS} />
            </>
          )}
          <h2 className={`${SECTION_TITLE} mt-2 px-1`}>Nach Gefühl oder nach Rezept?</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Kochstil">
            {COOKING_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                role="radio"
                aria-checked={draft.cookingStyle === style.value}
                onClick={() => setDraft((d) => ({ ...d, cookingStyle: style.value }))}
                className={tileClass(draft.cookingStyle === style.value)}
              >
                <span className="flex flex-col self-stretch px-2 text-left">
                  <span className="text-base font-bold">{style.label}</span>
                  <span className="text-sm text-muted">{style.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <h2 className={`${SECTION_TITLE} mt-2`}>Wie viel Neues?</h2>
          <p className={SUBTLE}>Beim Planen nehme ich vor allem Bewährtes und Schnelles – und so viel Neues, wie ihr mögt.</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Neue Gerichte pro Woche">
            {NEW_DISHES_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={draft.newPerWeek === option.value}
                onClick={() => setDraft((d) => ({ ...d, newPerWeek: option.value }))}
                className={tileClass(draft.newPerWeek === option.value)}
              >
                <span className="flex flex-col self-stretch px-2 text-left">
                  <span className="text-base font-bold">{option.label}</span>
                  <span className="text-sm text-muted">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <h2 className={`${SECTION_TITLE} mt-2`}>Küchenmaschine</h2>
          <p className={SUBTLE}>Mit Küchenmaschine zeige ich bei Rezepten auch die Maschinen-Schritte (Zeit, Temperatur, Stufe).</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Küchenmaschine">
            {KITCHEN_MACHINES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={draft.kitchenMachine === option.value}
                onClick={() => setDraft((d) => ({ ...d, kitchenMachine: option.value }))}
                className={tileClass(draft.kitchenMachine === option.value)}
              >
                <span className="flex flex-col self-stretch px-2 text-left">
                  <span className="text-base font-bold">{option.label}</span>
                  <span className="text-sm text-muted">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </ProfileEditPage>
  );
}

const KITCHEN_MACHINES: { value: KitchenMachine; label: string; hint: string }[] = [
  { value: "keine", label: "Klassisch", hint: "Herd, Ofen, Pfanne" },
  { value: "thermomix", label: "Küchenmaschine mit Kochfunktion", hint: "z. B. Thermomix – Schritte mit Zeit, Temperatur und Stufe" },
];

/** Pause-Modus: an/aus, ab wann, optional bis wann */
export function PauseEditView() {
  return (
    <ProfileEditPage title="Pause" intro="Urlaub oder einfach mal frei: Dann plane ich nichts und bin still.">
      {(draft, setDraft) => {
        const on = Boolean(draft.pause);
        const today = now();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return (
          <>
            <p className={SUBTLE}>
              Urlaub oder einfach mal Ruhe: In der Pause plane ich nichts, schicke keine Hinweise und keine Mitteilungen. Kurz vor
              dem Ende frage ich höchstens einmal, ob ich etwas vorbereiten soll.
            </p>
            <label className={`${CARD} flex items-center gap-3 p-4`}>
              <span className="min-w-0 flex-1 font-bold">Pause</span>
              <input
                type="checkbox"
                role="switch"
                checked={on}
                onChange={(e) => setDraft((d) => ({ ...d, pause: e.target.checked ? { from: todayIso, until: null } : null }))}
                className="h-6 w-6 shrink-0 accent-accent"
                aria-label="Pause"
              />
            </label>
            {draft.pause && (
              <div className={`${CARD} flex flex-col gap-3 p-4`}>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Ab</span>
                  <input
                    type="date"
                    value={draft.pause.from}
                    onChange={(e) => e.target.value && setDraft((d) => ({ ...d, pause: { from: e.target.value, until: d.pause?.until ?? null } }))}
                    aria-label="Pause ab"
                    className={`${INPUT_BASE} h-12 px-3`}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Bis (optional)</span>
                  <input
                    type="date"
                    value={draft.pause.until ?? ""}
                    min={draft.pause.from}
                    onChange={(e) => setDraft((d) => ({ ...d, pause: d.pause ? { ...d.pause, until: e.target.value || null } : null }))}
                    aria-label="Pause bis"
                    className={`${INPUT_BASE} h-12 px-3`}
                  />
                </label>
              </div>
            )}
          </>
        );
      }}
    </ProfileEditPage>
  );
}
