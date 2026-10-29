// Sichtbar machen (Etappe 3d): wer im Haushalt etwas eingetragen hat – nur,
// wenn mehrere Personen dabei sind und es nicht von mir ist. Dazu die leisen
// Neuigkeiten für die Jetzt-Karte („Milch steht auf der Liste – hat Lisa
// gerade gesetzt“): aus dem, was beim Abgleich von anderen kommt, höchstens
// eine am Tag, jede nur einmal. Rein: Werte rein, Werte raus.

import type { Member } from "@/lib/konten/model";
import { personName } from "@/lib/konten/namen";
import type { CloudDoc } from "@/lib/konten/sync/docs";

export type Who = { name: string };

/** Von wem (null = von mir, allein im Haushalt oder unbekannt) */
export function addedBy(besitzer: unknown, members: Member[], me: string | null): Who | null {
  if (typeof besitzer !== "string" || !besitzer || besitzer === me || members.length < 2) return null;
  const m = members.find((x) => x.userId === besitzer);
  const name = personName(m?.displayName);
  return name ? { name } : null;
}

/** Eine Neuigkeit von jemand anderem im Haushalt */
export type FamilyNews = { id: string; title: string; detail: string; at: string; href: string };

/** Neuigkeiten bleiben 6 Std. frisch – danach erzählt die Kachel es ohnehin */
export const NEWS_FRESH_MS = 6 * 3_600_000;

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/**
 * Was beim Abgleich neu von anderen kam (nur Neues – Änderungen nicht):
 * Einkauf, Termine und „unterwegs“ („Lisa ist gleich bei REWE“). Aufgaben
 * haben ihr eigenes „von …“ (Abgeben), die Pinnwand ihr eigenes Thema.
 * Titel nie mit „…“ gekürzt – die Jetzt-Karte bricht um (A-054).
 */
export function newsFromDocs(docs: CloudDoc[], knownBefore: (id: string) => boolean, members: Member[], me: string | null): FamilyNews[] {
  const news: FamilyNews[] = [];
  for (const d of docs) {
    if (d.geloescht || knownBefore(d.id)) continue;
    const who = addedBy(d.besitzer, members, me);
    if (!who) continue;
    const data = isObj(d.data) ? d.data : {};
    if (d.typ === "einkauf" && isObj(data.item) && typeof data.item.name === "string" && data.item.name.trim()) {
      news.push({ id: d.id, title: `${data.item.name.trim()} steht auf der Liste`, detail: `Hat ${who.name} gerade gesetzt.`, at: d.geaendert, href: "/einkaufsliste" });
    } else if (d.typ === "termin" && d.raum === "familie") {
      const entry = isObj(data.data) ? data.data : {};
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : null;
      if (title) news.push({ id: d.id, title: `Neu: ${title}`, detail: `Hat ${who.name} eingetragen.`, at: d.geaendert, href: date ? `/tag?datum=${date}` : "/" });
    } else if (d.typ === "unterwegs" && typeof data.shop === "string" && data.shop.trim() && typeof data.end !== "string") {
      news.push({ id: d.id, title: `${who.name} ist gleich bei ${data.shop.trim()}`, detail: "Braucht ihr noch was?", at: d.geaendert, href: "/einkaufsliste" });
    }
  }
  return news;
}

export type NewsState = { version: 1; items: FamilyNews[]; shown: string[]; lastDay: string | null };

export const emptyNews = (): NewsState => ({ version: 1, items: [], shown: [], lastDay: null });

/** Neue dazulegen (höchstens 10, Älteres fällt raus) */
export function addNews(state: NewsState, news: FamilyNews[]): NewsState {
  if (!news.length) return state;
  const items = [...state.items.filter((n) => !news.some((x) => x.id === n.id)), ...news].slice(-10);
  return { ...state, items };
}

/** Die eine Neuigkeit für die Jetzt-Karte: frisch, noch nie gezeigt, höchstens eine am Tag */
export function newsForCard(state: NewsState, nowMs: number, today: string): FamilyNews | null {
  if (state.lastDay === today) {
    const shownToday = state.items.find((n) => n.id === state.shown[state.shown.length - 1]);
    return shownToday && nowMs - (Date.parse(shownToday.at) || 0) < NEWS_FRESH_MS ? shownToday : null;
  }
  const fresh = state.items.filter((n) => !state.shown.includes(n.id) && nowMs - (Date.parse(n.at) || 0) < NEWS_FRESH_MS);
  return fresh[fresh.length - 1] ?? null;
}

/** Als gezeigt merken (dann kommt sie nie wieder, und heute keine andere) */
export function markNewsShown(state: NewsState, id: string, today: string): NewsState {
  if (state.shown.includes(id) && state.lastDay === today) return state;
  return { ...state, shown: [...state.shown.filter((s) => s !== id), id].slice(-30), lastDay: today };
}

export function migrateNews(raw: unknown): NewsState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((n): n is FamilyNews => isObj(n) && typeof n.id === "string" && typeof n.title === "string" && typeof n.detail === "string" && typeof n.at === "string")
    .map((n) => ({ ...n, href: typeof n.href === "string" && n.href.startsWith("/") ? n.href : "/" }));
  const shown = Array.isArray(raw.shown) ? raw.shown.filter((s): s is string => typeof s === "string") : [];
  return { version: 1, items, shown, lastDay: typeof raw.lastDay === "string" ? raw.lastDay : null };
}
