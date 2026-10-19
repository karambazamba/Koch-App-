// Ein Tipp für Theos/Lottes Satz oben auf "Heute" (Bausteine Tipps und
// Wochenend-Ideen): pro Tag stabil, ohne Speicher. Fr–So zuerst eine
// Wochenend-Idee (falls an), sonst ein Tipp zum heutigen Gericht, sonst ein
// allgemeiner – reihum nach Datum.

import { ALL_TIPS } from "./index";
import type { Tip } from "./types";

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);

export function dailyTip(
  date: string,
  opts: { dish: string | null; tips: boolean; weekendIdeas: boolean; kids: boolean; persons: number },
): Tip | null {
  const n = dayNumber(date);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = So
  const fits = (t: Tip) => !t.audience || (t.audience === "kids" ? opts.kids : t.audience === "nokids" ? !opts.kids : opts.persons === 2);
  if (opts.weekendIdeas && (weekday === 5 || weekday === 6 || weekday === 0)) {
    const ideas = ALL_TIPS.filter((t) => t.category === "wochenende" && fits(t));
    if (ideas.length) return ideas[n % ideas.length];
  }
  if (!opts.tips) return null;
  const forDish = opts.dish ? ALL_TIPS.filter((t) => t.category === "gericht" && t.match?.test(opts.dish!.toLowerCase())) : [];
  if (forDish.length) return forDish[n % forDish.length];
  const general = ALL_TIPS.filter((t) => t.category !== "gericht" && t.category !== "wochenende" && fits(t));
  return general.length ? general[n % general.length] : null;
}
