"use client";

// Mails an Mia in der App: Vorschläge laden (nur mit Konto und Familie,
// Baustein „mails“ an), übernehmen (Termin, Aufgabe, Einkauf – wie von Hand
// eingetragen, mit „Rückgängig“), verwerfen, Absender lernen. Die Vorschläge
// selbst liegen nur auf dem Server (7 Tage) – nie in der Sicherung.

import { useEffect } from "react";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { createEntry, type Room } from "@/lib/core/entries";
import { todayIso } from "@/lib/core/now";
import { featureOn } from "@/lib/core/features";
import { getBackend, type MailAbsender } from "@/lib/konten/backend";
import { fail, type Result } from "@/lib/konten/model";
import { sanitizeEntry, upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { quickTaskData } from "@/lib/kalender/quick";
import { changeEntries } from "@/lib/kalender/store";
import { addManualItem, removeManualItems, sectionFor } from "@/lib/einkauf/shoppingList";
import { fragen } from "@/lib/mails/lernen";
import { mailDomain } from "@/lib/mails/adresse";
import type { MailEintrag, MailVorschlag } from "@/lib/mails/vorschlag";

type MailState = { items: MailEintrag[] | null; senders: MailAbsender[] };

let state: MailState = { items: null, senders: [] };
const listeners = new Set<() => void>();
const set = (next: Partial<MailState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: MailState = { items: null, senders: [] };
let loading: Promise<void> | null = null;

/** Neu laden (still; ohne Konto/Baustein bleibt es leer) */
function refreshMails(): Promise<void> {
  if (!featureOn("mails")) return Promise.resolve();
  loading ??= (async () => {
    const backend = await getBackend();
    if (!backend || !(await backend.user())) return set({ items: [], senders: [] });
    const [items, senders] = await Promise.all([backend.listMailItems(), backend.mailSenders()]);
    set({ items: items.ok ? items.value : (state.items ?? []), senders: senders.ok ? senders.value : state.senders });
  })().finally(() => {
    loading = null;
  });
  return loading;
}

/** Vorschläge aus Mails (null = lädt noch); fragt beim ersten Anzeigen */
export function useMails(): MailState {
  const value = useExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    void refreshMails();
  }, []);
  return value;
}

/** Ganze Adresse (lokaler Teil vom Server, Domain öffentlich) */
export async function mailAddress(room: Room, renew = false): Promise<Result<string>> {
  const backend = await getBackend();
  if (!backend) return fail("Dafür braucht es ein Konto.");
  const r = await backend.mailAddress(room, renew);
  return r.ok ? { ok: true, value: `${r.value}@${mailDomain()}` } : r;
}

export async function dropMail(id: string): Promise<void> {
  set({ items: (state.items ?? []).filter((m) => m.id !== id) });
  await (await getBackend())?.dropMailItem(id);
}

/** Ein Vorschlag → Eintrag; liefert „rückgängig“ und den Namen */
function save(v: MailVorschlag, room: Room, week: string): { undo: () => void; title: string } | null {
  const today = todayIso();
  if (v.kind === "einkauf") {
    const id = addManualItem(week, { name: v.name, amount: "", section: sectionFor(v.name) });
    return { undo: () => removeManualItems(week, [id]), title: v.name };
  }
  const data = v.kind === "termin" ? { title: v.title, date: v.date, start: v.start, reminder: "aus", repeat: null, ...(v.place ? { place: v.place } : {}) } : quickTaskData(v.title, { date: v.date, due: v.due }, today);
  const entry = sanitizeEntry(createEntry(v.kind, data, { raum: room }) as CalendarEntry);
  if (!entry) return null;
  return { undo: changeEntries((list) => upsertEntry(list, entry)), title: entry.data.title };
}

/** Übernehmen: die gewählten Vorschläge eintragen, Mail weg, Absender merkt sich „übernommen“ */
export async function acceptMail(item: MailEintrag, chosen: MailVorschlag[], shoppingWeek: string): Promise<{ undo: () => void; titles: string[] }> {
  const done = chosen.map((v) => save(v, item.room, shoppingWeek)).filter((x): x is NonNullable<typeof x> => x !== null);
  await dropMail(item.id);
  if (item.senderKey) {
    const backend = await getBackend();
    await backend?.markSender(item.senderKey, item.room, { accepted: true });
    set({ senders: state.senders.map((s) => (s.sender === item.senderKey && s.room === item.room ? { ...s, accepted: s.accepted + 1 } : s)) });
  }
  return { undo: () => done.forEach((d) => d.undo()), titles: done.map((d) => d.title) };
}

/** Absender, nach denen Mia einmal fragen darf (2. Mail, schon etwas übernommen, noch nie entschieden) */
export const senderToAsk = (senders: MailAbsender[]) => senders.find(fragen) ?? null;

export async function decideSender(s: MailAbsender, decision: "ja" | "nein"): Promise<void> {
  set({ senders: state.senders.map((x) => (x.sender === s.sender && x.room === s.room ? { ...x, decision } : x)) });
  await (await getBackend())?.markSender(s.sender, s.room, { decision });
}
