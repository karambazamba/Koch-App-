// Test-Backend (nur Durchklick, KONTEN_TEST=1): Konten, Anmelde-Codes,
// Haushalt, Einladungen im Speicher des Testservers – mit denselben Regeln wie
// die Datenbank-Funktionen (supabase/migrations): ein Haushalt je Konto, nur
// Erwachsene laden ein, Code 7 Tage gültig und einmal nutzbar, höchstens 10
// Fehlversuche pro Stunde, leerer Haushalt verschwindet. Kein Netz, keine
// echten Mails – `admin_code` liefert den Code für den Test.

import type { HouseholdInfo, Member, Role } from "@/lib/konten/model";
import { normalizeInviteCode } from "@/lib/konten/model";

type User = { id: string; email: string };
type Membership = Member & { householdId: string };
type Invite = { householdId: string; role: Role; expires: number; usedBy: string | null };

type State = {
  users: Map<string, User>;
  otps: Map<string, { code: string; at: number }>;
  sessions: Map<string, string>;
  households: Map<string, { id: string; name: string; region: string | null }>;
  members: Membership[];
  invites: Map<string, Invite>;
  attempts: Map<string, number[]>;
};

const OTP_MS = 900_000;
const INVITE_MS = 7 * 86_400_000;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const g = globalThis as unknown as { __wasgibtsKonten?: State };
const state = (): State =>
  (g.__wasgibtsKonten ??= { users: new Map(), otps: new Map(), sessions: new Map(), households: new Map(), members: [], invites: new Map(), attempts: new Map() });

/** Für Tests: alles leeren @public */
export function resetTestKonten() {
  g.__wasgibtsKonten = undefined;
}

const rand = (n: number, chars: string) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
const id = () => `${rand(8, "0123456789abcdef")}-${rand(4, "0123456789abcdef")}-4${rand(3, "0123456789abcdef")}-a${rand(3, "0123456789abcdef")}-${rand(12, "0123456789abcdef")}`;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

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
  if (mine && !s.members.some((m) => m.householdId === mine.householdId)) {
    s.households.delete(mine.householdId);
    for (const [code, inv] of s.invites) if (inv.householdId === mine.householdId) s.invites.delete(code);
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
    case "export":
      return { konto: { userId: user.id, email: user.email }, haushalt: householdOf(s, user.id) };
    default:
      return { error: "unbekannt" };
  }
}
