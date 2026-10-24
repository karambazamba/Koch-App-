// Anmelden wie man es kennt (Tafel 22): Einladen per Link im Test-Backend
// (gleiche Regeln wie die Datenbank), Karte „Familie einladen“, Apple/Google
// nur mit Schalter.
import { beforeEach, describe, expect, it } from "vitest";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { einladenText, einladenWunsch, migrateEinladen } from "@/lib/konten/einladenHinweis";
import { oauthProviders, safeReturn } from "@/lib/konten/oauth";

const login = (email: string) => {
  testKonten({ action: "send_code", email });
  const code = testKonten({ action: "admin_code", email }).code as string;
  return (testKonten({ action: "verify", email, code }) as { token: string }).token;
};

describe("Einladen per Link (Test-Backend)", () => {
  beforeEach(() => resetTestKonten());
  it("Link: mehrfach nutzbar, Wechsel nur auf Wunsch, zurückziehen, abgelaufen, Kind lädt nicht ein", () => {
    const anja = login("anja@example.com");
    const ben = login("ben@example.com");
    const kim = login("kim@example.com");
    const fremd = login("fremd@example.com");
    const hh = testKonten({ action: "create_household", token: anja, name: "Familie Berg", displayName: "Anja" }).householdId;
    const kimHh = testKonten({ action: "create_household", token: kim, name: "Familie Kim", displayName: "Kim" }).householdId;
    const token = testKonten({ action: "create_invite_link", token: anja }, 0).token as string;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(testKonten({ action: "invite_link_info", linkToken: token }, 1)).toEqual({ status: "gueltig", inviter: "Anja", family: "Familie Berg" });
    expect(testKonten({ action: "join_by_link", token: ben, linkToken: token, displayName: "Ben" }, 1).householdId).toBe(hh);
    expect(testKonten({ action: "join_by_link", token: ben, linkToken: token }, 1).householdId).toBe(hh);
    expect(testKonten({ action: "join_by_link", token: kim, linkToken: token }, 1)).toEqual({ error: "andere_familie", family: "Familie Kim" });
    expect(testKonten({ action: "join_by_link", token: kim, linkToken: token, switchFamily: true, displayName: "Kim" }, 1).householdId).toBe(hh);
    expect(testKonten({ action: "my_household", token: kim }).household).toMatchObject({ id: hh });
    expect(kimHh).not.toBe(hh);
    const links = testKonten({ action: "list_invite_links", token: anja }, 1).links as { ref: string; uses: number }[];
    expect(links).toHaveLength(1);
    expect(links[0].uses).toBe(2);
    expect((testKonten({ action: "list_invite_links", token: fremd }, 1).links as unknown[]).length).toBe(0);
    expect(testKonten({ action: "revoke_invite_link", token: fremd, ref: links[0].ref }, 1).error).toBe("darf_nicht_einladen");
    testKonten({ action: "revoke_invite_link", token: anja, ref: links[0].ref }, 1);
    expect(testKonten({ action: "join_by_link", token: fremd, linkToken: token }, 1).error).toBe("link_unbekannt");
    const kidLink = testKonten({ action: "create_invite_link", token: anja, role: "kind" }, 0).token as string;
    expect(testKonten({ action: "invite_link_info", linkToken: kidLink }, 15 * 86_400_000).status).toBe("abgelaufen");
    expect(testKonten({ action: "join_by_link", token: fremd, linkToken: kidLink }, 15 * 86_400_000).error).toBe("link_abgelaufen");
    const kid = login("kind@example.com");
    testKonten({ action: "join_by_link", token: kid, linkToken: kidLink, displayName: "Kind" }, 1);
    expect(testKonten({ action: "create_invite_link", token: kid }).error).toBe("darf_nicht_einladen");
    expect(testKonten({ action: "invite_link_info", linkToken: "falsch" }).status).toBe("unbekannt");
  });
});

describe("Karte „Familie einladen“", () => {
  const base = { today: "2026-10-21", since: "2026-10-17", cloud: true, members: 1, secondAdult: null };
  it("nach 3 Tagen bzw. mit zweiter Person; nur mit Konten; nicht, wenn schon verbunden", () => {
    expect(einladenText({ version: 1, later: [] }, base)).toBe("Soll deine Familie auch sehen, was du einträgst?");
    expect(einladenText({ version: 1, later: [] }, { ...base, since: "2026-10-20" })).toBeNull();
    expect(einladenText({ version: 1, later: [] }, { ...base, since: "2026-10-20", secondAdult: "Lisa" })).toBe("Soll Lisa auch sehen, was du einträgst?");
    expect(einladenText({ version: 1, later: [] }, { ...base, cloud: false })).toBeNull();
    expect(einladenText({ version: 1, later: [] }, { ...base, members: 2 })).toBeNull();
  });
  it("„Später“: 7 Tage Ruhe, beim zweiten Mal nie wieder", () => {
    expect(einladenText({ version: 1, later: ["2026-10-18"] }, base)).toBeNull();
    expect(einladenText({ version: 1, later: ["2026-10-10"] }, base)).not.toBeNull();
    expect(einladenText({ version: 1, later: ["2026-10-01", "2026-10-10"] }, base)).toBeNull();
    expect(migrateEinladen({ version: 1, later: ["x", "2026-10-01"] })).toEqual({ version: 1, later: ["2026-10-01"] });
    expect(migrateEinladen(null)).toBeNull();
  });
});

describe("Apple/Google nur mit Schalter", () => {
  it("Reihenfolge Apple, Google; ohne Schalter nur E-Mail", () => {
    expect(oauthProviders({}, false)).toEqual([]);
    expect(oauthProviders({ google: "1" }, false)).toEqual(["google"]);
    expect(oauthProviders({ apple: "1", google: "1" }, false)).toEqual(["apple", "google"]);
    expect(oauthProviders({ apple: "true" }, false)).toEqual([]);
    // Launch 1.0: nur E-Mail-Code, auch wenn Apple/Google eingerichtet wären
    expect(oauthProviders({ apple: "1", google: "1" })).toEqual([]);
  });
  it("Rückkehr nur auf eigene Seiten", () => {
    expect(safeReturn("/e/0123456789abcdef0123456789abcdef")).toBe("/e/0123456789abcdef0123456789abcdef");
    expect(safeReturn("//boese.example")).toBe("/");
    expect(safeReturn("https://boese.example")).toBe("/");
    expect(safeReturn(null)).toBe("/");
  });
});

describe("Mia: „Lade Lisa ein“", () => {
  it("erkennt Einladen, nicht Essen-Einladungen", () => {
    expect(einladenWunsch("Lade Lisa ein")).toBe("Lisa");
    expect(einladenWunsch("Bitte lad meinen Mann ein")).toBe("Mann");
    expect(einladenWunsch("Ich möchte meine Schwester einladen")).toBe("Schwester");
    expect(einladenWunsch("Familie einladen")).toBe("");
    expect(einladenWunsch("Lisa zum Essen einladen")).toBeNull();
    expect(einladenWunsch("Lade dich ein")).toBeNull();
    expect(einladenWunsch("Milch auf die Liste")).toBeNull();
  });
});
