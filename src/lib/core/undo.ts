// Gemeinsames "Rückgängig" für alles, was Lotte (mit oder ohne KI) ändert:
// Jede Änderung legt hier ihr Zurücknehmen ab. Der Knopf im Toast nimmt sie
// sofort zurück, "Mach das rückgängig" im Chat später die letzte noch
// gültige. Lebt nur in dieser Sitzung (Funktionen lassen sich nicht speichern).

type Undo = { label: string; run: () => void; done: boolean };

const stack: Undo[] = [];

/** Änderung merken; liefert das Zurücknehmen (wirkt nur einmal) */
export function pushUndo(label: string, run: () => void): () => void {
  const entry: Undo = { label, run, done: false };
  stack.push(entry);
  if (stack.length > 20) stack.shift();
  return () => {
    if (entry.done) return;
    entry.done = true;
    entry.run();
  };
}

/** Letzte noch gültige Änderung zurücknehmen; liefert ihre Beschreibung oder null */
export function undoLast(): string | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i];
    if (entry.done) continue;
    entry.done = true;
    entry.run();
    return entry.label;
  }
  return null;
}
