// Mails ohne KI: eingefügte Mail erkennen, Antwort-Entwürfe, neue Mails,
// Du/Sie, Ändern ("Kürzer", "Auf Du"), mailto, Stil aus dem Kontext.
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAIL_STYLE,
  closingFor,
  draftForHistory,
  draftText,
  eventsIn,
  greetingCommand,
  localNewMail,
  localReply,
  looksLikeMail,
  mailtoHref,
  parseHistoryDraft,
  revisionOf,
  reviseDraft,
  sanitizeDraft,
  sanitizeMailStyle,
  splitInstruction,
  styleFromContext,
  summaryOf,
  withTone,
  type MailDraft,
} from "@/lib/begleitung/mail";
import { loadMailStyle, saveMailStyle } from "@/lib/begleitung/mailSettings";
import { memoryStorage } from "../helpers";

const KITA_MAIL = `Von: Kita Sonnenschein <info@kita-sonnenschein.de>
Betreff: Elternabend im Oktober

Liebe Eltern,

der Elternabend findet am Donnerstag um 19:30 statt. Bitte meldet euch bis Mittwoch zurück, ob ihr kommt.

Liebe Grüße
Anna Becker`;

const OMA_MAIL = `Hallo Felix,

hast du am Sonntag Zeit zum Kaffee? Wir würden uns sehr freuen, euch alle mal wieder zu sehen.

Liebe Grüße, Oma`;

const STYLE = { ...DEFAULT_MAIL_STYLE, signature: "Felix Meier\nTel. 0123" };

describe("Eingefügte Mail erkennen", () => {
  it("Kopfzeilen oder Anrede + Gruß – kurze Sätze nie", () => {
    expect(looksLikeMail(KITA_MAIL)).toBe(true);
    expect(looksLikeMail(OMA_MAIL)).toBe(true);
    expect(looksLikeMail("Schreib der Kita, dass Jonne heute krank ist")).toBe(false);
    expect(looksLikeMail("Hallo Mia,\n" + "ich habe eine lange Frage zu unserem Essen, die aber keine Mail ist und keinen Gruß hat.\nDanke")).toBe(false);
  });

  it("„Gruß“ allein als Schluss zählt (Fehler bis jetzt: \\b nach „ß“)", () => {
    const mail = "Hallo Felix,\n\nkannst du mir morgen den Bohrer zurückbringen? Ich brauche ihn am Wochenende für das Regal.\n\nGruß\nTom";
    expect(looksLikeMail(mail)).toBe(true);
    expect(localReply(mail, { choice: "zusagen" }, DEFAULT_MAIL_STYLE, "Felix").recipient).toBe("Tom");
  });

  it("trennt Anweisung und Mail – vorne oder hinten", () => {
    const front = splitInstruction(`Antworte, dass wir kommen:\n\n${OMA_MAIL}`);
    expect(front.instruction).toBe("Antworte, dass wir kommen");
    expect(front.mail).toBe(OMA_MAIL);
    const back = splitInstruction(`${OMA_MAIL}\n\nSag ab, wir sind verreist`);
    expect(back.instruction).toBe("Sag ab, wir sind verreist");
    expect(back.mail).toBe(OMA_MAIL);
    expect(splitInstruction(OMA_MAIL)).toEqual({ instruction: "", mail: OMA_MAIL });
  });

  it("Kurzfassung und Termine aus der Mail", () => {
    expect(summaryOf(KITA_MAIL)).toMatch(/^Der Elternabend findet am Donnerstag um 19:30 statt\.$/);
    const events = eventsIn(KITA_MAIL, "2026-10-20");
    expect(events.map((e) => e.data.title)).toContain("Elternabend");
    const termin = events.find((e) => e.typ === "termin")!;
    expect(termin.data).toMatchObject({ date: "2026-10-22", start: "19:30" });
    expect(eventsIn(OMA_MAIL.replace("am Sonntag", "bald"), "2026-10-20")).toEqual([]);
  });

  it("kürzt sehr lange Kurzfassungen", () => {
    const long = `Hallo,\n\n${"Wir planen ein großes Fest mit vielen Gästen und Spielen ".repeat(4)}im Garten.\n\nViele Grüße\nTom`;
    const s = summaryOf(long);
    expect(s.length).toBeLessThanOrEqual(141);
    expect(s.endsWith(" …")).toBe(true);
  });
});

