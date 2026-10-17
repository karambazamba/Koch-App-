"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { ChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
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
  type RecipeCategory,
  type RecipeSource,
} from "@/lib/cookbook";

/** Zutat im Formular: Menge als Text, damit "1," beim Tippen nicht verloren geht */
type IngredientRow = { id: string; amountText: string; unit: string; name: string };

const INPUT =
  "h-14 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400";

/** /kochbuch/bearbeiten (neu) bzw. /kochbuch/bearbeiten?id=… (ändern) */
export function RecipeEditor() {
  const params = useSearchParams();
  const recipes = useRecipes();
  // Jede neue Navigation startet frisch (Next.js hält besuchte Seiten sonst am Leben).
  const { bfcacheId } = useRouter();
  const id = params.get("id");

  if (recipes === undefined) return <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;
  const existing = id ? recipes[id] : undefined;
  if (id && !existing) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Rezept bearbeiten" backHref="/kochbuch" />
        <p className="px-6 pt-10 text-center text-lg">Dieses Rezept gibt es nicht (mehr).</p>
      </div>
    );
  }
  return <EditorForm key={`${bfcacheId}|${id ?? "neu"}`} existing={existing} />;
}

function EditorForm({ existing }: { existing?: Recipe }) {
  const router = useRouter();
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
    router.push(`/kochbuch/rezept?id=${encodeURIComponent(saved.id)}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={existing ? "Rezept bearbeiten" : "Neues Rezept"} backHref={backHref} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
        <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
          <span className="text-lg font-bold">Titel</span>
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

        <ChoiceGroup<RecipeCategory>
          label="Kategorie"
          value={recipe.category}
          onChange={(category) => update({ category })}
          options={RECIPE_CATEGORIES}
          columns={2}
        />

        <div className="divide-y divide-stone-100 rounded-3xl bg-white px-4 py-1 shadow-sm">
          <NumberStepper
            label="Personen"
            value={recipe.servings}
            min={1}
            max={12}
            onChange={(servings) => update({ servings })}
            variant="plain"
          />
          <label className="flex items-center justify-between gap-3 py-3">
            <span className="text-lg font-bold">Zubereitungszeit</span>
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
                className="h-14 w-24 rounded-2xl border-2 border-stone-200 px-3 text-center text-lg font-bold outline-none focus:border-orange-400"
              />
              <span className="text-lg">Min.</span>
            </span>
          </label>
        </div>

        <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold">Zutaten</h3>
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={row.amountText}
                onChange={(e) => setRow(row.id, { amountText: e.target.value })}
                placeholder="Menge"
                aria-label={`Zutat ${index + 1}: Menge`}
                className="h-12 w-20 shrink-0 rounded-xl border-2 border-stone-200 px-2 text-center text-lg outline-none focus:border-orange-400"
              />
              <select
                value={row.unit}
                onChange={(e) => setRow(row.id, { unit: e.target.value })}
                aria-label={`Zutat ${index + 1}: Einheit`}
                className="h-12 w-24 shrink-0 rounded-xl border-2 border-stone-200 bg-white px-1 text-lg outline-none focus:border-orange-400"
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
                className="h-12 min-w-0 flex-1 rounded-xl border-2 border-stone-200 px-3 text-lg outline-none focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => setRows((list) => list.filter((r) => r.id !== row.id))}
                aria-label={`Zutat ${index + 1} entfernen`}
                className="h-12 w-10 shrink-0 text-2xl text-stone-400 active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const i = createIngredient();
              setRows((list) => [...list, { id: i.id, amountText: "", unit: "", name: "" }]);
            }}
            className="h-12 rounded-2xl border-2 border-dashed border-orange-300 font-bold text-orange-700 active:scale-95"
          >
            + Zutat
          </button>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold">Zubereitung</h3>
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                {index + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => setSteps((list) => list.map((s, i) => (i === index ? e.target.value : s)))}
                placeholder={index === 0 ? "z. B. Zwiebeln schälen und würfeln" : "Nächster Schritt"}
                aria-label={`Schritt ${index + 1}`}
                rows={2}
                className="min-w-0 flex-1 rounded-xl border-2 border-stone-200 px-3 py-2 text-lg outline-none focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => setSteps((list) => list.filter((_, i) => i !== index))}
                aria-label={`Schritt ${index + 1} entfernen`}
                className="mt-2 h-12 w-10 shrink-0 text-2xl text-stone-400 active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSteps((list) => [...list, ""])}
            className="h-12 rounded-2xl border-2 border-dashed border-orange-300 font-bold text-orange-700 active:scale-95"
          >
            + Schritt
          </button>
        </section>

        <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
          <span className="text-lg font-bold">Notiz</span>
          <textarea
            value={recipe.note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="z. B. Kinder mögen es mit weniger Paprika"
            rows={3}
            className="rounded-2xl border-2 border-stone-200 px-4 py-3 text-lg outline-none focus:border-orange-400"
          />
        </label>

        <ChoiceGroup<RecipeSource>
          label="Herkunft"
          value={recipe.source}
          onChange={(source) => update({ source })}
          options={[
            { value: "eigenes", label: "Eigenes", emoji: "✍️" },
            { value: "ki", label: "KI", emoji: "✨" },
          ]}
          columns={2}
        />
      </main>

      <StickyActions>
        <Link href={backHref} className={SECONDARY_BUTTON}>
          Abbrechen
        </Link>
        <button type="button" onClick={save} disabled={!recipe.title.trim()} className={PRIMARY_BUTTON}>
          Speichern ✓
        </button>
      </StickyActions>
    </div>
  );
}
