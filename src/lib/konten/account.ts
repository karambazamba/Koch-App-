"use client";

// Konto und Haushalt für die Oberfläche: Zustand (laedt/aus/angemeldet …),
// Anmelden per Code, Haushalt anlegen/beitreten, einladen, abmelden, Konto
// löschen, Daten exportieren. Der letzte bekannte Haushalt liegt in
// `cache.ts` (offline sichtbar). Die Verbindung selbst: `backend.ts`.

import { useEffect } from "react";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { STORAGE } from "@/lib/core/storage";
import { writeRaw } from "@/lib/core/localStore";
import { getBackend, type CloudMode } from "@/lib/konten/backend";
import { accountCache } from "@/lib/konten/cache";
import { fail, friendlyError, normalizeInviteCode, type CloudUser, type HouseholdInfo, type Result, type Role } from "@/lib/konten/model";

export type AccountState = { mode: CloudMode | "laedt"; user: CloudUser | null; household: HouseholdInfo | null };

const cached = () => accountCache.load();
let state: AccountState = { mode: "laedt", user: cached()?.user ?? null, household: cached()?.household ?? null };
const listeners = new Set<() => void>();
const set = (next: Partial<AccountState>) => {
  state = { ...state, ...next };
  if (state.mode !== "laedt") accountCache.save({ version: 1, user: state.user, household: state.household });
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: AccountState = { mode: "laedt", user: null, household: null };

let refreshing: Promise<void> | null = null;

/** Neu fragen: eingerichtet? angemeldet? Haushalt? (offline: alter Stand bleibt) */
function refreshAccount(): Promise<void> {
  refreshing ??= (async () => {
    const backend = await getBackend();
    if (!backend) return set({ mode: "aus" });
    const user = await backend.user();
    if (!user) return set({ mode: backend.mode, user: null, household: null });
    const h = await backend.myHousehold();
    set({ mode: backend.mode, user, household: h.ok ? h.value : state.household });
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Konto-Zustand; fragt beim ersten Anzeigen nach */
export function useAccount(): AccountState {
  const value = useExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    if (state.mode === "laedt") void refreshAccount();
  }, []);
  return value;
}

const notReady = () => fail<never>("Konten sind gerade nicht erreichbar – gleich nochmal?");

export async function sendLoginCode(email: string): Promise<Result> {
  const b = await getBackend();
  return b ? b.sendCode(email) : notReady();
}

export async function verifyLoginCode(email: string, code: string): Promise<Result<CloudUser>> {
  const b = await getBackend();
  if (!b) return notReady();
  const r = await b.verifyCode(email, code);
  if (r.ok) await refreshAccount();
  return r;
}

export async function createHousehold(name: string, displayName: string, personId: string | null): Promise<Result<string>> {
  const b = await getBackend();
  if (!b) return notReady();
  const r = await b.createHousehold(name.trim() || "Unser Haushalt", displayName, personId);
  if (r.ok) await refreshAccount();
  return r;
}

export async function joinHousehold(code: string, displayName: string, personId: string | null): Promise<Result<string>> {
  const clean = normalizeInviteCode(code);
  if (!clean) return fail(friendlyError("code_unbekannt"));
  const b = await getBackend();
  if (!b) return notReady();
  const r = await b.joinHousehold(clean, displayName, personId);
  if (r.ok) await refreshAccount();
  return r;
}

export async function createInvite(role: Role): Promise<Result<string>> {
  const b = await getBackend();
  return b ? b.createInvite(role) : notReady();
}

/** Alle Daten dieser App vom Gerät entfernen (nur auf ausdrücklichen Wunsch beim Abmelden) */
function clearLocalData() {
  for (const s of STORAGE) if (s.area === "local" || s.area === "session") writeRaw(s.key, null, s.area);
}

/** Abmelden; `keepLocal` = Daten auf dem Handy behalten */
export async function signOut(keepLocal: boolean): Promise<void> {
  const b = await getBackend();
  await b?.signOut();
  set({ user: null, household: null });
  writeRaw("wasgibts.haushalt", null);
  if (!keepLocal) clearLocalData();
}

export async function deleteAccount(): Promise<Result> {
  const b = await getBackend();
  if (!b) return notReady();
  const r = await b.deleteAccount();
  if (r.ok) {
    set({ user: null, household: null });
    writeRaw("wasgibts.haushalt", null);
  }
  return r;
}

export async function exportAccount(): Promise<Result<Record<string, unknown>>> {
  const b = await getBackend();
  return b ? b.exportData() : notReady();
}