describe("Antwort-Entwürfe ohne KI", () => {
  it("mit Anweisung: Anrede, Dank, Kern, Gruß", () => {
    const d = localReply(OMA_MAIL, { instruction: "Antworte, dass Sonntag passt, aber erst ab 15 Uhr" }, DEFAULT_MAIL_STYLE, "Felix");
    expect(d.tone).toBe("du");
    expect(d.recipient).toBe("Oma");
    expect(d.to).toBe("");
    expect(d.body).toBe("Hallo Oma,\n\nVielen Dank für deine Nachricht. Sonntag passt, aber erst ab 15 Uhr.\n\nViele Grüße\nFelix");
    expect(d.subject).toBe("Re: deine Nachricht");
  });

  it("Zusagen/Absagen/Nachfragen, Sie bei förmlicher Mail, Signatur nur dann", () => {
    const formal = `Von: Praxis Dr. Weber <praxis@weber.de>\nBetreff: AW: Termin\n\nSehr geehrter Herr Meier,\n\nwir können Ihnen am Freitag einen Termin anbieten.\n\nMit freundlichen Grüßen\nPraxis Dr. Weber`;
    const yes = localReply(formal, { choice: "zusagen" }, STYLE, "Felix");
    expect(yes.tone).toBe("sie");
    expect(yes.to).toBe("praxis@weber.de");
    expect(yes.subject).toBe("Re: Termin");
    expect(yes.body).toContain("Vielen Dank für Ihre Nachricht. Das passt mir gut, ich bin dabei.");
    expect(yes.body.endsWith("Viele Grüße\nFelix\nFelix Meier\nTel. 0123")).toBe(true);
    const no = localReply(formal, { choice: "absagen" }, STYLE, "Felix");
    expect(no.body).toContain("Leider passt es bei mir dieses Mal nicht.");
    expect(no.body).toContain("Danke Ihnen trotzdem!");
    const ask = localReply(OMA_MAIL, { choice: "nachfragen" }, STYLE, "Felix");
    // Fehler bis jetzt: „Können du mir …“ statt „Kannst du mir …“
    expect(ask.body).toContain("Kannst du mir noch etwas mehr dazu sagen?");
    expect(localReply(formal, { choice: "nachfragen" }, STYLE, "Felix").body).toContain("Können Sie mir noch etwas mehr dazu sagen?");
    expect(ask.body).not.toContain("Tel. 0123");
  });

  it("gemerkte Anrede schlägt die Erkennung", () => {
    const style = withTone(DEFAULT_MAIL_STYLE, "info@kita-sonnenschein.de", "sie");
    expect(localReply(KITA_MAIL, { choice: "zusagen" }, style, "Felix").tone).toBe("sie");
    expect(withTone(DEFAULT_MAIL_STYLE, "  ", "du")).toBe(DEFAULT_MAIL_STYLE);
  });
});

describe("Neue Mails", () => {
  it("Krankmeldung an die Kita: Sie, Betreff schlicht", () => {
    // Name nur direkt vor „ist/hat“ erkannt (siehe Doppelpunkt-Fall); im „dass“-Satz schlicht „Krankmeldung“
    expect(localNewMail("Schreib der Kita, dass ich krank bin", DEFAULT_MAIL_STYLE, "Felix")!.subject).toBe("Krankmeldung");
    const d = localNewMail("Schreib der Kita, dass Jonne heute krank ist", DEFAULT_MAIL_STYLE, "Felix")!;
    expect(d.recipient).toBe("Kita");
    expect(d.tone).toBe("sie");
    expect(d.subject).toBe("Krankmeldung");
    expect(d.body).toBe("Guten Tag,\n\nIch wollte Ihnen kurz Bescheid geben, dass Jonne heute krank ist.\n\nVielen Dank und einen schönen Tag!\n\nViele Grüße\nFelix");
  });

  it("Doppelpunkt, Frage mit „ob“, Vorname = du, Adresse", () => {
    const colon = localNewMail("Mail an die Kita: Jonne ist heute krank", DEFAULT_MAIL_STYLE, "Felix")!;
    expect(colon.subject).toBe("Krankmeldung Jonne");
    expect(colon.body).toContain("Bescheid geben: Jonne ist heute krank.");
    const ob = localNewMail("Schreib Anna, ob sie Samstag Zeit hat", DEFAULT_MAIL_STYLE, "Felix")!;
    expect(ob.tone).toBe("du");
    expect(ob.subject).toBe("Kurze Frage");
    expect(ob.body.startsWith("Hallo Anna,\n\nIch wollte dich kurz fragen, ob sie Samstag Zeit hat.")).toBe(true);
    const mail = localNewMail("Schreib an tom@example.org, dass das Treffen ausfällt", DEFAULT_MAIL_STYLE, "Felix")!;
    expect(mail.to).toBe("tom@example.org");
    expect(mail.subject).toBe("Kurze Info");
    const info = localNewMail("Nachricht an Mama: Wir kommen am Sonntag gegen drei Uhr zum Mittagessen vorbei", DEFAULT_MAIL_STYLE, "Felix")!;
    expect(info.tone).toBe("du");
    expect(info.body.startsWith("Hallo Mama,")).toBe(true);
    expect(info.subject).toBe("Wir kommen am Sonntag gegen drei Uhr …");
  });

  it("Ärztin wird gesiezt (Fehler bis jetzt: \\b vor „Ä“ – galt als Vorname)", () => {
    expect(localNewMail("Schreib der Ärztin, dass Jonne wieder gesund ist", DEFAULT_MAIL_STYLE, "Felix")!.tone).toBe("sie");
  });

  it("bekannte Namen und GmbH, ohne Inhalt nichts", () => {
    expect(localNewMail("Schreib Herrn Müller Lieferservice, dass wir Montag zu sind", DEFAULT_MAIL_STYLE, "Felix", ["Herrn Müller Lieferservice"])!.tone).toBe("du");
    expect(localNewMail("Schreib Becker GmbH, dass die Rechnung bezahlt ist", DEFAULT_MAIL_STYLE, "Felix")!.tone).toBe("sie");
    expect(localNewMail("Schreib Tom, dass ok", DEFAULT_MAIL_STYLE, "")).toBeNull();
    expect(localNewMail("Was gibt’s heute?", DEFAULT_MAIL_STYLE, "Felix")).toBeNull();
  });
});

