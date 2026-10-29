// Stoppuhr für die Übungen (A-051): vergangene Zeit, nicht „jetzt“ – deshalb
// `performance.now()` statt `now()` (die feste Testzeit im Durchklick hält die
// Uhr an, die Übung soll trotzdem laufen). Im Durchklick schneller:
// `window.__DURCHATMEN_TEMPO__ = 20` (1 Min. in 3 s).

export function laufUhr(): () => number {
  const tempo = () => {
    if (typeof window === "undefined") return 1;
    const t = Number((window as unknown as { __DURCHATMEN_TEMPO__?: number }).__DURCHATMEN_TEMPO__);
    return Number.isFinite(t) && t > 0 ? t : 1;
  };
  const basis = typeof performance !== "undefined" ? performance.now() : 0;
  return () => ((typeof performance !== "undefined" ? performance.now() : 0) - basis) * tempo();
}
