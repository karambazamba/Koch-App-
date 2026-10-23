// Aufgaben sind persönlich – abgeben geht (Tafel 52 B). Reine Logik: Wem
// gehört eine Aufgabe, wer hält sie gerade, „An … geben“, „Passt gerade
// nicht“ und die Meldung, wenn eine abgegebene Aufgabe erledigt ist.
// Im Eintrag: besitzer = wer sie angelegt hat (Konto-ID, auf dem Gerät
// „lokal“), data.fuer = Konto-ID der Person, die sie gerade hält, data.zurueck
// = wer sie zuletzt zurückgegeben hat (nur, damit die Datenbank das Zurückgeben
// erlaubt – die App blendet sie dort aus). Ohne Konto ist alles „meins“.

import { LOCAL_OWNER } from "@/lib/core/entries";
import type { Member } from "@/lib/konten/model";

type TaskLike = { typ: string; besitzer: string; data: { fuer?: string; zurueck?: string; doneOn?: string | null; title?: string } };

/** Wie ich eine Aufgabe sehe: meine, bekommen (von jemand anderem), abgegeben (meine bei jemand anderem), fremd (ausblenden) */
export type TaskRole = "meine" | "bekommen" | "abgegeben" | "fremd";

const mineOwner = (besitzer: string, me: string | null) => besitzer === LOCAL_OWNER || (me !== null && besitzer === me);

export function taskRole(entry: TaskLike, me: string | null): TaskRole {
  if (entry.typ !== "aufgabe" || me === null) return "meine";
  const fuer = entry.data.fuer;
  if (mineOwner(entry.besitzer, me)) return fuer && fuer !== me ? "abgegeben" : "meine";
  return fuer === me ? "bekommen" : "fremd";
}

/** Sichtbar in Listen und Kacheln (abgegebene nur unter „Abgegeben“) */
export const isMyTask = (entry: TaskLike, me: string | null) => {
  const r = taskRole(entry, me);
  return r === "meine" || r === "bekommen";
};

/** Anzeigename eines Kontos im Haushalt */
export const memberName = (members: Member[], userId: string | undefined) => members.find((m) => m.userId === userId)?.displayName ?? null;

/** „von Felix“ bei bekommenen Aufgaben, sonst null */
export function fromLabel(entry: TaskLike, me: string | null, members: Member[]): string | null {
  if (taskRole(entry, me) !== "bekommen") return null;
  const name = memberName(members, entry.besitzer);
  return name ? `von ${name}` : null;
}

/** Wer im Haushalt eine Aufgabe bekommen kann (alle außer mir) */
export const giveTargets = (members: Member[], me: string | null) => members.filter((m) => m.userId !== me);

/** „An … geben“: die Aufgabe hält jetzt `to` */
export function giveTo<T extends TaskLike["data"]>(data: T, to: string): T {
  const next = { ...data, fuer: to };
  delete next.zurueck;
  return next;
}

/** „Passt gerade nicht“: freundlich zurück an den Besitzer */
export function giveBack<T extends TaskLike["data"]>(data: T, me: string): T {
  const next = { ...data, zurueck: me };
  delete next.fuer;
  return next;
}

/** Selbst zurückholen (Besitzer): niemand sonst hält sie */
export function takeBack<T extends TaskLike["data"]>(data: T): T {
  const next = { ...data };
  delete next.fuer;
  delete next.zurueck;
  return next;
}

/** Ein Name aus dem Gespräch („Lisa“) → Konto im Haushalt (ohne Groß/Klein) */
export function memberByName(members: Member[], name: string): Member | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return members.find((m) => m.displayName.trim().toLowerCase() === n) ?? members.find((m) => m.displayName.trim().toLowerCase().split(/\s+/)[0] === n) ?? null;
}

/**
 * Meldungen für den Absender: abgegebene Aufgaben, die seit `before` erledigt
 * wurden („Lisa hat ‚Turnbeutel waschen‘ erledigt ✓“).
 */
export function doneNotes(before: TaskLike[], after: (TaskLike & { id: string })[], me: string | null, members: Member[]): string[] {
  const was = new Map(before.map((e) => [(e as TaskLike & { id: string }).id, e]));
  return after.flatMap((e) => {
    if (taskRole(e, me) !== "abgegeben" || !e.data.doneOn) return [];
    const old = was.get(e.id);
    if (!old || old.data.doneOn) return [];
    const who = memberName(members, e.data.fuer) ?? "Jemand";
    return [`${who} hat „${e.data.title ?? "die Aufgabe"}“ erledigt ✓`];
  });
}

/** Eine Aufgabe in der Liste ändern (für act/Rückgängig) */
export function changeTask<E extends { id: string; geaendert: string; data: TaskLike["data"] }>(list: E[], id: string, change: (data: E["data"]) => E["data"], stamp: string): E[] {
  return list.map((e) => (e.id === id ? { ...e, geaendert: stamp, data: change(e.data) } : e));
}

/**
 * Aus dem Gespräch („Sag Lisa, sie soll …“, Feld `an`): beim Übernehmen den
 * Namen zum Konto im Haushalt machen. Unbekannter Name (oder ohne Haushalt):
 * die Aufgabe bleibt bei mir, mit einem kurzen Satz.
 */
export function resolveGiving<E extends { typ: string; data: unknown }>(entries: E[], members: Member[], me: string | null): { entries: E[]; notes: string[] } {
  const notes: string[] = [];
  const next = entries.map((e) => {
    const data = e.data as { an?: string; title?: string; fuer?: string; zurueck?: string };
    if (e.typ !== "aufgabe" || !data.an) return e;
    const { an, ...rest } = data;
    const member = me ? memberByName(members.filter((m) => m.userId !== me), an) : null;
    if (member) {
      notes.push(`„${rest.title ?? "Aufgabe"}“ ist jetzt bei ${member.displayName}.`);
      return { ...e, data: giveTo(rest, member.userId) };
    }
    notes.push(`${an} ist noch nicht im Haushalt – ich hab’s erstmal bei dir notiert.`);
    return { ...e, data: rest };
  });
  return { entries: next, notes };
}
