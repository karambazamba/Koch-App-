"use client";

// Supabase-Umsetzung der Konten-Schnittstelle (erst bei Bedarf geladen).
// Anmeldung per 6-stelligem Code (signInWithOtp + verifyOtp) – nie per
// Magic-Link, der auf dem iPhone in Safari statt in der App aufgeht. Apple/
// Google (nur wenn eingeschaltet) per OAuth mit PKCE, Rückkehr auf /auth/callback. Die
// Sitzung liegt unter `wasgibts.konto` (Speicher-Verzeichnis, nicht in der
// Sicherung). Haushalt über die Datenbank-Funktionen (RLS schützt den Rest).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readRaw, writeRaw } from "@/lib/core/localStore";
import { fail, friendlyError, ok, type CloudUser, type HouseholdInfo, type InviteInfo, type InviteLink, type Member, type Role } from "@/lib/konten/model";
import type { CloudBackend, MailAbsender } from "@/lib/konten/backend";
import type { MailEintrag, MailVorschlag } from "@/lib/mails/vorschlag";
import type { Room } from "@/lib/core/entries";
import type { CloudDoc } from "@/lib/konten/sync/docs";
import { memoContentType } from "@/lib/konten/memoShare";

/** Sitzung nur unter unserem Schlüssel speichern */
const slot = (key: string) => (key.endsWith("-code-verifier") ? "wasgibts.konto-pkce" : "wasgibts.konto");
const storage = {
  getItem: (key: string) => readRaw(slot(key)),
  setItem: (key: string, value: string) => writeRaw(slot(key), value),
  removeItem: (key: string) => writeRaw(slot(key), null),
};

type MemberRow = { user_id: string; display_name: string; role: Role; person_id: string | null; household_id: string };

type EntryRow = Omit<CloudDoc, "rev"> & { rev: number | string };

/** Zeiten einheitlich als ISO (die Datenbank schreibt „+00:00“) */
const iso = (t: string) => new Date(t).toISOString();
const fromRow = (r: EntryRow): CloudDoc => ({ ...r, erstellt: iso(r.erstellt), geaendert: iso(r.geaendert), rev: Number(r.rev) });

type MailRow = { id: string; room: Room; sender_domain: string; sender_key: string; subject: string; excerpt: string; vorschlaege: MailVorschlag[]; attachments: string[]; confirmation: MailEintrag["confirmation"]; created_at: string };
const mailItem = (r: MailRow): MailEintrag => ({ id: r.id, room: r.room, senderDomain: r.sender_domain, senderKey: r.sender_key, subject: r.subject, excerpt: r.excerpt, vorschlaege: r.vorschlaege ?? [], attachments: r.attachments ?? [], confirmation: r.confirmation ?? null, at: iso(r.created_at) });

const member = (r: MemberRow): Member => ({ userId: r.user_id, displayName: r.display_name, role: r.role, personId: r.person_id });

export function supabaseBackend(url: string, key: string): CloudBackend {
  const sb: SupabaseClient = createClient(url, key, {
    auth: { storageKey: "wasgibts.konto", storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
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
    startOAuth: async (provider) => {
      const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
    finishOAuth: async (code) => {
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      const u = data.session?.user;
      return error || !u ? fail(friendlyError(error?.message ?? "nicht_angemeldet")) : ok({ userId: u.id, email: u.email ?? "" });
    },
    createInviteLink: async (role) => {
      const { data, error } = await sb.rpc("create_invite_link", { p_role: role });
      return error ? fail(friendlyError(error.message)) : ok(data as string);
    },
    listInviteLinks: async () => {
      const { data, error } = await sb.rpc("list_invite_links");
      if (error) return fail(friendlyError(error.message));
      const rows = (data ?? []) as { ref: string; role: Role; inviter_name: string; expires_at: string; uses: number }[];
      return ok(rows.map((r): InviteLink => ({ ref: r.ref, role: r.role, inviterName: r.inviter_name, expiresAt: iso(r.expires_at), uses: Number(r.uses) })));
    },
    revokeInviteLink: async (ref) => {
      const { error } = await sb.rpc("revoke_invite_link", { p_ref: ref });
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
    inviteInfo: async (token) => {
      const { data, error } = await sb.rpc("invite_link_info", { p_token: token });
      if (error) return fail(friendlyError(error.message));
      const r = (data ?? {}) as Partial<InviteInfo>;
      return ok({ status: r.status === "gueltig" || r.status === "abgelaufen" ? r.status : "unbekannt", inviter: r.inviter ?? "", family: r.family ?? "" });
    },
    joinByLink: async (token, displayName, personId, switchFamily) => {
      const { data, error } = await sb.rpc("join_by_link", { p_token: token, p_display_name: displayName, p_person_id: personId, p_switch: switchFamily });
      if (error) return fail(friendlyError(error.message));
      const r = data as { household_id?: string; error?: string; family?: string };
      if (r.error === "andere_familie") return ok({ otherFamily: r.family ?? "" });
      return r.household_id ? ok({ householdId: r.household_id }) : fail(friendlyError(r.error));
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
      const [entries, consents, mails] = await Promise.all([
        sb.from("entries").select("id, typ, raum, erstellt, geaendert, geloescht, data").eq("besitzer", me.userId),
        sb.from("einwilligungen").select("art, version, ja, at"),
        sb.from("mail_items").select("room, sender_domain, subject, excerpt, vorschlaege, created_at"),
      ]);
      return ok({ konto: me, mitglieder: members.data ?? [], haushalt: households.data ?? [], profil: profiles.data ?? [], eintraege: entries.data ?? [], einwilligungen: consents.data ?? [], mail_vorschlaege: mails.data ?? [] });
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
    uploadFoto: async (path, blob) => {
      const { error } = await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      return !error || /exist|duplicate/i.test(error.message) ? ok(true) : fail(friendlyError(error.message));
    },
    downloadFoto: async (path) => {
      const { data, error } = await sb.storage.from("fotos").download(path);
      return error ? null : data;
    },
    mailAddress: async (room, renew) => {
      const { data, error } = await sb.rpc("mail_address", { p_room: room, p_renew: renew });
      return error ? fail(friendlyError(error.message)) : ok(String(data));
    },
    listMailItems: async () => {
      const { data, error } = await sb.from("mail_items").select("id, room, sender_domain, sender_key, subject, excerpt, vorschlaege, attachments, confirmation, created_at").order("created_at", { ascending: false }).limit(50);
      return error ? fail(friendlyError(error.message)) : ok(((data ?? []) as MailRow[]).map(mailItem));
    },
    dropMailItem: async (id) => {
      const { error } = await sb.from("mail_items").delete().eq("id", id);
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
    mailSenders: async () => {
      const { data, error } = await sb.from("mail_senders").select("room, sender, count, accepted, decision").order("updated_at", { ascending: false }).limit(100);
      return error ? fail(friendlyError(error.message)) : ok((data ?? []) as MailAbsender[]);
    },
    saveConsent: async (art, version, ja) => {
      const { error } = await sb.from("einwilligungen").insert({ art, version, ja });
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
    markSender: async (sender, room, change) => {
      const { error } = "decision" in change ? await sb.rpc("mail_sender_decide", { p_sender: sender, p_room: room, p_decision: change.decision }) : await sb.rpc("mail_sender_accepted", { p_sender: sender, p_room: room });
      return error ? fail(friendlyError(error.message)) : ok(true);
    },
  };
}
