"use client";

// Verbindung für Konten und Haushalt – eine Schnittstelle, zwei Umsetzungen:
// Supabase (Echtbetrieb, erst bei Bedarf geladen) und das Test-Backend des
// Durchklicks. Ob Konten da sind, sagt der Server zur Laufzeit
// (/api/konto/config) – ohne Variablen bleibt alles wie bisher auf dem Gerät.

import { useEffect, useState } from "react";
import { readRaw, writeRaw } from "@/lib/core/localStore";
import { fail, friendlyError, ok, type CloudUser, type HouseholdInfo, type InviteInfo, type InviteLink, type Result, type Role } from "@/lib/konten/model";
import type { CloudDoc } from "@/lib/konten/sync/docs";
import type { OAuthProvider } from "@/lib/konten/oauth";
import { memoContentType } from "@/lib/konten/memoShare";
import type { Room } from "@/lib/core/entries";
import type { MailEintrag } from "@/lib/mails/vorschlag";
import type { Absender } from "@/lib/mails/lernen";

export type CloudMode = "aus" | "supabase" | "test";

/** Beitreten per Link: geklappt, oder schon in einer anderen Familie (Name) */
export type JoinOutcome = { householdId: string } | { otherFamily: string };

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
  /** Mit Apple/Google anmelden (verlässt die Seite); Rückkehr: finishOAuth mit dem Code aus /auth/callback */
  startOAuth(provider: OAuthProvider): Promise<Result>;
  finishOAuth(code: string): Promise<Result<CloudUser>>;
  /** Einladen per Link (Tafel 22): Token, 14 Tage, mehrfach nutzbar */
  createInviteLink(role: Role): Promise<Result<string>>;
  listInviteLinks(): Promise<Result<InviteLink[]>>;
  revokeInviteLink(ref: string): Promise<Result>;
  /** Auch ohne Anmeldung: wer lädt ein, in welche Familie, noch gültig? */
  inviteInfo(token: string): Promise<Result<InviteInfo>>;
  joinByLink(token: string, displayName: string, personId: string | null, switchFamily: boolean): Promise<Result<JoinOutcome>>;
  leaveHousehold(): Promise<Result>;
  deleteAccount(): Promise<Result>;
  exportData(): Promise<Result<Record<string, unknown>>>;
  /** Einträge hochladen (neueste Änderung gewinnt); `skipped` = abgelehnt */
  pushEntries(docs: CloudDoc[]): Promise<Result<{ skipped: string[] }>>;
  /** Einträge seit `since` (rev) holen – nur, was man sehen darf */
  pullEntries(since: number): Promise<Result<{ docs: CloudDoc[]; more: boolean }>>;
  /** Bescheid sagen, wenn sich im Haushalt etwas ändert (Realtime); liefert „aufhören“ */
  watchEntries(householdId: string, onChange: () => void): () => void;
  /** Ton einer Sprachnachricht ablegen (Bucket „memos“, Pfad <haushalt>/<id>.<endung>) */
  uploadMemo(path: string, blob: Blob): Promise<Result>;
  /** Ton holen; null = gerade nicht (offline, schon weggeräumt) */
  downloadMemo(path: string): Promise<Blob | null>;
  /** Bild eines Foto-Zettels ablegen (Bucket „fotos“, Pfad <haushalt>/<id>.jpg) */
  uploadFoto(path: string, blob: Blob): Promise<Result>;
  /** Bild holen; null = gerade nicht */
  downloadFoto(path: string): Promise<Blob | null>;
  /** Mails an Mia: lokaler Teil der Adresse (Familie bzw. eigene Arbeit); `renew` = neue Adresse, alte nimmt nichts mehr an */
  mailAddress(room: Room, renew: boolean): Promise<Result<string>>;
  listMailItems(): Promise<Result<MailEintrag[]>>;
  dropMailItem(id: string): Promise<Result>;
  mailSenders(): Promise<Result<MailAbsender[]>>;
  /** Einwilligung festhalten (Nachweis; nur anhängen) */
  saveConsent(art: string, version: number, ja: boolean): Promise<Result>;
  /** „Ja, gern“ / „Nein danke“ bzw. „übernommen“ zählen */
  markSender(sender: string, room: Room, change: { decision: "ja" | "nein" } | { accepted: true }): Promise<Result>;
}

