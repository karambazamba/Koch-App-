"use client";

// Supabase-Umsetzung der Konten-Schnittstelle (erst bei Bedarf geladen).
// Anmeldung immer per 6-stelligem Code (signInWithOtp + verifyOtp) – nie per
// Magic-Link, der auf dem iPhone in Safari statt in der App aufgeht. Die
// Sitzung liegt unter `wasgibts.konto` (Speicher-Verzeichnis, nicht in der
// Sicherung). Haushalt über die Datenbank-Funktionen (RLS schützt den Rest).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readRaw, writeRaw } from "@/lib/core/localStore";
import { fail, friendlyError, ok, type CloudUser, type HouseholdInfo, type Member, type Role } from "@/lib/konten/model";
import type { CloudBackend } from "@/lib/konten/backend";
import type { CloudDoc } from "@/lib/konten/sync/docs";
import { memoContentType } from "@/lib/konten/memoShare";

/** Sitzung nur unter unserem Schlüssel speichern */
const storage = {
  getItem: () => readRaw("wasgibts.konto"),
  setItem: (_key: string, value: string) => writeRaw("wasgibts.konto", value),
  removeItem: () => writeRaw("wasgibts.konto", null),
};

type MemberRow = { user_id: string; display_name: string; role: Role; person_id: string | null; household_id: string };

type EntryRow = Omit<CloudDoc, "rev"> & { rev: number | string };

/** Zeiten einheitlich als ISO (die Datenbank schreibt „+00:00“) */
const iso = (t: string) => new Date(t).toISOString();
const fromRow = (r: EntryRow): CloudDoc => ({ ...r, erstellt: iso(r.erstellt), geaendert: iso(r.geaendert), rev: Number(r.rev) });

const member = (r: MemberRow): Member => ({ userId: r.user_id, displayName: r.display_name, role: r.role, personId: r.person_id });

