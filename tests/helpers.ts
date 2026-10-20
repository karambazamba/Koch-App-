// Gemeinsame Hilfen für die Tests: feste Zeit und kleiner Speicher im Speicher
import { setNowForTests } from "@/lib/core/now";

/** Feste Zeit (Europe/Berlin), z. B. "2026-10-20T09:00" */
export function at(iso: string) {
  setNowForTests(new Date(`${iso}:00+02:00`));
}

/** Einfacher Ersatz für localStorage/sessionStorage */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}
