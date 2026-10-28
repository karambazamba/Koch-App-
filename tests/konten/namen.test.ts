// Familie verbinden klarer + Namen statt Mail-Adresse (A-042): Profilname
// wird übernommen, Nachfrage nur ohne Namen, Vorschlag aus der Mail,
// einmalige Korrektur alter Konten, Haushaltsname je Haushaltsart und mit
// Nachname, Einladungs-Link mit Datum und Wochentag – und in der
// Familie-Ansicht steht nirgends ein „@“ außer unter „Angemeldet als“.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { anfangsbuchstabe, brauchtNamensfrage, haushaltAnzeige, istMailHaushaltsname, istMailName, mitgliedName, nachnameAusProfil, nameAusMail, namensKorrektur, ohneMail, personName, profilName, standardHaushaltsname } from "@/lib/konten/namen";
import { linkDatum, linkGilt, linkTage, linkZeile, neuesterLink } from "@/lib/konten/einladenText";
import { linkWerSatz, haushaltName, verbindenTitel } from "@/lib/core/haushalt";
import { addedBy } from "@/lib/konten/wer";
import { fromLabel, memberName } from "@/lib/kalender/abgeben/model";
import { sanitizePin } from "@/lib/pinnwand/model";
import { LINK_TAGE, type HouseholdInfo, type InviteLink, type Member } from "@/lib/konten/model";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";

const m = (userId: string, displayName: string, role: Member["role"] = "erwachsener"): Member => ({ userId, displayName, role, personId: null });
const hh = (name: string, me: Member, others: Member[] = []): HouseholdInfo => ({ id: "h1", name, region: null, members: [me, ...others], me });
const FELIX = { userId: "u1", email: "felix.gabriel92@example.com" };

describe("Namen statt Mail-Adresse", () => {
  it("Vorschlag aus der Mail: Teil vor dem @, ohne Punkte/Zahlen/Unterstriche, großgeschrieben", () => {
    expect(nameAusMail("felix.gabriel92@example.com")).toBe("Felix Gabriel");
    expect(nameAusMail("mathis_k@example.com")).toBe("Mathis K");
    expect(nameAusMail("anna-lena@web.de")).toBe("Anna-Lena");
    expect(nameAusMail("LISA@gmx.de")).toBe("Lisa");
    expect(nameAusMail("12345@x.de")).toBe("");
  });

  it("personName zeigt nie eine Mail", () => {
    expect(personName("felix@example.com")).toBe("Felix");
    expect(personName("  Lisa ")).toBe("Lisa");
    expect(personName("")).toBe("");
    expect(mitgliedName(m("u", ""))).toBe("Ohne Namen");
    expect(mitgliedName(m("u", "ana.berg@example.com"))).toBe("Ana Berg");
    expect(anfangsbuchstabe("lisa@x.de")).toBe("L");
  });

  it("Profilname wird übernommen, Nachfrage nur ohne Namen", () => {
    expect(profilName("Felix")).toBe("Felix");
    expect(brauchtNamensfrage("Felix")).toBe(false);
    expect(brauchtNamensfrage("")).toBe(true);
    expect(brauchtNamensfrage("   ")).toBe(true);
    expect(brauchtNamensfrage(undefined)).toBe(true);
  });

  it("Überall der Name: „von …“, Abgeben, Pinnwand", () => {
    const members = [m("u1", "Felix"), m("u2", "lisa@example.com")];
    expect(addedBy("u2", members, "u1")).toEqual({ name: "Lisa" });
    expect(memberName(members, "u2")).toBe("Lisa");
    expect(fromLabel({ typ: "aufgabe", besitzer: "u2", data: { fuer: "u1" } }, "u1", members)).toBe("von Lisa");
    const pin = sanitizePin({ id: "p", typ: "pinnwand", raum: "familie", besitzer: "x", erstellt: "2026-10-28T08:00:00Z", geaendert: "2026-10-28T08:00:00Z", data: { text: "Hallo", author: "felix@example.com" } });
    expect(pin?.data.author).toBe("Felix");
  });
});

