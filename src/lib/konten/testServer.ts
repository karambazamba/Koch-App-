// Test-Backend (nur Durchklick, KONTEN_TEST=1): Konten, Anmelde-Codes,
// Haushalt, Einladungen (Code und Link) im Speicher des Testservers – mit denselben Regeln wie
// die Datenbank-Funktionen (supabase/migrations): ein Haushalt je Konto, nur
// Erwachsene laden ein, Code 7 Tage gültig und einmal nutzbar, höchstens 10
// Fehlversuche pro Stunde, leerer Haushalt verschwindet. Kein Netz, keine
// echten Mails – `admin_code` liefert den Code für den Test. Einträge
// (Etappe 3b) wie die Tabelle `entries`: neueste Änderung gewinnt, Arbeit nur
// für den Besitzer, Löschen nur als Markierung, `rev` zählt hoch. Sprach-
// nachrichten (Etappe 3c) wie der Bucket „memos“: nur der eigene Haushalt
// (erster Ordner), nur harmlose Pfade, höchstens 2 MB.

import type { HouseholdInfo, Member, Role } from "@/lib/konten/model";
import { normalizeInviteCode } from "@/lib/konten/model";
import type { CloudDoc } from "@/lib/konten/sync/docs";

type User = { id: string; email: string };
type Membership = Member & { householdId: string };
type Invite = { householdId: string; role: Role; expires: number; usedBy: string | null };
type InviteLinkRow = { householdId: string; role: Role; inviterName: string; expires: number; revoked: boolean; uses: number; createdBy: string };

type State = {
  users: Map<string, User>;
  otps: Map<string, { code: string; at: number }>;
  sessions: Map<string, string>;
  households: Map<string, { id: string; name: string; region: string | null }>;
  members: Membership[];
  invites: Map<string, Invite>;
  /** Einladungs-Links (Token → Einladung), wie Tabelle `invite_links` */
  links: Map<string, InviteLinkRow>;
  attempts: Map<string, number[]>;
  /** Haushalt → Einträge */
  entries: Map<string, Map<string, CloudDoc & { besitzer: string }>>;
  rev: number;
  /** Ton der Sprachnachrichten: Pfad <haushalt>/<datei> → Inhalt (wie Bucket „memos“) */
  files: Map<string, { data: string; mime: string; at: number }>;
};

const OTP_MS = 900_000;
const INVITE_MS = 7 * 86_400_000;
const LINK_MS = 14 * 86_400_000;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const g = globalThis as unknown as { __wasgibtsKonten?: State };
const state = (): State =>
  (g.__wasgibtsKonten ??= { users: new Map(), otps: new Map(), sessions: new Map(), households: new Map(), members: [], invites: new Map(), links: new Map(), attempts: new Map(), entries: new Map(), rev: 0, files: new Map() });

/** Für Tests: alles leeren @public */
export function resetTestKonten() {
  g.__wasgibtsKonten = undefined;
}

const rand = (n: number, chars: string) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
const id = () => `${rand(8, "0123456789abcdef")}-${rand(4, "0123456789abcdef")}-4${rand(3, "0123456789abcdef")}-a${rand(3, "0123456789abcdef")}-${rand(12, "0123456789abcdef")}`;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Sichtbar wie in der Datenbank: Aufgaben nur für Besitzer, Empfänger und wer sie zurückgab; sonst Familie oder eigene Arbeit */
function visible(d: { typ: string; raum: string; besitzer: string; data: unknown }, uid: string): boolean {
  if (d.typ === "aufgabe") {
    const data = (d.data ?? {}) as { fuer?: unknown; zurueck?: unknown };
    return d.besitzer === uid || data.fuer === uid || data.zurueck === uid;
  }
  return d.raum === "familie" || d.besitzer === uid;
}

/** Wie `memo_household` in der Datenbank: Haushalt aus dem Pfad, sonst null */
const MEMO_PATH = /^([0-9a-f-]{36})\/[A-Za-z0-9_-]{1,80}\.(m4a|webm|ogg)$/;
const memoHousehold = (path: unknown) => (typeof path === "string" ? (MEMO_PATH.exec(path)?.[1] ?? null) : null);

function householdOf(s: State, userId: string): HouseholdInfo | null {
  const mine = s.members.find((m) => m.userId === userId);
  if (!mine) return null;
  const h = s.households.get(mine.householdId);
  if (!h) return null;
  const members = s.members.filter((m) => m.householdId === h.id).map(({ householdId: _h, ...m }) => (void _h, m));
  return { id: h.id, name: h.name, region: h.region, members, me: members.find((m) => m.userId === userId) as Member };
}