describe("Entwurf ändern", () => {
  const draft = localNewMail("Schreib Anna, dass wir Samstag kommen", DEFAULT_MAIL_STYLE, "Felix")!;

  it("erkennt die Wünsche", () => {
    expect(revisionOf("Kürzer bitte")).toBe("kuerzer");
    expect(revisionOf("Auf Du")).toBe("du");
    expect(revisionOf("Lieber siezen")).toBe("sie");
    expect(revisionOf("Etwas förmlicher")).toBe("foermlicher");
    expect(revisionOf("Lockerer")).toBe("lockerer");
    expect(revisionOf("Mach das bitte etwas kürzer, aber behalte unbedingt den letzten Absatz drin, ja?")).toBeNull();
    expect(revisionOf("Hallo")).toBeNull();
  });

  it("Du → Sie und zurück", () => {
    const sie = reviseDraft(draft, "sie");
    expect(sie.tone).toBe("sie");
    expect(sie.body.startsWith("Guten Tag Anna,\n\nIch wollte Ihnen kurz Bescheid geben")).toBe(true);
    const du = reviseDraft(sie, "du");
    expect(du.tone).toBe("du");
    expect(du.body.startsWith("Hallo Anna,\n\nIch wollte dir kurz Bescheid geben")).toBe(true);
    expect(reviseDraft(draft, "foermlicher").tone).toBe("sie");
    expect(reviseDraft(sie, "lockerer").tone).toBe("du");
  });

  it("förmlicher/lockerer ohne Wechsel und kürzer", () => {
    const sieDraft: MailDraft = { ...draft, tone: "sie", body: "Hallo,\n\nDas passt.\n\nLiebe Grüße\nFelix" };
    expect(reviseDraft(sieDraft, "foermlicher").body).toBe("Guten Tag,\n\nDas passt.\n\nViele Grüße\nFelix");
    const duDraft: MailDraft = { ...draft, tone: "du", body: "Guten Tag,\n\nDas passt.\n\nMit freundlichen Grüßen\nFelix" };
    expect(reviseDraft(duDraft, "lockerer").body).toBe("Hallo,\n\nDas passt.\n\nViele Grüße\nFelix");
    const long: MailDraft = { ...draft, body: "Hallo Tom,\n\nVielen Dank für deine Nachricht. Eins. Zwei. Drei.\n\nVielen Dank und einen schönen Tag!\n\nViele Grüße\nFelix" };
    // Fehler bis jetzt: doppeltes Leerzeichen zwischen den behaltenen Sätzen
    expect(reviseDraft(long, "kuerzer").body).toBe("Hallo Tom,\n\nEins. Zwei.\n\nViele Grüße\nFelix");
  });
});

