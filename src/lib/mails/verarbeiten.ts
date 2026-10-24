// Mails an Mia: was mit einer eingegangenen Mail passiert – rein, damit
// Webhook und Test-Backend gleich entscheiden. Gespeichert wird nur:
// Absender-Domain, Betreff, Auszug (≤ 300 Zeichen), Vorschläge, Namen der
// Anhänge – nie die Rohmail. Ohne Vorschlag nur leise „angekommen“ (24 Std.).

import type { Room } from "@/lib/core/entries";
import { checkMail, domainOf, excerpt, forwardingConfirmation, mailBody, type InboundMail } from "@/lib/mails/eingang";
import { absenderSchluessel } from "@/lib/mails/lernen";
import { vorschlaegeAus, type MailVorschlag } from "@/lib/mails/vorschlag";

/** Höchstens so viele Mails pro Familie und Tag */
const MAILS_PRO_TAG = 30;

export type MailKontext = { room: Room; memberEmails: string[]; learned: string[]; todayCount: number; today: string };

export type MailItem = {
  room: Room;
  senderDomain: string;
  senderKey: string;
  subject: string;
  excerpt: string;
  vorschlaege: MailVorschlag[];
  attachments: string[];
  confirmation: { anbieter: string; code: string } | null;
  /** Stunden bis zum Verfall (Vorschläge 7 Tage, „angekommen“ 24 Std.) */
  hours: number;
};

export type MailErgebnis = { action: "verwerfen"; reason: string } | { action: "speichern"; item: MailItem };

export function verarbeite(mail: InboundMail, ctx: MailKontext): MailErgebnis {
  if (ctx.todayCount >= MAILS_PRO_TAG) return { action: "verwerfen", reason: "limit" };
  const subject = mail.subject.replace(/^\s*((fwd?|wg|aw|re)\s*:\s*)+/i, "").trim().slice(0, 200);
  const attachments = (mail.attachments ?? []).map((a) => a.filename.slice(0, 80)).slice(0, 5);
  // Gmail/Outlook bestätigen die Weiterleitung: Code sofort zeigen
  const confirmation = forwardingConfirmation(mail);
  if (confirmation) return { action: "speichern", item: { room: ctx.room, senderDomain: domainOf(mail.from.match(/[^<\s]+@[^>\s]+/)?.[0] ?? ""), senderKey: "", subject, excerpt: "", vorschlaege: [], attachments: [], confirmation, hours: 24 } };
  const check = checkMail(mail, ctx.memberEmails, ctx.learned);
  if (!check.ok) return { action: "verwerfen", reason: check.reason };
  const vorschlaege = vorschlaegeAus(mailBody(mail.text), ctx.today);
  return {
    action: "speichern",
    item: { room: ctx.room, senderDomain: domainOf(check.sender), senderKey: absenderSchluessel(check.sender), subject, excerpt: excerpt(mail.text), vorschlaege, attachments, confirmation: null, hours: vorschlaege.length ? 24 * 7 : 24 },
  };
}

/** Webhook-Inhalt (Resend „email.received“) → Mail; Kopfzeilen klein */
export function mailAusWebhook(payload: unknown): InboundMail | null {
  const d = (payload as { data?: Record<string, unknown> } | null)?.data;
  if (!d || typeof d !== "object") return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : typeof v === "string" ? [v] : []);
  const headers: Record<string, string> = {};
  const raw = d.headers;
  if (Array.isArray(raw)) for (const h of raw as { name?: string; value?: string }[]) if (h?.name) headers[h.name.toLowerCase()] = str(h.value);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = str(v);
  const text = str(d.text) || str(d.html).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ");
  const attachments = Array.isArray(d.attachments) ? (d.attachments as { filename?: string }[]).map((a) => ({ filename: str(a?.filename) || "Anhang" })) : [];
  const from = str(d.from);
  const to = list(d.to);
  return from && to.length ? { from, to, subject: str(d.subject), text, headers, attachments } : null;
}
