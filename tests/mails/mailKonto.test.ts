// Mails an Mia im Test-Backend (gleiche Regeln wie Webhook und Datenbank):
// Adresse je Familie/Arbeit, Eingang nur von Mitgliedern, Vorschläge,
// verwerfen, Absender lernen, „Adresse ändern“, Arbeit nur für die Person;
// dazu Anleitung je Postfach und das Thema auf der Jetzt-Karte.
import { beforeEach, describe, expect, it } from "vitest";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { automatisch, EINZELN, postfachVon } from "@/lib/mails/anleitung";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { friendlyError } from "@/lib/konten/model";
import type { InboundMail } from "@/lib/mails/eingang";
import type { MailEintrag } from "@/lib/mails/vorschlag";

const login = (email: string) => {
  testKonten({ action: "send_code", email });
  const code = testKonten({ action: "admin_code", email }).code as string;
  return (testKonten({ action: "verify", email, code }) as { token: string }).token;
};

const NOW = Date.parse("2026-10-21T08:00:00Z");
const kita = (to: string, from = "Felix <felix@example.com>"): InboundMail => ({
  from,
  to: [to],
  subject: "Fwd: Laternenumzug",
  text: "---------- Forwarded message ---------\nFrom: Kita <info@kita-sonnenschein.de>\nSubject: Laternenumzug\n\nDer Laternenumzug ist am Freitag um 17 Uhr im Schlosspark.\nBitte bringt einen Kuchen für den Basar mit.",
  headers: {},
});

describe("Mails an Mia (Test-Backend)", () => {
  beforeEach(() => resetTestKonten());
  it("Adresse, Eingang, Vorschläge, verwerfen, lernen, Adresse ändern", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const fremd = login("fremd@example.com");
    testKonten({ action: "create_household", token: felix, name: "Familie Müller", displayName: "Felix" });
    const link = testKonten({ action: "create_invite_link", token: felix }).token as string;
    testKonten({ action: "join_by_link", token: lisa, linkToken: link, displayName: "Lisa" });
    expect(testKonten({ action: "mail_address", token: fremd, room: "familie" }).error).toBe("keine_familie");
    const local = testKonten({ action: "mail_address", token: felix, room: "familie" }).local as string;
    expect(local).toMatch(/^familie-mueller-[0-9a-f]{4}$/);
    expect(testKonten({ action: "mail_address", token: lisa, room: "familie" }).local).toBe(local);
    // fremder Absender: still verworfen
    expect(testKonten({ action: "mail_eingang", mail: kita(`${local}@x`, "Spam <spam@example.org>"), local }, NOW)).toMatchObject({ verworfen: "fremd" });
    expect(testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local: "gibt-es-nicht" }, NOW)).toMatchObject({ verworfen: "adresse" });
    expect(testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local }, NOW)).toEqual({ ok: true });
    const items = testKonten({ action: "mail_items", token: lisa }, NOW).items as MailEintrag[];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ room: "familie", senderDomain: "kita-sonnenschein.de", senderKey: "kita-sonnenschein.de", subject: "Laternenumzug" });
    expect(items[0].vorschlaege.map((v) => v.kind)).toEqual(["termin", "einkauf"]);
    expect((testKonten({ action: "mail_items", token: fremd }, NOW).items as unknown[]).length).toBe(0);
    // 7 Tage später weg
    expect((testKonten({ action: "mail_items", token: lisa }, NOW + 8 * 86_400_000).items as unknown[]).length).toBe(0);
    testKonten({ action: "drop_mail_item", token: fremd, id: items[0].id });
    expect((testKonten({ action: "mail_items", token: felix }, NOW).items as unknown[]).length).toBe(1);
    testKonten({ action: "drop_mail_item", token: felix, id: items[0].id });
    expect((testKonten({ action: "mail_items", token: felix }, NOW).items as unknown[]).length).toBe(0);
    // Lernen: zweite Mail, übernommen, dann „Ja, gern“
    testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local }, NOW);
    testKonten({ action: "mail_sender", token: felix, sender: "kita-sonnenschein.de", room: "familie", accepted: true });
    expect(testKonten({ action: "mail_senders", token: lisa }).senders).toEqual([{ room: "familie", sender: "kita-sonnenschein.de", count: 2, accepted: 1, decision: null }]);
    testKonten({ action: "mail_sender", token: lisa, sender: "kita-sonnenschein.de", room: "familie", decision: "ja" });
    expect((testKonten({ action: "mail_senders", token: felix }).senders as { decision: string }[])[0].decision).toBe("ja");
    // Adresse ändern: alte nimmt nichts mehr an
    const neu = testKonten({ action: "mail_address", token: felix, room: "familie", renew: true }).local as string;
    expect(neu).not.toBe(local);
    expect(testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local }, NOW)).toMatchObject({ verworfen: "adresse" });
  });

  it("Arbeit: eigene Adresse, nur die Person sieht ihre Vorschläge; Kinder bekommen keine Familien-Adresse", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const kind = login("kind@example.com");
    testKonten({ action: "create_household", token: felix, name: "Familie Müller", displayName: "Felix" });
    testKonten({ action: "join_by_link", token: lisa, linkToken: testKonten({ action: "create_invite_link", token: felix }).token, displayName: "Lisa" });
    testKonten({ action: "join_by_link", token: kind, linkToken: testKonten({ action: "create_invite_link", token: felix, role: "kind" }).token, displayName: "Jonne" });
    expect(testKonten({ action: "mail_address", token: kind, room: "familie" }).error).toBe("darf_nicht_einladen");
    const work = testKonten({ action: "mail_address", token: felix, room: "arbeit" }).local as string;
    expect(work).toMatch(/^felix-arbeit-[0-9a-f]{4}$/);
    expect(testKonten({ action: "mail_address", token: lisa, room: "arbeit" }).local).not.toBe(work);
    // Lisa darf nicht an Felix’ Arbeit-Adresse weiterleiten
    expect(testKonten({ action: "mail_eingang", mail: kita(`${work}@x`, "Lisa <lisa@example.com>"), local: work }, NOW)).toMatchObject({ verworfen: "fremd" });
    testKonten({ action: "mail_eingang", mail: kita(`${work}@x`), local: work }, NOW);
    expect((testKonten({ action: "mail_items", token: felix }, NOW).items as MailEintrag[])[0].room).toBe("arbeit");
    expect((testKonten({ action: "mail_items", token: lisa }, NOW).items as unknown[]).length).toBe(0);
    // Konto weg: Arbeit-Adresse und -Vorschläge gehen mit
    testKonten({ action: "delete_account", token: felix });
    expect(testKonten({ action: "mail_eingang", mail: kita(`${work}@x`), local: work }, NOW)).toMatchObject({ verworfen: "adresse" });
  });

  it("höchstens 30 Mails am Tag", () => {
    const felix = login("felix@example.com");
    testKonten({ action: "create_household", token: felix, name: "Familie Müller", displayName: "Felix" });
    const local = testKonten({ action: "mail_address", token: felix, room: "familie" }).local as string;
    for (let i = 0; i < 30; i++) testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local }, NOW);
    expect(testKonten({ action: "mail_eingang", mail: kita(`${local}@x`), local }, NOW)).toMatchObject({ verworfen: "limit" });
  });
});

