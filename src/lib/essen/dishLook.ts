// Farbe eines Gerichts für die Teller-Zeichnung (ohne Foto): nach Kategorie,
// innerhalb leicht unterschiedlich je Name – gleiches Gericht, gleiche Farbe.

import type { RecipeCategory } from "@/lib/essen/cookbook";

const TONES: Record<RecipeCategory | "frei", string[]> = {
  vegetarisch: ["#7FA35A", "#9BB26A", "#C9A64B", "#E0A040"],
  fleisch: ["#B9733F", "#A65E3A", "#C98A4E", "#D97B4E"],
  fisch: ["#E2786A", "#E59A6F", "#D9A45C", "#C97F64"],
  cheatday: ["#E8823A", "#E0A040", "#D9663F", "#E2786A"],
  frei: ["#D97B4E", "#E0A040", "#7FA35A", "#E2786A"],
};

export function dishTone(title: string, category?: RecipeCategory | null): string {
  const list = TONES[category ?? "frei"] ?? TONES.frei;
  let h = 0;
  for (const c of title.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