export function supabaseBackend(url: string, key: string): CloudBackend {
  const sb: SupabaseClient = createClient(url, key, {
    auth: { storageKey: "wasgibts.konto", storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  const user = async (): Promise<CloudUser | null> => {
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? "" } : null;
  };
  return {
    mode: "supabase",
    sendCode: async (email) => {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      return error ? fail(friendlyError(error.code ?? error.message)) : ok(true);
    },
    verifyCode: async (email, code) => {
      const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
      if (error || !data.user) return fail(friendlyError(error?.code ?? error?.message ?? "otp_expired"));
      return ok({ userId: data.user.id, email: data.user.email ?? email });
    },
    user,
    accessToken: async () => (await sb.auth.getSession()).data.session?.access_token ?? null,
    signOut: async () => {
      await sb.auth.signOut({ scope: "local" });
    },
    myHousehold: async () => {
      const me = await user();
      if (!me) return fail(friendlyError("nicht_angemeldet"));
      const { data: rows, error } = await sb.from("members").select("user_id, display_name, role, person_id, household_id");
      if (error) return fail(friendlyError(error.message));
      const members = (rows ?? []) as MemberRow[];
      const mine = members.find((r) => r.user_id === me.userId);
      if (!mine) return ok(null);
      const { data: hh, error: e2 } = await sb.from("households").select("id, name, region").eq("id", mine.household_id).single();
      if (e2 || !hh) return fail(friendlyError(e2?.message));
      const info: HouseholdInfo = { id: hh.id as string, name: hh.name as string, region: (hh.region as string | null) ?? null, members: members.map(member), me: member(mine) };
      return ok(info);
    },
    createHousehold: async (name, displayName, personId) => {
      const { data, error } = await sb.rpc("create_household", { p_name: name, p_display_name: displayName, p_person_id: personId });
      return error ? fail(friendlyError(error.message)) : ok(data as string);
    },
    createInvite: async (role) => {
      const { data, error } = await sb.rpc("create_invite", { p_role: role });
      return error ? fail(friendlyError(error.message)) : ok(data as string);
    },
    joinHousehold: async (code, displayName, personId) => {
      const { data, error } = await sb.rpc("join_household", { p_code: code, p_display_name: displayName, p_person_id: personId });
      if (error) return fail(friendlyError(error.message));
      const r = data as { household_id?: string; error?: string };
      return r.household_id ? ok(r.household_id) : fail(friendlyError(r.error));
    },
    leaveHousehold: async () => {
      const { error } = await sb.rpc("leave_household");
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
    deleteAccount: async () => {
      const token = (await sb.auth.getSession()).data.session?.access_token;
      if (!token) return fail(friendlyError("nicht_angemeldet"));
      const res = await fetch("/api/konto/loeschen", { method: "POST", headers: { authorization: `Bearer ${token}` } }).catch(() => null);
      if (!res?.ok) return fail(friendlyError(res ? String(res.status) : "network"));
      await sb.auth.signOut({ scope: "local" });
      return ok(true);
    },
    exportData: async () => {
      const me = await user();
      if (!me) return fail(friendlyError("nicht_angemeldet"));
      const [members, households, profiles] = await Promise.all([sb.from("members").select("*"), sb.from("households").select("*"), sb.from("profiles").select("*").eq("user_id", me.userId)]);
      const entries = await sb.from("entries").select("id, typ, raum, erstellt, geaendert, geloescht, data").eq("besitzer", me.userId);
      return ok({ konto: me, mitglieder: members.data ?? [], haushalt: households.data ?? [], profil: profiles.data ?? [], eintraege: entries.data ?? [] });
    },
    pushEntries: async (docs) => {
      const skipped: string[] = [];
      for (let i = 0; i < docs.length; i += 200) {
        const part = docs.slice(i, i + 200).map(({ id, typ, raum, erstellt, geaendert, geloescht, data }) => ({ id, typ, raum, erstellt, geaendert, geloescht, data }));
        const { data, error } = await sb.rpc("sync_entries", { p_docs: part });
        if (error) return fail(friendlyError(error.message));
        const r = data as { skipped?: string[]; error?: string };
        if (r.error) return fail(friendlyError(r.error));
        skipped.push(...(r.skipped ?? []));
      }
      return ok({ skipped });
    },
    pullEntries: async (since) => {
      const { data, error } = await sb.from("entries").select("id, typ, raum, besitzer, erstellt, geaendert, geloescht, data, rev").gt("rev", since).order("rev").limit(500);
      if (error) return fail(friendlyError(error.message));
      const rows = (data ?? []) as EntryRow[];
      return ok({ docs: rows.map(fromRow), more: rows.length === 500 });
    },
    watchEntries: (householdId, onChange) => {
      const channel = sb
        .channel(`entries-${householdId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "entries", filter: `household_id=eq.${householdId}` }, () => onChange())
        .subscribe();
      return () => void sb.removeChannel(channel);
    },
    uploadMemo: async (path, blob) => {
      const { error } = await sb.storage.from("memos").upload(path, blob, { contentType: memoContentType(blob.type), upsert: false });
      // Schon da (zweiter Versuch nach Netzabbruch) = geklappt
      return !error || /exist|duplicate/i.test(error.message) ? ok(true) : fail(friendlyError(error.message));
    },
    downloadMemo: async (path) => {
      const { data, error } = await sb.storage.from("memos").download(path);
      return error ? null : data;
    },
    listMemos: async (householdId) => {
      const { data, error } = await sb.storage.from("memos").list(householdId, { limit: 1000 });
      if (error) return fail(friendlyError(error.message));
      return ok((data ?? []).filter((f) => f.id).map((f) => ({ name: `${householdId}/${f.name}`, createdAt: f.created_at ?? "" })));
    },
    removeMemos: async (paths) => {
      if (!paths.length) return ok(true);
      const { error } = await sb.storage.from("memos").remove(paths);
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
  };
}
