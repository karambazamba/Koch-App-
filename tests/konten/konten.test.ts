import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatInviteCode, friendlyError, inviteShareText, isEmail, normalizeInviteCode, otpDigits } from "@/lib/konten/model";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { fakeWindow, noBrowser } from "../helpers";

describe("Codes und Texte", () => {
  it("Einladungs-Code säubern und schön schreiben", () => {
    expect(normalizeInviteCode("4k7-p2q")).toBe("4K7P2Q");
    expect(normalizeInviteCode(" 4K7 P2Q ")).toBe("4K7P2Q");
    expect(normalizeInviteCode("4K7-P2")).toBeNull();
    expect(normalizeInviteCode("4K7-P0Q")).toBeNull();
    expect(normalizeInviteCode("4K7-PIQ")).toBeNull();
    expect(formatInviteCode("4K7P2Q")).toBe("4K7-P2Q");
    expect(inviteShareText("4K7P2Q")).toBe("Komm in unseren Haushalt bei Mia. Code: 4K7-P2Q");
    expect(inviteShareText("4K7P2Q", "https://koch-app-two.vercel.app/")).toBe("Komm in unseren Haushalt bei Mia. Code: 4K7-P2Q\nhttps://koch-app-two.vercel.app/beitreten?code=4K7-P2Q");
  });

  it("E-Mail und Anmelde-Code", () => {
    expect([isEmail("felix@example.com"), isEmail("felix@"), isEmail("felix example.com")]).toEqual([true, false, false]);
    expect(otpDigits("12 34-56 78")).toBe("123456");
  });

  it("Fehler als Satz, nie Technik", () => {
    expect(friendlyError("code_unbekannt")).toMatch(/kenne ich nicht/);
    expect(friendlyError("code_benutzt")).toMatch(/schon benutzt/);
    expect(friendlyError("code_abgelaufen")).toMatch(/abgelaufen/);
    expect(friendlyError("zu_viele_versuche")).toMatch(/Stunde/);
    expect(friendlyError("darf_nicht_einladen")).toMatch(/nur Erwachsene/);
    expect(friendlyError("otp_expired")).toMatch(/stimmt nicht oder ist abgelaufen/);
    expect(friendlyError("Token has expired or is invalid")).toMatch(/stimmt nicht/);
    expect(friendlyError("over_email_send_rate_limit")).toMatch(/kurz warten/);
    expect(friendlyError("TypeError: Failed to fetch")).toMatch(/Verbindung/);
    expect(friendlyError("irgendwas")).toBe("Hm, das hat gerade nicht geklappt – gleich nochmal?");
  });
});

