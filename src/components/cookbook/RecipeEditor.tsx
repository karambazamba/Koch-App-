"use client";

import { useGoBack } from "@/lib/useGoBack";
import { expectReplace } from "@/lib/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, PenLine, Plus, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { ChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
import { CARD, INPUT, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import {
  RECIPE_CATEGORIES,
  UNITS,
  createIngredient,
  createRecipe,
  formatAmount,
  parseAmount,
  saveRecipe,
  useRecipes,
  type Recipe,
  type OvenMode,
  type RecipeCategory,
  type RecipeKind,
  type RecipeSource,
} from "@/lib/cookbook";

/** Zutat im Formular: Menge als Text, damit "1," beim Tippen nicht verloren geht */
type IngredientRow = { id: string; amountText: string; unit: string; name: string };

/** Feldstil ohne feste Breite/Höhe, für schmale Felder und Textbereiche */
const ADD_ROW = `${buttonClass("soft")} w-full`;
const REMOVE = "flex h-12 w-10 shrink-0 items-center justify-center text-stone-400 transition active:scale-90";

/** /kochbuch/bearbeiten (neu) bzw. /kochbuch/bearbeiten?id=… (ändern) */
export function RecipeEditor() {
  const params = useSearchParams();
  const recipes = useRecipes();
  // Jede neue Navigation startet frisch (Next.js hält besuchte Seiten sonst am Leben).
  const { bfcacheId } = useRouter();
  const id = params.get("id");

  if (recipes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const existing = id ? recipes[id] : undefined;
  if (id && !existing) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Rezept bearbeiten" backHref="/kochbuch" />
        <p className="px-6 pt-10 text-center text-base">Dieses Rezept gibt es nicht (mehr).</p>
      </div>
    );
  }
  return <EditorForm key={`${bfcacheId}|${id ?? "neu"}`} existing={existing} />;
}