describe("Haushaltsname", () => {
  it("Standard je Haushaltsart, mit Nachname „Familie Gabriel“", () => {
    expect([haushaltName("familie"), haushaltName("paar"), haushaltName("allein")]).toEqual(["Familie", "Wir zwei", "Privat"]);
    expect(standardHaushaltsname("familie", { householdName: "", persons: [{ name: "Felix" }] })).toBe("Familie");
    expect(standardHaushaltsname("familie", { householdName: "Gabriel", persons: [] })).toBe("Familie Gabriel");
    expect(standardHaushaltsname("familie", { householdName: "Familie Gabriel", persons: [] })).toBe("Familie Gabriel");
    expect(standardHaushaltsname("familie", { householdName: "", persons: [{ name: "Felix Gabriel" }] })).toBe("Familie Gabriel");
    expect(standardHaushaltsname("paar", { householdName: "", persons: [{ name: "Felix Gabriel" }] })).toBe("Wir zwei");
    expect(standardHaushaltsname("allein", null)).toBe("Privat");
    expect(standardHaushaltsname("paar", { householdName: "Villa Kunterbunt", persons: [] })).toBe("Villa Kunterbunt");
    expect(nachnameAusProfil({ householdName: "Villa Kunterbunt", persons: [{ name: "Lisa" }] })).toBeNull();
  });

  it("Anzeige nie mit Mail, leer = Standard", () => {
    expect(haushaltAnzeige("", "Familie")).toBe("Familie");
    expect(haushaltAnzeige("Familie felix@x.de", "Wir zwei")).toBe("Wir zwei");
    expect(haushaltAnzeige("Familie Müller", "Familie")).toBe("Familie Müller");
  });

  it("Überschrift je Haushaltsart", () => {
    expect([verbindenTitel("allein"), verbindenTitel("paar"), verbindenTitel("familie")]).toEqual(["Mit jemandem teilen", "Zu zweit verbinden", "Familie verbinden"]);
  });
});

describe("Einmalige Korrektur alter Konten", () => {
  it("erkennt Mail-Namen und „Familie <mail>“", () => {
    expect(istMailName("felix.gabriel92", FELIX.email)).toBe(true);
    expect(istMailName("felix@x.de", null)).toBe(true);
    expect(istMailName("Felix", FELIX.email)).toBe(false);
    expect(istMailHaushaltsname("Familie felix.gabriel92", FELIX.email)).toBe(true);
    expect(istMailHaushaltsname("", FELIX.email)).toBe(true);
    expect(istMailHaushaltsname("Familie Felix", FELIX.email)).toBe(false);
    expect(istMailHaushaltsname("Familie Gabriel", FELIX.email)).toBe(false);
  });

  it("Mail-Name → Profilname, „Familie <mail>“ → Standard", () => {
    const fix = namensKorrektur(hh("Familie felix.gabriel92", m("u1", "felix.gabriel92")), FELIX, { name: "Felix", standard: "Familie Gabriel" });
    expect(fix).toEqual({ displayName: "Felix", householdName: "Familie Gabriel" });
  });

  it("ohne Profilnamen: bereinigter Teil vor dem @", () => {
    expect(namensKorrektur(hh("Familie", m("u1", "felix.gabriel92")), FELIX, { name: "", standard: "Familie" })).toEqual({ displayName: "Felix Gabriel" });
  });

  it("nach der Server-Migration (bereinigt bzw. leer): Profilname und Standard", () => {
    expect(namensKorrektur(hh("", m("u1", "Felix Gabriel")), FELIX, { name: "Felix", standard: "Wir zwei" })).toEqual({ displayName: "Felix", householdName: "Wir zwei" });
  });

  it("einmalig: wenn alles passt, gibt es nichts zu tun; Kinder benennen nicht um", () => {
    expect(namensKorrektur(hh("Familie Gabriel", m("u1", "Felix")), FELIX, { name: "Felix", standard: "Familie Gabriel" })).toEqual({});
    expect(namensKorrektur(hh("Familie Müller", m("u1", "Felix")), FELIX, { name: "Felix", standard: "Familie Gabriel" })).toEqual({});
    expect(namensKorrektur(hh("", m("u1", "Mathis", "kind")), FELIX, { name: "Mathis", standard: "Familie" })).toEqual({});
  });

  it("gespeicherter Haushalt im Gerät: ohne Mail", () => {
    const me = m("u1", "felix@example.com");
    const clean = ohneMail(hh("Familie felix@example.com", me, [m("u2", "Lisa")]));
    expect(clean.name).toBe("");
    expect(clean.me.displayName).toBe("Felix");
    expect(clean.members.map((x) => x.displayName)).toEqual(["Felix", "Lisa"]);
  });
});

