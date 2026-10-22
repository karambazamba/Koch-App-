
import { restoreRecipe } from "@/lib/essen/cookbook";
import type { HouseholdProfile, NeverAgainEntry } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";


/** Titel vergleichbar machen */
const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß ]/g, "").replace(/\s+/g, " ").trim();

/** Steht ein Gericht (oder ein sehr ähnlich benanntes) auf der "Nie wieder"-Liste? */
export function isNeverAgain(title: string, list: NeverAgainEntry[]): boolean {
  const t = norm(title);
  if (!t) return false;
  return list.some((e) => {
    const n = norm(e.title);
    return n === t || (n.length >= 5 && t.includes(n)) || (t.length >= 5 && n.includes(t));
  });
}

/** Eintrag wiederherstellen: aus der Liste nehmen, Rezept zurück ins Kochbuch */
export function restoreNeverAgain(profile: HouseholdProfile, id: string) {
  const entry = profile.neverAgain.find((e) => e.id === id);
  if (!entry) return;
  if (entry.recipe) restoreRecipe(entry.recipe);
  saveProfile({ ...profile, neverAgain: profile.neverAgain.filter((e) => e.id !== id) });
}