describe("Hilfen rund um den Entwurf", () => {
  it("mailto, Kopieren, Verlauf hin und zurück", () => {
    const d: MailDraft = { to: "a.b@kita.de", subject: "Krank & müde", body: "Hallo\nZeile 2", tone: "sie" };
    expect(mailtoHref(d)).toBe("mailto:a.b@kita.de?subject=Krank%20%26%20m%C3%BCde&body=Hallo%0D%0AZeile%202");
    expect(mailtoHref({ to: "", subject: "", body: "" })).toBe("mailto:");
    expect(draftText(d)).toBe("Betreff: Krank & müde\n\nHallo\nZeile 2");
    expect(draftText({ subject: "", body: "Nur Text" })).toBe("Nur Text");
    expect(parseHistoryDraft(draftForHistory(d))).toEqual({ to: "a.b@kita.de", recipient: undefined, tone: "sie", subject: "Krank & müde", body: "Hallo\nZeile 2" });
    const toKita = parseHistoryDraft(draftForHistory({ ...d, to: "", recipient: "Kita", tone: "du" }))!;
    expect(toKita).toMatchObject({ to: "", recipient: "Kita", tone: "du" });
    expect(parseHistoryDraft(draftForHistory({ ...d, to: "" }))!.recipient).toBeUndefined();
    expect(parseHistoryDraft("irgendwas")).toBeNull();
  });

  it("Gruß mit Signatur nur förmlich, leerer Gruß = Standard", () => {
    expect(closingFor(STYLE, "Felix", "du")).toBe("Viele Grüße\nFelix");
    expect(closingFor(STYLE, "Felix", "sie")).toBe("Viele Grüße\nFelix\nFelix Meier\nTel. 0123");
    expect(closingFor({ ...STYLE, greeting: " " }, "", "du")).toBe("Viele Grüße");
  });

  it("prüft KI-Entwürfe und Mail-Stil", () => {
    expect(sanitizeDraft(null)).toBeNull();
    expect(sanitizeDraft({ body: "  " })).toBeNull();
    expect(sanitizeDraft({ body: "Text", to: "keine adresse", tone: "du", subject: 3 })).toEqual({ to: "", recipient: undefined, subject: "", body: "Text", tone: "du", summary: undefined });
    expect(sanitizeDraft({ body: "Text", to: "Anna <anna@x.de>", recipient: "Anna", summary: "Kurz" })).toMatchObject({ to: "anna@x.de", tone: "sie", recipient: "Anna", summary: "Kurz" });
    expect(sanitizeMailStyle("x")).toBe(DEFAULT_MAIL_STYLE);
    expect(sanitizeMailStyle({ greeting: "  LG ", signature: 5, tones: { kita: "sie", oma: "ihr" } })).toEqual({ greeting: "LG", signature: "", tones: { kita: "sie" } });
    expect(sanitizeMailStyle({ greeting: "", signature: " S " }).greeting).toBe("Viele Grüße");
  });

  it("Stil aus dem Kontext (Testmodus)", () => {
    const system = 'Heute: …\nMail-Stil: Gruß "Liebe Grüße", Name "Felix", Signatur (nur förmlich): "Felix Meier / Bahnhofstr. 1", gemerkte Anrede: kita = Sie, oma = Du';
    expect(styleFromContext(system)).toEqual({ style: { greeting: "Liebe Grüße", signature: "Felix Meier\nBahnhofstr. 1", tones: { kita: "sie", oma: "du" } }, name: "Felix" });
    expect(styleFromContext("nichts")).toEqual({ style: { greeting: "Viele Grüße", signature: "", tones: {} }, name: "" });
  });

  it("neue Grußformel per Satz", () => {
    expect(greetingCommand("Unterschreib meine Mails mit „Liebe Grüße“")).toBe("Liebe Grüße");
    expect(greetingCommand("Gruß in Mails: Beste Grüße")).toBe("Beste Grüße");
    expect(greetingCommand("Unterschreib meine Mails mit " + "x".repeat(70))).toBeNull();
    expect(greetingCommand("Schreib der Kita")).toBeNull();
  });
});

describe("Mail-Einstellungen pro Gerät", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: memoryStorage(), addEventListener() {}, removeEventListener() {} };
  });

  it("Standard ohne Speicher, speichert und liest zurück", () => {
    expect(loadMailStyle()).toEqual(DEFAULT_MAIL_STYLE);
    saveMailStyle({ greeting: "LG", signature: "Felix", tones: { kita: "sie" } });
    expect(loadMailStyle()).toEqual({ version: 1, greeting: "LG", signature: "Felix", tones: { kita: "sie" } });
  });

  it("räumt kaputte gespeicherte Werte auf", () => {
    const w = (globalThis as unknown as { window: { localStorage: Storage } }).window;
    w.localStorage.setItem("wasgibts.mails", JSON.stringify({ greeting: 7, tones: { a: "du", b: "x" } }));
    expect(loadMailStyle()).toEqual({ version: 1, greeting: "Viele Grüße", signature: "", tones: { a: "du" } });
    w.localStorage.setItem("wasgibts.mails", JSON.stringify("kaputt"));
    expect(loadMailStyle()).toEqual(DEFAULT_MAIL_STYLE);
  });
});
