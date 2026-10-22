// Mails schreiben und beantworten – ohne Postfach: Man fügt eine Mail ein
// (oder sagt "Mail an die Kita: …"), Lotte schreibt einen Entwurf, man
// sendet selbst ("In Mail öffnen" = mailto-Link, "Kopieren"). Nie
// automatisch senden. Eingefügte Mails werden nirgends gespeichert, nur der
// Chat (im Speicher, wie bisher) kennt sie.
//
// Rein (App und Server): Erkennung, mailto, Anrede/Gruß und die einfachen
// Entwürfe für die Zeit ohne KI und den Testmodus.

import { findDate, parseCalendar, type Draft } from "@/lib/kalender/parse";

export type MailTone = "du" | "sie";

export type MailDraft = {
  /** E-Mail-Adresse – leer, wenn keine bekannt ist (dann trägt man sie in der Mail-App ein) */
  to: string;
  /** Wem (für die Anzeige, z. B. "Kita" oder "Anna Becker") */
  recipient?: string;
  subject: string;
  /** Ganzer Text inkl. Anrede und Gruß, Absätze mit Leerzeile */
  body: string;
  tone: MailTone;
  /** Bei einer eingefügten Mail: worum es geht, in einem Satz */
  summary?: string;
};

/** Einstellungen "Lotte → Mails" */
export type MailStyle = {
  /** Grußformel, Standard "Viele Grüße" */
  greeting: string;
  /** Signatur unter dem Namen – nur bei förmlichen Mails */
  signature: string;
  /** Gemerkte Anrede je Empfänger (Adresse oder Bezeichnung, klein geschrieben) */
  tones: Record<string, MailTone>;
};

export const DEFAULT_MAIL_STYLE: MailStyle = { greeting: "Viele Grüße", signature: "", tones: {} };

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const GREETING_LINE = /^(hallo|hi|hey|liebe[rs]?|sehr geehrte[rs]?|guten (tag|morgen|abend)|moin|servus|grüß gott|dear)\b/i;
const CLOSING = /(viele|liebe|beste|herzliche|freundliche|schöne|sonnige)n?\s+grüße|mit freundlichen grüßen|\bmfg\b|\blg\b|\bvg\b|^gruß(?![a-zäöüß])|^grüße\b|best regards|^cheers\b/im;
const HEADER = /^(von|from|an|to|betreff|subject|gesendet|sent|datum|date|cc):\s*\S/im;

/** Erste E-Mail-Adresse im Text (bei eingefügten Mails bevorzugt aus "Von:") */
function emailIn(text: string): string {
  const from = text.match(/^(?:von|from):.*$/im)?.[0];
  return (from && from.match(EMAIL)?.[0]) || text.match(EMAIL)?.[0] || "";
}

/**
 * Sieht der Text nach einer eingefügten Mail aus? Mehrere Zeilen und
 * Kopfzeilen (Von/Betreff) oder Anrede + Gruß – kurze Sätze an Lotte nie.
 */
export function looksLikeMail(text: string): boolean {
  const t = text.trim();
  if (t.length < 80) return false;
  const lines = t.split(/\n/).filter((l) => l.trim());
  if (HEADER.test(t) && lines.length >= 3) return true;
  const greeting = lines.some((l) => GREETING_LINE.test(l.trim()) && l.trim().length < 60);
  const closing = CLOSING.test(t);
  return lines.length >= 3 && greeting && closing;
}

/** Anweisung vor der eingefügten Mail ("Antworte, dass Donnerstag passt:") und die Mail selbst */
export function splitInstruction(text: string): { instruction: string; mail: string } {
  const t = text.trim();
  const parts = t.split(/\n\s*\n/);
  const first = parts[0]?.trim() ?? "";
  if (parts.length > 1 && first.length < 200 && !GREETING_LINE.test(first) && !HEADER.test(first) && /^(bitte\s+)?(antwort|schreib|sag|sage|frag|zusag|absag|lehn|bestätig|kurz|freundlich)/i.test(first)) {
    return { instruction: first.replace(/:\s*$/, ""), mail: parts.slice(1).join("\n\n").trim() };
  }
  const last = parts[parts.length - 1]?.trim() ?? "";
  if (parts.length > 1 && last.length < 200 && /^(bitte\s+)?(antwort|schreib|sag|frag|zusag|absag)/i.test(last)) {
    return { instruction: last.replace(/:\s*$/, ""), mail: parts.slice(0, -1).join("\n\n").trim() };
  }
  return { instruction: "", mail: t };
}