describe("Test-Backend (gleiche Regeln wie die Datenbank)", () => {
  beforeEach(() => resetTestKonten());

  const login = (email: string) => {
    testKonten({ action: "send_code", email });
    const code = testKonten({ action: "admin_code", email }).code as string;
    return (testKonten({ action: "verify", email, code }) as { token: string }).token;
  };

  it("Anmelden per Code: falsch, abgelaufen, richtig", () => {
    testKonten({ action: "send_code", email: "felix@example.com" }, 0);
    const code = testKonten({ action: "admin_code", email: "felix@example.com" }).code as string;
    expect(code).toMatch(/^\d{6}$/);
    expect(testKonten({ action: "verify", email: "felix@example.com", code: "000000" === code ? "111111" : "000000" }, 1000).error).toBe("otp_expired");
    expect(testKonten({ action: "verify", email: "felix@example.com", code }, 901_000).error).toBe("otp_expired");
    testKonten({ action: "send_code", email: "felix@example.com" }, 0);
    const again = testKonten({ action: "admin_code", email: "felix@example.com" }).code as string;
    expect(testKonten({ action: "verify", email: "felix@example.com", code: again }, 1000).token).toBeTruthy();
    expect(testKonten({ action: "send_code", email: "kaputt" }).error).toBe("invalid email");
  });

  it("Haushalt, Einladen, Beitreten, Kind darf nicht einladen, Verlassen", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const mathis = login("mathis@example.com");
    const fremd = login("fremd@example.com");
    expect(testKonten({ action: "my_household", token: felix }).household).toBeNull();
    const hh = testKonten({ action: "create_household", token: felix, name: "Müller", displayName: "Felix" }).householdId;
    expect(testKonten({ action: "create_household", token: felix, name: "x" }).error).toBe("schon_im_haushalt");
    const code = testKonten({ action: "create_invite", token: felix }).code as string;
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
    expect(testKonten({ action: "join_household", token: lisa, code: code.toLowerCase(), displayName: "Lisa" }).householdId).toBe(hh);
    expect(testKonten({ action: "join_household", token: fremd, code }).error).toBe("code_benutzt");
    const kid = testKonten({ action: "create_invite", token: lisa, role: "kind" }).code as string;
    testKonten({ action: "join_household", token: mathis, code: kid, displayName: "Mathis" });
    expect(testKonten({ action: "create_invite", token: mathis }).error).toBe("darf_nicht_einladen");
    const seen = testKonten({ action: "my_household", token: lisa }).household as { members: { displayName: string; role: string }[]; me: { displayName: string } };
    expect(seen.members.map((m) => `${m.displayName}:${m.role}`)).toEqual(["Felix:erwachsener", "Lisa:erwachsener", "Mathis:kind"]);
    expect(seen.me.displayName).toBe("Lisa");
    expect(testKonten({ action: "my_household", token: fremd }).household).toBeNull();
    for (let i = 0; i < 10; i++) testKonten({ action: "join_household", token: fremd, code: "ZZZ-ZZZ" });
    expect(testKonten({ action: "join_household", token: fremd, code }).error).toBe("zu_viele_versuche");
    testKonten({ action: "leave_household", token: lisa });
    testKonten({ action: "delete_account", token: mathis });
    expect(testKonten({ action: "session", token: mathis }).error).toBe("nicht_angemeldet");
    testKonten({ action: "leave_household", token: felix });
    expect(testKonten({ action: "join_household", token: lisa, code: kid }).error).toBe("code_unbekannt");
  });

  it("Einträge: Familie für alle, Arbeit nur für den Besitzer, neueste Änderung gewinnt", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const fremd = login("fremd@example.com");
    testKonten({ action: "create_household", token: felix, name: "Müller" });
    const code = testKonten({ action: "create_invite", token: felix }).code as string;
    testKonten({ action: "join_household", token: lisa, code });
    const doc = (id: string, raum: string, geaendert: string, title: string) => ({ id, typ: "termin", raum, erstellt: geaendert, geaendert, geloescht: false, data: { title } });
    testKonten({ action: "push_entries", token: felix, docs: [doc("t1", "familie", "2026-10-21T08:00:00Z", "Kita"), doc("w1", "arbeit", "2026-10-21T08:00:00Z", "Kunde")] });
    const pulled = (token: string, since = 0) => testKonten({ action: "pull_entries", token, since }).docs as { id: string; data: { title: string }; rev: number; besitzer: string }[];
    expect(pulled(felix).map((d) => d.id)).toEqual(["t1", "w1"]);
    expect(pulled(lisa).map((d) => d.id)).toEqual(["t1"]);
    expect(testKonten({ action: "pull_entries", token: fremd }).docs).toEqual([]);
    expect(testKonten({ action: "push_entries", token: lisa, docs: [doc("w1", "arbeit", "2026-10-22T08:00:00Z", "x")] }).skipped).toEqual(["w1"]);
    testKonten({ action: "push_entries", token: lisa, docs: [doc("t1", "familie", "2026-10-21T07:00:00Z", "alt")] });
    expect(pulled(felix).find((d) => d.id === "t1")?.data.title).toBe("Kita");
    testKonten({ action: "push_entries", token: lisa, docs: [doc("t1", "familie", "2026-10-21T09:00:00Z", "Kita 9")] });
    const after = pulled(felix, pulled(felix)[0].rev);
    expect(after.map((d) => `${d.id}:${d.data.title}`)).toContain("t1:Kita 9");
    testKonten({ action: "leave_household", token: felix });
    expect(pulled(lisa).map((d) => d.id)).toEqual(["t1"]);
    expect(testKonten({ action: "push_entries", token: fremd, docs: [] }).error).toBe("kein_haushalt");
  });

  it("abgelaufener Einladungs-Code", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    testKonten({ action: "create_household", token: felix, name: "Müller" }, 0);
    const code = testKonten({ action: "create_invite", token: felix }, 0).code as string;
    expect(testKonten({ action: "join_household", token: lisa, code }, 8 * 86_400_000).error).toBe("code_abgelaufen");
  });
});

describe("Zur Laufzeit: eingerichtet und angemeldet?", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    noBrowser();
  });

  it("Server liest Variablen zur Laufzeit; Test-Backend nie in Produktion", async () => {
    const { supabasePublic, supabaseSecret, kontenTest } = await import("@/lib/konten/serverEnv");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    expect(supabasePublic()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(supabasePublic()).toEqual({ url: "https://abc.supabase.co", key: "anon" });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(supabasePublic()?.key).toBe("sb_publishable_x");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "geheim");
    expect(supabaseSecret()).toBe("geheim");
    vi.stubEnv("KONTEN_TEST", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(kontenTest()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(kontenTest()).toBe(false);
  });

  it("cloudSync nur mit bekanntem Haushalt", async () => {
    fakeWindow();
    vi.resetModules();
    const { cloudSync, accountCache } = await import("@/lib/konten/cache");
    expect(cloudSync()).toBe(false);
    accountCache.save({ version: 1, user: { userId: "u", email: "a@b.de" }, household: null });
    expect(cloudSync()).toBe(false);
    const me = { userId: "u", displayName: "Felix", role: "erwachsener" as const, personId: null };
    accountCache.save({ version: 1, user: { userId: "u", email: "a@b.de" }, household: { id: "h", name: "Müller", region: null, members: [me], me } });
    expect(cloudSync()).toBe(true);
  });
});
