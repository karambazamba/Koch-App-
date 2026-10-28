// Aufgaben sind persönlich – abgeben geht (Tafel 52 B). Reine Logik: Wem
// gehört eine Aufgabe, wer hält sie gerade, „An … geben“, „Passt gerade
// nicht“ und die Meldung, wenn eine abgegebene Aufgabe erledigt ist.
// Im Eintrag: besitzer = wer sie angelegt hat (Konto-ID, auf dem Gerät
// „lokal“), data.fuer = Konto-ID der Person, die sie gerade hält, data.zurueck
// = wer sie zuletzt zurückgegeben hat (nur, damit die Datenbank das Zurückgeben
// erlaubt – die App blendet sie dort aus). Ohne Konto ist alles „meins“.
// Familien-Aufgaben (A-034, Raum „familie“) sehen alle im Haushalt, jeder darf
// abhaken („erledigt von Lisa“, `data.doneBy`); „Ich“ und „Arbeit“ bleiben
// beim Besitzer (und bei wem er sie abgegeben hat).

import { LOCAL_OWNER } from "@/lib/core/entries";
import type { Member } from "@/lib/konten/model";
import { mitgliedName, personName } from "@/lib/konten/namen";

type TaskLike = { typ: string; besitzer: string; raum?: string; data: { fuer?: string; zurueck?: string; doneOn?: string | null; doneBy?: string; title?: string } };

/** Wie ich eine Aufgabe sehe: meine, bekommen (von jemand anderem), abgegeben (meine bei jemand anderem), familie (von jemand anderem, für alle), fremd (ausblenden) */
export type TaskRole = "meine" | "bekommen" | "abgegeben" | "familie" | "fremd";

const mineOwner = (besitzer: string, me: string | null) => besitzer === LOCAL_OWNER || (me !== null && besitzer === me);

export function taskRole(entry: TaskLike, me: string | null): TaskRole {
  if (entry.typ !== "aufgabe" || me === null) return "meine";
  const fuer = entry.data.fuer;
  if (mineOwner(entry.besitzer, me)) return fuer && fuer !== me ? "abgegeben" : "meine";
  if (fuer === me) return "bekommen";
  return entry.raum === "familie" ? "familie" : "fremd";
}

/** Sichtbar in Listen und Kacheln: meine, bekommene und Familien-Aufgaben (abgegebene nur unter „Abgegeben“) */
export const isMyTask = (entry: TaskLike, me: string | null) => {
  const r = taskRole(entry, me);
  return r === "meine" || r === "bekommen" || r === "familie";
};

/** Darf ich den Raum ändern? Nur der Besitzer (eine fremde Familien-Aufgabe würde sonst verschwinden) */
export const darfRaumAendern = (entry: Pick<TaskLike, "besitzer">, me: string | null) => mineOwner(entry.besitzer, me);

/** Anzeigename eines Kontos im Haushalt */
export const memberName = (members: Member[], userId: string | undefined) => personName(members.find((m) => m.userId === userId)?.displayName) || null;

/** „von Felix“ bei bekommenen und fremden Familien-Aufgaben; erledigt von jemand anderem: „erledigt von Lisa“; sonst null */
export function fromLabel(entry: TaskLike, me: string | null, members: Member[]): string | null {
  const done = entry.data.doneBy;
  if (entry.data.doneOn && done && done !== me) {
    const wer = memberName(members, done);
    if (wer) return `erledigt von ${wer}`;
  }
  const role = taskRole(entry, me);
  if (role !== "bekommen" && role !== "familie") return null;
  const name = memberName(members, entry.besitzer);
  return name ? `von ${name}` : null;
}

/**
 * Konto-IDs, die `fromLabel` bräuchte, aber in der (zwischengespeicherten)
 * Mitgliederliste noch nicht stehen – z. B. Lisa ist eben erst beigetreten
 * und hat schon abgehakt. Dann die Mitgliederliste neu holen, sonst fehlte
 * „erledigt von Lisa“ bis zum nächsten Öffnen der Konto-Seite.
 */
export function unbekannteMitglieder(entry: TaskLike, me: string | null, members: Member[]): string[] {
  if (entry.typ !== "aufgabe" || me === null) return [];
  const ids: string[] = [];
  const done = entry.data.doneBy;
  if (entry.data.doneOn && done && done !== me) ids.push(done);
  const role = taskRole(entry, me);
  if (role === "bekommen" || role === "familie") ids.push(entry.besitzer);
  return ids.filter((id) => id !== LOCAL_OWNER && memberName(members, id) === null);
}

/**
 * Wer hat abgehakt (A-034): neu erledigte Aufgaben bekommen `doneBy` = Konto,
 * wieder geöffnete verlieren es. Ohne Konto (`wer` null) bleibt alles, wie es ist.
 */
export function mitErledigtVon<E extends { id: string; typ: string; data: unknown }>(before: readonly E[], after: E[], wer: string | null): E[] {
  if (!wer) return after;
  const vorher = new Map(before.map((e) => [e.id, e]));
  const fertig = (e: E | undefined) => {
    const d = (e?.data ?? {}) as { doneOn?: string | null; doneDates?: string[] };
    return `${d.doneOn ?? ""}|${(d.doneDates ?? []).length}`;
  };
  return after.map((e) => {
    if (e.typ !== "aufgabe") return e;
    const alt = vorher.get(e.id);
    if (fertig(alt) === fertig(e)) return e;
    const d = e.data as { doneOn?: string | null; doneDates?: string[]; doneBy?: string };
    const altD = (alt?.data ?? {}) as { doneDates?: string[] };
    const jetztErledigt = Boolean(d.doneOn) || (d.doneDates ?? []).length > (altD.doneDates ?? []).length;
    if (jetztErledigt) return { ...e, data: { ...d, doneBy: wer } };
    const { doneBy: _weg, ...rest } = d;
    void _weg;
    return { ...e, data: rest };
  });
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
  return members.find((m) => personName(m.displayName).toLowerCase() === n) ?? members.find((m) => personName(m.displayName).toLowerCase().split(/\s+/)[0] === n) ?? null;
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
      notes.push(`„${rest.title ?? "Aufgabe"}“ ist jetzt bei ${mitgliedName(member)}.`);
      return { ...e, data: giveTo(rest, member.userId) };
    }
    notes.push(`${an} ist noch nicht im Haushalt – ich hab’s erstmal bei dir notiert.`);
    return { ...e, data: rest };
  });
  return { entries: next, notes };
}