/** mailto-Link mit Empfänger, Betreff und Text (öffnet Gmail bzw. die Standard-Mail-App) */
export function mailtoHref(draft: Pick<MailDraft, "to" | "subject" | "body">): string {
  const enc = encodeURIComponent;
  const body = draft.body.replace(/\r?\n/g, "\r\n");
  const query = [draft.subject ? `subject=${enc(draft.subject)}` : "", body ? `body=${enc(body)}` : ""].filter(Boolean).join("&");
  return `mailto:${draft.to ? encodeURIComponent(draft.to).replace(/%40/g, "@") : ""}${query ? `?${query}` : ""}`;
}

/** Zum Kopieren: Betreff oben, dann der Text */
export function draftText(draft: Pick<MailDraft, "subject" | "body">): string {
  return draft.subject ? `Betreff: ${draft.subject}\n\n${draft.body}` : draft.body;
}

/** Für den Gesprächsverlauf (damit "Kürzer" / "Auf Du" den Entwurf kennt) */
export function draftForHistory(draft: MailDraft): string {
  return `[Mail-Entwurf${draft.to ? ` an ${draft.to}` : draft.recipient ? ` an ${draft.recipient}` : ""}, ${draft.tone === "sie" ? "Sie" : "Du"}]\nBetreff: ${draft.subject}\n${draft.body}`;
}

/** Gruß am Ende: "Viele Grüße\nFelix" (+ Signatur bei förmlichen Mails) */
export function closingFor(style: MailStyle, name: string, tone: MailTone): string {
  const lines = [style.greeting.trim() || DEFAULT_MAIL_STYLE.greeting, name.trim()].filter(Boolean);
  if (tone === "sie" && style.signature.trim()) lines.push(style.signature.trim());
  return lines.join("\n");
}

const toneKey = (s: string) => s.trim().toLowerCase();

/** Gemerkte Anrede für einen Empfänger (Adresse oder Bezeichnung) */
function rememberedTone(style: MailStyle, ...keys: (string | undefined)[]): MailTone | null {
  for (const k of keys) if (k && style.tones[toneKey(k)]) return style.tones[toneKey(k)];
  return null;
}

export function withTone(style: MailStyle, key: string, tone: MailTone): MailStyle {
  if (!key.trim()) return style;
  return { ...style, tones: { ...style.tones, [toneKey(key)]: tone } };
}

// --- Eingefügte Mail verstehen (ohne KI) -------------------------------------

/** Kopfzeilen und Zitate weg, nur der eigentliche Text */
function mailBody(mail: string): string[] {
  return mail
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !HEADER.test(l) && !l.startsWith(">"));
}

/** Betreff aus "Betreff:"/"Subject:" */
function subjectIn(mail: string): string {
  return mail.match(/^(?:betreff|subject):\s*(.+)$/im)?.[1].replace(/^(re|aw|wg|fwd?):\s*/i, "").trim() ?? "";
}

/** Wer schreibt: Name unter dem Gruß oder aus "Von:" */
function senderIn(mail: string): string {
  const lines = mailBody(mail);
  const at = lines.findIndex((l) => CLOSING.test(l));
  if (at >= 0) {
    const inline = lines[at].match(/(?:grüße|gruß|lg|vg|mfg|regards)[,!]?\s+([A-ZÄÖÜ][\wäöüß.-]+(?:\s+[A-ZÄÖÜ][\wäöüß.-]+)?)\s*$/i)?.[1];
    if (inline) return inline;
    const next = lines[at + 1];
    if (next && next.length < 40 && /^[A-ZÄÖÜ][\wäöüß.-]+(\s+[\wäöüß.-]+){0,4}$/.test(next)) return next;
  }
  const from = mail.match(/^(?:von|from):\s*([^<\n]+?)\s*(<|$)/im)?.[1].trim();
  return from && !EMAIL.test(from) ? from.replace(/^"|"$/g, "") : "";
}