function EditorForm({ existing }: { existing?: Recipe }) {
  const router = useRouter();
  const goBack = useGoBack();
  const [recipe, setRecipe] = useState<Recipe>(
    () => existing ?? createRecipe({ title: "", category: "fleisch" }),
  );
  const [rows, setRows] = useState<IngredientRow[]>(() => {
    const list = existing?.ingredients.length ? existing.ingredients : [createIngredient()];
    return list.map((i) => ({ id: i.id, amountText: formatAmount(i.amount), unit: i.unit, name: i.name }));
  });
  const [steps, setSteps] = useState<string[]>(() => (existing?.steps.length ? existing.steps : [""]));

  const update = (changes: Partial<Recipe>) => setRecipe((r) => ({ ...r, ...changes }));
  const setRow = (id: string, changes: Partial<IngredientRow>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  const backHref = existing ? `/kochbuch/rezept?id=${encodeURIComponent(existing.id)}` : "/kochbuch";

  const save = () => {
    const saved = saveRecipe({
      ...recipe,
      ingredients: rows.map((r) => ({
        id: r.id,
        amount: parseAmount(r.amountText),
        unit: r.unit,
        name: r.name.trim(),
      })),
      steps,
    });
    // Bearbeiten: zurück zum Rezept; neu: das Rezept ersetzt den Editor im Verlauf
    if (existing) goBack(backHref);
    else {
      expectReplace();
      router.replace(`/kochbuch/rezept?id=${encodeURIComponent(saved.id)}`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={existing ? "Rezept bearbeiten" : "Neues Rezept"} backHref={backHref} />
      <main className={PAGE_MAIN}>
        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className={SECTION_TITLE}>Titel</span>
          <input
            type="text"
            value={recipe.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="z. B. Omas Gulasch"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={INPUT}
          />
        </label>

        <ChoiceGroup<RecipeKind>
          label="Typ"
          value={recipe.kind}
          onChange={(kind) => update({ kind, oven: kind === "backen" ? (recipe.oven ?? { mode: "ober-unter", temp: 180, minutes: 40 }) : recipe.oven })}
          options={[
            { value: "kochen", label: "🍲 Kochen" },
            { value: "backen", label: "🧁 Backen" },
          ]}
          columns={2}
        />

        {recipe.kind === "backen" && (
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Backofen">
            <h3 className={SECTION_TITLE}>Backofen</h3>
            <div className="flex gap-2">
              <select
                value={recipe.oven?.mode ?? "ober-unter"}
                onChange={(e) => update({ oven: { ...(recipe.oven ?? { temp: 180, minutes: 40 }), mode: e.target.value as OvenMode } })}
                aria-label="Heizart"
                className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-2`}
              >
                <option value="ober-unter">Ober-/Unterhitze</option>
                <option value="umluft">Umluft</option>
              </select>
              <input
                type="number"
                inputMode="numeric"
                value={recipe.oven?.temp ?? ""}
                onChange={(e) => update({ oven: { ...(recipe.oven ?? { mode: "ober-unter", minutes: 40 }), temp: Number(e.target.value) || 0 } })}
                aria-label="Temperatur in Grad"
                className={`${INPUT_BASE} h-12 w-20 px-2 text-center font-bold`}
              />
              <span className="self-center text-muted">°C</span>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-base font-bold">Backzeit</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={recipe.oven?.minutes ?? ""}
                  onChange={(e) => update({ oven: { ...(recipe.oven ?? { mode: "ober-unter", temp: 180 }), minutes: Number(e.target.value) || 0 } })}
                  aria-label="Backzeit in Minuten"
                  className={`${INPUT_BASE} h-12 w-20 px-2 text-center font-bold`}
                />
                <span className="text-muted">Min.</span>
              </span>
            </label>
            <input
              type="text"
              value={recipe.pan}
              onChange={(e) => update({ pan: e.target.value })}
              placeholder="Form, z. B. Springform 26 cm"
              aria-label="Formgröße"
              className={INPUT}
            />
            <p className="text-sm text-muted">Beim Backen Mengen am besten in g und ml – das wird genauer.</p>
          </section>
        )}

        <ChoiceGroup<RecipeCategory>
          label="Kategorie"
          value={recipe.category}
          onChange={(category) => update({ category })}
          options={RECIPE_CATEGORIES}
          columns={2}
        />

        <div className={`${CARD} divide-y divide-line px-4 py-1`}>
          <NumberStepper
            label={recipe.kind === "backen" ? "Stück" : "Personen"}
            value={recipe.servings}
            min={1}
            max={12}
            onChange={(servings) => update({ servings })}
            variant="plain"
          />
          <label className="flex items-center justify-between gap-3 py-3">
            <span className="text-base font-bold">Zubereitungszeit</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={recipe.prepMinutes ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update({ prepMinutes: v === "" ? null : Math.max(0, Math.round(Number(v))) || 0 });
                }}
                placeholder="–"
                aria-label="Zubereitungszeit in Minuten"
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className={`${INPUT_BASE} h-12 w-20 px-3 text-center font-bold`}
              />
              <span className="text-base text-muted">Min.</span>
            </span>
          </label>
        </div>

        <section className={`${CARD} flex flex-col gap-3 p-4`}>
          <h3 className={SECTION_TITLE}>Zutaten</h3>
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={row.amountText}
                onChange={(e) => setRow(row.id, { amountText: e.target.value })}
                placeholder="Menge"
                aria-label={`Zutat ${index + 1}: Menge`}
                className={`${INPUT_BASE} h-12 w-20 shrink-0 px-2 text-center`}
              />
              <select
                value={row.unit}
                onChange={(e) => setRow(row.id, { unit: e.target.value })}
                aria-label={`Zutat ${index + 1}: Einheit`}
                className={`${INPUT_BASE} h-12 w-24 shrink-0 px-1`}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u || "–"}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={row.name}
                onChange={(e) => setRow(row.id, { name: e.target.value })}
                placeholder="Zutat"
                aria-label={`Zutat ${index + 1}: Name`}
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className={`${INPUT_BASE} h-12 flex-1 px-3`}
              />
              <button
                type="button"
                onClick={() => setRows((list) => list.filter((r) => r.id !== row.id))}
                aria-label={`Zutat ${index + 1} entfernen`}
                className={REMOVE}
              >
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const i = createIngredient();
              setRows((list) => [...list, { id: i.id, amountText: "", unit: "", name: "" }]);
            }}
            className={ADD_ROW}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Zutat
          </button>
        </section>

        <section className={`${CARD} flex flex-col gap-3 p-4`}>
          <h3 className={SECTION_TITLE}>Zubereitung</h3>
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
                {index + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => setSteps((list) => list.map((s, i) => (i === index ? e.target.value : s)))}
                placeholder={index === 0 ? "z. B. Zwiebeln schälen und würfeln" : "Nächster Schritt"}
                aria-label={`Schritt ${index + 1}`}
                rows={2}
                className={`${INPUT_BASE} flex-1 px-3 py-2`}
              />
              <button
                type="button"
                onClick={() => setSteps((list) => list.filter((_, i) => i !== index))}
                aria-label={`Schritt ${index + 1} entfernen`}
                className={`${REMOVE} mt-1`}
              >
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSteps((list) => [...list, ""])}
            className={ADD_ROW}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Schritt
          </button>
        </section>

        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className={SECTION_TITLE}>Notiz</span>
          <textarea
            value={recipe.note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="z. B. Kinder mögen es mit weniger Paprika"
            rows={3}
            className={`${INPUT_BASE} w-full px-4 py-3`}
          />
        </label>

        <ChoiceGroup<RecipeSource>
          label="Herkunft"
          value={recipe.source}
          onChange={(source) => update({ source })}
          options={[
            { value: "eigenes", label: "Eigenes", icon: PenLine },
            { value: "ki", label: "KI", icon: Sparkles },
          ]}
          columns={2}
        />
      </main>

      <StickyActions>
        <button type="button" onClick={() => goBack(backHref)} className={SECONDARY_BUTTON}>
          Abbrechen
        </button>
        <button type="button" onClick={save} disabled={!recipe.title.trim()} className={PRIMARY_BUTTON}>
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Speichern
        </button>
      </StickyActions>
    </div>
  );
}