export type MailAbsender = Absender & { room: Room };

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

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
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
    // Im Durchklick gibt es kein Apple/Google
    startOAuth: async () => fail(friendlyError("oauth")),
    finishOAuth: async () => fail(friendlyError("oauth")),
    createInviteLink: async (role) => {
      const r = await call("create_invite_link", { role });
      return err(r) ? fail(err(r) as string) : ok(r.token as string);
    },
    listInviteLinks: async () => {
      const r = await call("list_invite_links");
      return err(r) ? fail(err(r) as string) : ok((r.links as InviteLink[]) ?? []);
    },
    revokeInviteLink: async (ref) => {
      const r = await call("revoke_invite_link", { ref });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    inviteInfo: async (token) => {
      const r = await call("invite_link_info", { linkToken: token });
      return err(r) ? fail(err(r) as string) : ok(r as unknown as InviteInfo);
    },
    joinByLink: async (token, displayName, personId, switchFamily) => {
      const r = await call("join_by_link", { linkToken: token, displayName, personId, switchFamily });
      if (r.error === "andere_familie") return ok({ otherFamily: String(r.family ?? "") });
      return err(r) ? fail(err(r) as string) : ok({ householdId: r.householdId as string });
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
    pushEntries: async (docs) => {
      const r = await call("push_entries", { docs });
      return err(r) ? fail(err(r) as string) : ok({ skipped: (r.skipped as string[]) ?? [] });
    },
    pullEntries: async (since) => {
      const r = await call("pull_entries", { since });
      return err(r) ? fail(err(r) as string) : ok({ docs: (r.docs as CloudDoc[]) ?? [], more: r.more === true });
    },
    uploadMemo: async (path, blob) => {
      const r = await call("upload_memo", { path, mime: memoContentType(blob.type), data: await toBase64(blob) });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    downloadMemo: async (path) => {
      const r = await call("download_memo", { path });
      return typeof r.data === "string" ? fromBase64(r.data, String(r.mime ?? "audio/webm")) : null;
    },
    uploadFoto: async (path, blob) => {
      const r = await call("upload_foto", { path, mime: "image/jpeg", data: await toBase64(blob) });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    downloadFoto: async (path) => {
      const r = await call("download_foto", { path });
      return typeof r.data === "string" ? fromBase64(r.data, "image/jpeg") : null;
    },
    mailAddress: async (room, renew) => {
      const r = await call("mail_address", { room, renew });
      return err(r) ? fail(err(r) as string) : ok(r.local as string);
    },
    listMailItems: async () => {
      const r = await call("mail_items");
      return err(r) ? fail(err(r) as string) : ok((r.items as MailEintrag[]) ?? []);
    },
    dropMailItem: async (id) => {
      const r = await call("drop_mail_item", { id });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    mailSenders: async () => {
      const r = await call("mail_senders");
      return err(r) ? fail(err(r) as string) : ok((r.senders as MailAbsender[]) ?? []);
    },
    markSender: async (sender, room, change) => {
      const r = await call("mail_sender", { sender, room, ...change });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    saveConsent: async (art, version, ja) => {
      const r = await call("consent", { art, version, ja });
      return err(r) ? fail(err(r) as string) : ok(true);
    },
    // Im Test ohne Realtime: alle 2 Sekunden nachsehen lassen
    watchEntries: (_householdId, onChange) => {
      const t = window.setInterval(onChange, 2000);
      return () => window.clearInterval(t);
    },
  };
}