/** Du oder Sie? "Sehr geehrte", "Sie/Ihnen/Ihr" mitten im Satz → Sie */
function toneOf(mail: string): MailTone {
  if (/sehr geehrte|guten tag|mit freundlichen grüßen/i.test(mail)) return "sie";
  if (/(?<![.!?\n]\s*)\b(Sie|Ihnen|Ihre[mnrs]?|Ihr)\b/.test(mail)) return "sie";
  return "du";
}

/** Ein Satz, worum es geht ("Kurz gesagt: …") – ohne KI: der erste echte Satz */
export function summaryOf(mail: string): string {
  const lines = mailBody(mail).filter((l) => !GREETING_LINE.test(l) || l.length > 60);
  const text = lines.join(" ");
  const cut = text.split(CLOSING)[0] ?? text;
  const first = splitSentences(cut).find((s) => s.length > 15 && !/^(ich hoffe|vielen dank|danke für)/i.test(s)) ?? cut.trim();
  const short = first.length > 140 ? `${first.slice(0, 137).replace(/\s+\S*$/, "")} …` : first;
  return cap(short.replace(/^(ich wollte (dir|ihnen|euch) )?(kurz )?/i, ""));
}

/** Termin oder Frist in der Mail ("Elternabend Do 19:30", "bis Mittwoch zurückmelden") */
export function eventsIn(mail: string, today: string): Draft[] {
  const sentences = splitSentences(mailBody(mail).join(" "))
    .filter((s) => findDate(s, today) || /\bbis\s+(zum\s+)?\S/i.test(s));
  const drafts: Draft[] = [];
  for (const s of sentences.slice(0, 6)) {
    const cmd = parseCalendar(s.replace(/[?]/g, "."), today);
    if (cmd?.kind !== "create") continue;
    const d = cmd.draft;
    // Nur echte Termine (mit Uhrzeit) oder Fristen
    if (d.typ === "termin" || (d.typ === "aufgabe" && d.data.due)) {
      const title = shortTitle(d.data.title);
      if (title && !drafts.some((x) => x.data.title === title)) drafts.push({ ...d, data: { ...d.data, title } } as Draft);
    }
  }
  return drafts.slice(0, 2);
}

