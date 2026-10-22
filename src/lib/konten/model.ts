// Konten und gemeinsamer Haushalt – reine Hilfen ohne Netz: Typen, Codes
// (Einladung „4K7-P2Q“, Anmelde-Code 6 Ziffern), Teilen-Text und freundliche
// Sätze statt Technik-Fehlern. Die Verbindung steckt in `backend.ts`.

export type Role = "erwachsener" | "kind";

export type Member = { userId: string; displayName: string; role: Role; personId: string | null };

export type HouseholdInfo = { id: string; name: string; region: string | null; members: Member[]; me: Member };

export type CloudUser = { userId: string; email: string };

/** Ergebnis: geklappt (mit Wert) oder ein freundlicher Satz */
export type Result<T = true> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });

/** Einladungs-Code: 6 Zeichen ohne verwechselbare (kein 0/O, 1/I) */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Eingabe säubern: groß, ohne Strich/Leerzeichen; null = kein gültiger Code */
export function normalizeInviteCode(raw: string): string | null {
  const t = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (t.length !== 6 || [...t].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return t;
}

/** „4K7P2Q“ → „4K7-P2Q“ */
export const formatInviteCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);

/** Text für das Teilen-Menü */
export const inviteShareText = (code: string) => `Komm in unseren Haushalt bei Was gibt’s? Code: ${formatInviteCode(code)}`;

export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

/** Anmelde-Code: genau 6 Ziffern (Leerzeichen erlaubt) */
export const otpDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, 6);

/** Fehler aus Datenbank/Anmeldung → Satz (nie Technik) */
export function friendlyError(code: string | undefined | null): string {
  const c = (code ?? "").toLowerCase();
  if (/code_unbekannt/.test(c)) return "Diesen Code kenne ich nicht – nochmal schauen?";
  if (/code_benutzt/.test(c)) return "Dieser Code wurde schon benutzt – bitte um einen neuen.";
  if (/code_abgelaufen/.test(c)) return "Der Code ist abgelaufen – bitte um einen neuen.";
  if (/zu_viele_versuche/.test(c)) return "Zu viele Versuche – in einer Stunde geht’s wieder.";
  if (/schon_im_haushalt/.test(c)) return "Du bist schon in einem Haushalt.";
  if (/darf_nicht_einladen/.test(c)) return "Einladen können nur Erwachsene.";
  if (/nicht_angemeldet|jwt|session/.test(c)) return "Bitte melde dich nochmal an.";
  if (/otp_expired|expired|invalid.*(token|otp)|token.*(invalid|expired)/.test(c)) return "Der Code stimmt nicht oder ist abgelaufen – nochmal versuchen oder neu senden.";
  if (/rate|too many|security purposes|429/.test(c)) return "Gerade wurden viele Codes verschickt – bitte kurz warten.";
  if (/email.*(invalid|valid)|invalid.*email/.test(c)) return "Diese E-Mail-Adresse sieht nicht ganz richtig aus.";
  if (/fetch|network|offline|failed to/.test(c)) return "Gerade keine Verbindung – gleich nochmal?";
  return "Hm, das hat gerade nicht geklappt – gleich nochmal?";
}
