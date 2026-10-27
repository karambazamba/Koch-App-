// Notiz bearbeiten sichert von selbst: kurz nach dem letzten Tippen (gebündelt),
// und sofort beim Schließen (`flush`). „Fertig“ schließt nur.

export type Autosave<T> = { push: (value: T) => void; flush: () => void };

export function createAutosave<T>(save: (value: T) => void, delay = 400): Autosave<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const { value } = pending;
    pending = null;
    save(value);
  };
  return {
    push(value) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    flush,
  };
}