function removeMember(s: State, userId: string) {
  const mine = s.members.find((m) => m.userId === userId);
  s.members = s.members.filter((m) => m.userId !== userId);
  // „Arbeit“ geht mit, Familie bleibt
  const rows = mine && s.entries.get(mine.householdId);
  if (rows) for (const [k, d] of rows) if (d.raum === "arbeit" && d.besitzer === userId) rows.delete(k);
  if (mine && !s.members.some((m) => m.householdId === mine.householdId)) {
    s.households.delete(mine.householdId);
    s.entries.delete(mine.householdId);
    for (const p of s.files.keys()) if (memoHousehold(p) === mine.householdId) s.files.delete(p);
    for (const [code, inv] of s.invites) if (inv.householdId === mine.householdId) s.invites.delete(code);
    for (const [token, l] of s.links) if (l.householdId === mine.householdId) s.links.delete(token);
  }
}

/** Eine Aktion ausführen (wie ein Aufruf an Supabase) */
export function testKonten(body: Record<string, unknown>, nowMs = Date.now()): Record<string, unknown> {
  const s = state();
  const email = str(body.email, 200).trim().toLowerCase();
  const userId = typeof body.token === "string" ? s.sessions.get(body.token) : undefined;
  const user = userId ? [...s.users.values()].find((u) => u.id === userId) : undefined;
  switch (body.action) {
    case "send_code": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "invalid email" };
      s.otps.set(email, { code: rand(6, "0123456789"), at: nowMs });
      return { ok: true };
    }
    case "admin_code":
      return { code: s.otps.get(email)?.code ?? null };
    case "invite_link_info": {
      const l = s.links.get(str(body.linkToken, 64).toLowerCase());
      if (!l || l.revoked) return { status: "unbekannt", inviter: "", family: "" };
      if (l.expires < nowMs) return { status: "abgelaufen", inviter: l.inviterName, family: "" };
      return { status: "gueltig", inviter: l.inviterName, family: s.households.get(l.householdId)?.name ?? "" };
    }
    case "verify": {
      const otp = s.otps.get(email);
      if (!otp || otp.code !== str(body.code, 6) || nowMs - otp.at > OTP_MS) return { error: "otp_expired" };
      s.otps.delete(email);
      let u = s.users.get(email);
      if (!u) {
        u = { id: id(), email };
        s.users.set(email, u);
      }
      const token = rand(32, "abcdefghijklmnopqrstuvwxyz0123456789");
      s.sessions.set(token, u.id);
      return { token, user: { userId: u.id, email } };
    }
  }
  if (!user) return { error: "nicht_angemeldet" };
  switch (body.action) {
    case "session":
      return { user: { userId: user.id, email: user.email } };
    case "sign_out":
      s.sessions.delete(body.token as string);
      return { ok: true };
    case "my_household":
      return { household: householdOf(s, user.id) };
    case "create_household": {
      if (s.members.some((m) => m.userId === user.id)) return { error: "schon_im_haushalt" };
      const h = { id: id(), name: str(body.name, 60), region: null };
      s.households.set(h.id, h);
      s.members.push({ householdId: h.id, userId: user.id, displayName: str(body.displayName, 40), role: "erwachsener", personId: str(body.personId, 80) || null });
      return { householdId: h.id };
    }
    case "create_invite": {
      const mine = s.members.find((m) => m.userId === user.id && m.role === "erwachsener");
      if (!mine) return { error: "darf_nicht_einladen" };
      const role: Role = body.role === "kind" ? "kind" : "erwachsener";
      const code = rand(6, ALPHABET);
      s.invites.set(code, { householdId: mine.householdId, role, expires: nowMs + INVITE_MS, usedBy: null });
      return { code: `${code.slice(0, 3)}-${code.slice(3)}` };
    }
    case "create_invite_link": {
      const mine = s.members.find((m) => m.userId === user.id && m.role === "erwachsener");
      if (!mine) return { error: "darf_nicht_einladen" };
      const token = rand(32, "0123456789abcdef");
      s.links.set(token, { householdId: mine.householdId, role: body.role === "kind" ? "kind" : "erwachsener", inviterName: mine.displayName, expires: nowMs + LINK_MS, revoked: false, uses: 0, createdBy: user.id });
      return { token };
    }
    case "list_invite_links": {
      const mine = s.members.find((m) => m.userId === user.id && m.role === "erwachsener");
      if (!mine) return { links: [] };
      const links = [...s.links].filter(([, l]) => l.householdId === mine.householdId && !l.revoked && l.expires > nowMs).map(([token, l]) => ({ ref: token.slice(0, 12), role: l.role, inviterName: l.inviterName, expiresAt: new Date(l.expires).toISOString(), uses: l.uses }));
      return { links };
    }
    case "revoke_invite_link": {
      const mine = s.members.find((m) => m.userId === user.id && m.role === "erwachsener");
      if (!mine) return { error: "darf_nicht_einladen" };
      for (const [token, l] of s.links) if (l.householdId === mine.householdId && token.slice(0, 12) === str(body.ref, 12)) l.revoked = true;
      return { ok: true };
    }
    case "join_by_link": {
      const recent = (s.attempts.get(user.id) ?? []).filter((t) => nowMs - t < 3_600_000);
      if (recent.length >= 10) return { error: "zu_viele_versuche" };
      const l = s.links.get(str(body.linkToken, 64).toLowerCase());
      const problem = !l || l.revoked ? "link_unbekannt" : l.expires < nowMs ? "link_abgelaufen" : null;
      if (problem || !l) {
        s.attempts.set(user.id, [...recent, nowMs]);
        return { error: problem };
      }
      const current = s.members.find((m) => m.userId === user.id);
      if (current?.householdId === l.householdId) return { householdId: l.householdId };
      if (current) {
        if (body.switchFamily !== true) return { error: "andere_familie", family: s.households.get(current.householdId)?.name ?? "" };
        removeMember(s, user.id);
      }
      s.members.push({ householdId: l.householdId, userId: user.id, displayName: str(body.displayName, 40), role: l.role, personId: str(body.personId, 80) || null });
      l.uses += 1;
      s.attempts.delete(user.id);
      return { householdId: l.householdId };
    }
    case "join_household": {
      if (s.members.some((m) => m.userId === user.id)) return { error: "schon_im_haushalt" };
      const recent = (s.attempts.get(user.id) ?? []).filter((t) => nowMs - t < 3_600_000);
      if (recent.length >= 10) return { error: "zu_viele_versuche" };
      const code = normalizeInviteCode(str(body.code, 20)) ?? "";
      const inv = s.invites.get(code);
      const problem = !inv ? "code_unbekannt" : inv.usedBy ? "code_benutzt" : inv.expires < nowMs ? "code_abgelaufen" : null;
      if (problem || !inv) {
        s.attempts.set(user.id, [...recent, nowMs]);
        return { error: problem };
      }
      s.members.push({ householdId: inv.householdId, userId: user.id, displayName: str(body.displayName, 40), role: inv.role, personId: str(body.personId, 80) || null });
      inv.usedBy = user.id;
      s.attempts.delete(user.id);
      return { householdId: inv.householdId };
    }
    case "leave_household":
      removeMember(s, user.id);
      return { ok: true };
    case "delete_account":
      removeMember(s, user.id);
      s.users.delete(user.email);
      for (const [t, u] of s.sessions) if (u === user.id) s.sessions.delete(t);
      return { ok: true };
    case "push_entries": {
      // wie die RLS-Regel entry_visible (Migration aufgaben_persoenlich)
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      if (!hh) return { error: "kein_haushalt" };
      const rows = s.entries.get(hh) ?? new Map();
      s.entries.set(hh, rows);
      const skipped: string[] = [];
      for (const d of Array.isArray(body.docs) ? (body.docs as CloudDoc[]).slice(0, 500) : []) {
        const old = rows.get(d.id);
        const raum = d.raum === "arbeit" ? "arbeit" : "familie";
        if (old && (!visible(old, user.id) || (old.typ !== "aufgabe" && raum === "arbeit" && old.besitzer !== user.id))) {
          skipped.push(d.id);
          continue;
        }
        if (old && Date.parse(old.geaendert) >= Date.parse(d.geaendert)) continue;
        rows.set(d.id, { id: d.id, typ: d.typ, raum, besitzer: old?.besitzer ?? user.id, erstellt: old?.erstellt ?? d.erstellt, geaendert: d.geaendert, geloescht: Boolean(d.geloescht), data: d.data ?? {}, rev: ++s.rev });
      }
      return { ok: true, skipped };
    }
    case "pull_entries": {
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      const since = Number(body.since) || 0;
      const docs = [...(hh ? (s.entries.get(hh)?.values() ?? []) : [])]
        .filter((d) => (d.rev ?? 0) > since && visible(d, user.id))
        .sort((a, b) => (a.rev ?? 0) - (b.rev ?? 0));
      return { docs: docs.slice(0, 500), more: docs.length > 500 };
    }
    case "upload_memo": {
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      const data = str(body.data, 3_000_000);
      if (!hh || memoHousehold(body.path) !== hh || !data || data.length > 2_800_000) return { error: "nicht_erlaubt" };
      s.files.set(body.path as string, { data, mime: str(body.mime, 60) || "audio/webm", at: nowMs });
      return { ok: true };
    }
    case "download_memo": {
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      const f = hh && memoHousehold(body.path) === hh ? s.files.get(body.path as string) : undefined;
      return f ? { data: f.data, mime: f.mime } : { error: "nicht_gefunden" };
    }
    case "list_memos": {
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      if (!hh || body.householdId !== hh) return { files: [] };
      return { files: [...s.files].filter(([p]) => memoHousehold(p) === hh).map(([name, f]) => ({ name, createdAt: new Date(f.at).toISOString() })) };
    }
    case "remove_memos": {
      const hh = s.members.find((m) => m.userId === user.id)?.householdId;
      for (const p of Array.isArray(body.paths) ? body.paths : []) if (hh && memoHousehold(p) === hh) s.files.delete(p as string);
      return { ok: true };
    }
    case "export":
      return { konto: { userId: user.id, email: user.email }, haushalt: householdOf(s, user.id) };
    default:
      return { error: "unbekannt" };
  }
}