describe("Einladungs-Link verständlich", () => {
  const NOW = Date.parse("2026-10-28T10:00:00Z");
  const exp = new Date(NOW + LINK_TAGE * 86_400_000).toISOString();

  it("„Link gilt 14 Tage, bis Mi, 11. Nov.“ mit Wochentag", () => {
    expect(linkDatum(new Date("2026-11-11T10:00:00Z"))).toBe("Mi, 11. Nov.");
    expect(linkTage(exp, NOW)).toBe(14);
    expect(linkGilt(exp, NOW)).toBe("Link gilt 14 Tage, bis Mi, 11. Nov.");
    expect(linkGilt(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe("Link gilt 1 Tag, bis Do, 29. Okt.");
    expect(linkWerSatz("familie")).toBe("Wer ihn öffnet, gehört zur Familie. Danach einfach neu holen.");
    expect(linkWerSatz("paar")).toBe("Wer ihn öffnet, gehört dazu. Danach einfach neu holen.");
  });

  it("je Link eine Zeile mit Rolle, Ablauf und Nutzung", () => {
    expect(linkZeile({ role: "erwachsener", expiresAt: exp, uses: 1 })).toBe("Link für Erwachsene · gilt bis Mi, 11. Nov. · 1× benutzt");
    expect(linkZeile({ role: "kind", expiresAt: exp, uses: 0 })).toBe("Link für ein Kind · gilt bis Mi, 11. Nov.");
    const a: InviteLink = { ref: "a", role: "erwachsener", inviterName: "Felix", expiresAt: "2026-11-01T00:00:00Z", uses: 0 };
    const b: InviteLink = { ...a, ref: "b", expiresAt: "2026-11-11T00:00:00Z" };
    expect(neuesterLink([a, b])?.ref).toBe("b");
    expect(neuesterLink([])).toBeNull();
  });

  it("Test-Backend: Laufzeit wie die Datenbank, Zurückziehen, Namen ändern", () => {
    resetTestKonten();
    const login = (email: string) => {
      testKonten({ action: "send_code", email });
      const code = testKonten({ action: "admin_code", email }).code as string;
      return (testKonten({ action: "verify", email, code }) as { token: string }).token;
    };
    const felix = login("felix.gabriel92@example.com");
    testKonten({ action: "create_household", token: felix, name: "Familie felix.gabriel92", displayName: "felix.gabriel92" });
    testKonten({ action: "create_invite_link", token: felix, role: "erwachsener" }, NOW);
    testKonten({ action: "create_invite_link", token: felix, role: "kind" }, NOW);
    const links = testKonten({ action: "list_invite_links", token: felix }, NOW).links as InviteLink[];
    expect(links).toHaveLength(2);
    expect(links.map(linkZeile)).toEqual(["Link für Erwachsene · gilt bis Mi, 11. Nov.", "Link für ein Kind · gilt bis Mi, 11. Nov."]);
    testKonten({ action: "revoke_invite_link", token: felix, ref: links[0].ref });
    expect((testKonten({ action: "list_invite_links", token: felix }, NOW).links as InviteLink[]).map((l) => l.role)).toEqual(["kind"]);
    expect(testKonten({ action: "set_display_name", token: felix, displayName: "Felix" }).ok).toBe(true);
    expect(testKonten({ action: "rename_household", token: felix, name: "Familie Gabriel" }).ok).toBe(true);
    const h = testKonten({ action: "my_household", token: felix }).household as HouseholdInfo;
    expect([h.name, h.me.displayName]).toEqual(["Familie Gabriel", "Felix"]);
    // Kind darf nicht umbenennen
    const kidToken = testKonten({ action: "create_invite_link", token: felix, role: "kind" }).token as string;
    const kind = login("kind@example.com");
    testKonten({ action: "join_by_link", token: kind, linkToken: kidToken, displayName: "Mathis" });
    expect(testKonten({ action: "rename_household", token: kind, name: "Kinderzimmer" }).error).toBe("darf_nicht_einladen");
  });
});

// --- Oberfläche: kein „@“ außer unter „Angemeldet als“ ------------------------

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }), useSearchParams: () => new URLSearchParams() }));

