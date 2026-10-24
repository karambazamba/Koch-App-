// Mails an Mia (Eingang): eine weitergeleitete Mail lesen – wer hat sie
// wirklich geschickt (Original-Absender aus dem weitergeleiteten Teil), kommt
// sie sicher von jemandem aus der Familie, ist sie Werbung/Newsletter, ist es
// eine Gmail-/Outlook-Bestätigung? Rein: keine Netz-, keine Speicher-Zugriffe.
// Mia sieht nie ein Postfach – nur, was jemand selbst weiterleitet.

export type InboundMail = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  /** Kopfzeilen, Namen klein geschrieben */
  headers: Record<string, string>;
  attachments?: { filename: string }[];
};

/** „Kita Eutin <info@kita-eutin.de>“ → „info@kita-eutin.de“ */
function emailOf(text: string): string | null {
  const m = text.match(/<([^<>\s@]+@[^<>\s@]+)>/) ?? text.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  return m ? m[1].toLowerCase() : null;
}

export const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";

// Weitergeleitet aus Gmail („---------- Forwarded message ---------“ / „Weitergeleitete Nachricht“),
// Apple Mail („Begin forwarded message:“ / „Anfang der weitergeleiteten Nachricht:“), Outlook („-----Original Message-----“, „Von:“ …)
const FORWARD_MARK = /-{2,}\s*(forwarded message|weitergeleitete nachricht|original message|ursprüngliche nachricht)\s*-{2,}|^(begin forwarded message|anfang der weitergeleiteten nachricht):/im;

/** Original-Absender aus dem weitergeleiteten Teil (oder null, wenn nicht weitergeleitet) */
export function originalSender(mail: Pick<InboundMail, "text">): string | null {
  const at = mail.text.search(FORWARD_MARK);
  if (at < 0) return null;
  const rest = mail.text.slice(at);
  const line = rest.match(/^\s*(?:from|von)\s*:\s*(.+)$/im);
  return line ? emailOf(line[1]) : null;
}

/** Newsletter, Werbung, Benachrichtigungen (List-Unsubscribe, Precedence, Auto-Submitted, no-reply) */
function isBulk(mail: InboundMail, sender: string): boolean {
  const h = mail.headers;
  if (h["list-unsubscribe"] || h["list-id"]) return true;
  if (/^(bulk|list|junk)$/i.test((h["precedence"] ?? "").trim())) return true;
  if (h["auto-submitted"] && !/^no$/i.test(h["auto-submitted"].trim())) return true;
  return /^(no-?reply|noreply|notifications?|newsletter|news|marketing|info-?mail|mailer-daemon|bounce)[@+.-]/i.test(sender) || /(github\.com|vercel\.com|amazon\.|paypal\.|ebay\.)$/i.test(domainOf(sender));
}

/** Gmail/Outlook bestätigen die Weiterleitung mit einem Code – den zeigt Mia sofort */
export function forwardingConfirmation(mail: InboundMail): { anbieter: "Gmail" | "Outlook"; code: string } | null {
  const from = emailOf(mail.from) ?? "";
  if (/forwarding-noreply@google\.com$/.test(from)) {
    const m = mail.text.match(/(?:best[äa]tigungscode|confirmation code)\s*:?\s*(\d{6,12})/i) ?? mail.subject.match(/#(\d{6,12})/);
    return m ? { anbieter: "Gmail", code: m[1] } : null;
  }
  if (/@(outlook|microsoft|hotmail|live)\.com$/.test(from) && /(weiterleit|forward)/i.test(mail.subject)) {
    const m = mail.text.match(/\b(\d{6,8})\b/);
    return m ? { anbieter: "Outlook", code: m[1] } : null;
  }
  return null;
}

/** SPF/DKIM aus „Authentication-Results“ – ausdrücklich fehlgeschlagen = nicht annehmen */
function authFailed(mail: InboundMail): boolean {
  const r = (mail.headers["authentication-results"] ?? "").toLowerCase();
  return /\b(spf|dkim)=(fail|softfail|permerror)\b/.test(r) && !/\bdkim=pass\b/.test(r);
}

/** Wer hat weitergeleitet? (selbst geschickt bzw. Auto-Weiterleitung eines Postfachs) */
function forwarders(mail: InboundMail): string[] {
  const h = mail.headers;
  return [emailOf(mail.from), emailOf(h["x-forwarded-for"] ?? ""), emailOf(h["x-forwarded-to"] ?? ""), emailOf(h["return-path"] ?? ""), emailOf(h["sender"] ?? "")].filter((x): x is string => Boolean(x));
}

export type MailCheck = { ok: true; via: string; sender: string; forwarded: boolean } | { ok: false; reason: "fremd" | "werbung" | "unsicher" | "zu_gross" };

/** Annehmen nur, was sicher ist: von einem Familienmitglied weitergeleitet, keine Werbung, Prüfung nicht fehlgeschlagen */
export function checkMail(mail: InboundMail, memberEmails: string[], learned: string[] = [], maxBytes = 5_000_000): MailCheck {
  if (mail.text.length > maxBytes) return { ok: false, reason: "zu_gross" };
  if (authFailed(mail)) return { ok: false, reason: "unsicher" };
  const members = new Set(memberEmails.map((e) => e.toLowerCase()));
  const via = forwarders(mail).find((e) => members.has(e));
  if (!via) return { ok: false, reason: "fremd" };
  const original = originalSender(mail);
  const sender = original ?? emailOf(mail.from) ?? via;
  const known = learned.some((l) => sender === l || domainOf(sender) === l);
  if (!known && isBulk(mail, sender)) return { ok: false, reason: "werbung" };
  return { ok: true, via, sender, forwarded: Boolean(original) || sender !== via };
}

/** Text ohne Kopfzeilen der Weiterleitung und ohne Zitate – nur der Inhalt */
export function mailBody(text: string): string {
  const at = text.search(FORWARD_MARK);
  let body = at >= 0 ? text.slice(at).replace(FORWARD_MARK, "") : text;
  // Kopfzeilen der weitergeleiteten Mail (Von/Datum/Betreff/An) weg
  body = body.replace(/^\s*(from|von|date|datum|gesendet|sent|subject|betreff|to|an|cc)\s*:.*$/gim, "");
  return body
    .split(/\r?\n/)
    .filter((l) => !/^\s*>/.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Kurzer Auszug (≤ 300 Zeichen) für die Anzeige – mehr wird nie gespeichert */
export const excerpt = (text: string, max = 300) => {
  const t = mailBody(text).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
