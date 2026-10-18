// Einfaches Rate-Limit pro Gerät (und IP) im Speicher der Server-Instanz.
// Auf Vercel hat jede Instanz ihren eigenen Zähler – als Schutz gegen
// Dauerfeuer reicht das; für harte Grenzen später einen gemeinsamen Speicher.

const WINDOWS = [
  { ms: 60_000, max: 6 }, // pro Minute
  { ms: 60 * 60_000, max: 40 }, // pro Stunde
  { ms: 24 * 60 * 60_000, max: 150 }, // pro Tag
];

const hits = new Map<string, number[]>();

/**
 * true = erlaubt (und gezählt), false = zu viele Anfragen. `factor` hebt die
 * Grenzen an (z. B. pro IP, hinter der mehrere Familien-Geräte stecken können).
 */
export function allowRequest(key: string, factor = 1, now = Date.now()): boolean {
  const longest = WINDOWS[WINDOWS.length - 1].ms;
  const list = (hits.get(key) ?? []).filter((t) => now - t < longest);
  const blocked = WINDOWS.some((w) => list.filter((t) => now - t < w.ms).length >= w.max * factor);
  if (!blocked) list.push(now);
  hits.set(key, list);
  // Speicher klein halten
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= longest)) hits.delete(k);
  }
  return !blocked;
}