/** Sichtbarer Text (ohne Tags, ohne Attribute) – Zeile „Angemeldet als …“ herausgenommen */
const sichtbar = (html: string) =>
  html
    .replace(/<p[^>]*data-angemeldet-als[^>]*>[\s\S]*?<\/p>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ");

describe("Familie-Ansicht zeigt Namen, nie die Mail", () => {
  beforeEach(() => resetTestKonten());

  it("Mitglieder, Haushalt und Einladungen ohne „@“", async () => {
    const { HouseholdCard, InviteRows } = await import("@/components/konten/HouseholdCard");
    const me = m("u1", "felix.gabriel92@example.com");
    const household = hh("Familie felix.gabriel92@example.com", me, [m("u2", "lisa@example.com"), m("u3", "Mathis", "kind")]);
    const html = renderToStaticMarkup(createElement(HouseholdCard, { household, email: "felix.gabriel92@example.com", onSignedOut: () => {} }));
    expect(html).toContain("Angemeldet als felix.gabriel92@example.com");
    const text = sichtbar(html);
    expect(text).not.toContain("@");
    expect(text).toContain("Felix Gabriel");
    expect(text).toContain("Lisa");
    expect(text).toContain("Familie");
    // Avatar-Kreis: Anfangsbuchstabe in der Personenfarbe (nicht weiß/soft)
    expect(html).not.toContain("bg-tile-inner");
    expect(html).toMatch(/text-on-accent bg-(accent|work|person-3|person-4)"[^>]*>L</);

    const exp = "2026-11-11T10:00:00.000Z";
    const onRevoke = vi.fn();
    const rows = renderToStaticMarkup(createElement(InviteRows, { links: [{ ref: "a", role: "erwachsener", inviterName: "felix@x.de", expiresAt: exp, uses: 1 }, { ref: "b", role: "kind", inviterName: "Felix", expiresAt: exp, uses: 0 }], onRevoke }));
    expect(rows.match(/data-einladung/g)).toHaveLength(2);
    expect(rows).toContain("Link für Erwachsene · gilt bis Mi, 11. Nov. · 1× benutzt");
    expect((rows.match(/Zurückziehen/g) ?? []).length).toBe(2);
    expect(rows).toContain("min-h-11");
    expect(sichtbar(rows)).not.toContain("@");
  });

  it("Zurückziehen ruft den vorhandenen Weg mit der Kennung", async () => {
    const { InviteRows } = await import("@/components/konten/HouseholdCard");
    const onRevoke = vi.fn();
    const el = InviteRows({ links: [{ ref: "abc", role: "erwachsener", inviterName: "Felix", expiresAt: "2026-11-11T10:00:00Z", uses: 0 }], onRevoke });
    // <section> → [h2, ul] → ul: [li] → li: [span, button]
    type El = { props: { children: unknown; onClick?: () => void } };
    const ul = (el as El).props.children as El[];
    const li = (ul[1].props.children as El[])[0];
    const button = (li.props.children as El[])[1];
    button.props.onClick?.();
    expect(onRevoke).toHaveBeenCalledWith("abc");
  });
});