describe("Anleitung je Postfach", () => {
  it("erkennt das Postfach an der Adresse", () => {
    expect(postfachVon("a@gmail.com")).toBe("gmail");
    expect(postfachVon("a@hotmail.de")).toBe("outlook");
    expect(postfachVon("a@icloud.com")).toBe("apple");
    expect(postfachVon("a@posteo.de")).toBe("andere");
  });
  it("kurz: höchstens 4 Schritte", () => {
    expect(EINZELN.length).toBeLessThanOrEqual(4);
    for (const p of ["gmail", "outlook", "apple", "andere"] as const) expect(automatisch(p).length).toBeLessThanOrEqual(4);
  });
  it("freundlicher Satz, wenn noch keine Familie da ist", () => {
    expect(friendlyError("keine_familie")).toMatch(/Familie/);
  });
});

describe("Jetzt-Karte: Vorschläge aus Mails", () => {
  const base = { today: "2026-10-21", calm: false, upcoming: [], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] }, urgent: [], dueToday: [], pin: null, planWeather: null, dish: null, birthdays: [], sport: null, shop: null, timer: null, cookingStep: null, reminder: null, pause: null, dinnerFree: false, leisure: null, tip: null, region: null, kids: false, weekCheck: null, demo: false, tiles: [], weights: {}, hidden: [] };
  it("tagsüber ein Thema (Baustein, ganz hinten in der Rangliste) → /mails, nachts nicht", () => {
    const mail = { id: "m1:2", title: "2 Vorschläge aus Mails", detail: "Laternenumzug" };
    const day = jetztTopics({ ...base, minutes: 10 * 60, mail });
    expect(day[0]).toMatchObject({ kind: "mail", title: "2 Vorschläge aus Mails", target: { href: "/mails" } });
    expect(jetztTopics({ ...base, minutes: 23 * 60, mail }).some((t) => t.kind === "mail")).toBe(false);
  });
});
