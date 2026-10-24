// Mails an Mia: selbst erzeugte Beispielmails (keine echten Daten) –
// weitergeleitet aus Gmail, Apple Mail, Outlook; Auto-Weiterleitung;
// Gmail-Bestätigung; Newsletter; fremder Absender; Kita-Mail mit Termin,
// Aufgabe, Einkauf; Arbeit-Adresse; Lernen, Filter, Signatur.
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkMail, excerpt, forwardingConfirmation, mailBody, originalSender, type InboundMail } from "@/lib/mails/eingang";
import { mailThema, vorschlaegeAus } from "@/lib/mails/vorschlag";
import { absenderName, absenderSchluessel, fragen, frageText, gmailFilterXml, gmailSuche } from "@/lib/mails/lernen";
import { localPart, mailDomain, ourLocalPart, roomOfLocalPart, slug } from "@/lib/mails/adresse";
import { verifySvix } from "@/lib/mails/svix";

const T = "2026-10-21"; // Mittwoch
const FELIX = "felix@example.com";
const mail = (p: Partial<InboundMail>): InboundMail => ({ from: `Felix <${FELIX}>`, to: ["familie-mueller-k7p2@mia.karamba-eis.de"], subject: "Fwd: Laternenumzug", text: "", headers: {}, ...p });

const KITA = `Hallo Lisa,

---------- Forwarded message ---------
From: Kita Sonnenschein <info@kita-sonnenschein.de>
Date: Mo., 19. Okt. 2026 um 08:12
Subject: Laternenumzug
To: <eltern@kita-sonnenschein.de>

Liebe Eltern,
der Laternenumzug ist am Freitag um 17 Uhr im Schlosspark.
Bitte bringt einen Kuchen für den Basar mit.
Die Anmeldung bitte bis Montag abgeben.
Viele Grüße`;

describe("Original-Absender", () => {
  it("Gmail, Apple Mail, Outlook (deutsch)", () => {
    expect(originalSender({ text: KITA })).toBe("info@kita-sonnenschein.de");
    expect(originalSender({ text: "Anfang der weitergeleiteten Nachricht:\n\nVon: \"TSV Eutin\" <jugend@tsv-eutin.de>\nBetreff: Training" })).toBe("jugend@tsv-eutin.de");
    expect(originalSender({ text: "-----Ursprüngliche Nachricht-----\nVon: Schule <sekretariat@grundschule-eutin.de>\nGesendet: Montag" })).toBe("sekretariat@grundschule-eutin.de");
    expect(originalSender({ text: "Einfach so geschrieben" })).toBeNull();
  });
  it("Inhalt ohne Kopfzeilen, Auszug ≤ 300 Zeichen", () => {
    expect(mailBody(KITA)).not.toMatch(/^From:/m);
    expect(mailBody(KITA)).toContain("Laternenumzug ist am Freitag");
    expect(excerpt("x ".repeat(400)).length).toBeLessThanOrEqual(300);
  });
});

describe("Annehmen nur, was sicher ist", () => {
  it("manuell weitergeleitet von einem Mitglied", () => {
    expect(checkMail(mail({ text: KITA }), [FELIX])).toEqual({ ok: true, via: FELIX, sender: "info@kita-sonnenschein.de", forwarded: true });
  });
  it("Gmail-Auto-Weiterleitung (X-Forwarded-For)", () => {
    const auto = mail({ from: "Kita <info@kita-sonnenschein.de>", text: "Am Freitag um 17 Uhr Laternenumzug.", headers: { "x-forwarded-for": `${FELIX} familie-mueller-k7p2@mia.karamba-eis.de` } });
    expect(checkMail(auto, [FELIX])).toMatchObject({ ok: true, sender: "info@kita-sonnenschein.de" });
  });
  it("fremder Absender, Newsletter, SPF/DKIM fehlgeschlagen, zu groß", () => {
    expect(checkMail(mail({ from: "Spam <x@spam.example>" }), [FELIX])).toEqual({ ok: false, reason: "fremd" });
    expect(checkMail(mail({ from: "Shop <newsletter@shop.de>", headers: { "x-forwarded-for": FELIX, "list-unsubscribe": "<mailto:x>" } }), [FELIX])).toEqual({ ok: false, reason: "werbung" });
    expect(checkMail(mail({ headers: { "authentication-results": "mx; spf=fail smtp.mailfrom=example.com" } }), [FELIX])).toEqual({ ok: false, reason: "unsicher" });
    expect(checkMail(mail({ text: "x".repeat(20) }), [FELIX], [], 10)).toEqual({ ok: false, reason: "zu_gross" });
  });
  it("gelernte Absender kommen auch mit Newsletter-Kopf durch", () => {
    const nl = mail({ from: "Kita <news@kita-sonnenschein.de>", headers: { "x-forwarded-for": FELIX, "list-unsubscribe": "<x>" } });
    expect(checkMail(nl, [FELIX], ["kita-sonnenschein.de"]).ok).toBe(true);
  });
  it("Gmail- und Outlook-Bestätigung", () => {
    expect(forwardingConfirmation(mail({ from: "Gmail-Team <forwarding-noreply@google.com>", subject: "(#123456789) Bestätigung der Gmail-Weiterleitung", text: "Bestätigungscode: 123456789" }))).toEqual({ anbieter: "Gmail", code: "123456789" });
    expect(forwardingConfirmation(mail({ from: "Outlook <no-reply@outlook.com>", subject: "Weiterleitung bestätigen", text: "Ihr Code lautet 445566" }))).toEqual({ anbieter: "Outlook", code: "445566" });
    expect(forwardingConfirmation(mail({ text: KITA }))).toBeNull();
  });
});

