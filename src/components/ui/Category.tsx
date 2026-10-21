import type { RecipeCategory } from "@/lib/essen/cookbook";
import { RECIPE_CATEGORIES } from "@/lib/essen/cookbook";

/** Kategorien nur als kleine farbige Punkte – keine farbigen Flächen */
const CATEGORY_DOT: Record<RecipeCategory, string> = {
  fleisch: "bg-cat-fleisch",
  vegetarisch: "bg-cat-veggie",
  fisch: "bg-cat-fisch",
  cheatday: "bg-accent",
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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-fill px-2.5 py-0.5 text-xs font-semibold text-muted">
      <CategoryDot category={category} />
      {children ?? categoryLabel(category, short)}
    </span>
  );
}
