import type { RecipeCategory } from "@/lib/cookbook";
import { RECIPE_CATEGORIES } from "@/lib/cookbook";

/** Kategorien nur als kleine farbige Punkte – keine farbigen Flächen */
export const CATEGORY_DOT: Record<RecipeCategory, string> = {
  fleisch: "bg-rose-500",
  vegetarisch: "bg-emerald-500",
  fisch: "bg-sky-500",
  cheatday: "bg-amber-400",
};

export function CategoryDot({ category }: { category: RecipeCategory }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[category]}`} aria-hidden />;
}

export function categoryLabel(category: RecipeCategory, short = false): string {
  if (short && category === "vegetarisch") return "Veggie";
  return RECIPE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Kleiner neutraler Chip mit farbigem Punkt, z. B. "• Fleisch" */
export function CategoryChip({ category, short = false, children }: { category: RecipeCategory; short?: boolean; children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
      <CategoryDot category={category} />
      {children ?? categoryLabel(category, short)}
    </span>
  );
}