describe("Vorschläge aus der Mail (ohne KI)", () => {
  it("Kita-Mail: Termin mit Ort, Aufgabe mit Frist, Einkauf", () => {
    const v = vorschlaegeAus(mailBody(KITA), T);
    expect(v).toContainEqual({ kind: "termin", title: "Laternenumzug", date: "2026-10-23", start: "17:00", place: "Schlosspark" });
    expect(v.find((x) => x.kind === "aufgabe")).toEqual({ kind: "aufgabe", title: "Anmeldung abgeben", due: "2026-10-26" });
    expect(v).toContainEqual({ kind: "einkauf", name: "Kuchen für den Basar" });
    expect(v.some((x) => x.kind === "aufgabe" && x.due === "2026-10-26")).toBe(true);
    expect(mailThema([{ vorschlaege: v, confirmation: null }])).toBe(`${v.length} Vorschläge aus Mails`);
    expect(mailThema([{ vorschlaege: [], confirmation: { anbieter: "Gmail", code: "123" } }])).toBe("Gmail-Code: 123");
    expect(mailThema([{ vorschlaege: [], confirmation: null }])).toBeNull();
  });
  it("ohne Datum/Aufgabe/Einkauf: kein Vorschlag", () => {
    expect(vorschlaegeAus("Danke für den schönen Nachmittag. Bis bald!", T)).toEqual([]);
  });
});

describe("Adressen", () => {
  it("Familie und Arbeit, unsere Domain, Raum aus der Adresse", () => {
    expect(localPart("familie", "Familie Müller", "K7P2")).toBe("familie-mueller-k7p2");
    expect(localPart("arbeit", "Felix", "a1b2")).toBe("felix-arbeit-a1b2");
    expect(slug("Familie Groß & Söhne")).toBe("gross-soehne");
    expect(mailDomain(undefined)).toBe("mia.karamba-eis.de");
    expect(mailDomain("Mails.Example.de")).toBe("mails.example.de");
    expect(ourLocalPart(["Mia <familie-mueller-k7p2@mia.karamba-eis.de>"])).toBe("familie-mueller-k7p2");
    expect(ourLocalPart(["x@andere.de"])).toBeNull();
    expect(roomOfLocalPart("felix-arbeit-a1b2")).toBe("arbeit");
    expect(roomOfLocalPart("familie-mueller-k7p2")).toBe("familie");
  });
});

describe("Mia lernt die Absender", () => {
  it("2. Mail + übernommen → einmal fragen; Nein = nie wieder", () => {
    expect(absenderSchluessel("Info@Kita-Sonnenschein.de")).toBe("kita-sonnenschein.de");
    expect(absenderSchluessel("oma.berg@gmail.com")).toBe("oma.berg@gmail.com");
    expect(fragen({ sender: "kita-sonnenschein.de", count: 1, accepted: 1, decision: null })).toBe(false);
    expect(fragen({ sender: "kita-sonnenschein.de", count: 2, accepted: 0, decision: null })).toBe(false);
    expect(fragen({ sender: "kita-sonnenschein.de", count: 2, accepted: 1, decision: null })).toBe(true);
    expect(fragen({ sender: "kita-sonnenschein.de", count: 5, accepted: 3, decision: "nein" })).toBe(false);
    expect(absenderName("kita-sonnenschein.de")).toBe("Kita Sonnenschein");
    expect(frageText({ sender: "tsv-eutin.de", count: 2, accepted: 1, decision: null })).toBe("Von Tsv Eutin kommt öfter was. Soll ich deren Mails künftig automatisch bekommen?");
  });
  it("Gmail-Filter: Suchtext und Datei", () => {
    expect(gmailSuche(["tsv-eutin.de", "kita-sonnenschein.de", "tsv-eutin.de"])).toBe("from:(kita-sonnenschein.de OR tsv-eutin.de)");
    const x = gmailFilterXml(["kita-sonnenschein.de"], "familie-mueller-k7p2@mia.karamba-eis.de", "2026-10-21T08:00:00Z");
    expect(x).toContain("<apps:property name='hasTheWord' value='from:(kita-sonnenschein.de)'/>");
    expect(x).toContain("<apps:property name='forwardTo' value='familie-mueller-k7p2@mia.karamba-eis.de'/>");
  });
});

describe("Webhook-Signatur (Svix)", () => {
  const secret = `whsec_${Buffer.from("geheimnis-nur-fuer-den-test").toString("base64")}`;
  const sign = (id: string, ts: string, body: string) => createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  it("richtig, falsch, zu alt", () => {
    const body = '{"type":"email.received"}';
    const ok = { id: "msg_1", timestamp: "1000000", signature: `v1,${sign("msg_1", "1000000", body)}` };
    expect(verifySvix(body, ok, secret, 1000010)).toBe(true);
    expect(verifySvix(`${body} `, ok, secret, 1000010)).toBe(false);
    expect(verifySvix(body, { ...ok, signature: "v1,AAAA" }, secret, 1000010)).toBe(false);
    expect(verifySvix(body, ok, secret, 1000000 + 301)).toBe(false);
    expect(verifySvix(body, { ...ok, id: null }, secret, 1000010)).toBe(false);
    expect(verifySvix(body, ok, "", 1000010)).toBe(false);
  });
});