/** Sätze trennen – "22.10. um" ist kein Satzende (danach kommt kein Großbuchstabe) */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "der Elternabend findet statt" → "Elternabend" (ohne KI so knapp wie möglich) */
function shortTitle(title: string): string {
  if (/zurück\s*meld|rückmeld|meld\w*\s+(\w+\s+)?zurück/i.test(title)) return "Rückmeldung geben";
  const noun = title.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:abend|treffen|gespräch|termin|fest|ausflug|feier|besprechung|meeting|lieferung|abgabe|anmeldung|rückmeldung|zahlung|frist|sitzung|konferenz|untersuchung|probe|training))\b/)?.[1];
  if (noun) return noun;
  const words = title
    .replace(/^(der|die|das|unser|unsere|ihr|ihre|euer|eure|wir|ich|bitte)\s+/i, "")
    .replace(/\b(findet|statt|ist|sind|wird|werden|haben|hat|bitte|uns|euch|ihnen|dir|mir|noch|schon|gerne|gern)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

// --- Entwürfe ohne KI ---------------------------------------------------------

type ReplyChoice = "zusagen" | "absagen" | "nachfragen";
export const REPLY_CHOICES: { id: ReplyChoice; label: string }[] = [
  { id: "zusagen", label: "Zusagen" },
  { id: "absagen", label: "Absagen" },
  { id: "nachfragen", label: "Nachfragen" },
];

function salutation(tone: MailTone, name: string): string {
  if (!name) return tone === "sie" ? "Guten Tag," : "Hallo,";
  if (tone === "sie") return `Guten Tag ${name},`;
  return `Hallo ${name.split(/\s+/)[0]},`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sentence = (s: string) => {
  const t = s.trim().replace(/[,;:]+$/, "");
  return t ? cap(/[.!?]$/.test(t) ? t : `${t}.`) : "";
};

/** "Antworte, dass Donnerstag passt, aber erst ab 9" → "Donnerstag passt, aber erst ab 9." */
function instructionContent(instruction: string): string {
  const t = instruction
    .trim()
    .replace(/^(bitte\s+)?(antworte|antwort|schreib(e)?|sag(e)?)\s*(ihm|ihr|ihnen|denen|zurück)?\s*(bitte\s*)?[,:]?\s*/i, "")
    .replace(/^(dass|das)\s+/i, "");
  return sentence(t);
}

/** Antwort auf eine eingefügte Mail – mit Anweisung oder gewählter Richtung */
export function localReply(mail: string, how: { instruction?: string; choice?: ReplyChoice }, style: MailStyle, myName: string): MailDraft {
  const sender = senderIn(mail);
  const to = emailIn(mail);
  const tone = rememberedTone(style, to, sender) ?? toneOf(mail);
  const you = tone === "sie" ? { dat: "Ihnen", gen: "Ihre" } : { dat: "dir", gen: "deine" };
  const thanks = `vielen Dank für ${you.gen} Nachricht.`;
  const core = how.instruction
    ? instructionContent(how.instruction)
    : how.choice === "absagen"
      ? "Leider passt es bei mir dieses Mal nicht."
      : how.choice === "nachfragen"
        ? `Ich hätte noch eine kurze Frage dazu: ${tone === "sie" ? "Können Sie" : "Kannst du"} mir noch etwas mehr dazu sagen?`
        : "Das passt mir gut, ich bin dabei.";
  const outro = how.choice === "absagen" ? `Danke ${tone === "sie" ? "Ihnen" : "dir"} trotzdem!` : "";
  const body = [salutation(tone, sender), `${cap(thanks)} ${core}`.trim(), outro, closingFor(style, myName, tone)].filter(Boolean).join("\n\n");
  const subject = subjectIn(mail);
  return { to, recipient: sender || undefined, subject: `Re: ${subject || (tone === "sie" ? "Ihre Nachricht" : "deine Nachricht")}`, body, tone, summary: summaryOf(mail) };
}

const FAMILY = /\b(mama|papa|mutti|vati|oma|opa|omi|opi|tante|onkel|schwester|bruder|schatz|freund|freundin|cousin|cousine|nachbar(in)?)\b/i;
const BUSINESS = /(?<![a-zäöüß])(großhandel|lieferant\w*|firma|bank|amt|behörde|vermieter\w*|hausverwaltung|versicherung|steuerberater\w*|arzt|ärztin|praxis|kita|schule|lehrer\w*|verein|kunde\w*|händler\w*|brauerei|molkerei|bäckerei|getränke\w*|support|kundenservice|team|verwaltung|büro)\b/i;

/** Neue Mail: "Schreib dem Großhandel, dass …" / "Mail an die Kita: Jonne ist morgen krank" */
function parseNewMail(text: string): { recipient: string; content: string; link: "dass" | "ob" | ":"; to: string } | null {
  const t = text.trim().replace(/[.!]+$/, "");
  const m =
    t.match(/^(?:bitte\s+)?(?:schreib\w*|schick\w*)\s+(?:(?:eine?\s+)?(?:e-?mail|mail|nachricht)\s+)?(?:an\s+)?(.+?)(?:\s+eine?\s+(?:e-?mail|mail|nachricht))?\s*(?:,\s*|\s+)(dass|ob|:)\s*(.+)$/i) ??
    t.match(/^(?:eine?\s+)?(?:e-?mail|mail|nachricht)\s+an\s+(.+?)\s*(:|,|dass|ob)\s*(.+)$/i);
  if (!m) return null;
  const recipientRaw = m[1].trim();
  const to = recipientRaw.match(EMAIL)?.[0] ?? text.match(EMAIL)?.[0] ?? "";
  const recipient = recipientRaw
    .replace(EMAIL, "")
    .replace(/^(an\s+)?(dem|der|den|die|das|meiner|meinem|meine|unserer|unserem|unsere)\s+/i, "")
    .replace(/\s+(eine?\s+)?(e-?mail|mail|nachricht)$/i, "")
    .replace(/[,:]\s*$/, "")
    .trim();
  const content = m[3].trim();
  if (!content || content.length < 3) return null;
  const link = /^ob$/i.test(m[2]) ? "ob" : /^dass$/i.test(m[2]) ? "dass" : ":";
  return { recipient: recipient ? cap(recipient) : "", content, link, to };
}

/** Du oder Sie für einen neuen Empfänger: Familie/Vornamen du, Geschäftliches Sie */
function toneForRecipient(recipient: string, style: MailStyle, to = "", knownNames: string[] = []): MailTone {
  const remembered = rememberedTone(style, to, recipient);
  if (remembered) return remembered;
  if (FAMILY.test(recipient) || knownNames.some((n) => n && recipient.toLowerCase() === n.toLowerCase())) return "du";
  if (BUSINESS.test(recipient) || /\b(gmbh|ag|kg|e\.v\.)\b/i.test(recipient)) return "sie";
  // Ein einzelner Vorname → du; sonst lieber förmlich
  return /^[A-ZÄÖÜ][a-zäöüß]+$/.test(recipient) ? "du" : "sie";
}

export function localNewMail(text: string, style: MailStyle, myName: string, knownNames: string[] = []): MailDraft | null {
  const parsed = parseNewMail(text);
  if (!parsed) return null;
  const tone = toneForRecipient(parsed.recipient, style, parsed.to, knownNames);
  const you = tone === "sie" ? "Ihnen" : "dir";
  const content = parsed.content.replace(/\s+/g, " ");
  const bare = content.replace(/[.!?]+$/, "");
  const core =
    parsed.link === "ob"
      ? `ich wollte ${tone === "sie" ? "Sie" : "dich"} kurz fragen, ob ${bare}.`
      : parsed.link === "dass"
        ? `ich wollte ${you} kurz Bescheid geben, dass ${bare}.`
        : `ich wollte ${you} kurz Bescheid geben: ${sentence(content)}`;
  const greet = tone === "du" && /^[A-ZÄÖÜ][a-zäöüß]+$/.test(parsed.recipient) ? `Hallo ${parsed.recipient},` : tone === "du" ? "Hallo," : "Guten Tag,";
  const body = [greet, cap(core), tone === "sie" ? "Vielen Dank und einen schönen Tag!" : "", closingFor(style, myName, tone)].filter(Boolean).join("\n\n");
  return { to: parsed.to, recipient: parsed.recipient || undefined, subject: subjectFrom(content, parsed.link, tone), body, tone };
}

/** Kurzer Betreff aus dem Inhalt (ohne KI bewusst schlicht) */
function subjectFrom(content: string, link: "dass" | "ob" | ":", tone: MailTone): string {
  const t = content.replace(/[.!?]+$/, "").trim();
  if (/\bkrank\b/i.test(t)) {
    const who = t.match(/\b([A-ZÄÖÜ][a-zäöüß]+)\s+(ist|sind|bleibt|hat)\b/)?.[1];
    return who && !/^(Ich|Wir|Er|Sie|Es)$/.test(who) ? `Krankmeldung ${who}` : "Krankmeldung";
  }
  if (link === "ob") return "Kurze Frage";
  if (link === ":") {
    const words = t.split(/\s+/);
    return cap(words.length > 7 ? `${words.slice(0, 7).join(" ")} …` : t);
  }
  return tone === "sie" ? "Kurze Info" : "Kurze Nachricht";
}

// --- Entwurf ändern ohne KI ("Kürzer", "Auf Du", "Etwas förmlicher") ---------

export type MailRevision = "kuerzer" | "du" | "sie" | "foermlicher" | "lockerer";

export function revisionOf(text: string): MailRevision | null {
  const t = text.trim().toLowerCase();
  if (t.length > 60) return null;
  if (/\b(kürzer|knapper|kurz(?:er)? fassen)\b/.test(t)) return "kuerzer";
  if (/\bauf du\b|\bduzen\b|\bper du\b/.test(t)) return "du";
  if (/\bauf sie\b|\bsiezen\b|\bper sie\b/.test(t)) return "sie";
  if (/förmlich|höflicher|seriöser|geschäftlich/.test(t)) return "foermlicher";
  if (/locker|lässig|persönlicher|herzlicher|freundlicher/.test(t)) return "lockerer";
  return null;
}

const TO_SIE: [RegExp, string][] = [
  [/\bdu\b/g, "Sie"],
  [/\bDu\b/g, "Sie"],
  [/\bdir\b/gi, "Ihnen"],
  [/\bdich\b/gi, "Sie"],
  [/\bdeine([mnrs]?)\b/gi, "Ihre$1"],
  [/\bdein\b/gi, "Ihr"],
  [/\bkannst\b/g, "können"],
  [/\bhast\b/g, "haben"],
  [/\bbist\b/g, "sind"],
  [/\bwillst\b/g, "wollen"],
];
const TO_DU: [RegExp, string][] = [
  [/\bIhnen\b/g, "dir"],
  [/\bIhre([mnrs]?)\b/g, "deine$1"],
  [/\bIhr\b/g, "dein"],
  [/\bkönnen Sie\b/g, "kannst du"],
  [/\bhaben Sie\b/g, "hast du"],
  [/\bsind Sie\b/g, "bist du"],
  [/\bwollen Sie\b/g, "willst du"],
  [/\bSie\b/g, "du"],
];

/** Den Entwurf ohne KI anpassen (Du/Sie, kürzer, förmlicher/lockerer) */
export function reviseDraft(draft: MailDraft, rev: MailRevision): MailDraft {
  const paragraphs = draft.body.split(/\n\s*\n/);
  const [first, ...rest] = paragraphs;
  const closing = rest.length ? rest[rest.length - 1] : "";
  const middle = rest.slice(0, -1);
  const swap = (s: string, map: [RegExp, string][]) => map.reduce((acc, [re, to]) => acc.replace(re, to), s);
  if (rev === "kuerzer") {
    const kept = middle
      .map((p) => p.replace(/^(vielen dank|danke)[^.!]*[.!]\s*/i, "").trim())
      .filter((p) => p && !/^(vielen dank und|einen schönen tag|danke (dir|ihnen) trotzdem)/i.test(p))
      .map((p) => (p.match(/[^.!?]+[.!?]/g) ?? [p]).slice(0, 2).map((x) => x.trim()).join(" "));
    return { ...draft, body: [first, ...kept, closing].filter(Boolean).join("\n\n") };
  }
  const toSie = rev === "sie" || (rev === "foermlicher" && draft.tone === "du");
  const toDu = rev === "du" || (rev === "lockerer" && draft.tone === "sie");
  if (toSie) {
    const salutationLine = first.replace(/^(hallo|hi|hey|liebe[rs]?)\s*/i, "Guten Tag ").replace(/\s+,/, ",").replace(/^Guten Tag ,/, "Guten Tag,");
    const body = [salutationLine, ...middle.map((p) => cap(swap(p, TO_SIE))), closing.replace(/^(liebe grüße|lg|bis bald)/i, "Viele Grüße")].join("\n\n");
    return { ...draft, tone: "sie", body };
  }
  if (toDu) {
    const salutationLine = first.replace(/^(guten tag|sehr geehrte[rs]?)\s*/i, "Hallo ").replace(/\s+,/, ",").replace(/^Hallo ,/, "Hallo,");
    const body = [salutationLine, ...middle.map((p) => cap(swap(p, TO_DU))), closing].join("\n\n");
    return { ...draft, tone: "du", body };
  }
  if (rev === "foermlicher") {
    return { ...draft, body: draft.body.replace(/^Hallo\b/, "Guten Tag").replace(/\bLiebe Grüße\b/, "Viele Grüße") };
  }
  return { ...draft, body: draft.body.replace(/^Guten Tag\b/, "Hallo").replace(/\bMit freundlichen Grüßen\b/, "Viele Grüße") };
}

/** Prüft einen Entwurf aus der KI (Länge, Adresse) */
export function sanitizeDraft(raw: unknown): MailDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const body = str(r.body, 5000);
  if (!body) return null;
  const to = str(r.to, 200);
  return {
    to: EMAIL.test(to) ? (to.match(EMAIL)?.[0] ?? "") : "",
    recipient: str(r.recipient, 80) || undefined,
    subject: str(r.subject, 200),
    body,
    tone: r.tone === "du" ? "du" : "sie",
    summary: str(r.summary, 300) || undefined,
  };
}

/** Mail-Stil aus einer Anfrage prüfen (Server) */
export function sanitizeMailStyle(raw: unknown): MailStyle {
  if (!raw || typeof raw !== "object") return DEFAULT_MAIL_STYLE;
  const r = raw as Partial<MailStyle>;
  const tones: Record<string, MailTone> = {};
  if (r.tones && typeof r.tones === "object") {
    for (const [k, v] of Object.entries(r.tones).slice(0, 50)) if ((v === "du" || v === "sie") && k.length <= 120) tones[k] = v;
  }
  return {
    greeting: typeof r.greeting === "string" && r.greeting.trim() ? r.greeting.trim().slice(0, 60) : DEFAULT_MAIL_STYLE.greeting,
    signature: typeof r.signature === "string" ? r.signature.trim().slice(0, 300) : "",
    tones,
  };
}

/** Entwurf aus dem Gesprächsverlauf zurücklesen (Gegenstück zu `draftForHistory`) */
export function parseHistoryDraft(text: string): MailDraft | null {
  const m = text.match(/\[Mail-Entwurf(?: an ([^,\]]+))?, (Sie|Du)\]\nBetreff: (.*)\n([\s\S]+)$/);
  if (!m) return null;
  const target = m[1]?.trim() ?? "";
  const isMail = EMAIL.test(target);
  return { to: isMail ? target : "", recipient: isMail ? undefined : target || undefined, tone: m[2] === "Sie" ? "sie" : "du", subject: m[3].trim(), body: m[4].trim() };
}

