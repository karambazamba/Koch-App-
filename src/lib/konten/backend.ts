"use client";

// Verbindung für Konten und Haushalt – eine Schnittstelle, zwei Umsetzungen:
// Supabase (Echtbetrieb, erst bei Bedarf geladen) und das Test-Backend des
// Durchklicks. Ob Konten da sind, sagt der Server zur Laufzeit
// (/api/konto/config) – ohne Variablen bleibt alles wie bisher auf dem Gerät.

import { useEffect, useState } from "react";
import { readRaw, writeRaw } from "@/lib/core/localStore";
import { fail, friendlyError, ok, type CloudUser, type HouseholdInfo, type Result, type Role } from "@/lib/konten/model";

export type CloudMode = "aus" | "supabase" | "test";

export interface CloudBackend {
  mode: CloudMode;
  sendCode(email: string): Promise<Result>;
  verifyCode(email: string, code: string): Promise<Result<CloudUser>>;
  user(): Promise<CloudUser | null>;
  /** Für Server-Aufrufe (Konto löschen) */
  accessToken(): Promise<string | null>;
  signOut(): Promise<void>;
  myHousehold(): Promise<Result<HouseholdInfo | null>>;
  createHousehold(name: string, displayName: string, personId: string | null): Promise<Result<string>>;
  createInvite(role: Role): Promise<Result<string>>;
  joinHousehold(code: string, displayName: string, personId: string | null): Promise<Result<string>>;
  leaveHousehold(): Promise<Result>;
  deleteAccount(): Promise<Result>;
  exportData(): Promise<Result<Record<string, unknown>>>;
}

type Config = { mode: "aus" } | { mode: "test" } | { mode: "supabase"; url: string; key: string };

let configPromise: Promise<Config> | null = null;
let backendPromise: Promise<CloudBackend | null> | null = null;

/** Einmal pro Laden fragen; offline/Fehler = aus (später nochmal) */
function loadConfig(): Promise<Config> {
  configPromise ??= fetch("/api/konto/config")
    .then((r) => r.json() as Promise<Config>)
    .catch(() => {
      configPromise = null;
      return { mode: "aus" } as Config;
    });
  return configPromise;
}

/** Nur: sind Konten eingerichtet? (lädt Supabase NICHT – für Hallo-Bildschirm und Einstellungen) */
export function useCloudMode(): CloudMode | null {
  const [mode, setMode] = useState<CloudMode | null>(null);
  useEffect(() => {
    let on = true;
    void loadConfig().then((c) => on && setMode(c.mode));
    return () => {
      on = false;
    };
  }, []);
  return mode;
}

/** Verbindung (null = Konten nicht eingerichtet) */
export function getBackend(): Promise<CloudBackend | null> {
  backendPromise ??= loadConfig().then(async (c) => {
    if (c.mode === "test") return testBackend();
    if (c.mode === "supabase") return (await import("@/lib/konten/supabaseBackend")).supabaseBackend(c.url, c.key);
    backendPromise = null;
    return null;
  });
  return backendPromise;
}

// --- Test-Backend (Durchklick) ------------------------------------------------

type TestSession = { token: string; user: CloudUser };

const session = (): TestSession | null => {
  try {
    const s = JSON.parse(readRaw("wasgibts.konto") ?? "null") as TestSession | null;
    return s?.token ? s : null;
  } catch {
    return null;
  }
};

async function call(action: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  try {
    const res = await fetch("/api/test-konten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, token: session()?.token, ...body }) });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { error: "network" };
  }
}

const err = (r: Record<string, unknown>) => (typeof r.error === "string" ? friendlyError(r.error) : null);

function testBackend(): CloudBackend {
  return {
    mode: "test",
    sendCode: async (email) => {
      const r = await call("send_code", { email });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    verifyCode: async (email, code) => {
      const r = await call("verify", { email, code });
      if (err(r)) return fail(err(r) as string);
      writeRaw("wasgibts.konto", JSON.stringify({ token: r.token, user: r.user }));
      return ok(r.user as CloudUser);
    },
    user: async () => {
      if (!session()) return null;
      const r = await call("session");
      return (r.user as CloudUser | undefined) ?? (r.error === "network" ? (session()?.user ?? null) : null);
    },
    accessToken: async () => session()?.token ?? null,
    signOut: async () => {
      await call("sign_out");
      writeRaw("wasgibts.konto", null);
    },
    myHousehold: async () => {
      const r = await call("my_household");
      return err(r) ? fail(err(r) as string) : ok((r.household as HouseholdInfo | null) ?? null);
    },
    createHousehold: async (name, displayName, personId) => {
      const r = await call("create_household", { name, displayName, personId });
      return err(r) ? fail(err(r) as string) : ok(r.householdId as string);
    },
    createInvite: async (role) => {
      const r = await call("create_invite", { role });
      return err(r) ? fail(err(r) as string) : ok(r.code as string);
    },
    joinHousehold: async (code, displayName, personId) => {
      const r = await call("join_household", { code, displayName, personId });
      return err(r) ? fail(err(r) as string) : ok(r.householdId as string);
    },
    leaveHousehold: async () => {
      const r = await call("leave_household");
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    deleteAccount: async () => {
      const token = session()?.token;
      const res = await fetch("/api/konto/loeschen", { method: "POST", headers: { authorization: `Bearer ${token ?? ""}` } }).then((x) => x.json() as Promise<Record<string, unknown>>, () => ({ error: "network" }));
      if (err(res)) return fail(err(res) as string);
      writeRaw("wasgibts.konto", null);
      return ok(true);
    },
    exportData: async () => {
      const r = await call("export");
      return err(r) ? fail(err(r) as string) : ok(r);
    },
  };
}