/** Mail-Stil aus dem Kontext-Text (für den Testmodus) */
export function styleFromContext(system: string): { style: MailStyle; name: string } {
  const line = system.match(/^Mail-Stil: (.*)$/m)?.[1] ?? "";
  const greeting = line.match(/Gruß "([^"]*)"/)?.[1] ?? DEFAULT_MAIL_STYLE.greeting;
  const name = line.match(/Name "([^"]*)"/)?.[1] ?? "";
  const signature = (line.match(/Signatur \(nur förmlich\): "([^"]*)"/)?.[1] ?? "").replace(/ \/ /g, "\n");
  const tones: Record<string, MailTone> = {};
  for (const [, k, v] of (line.match(/gemerkte Anrede: (.*)$/)?.[1] ?? "").matchAll(/([^,=]+?) = (Sie|Du)/g)) tones[k.trim()] = v === "Sie" ? "sie" : "du";
  return { style: { greeting, signature, tones }, name };
}

/** "Unterschreib meine Mails mit Liebe Grüße" / "Gruß in Mails: Beste Grüße" → neue Grußformel */
export function greetingCommand(text: string): string | null {
  const m = text.trim().match(/^(?:bitte\s+)?(?:unterschreib\w*|beende\w*|schließ\w*)\s+(?:meine\s+|die\s+)?(?:e-?mails?|mails)\s+(?:ab\s+jetzt\s+|künftig\s+|immer\s+)?mit\s+[„"]?(.+?)[“"]?[.!]?$/i)
    ?? text.trim().match(/^(?:mein\s+)?gruß\s+(?:in|für|unter)\s+(?:meinen\s+)?(?:e-?mails?|mails)\s*[:=]?\s*(?:ist\s+)?[„"]?(.+?)[“"]?[.!]?$/i);
  const greeting = m?.[1]?.replace(/,?\s*$/, "").trim();
  return greeting && greeting.length <= 60 ? greeting : null;
}
