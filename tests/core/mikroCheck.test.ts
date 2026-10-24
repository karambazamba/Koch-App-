// Mikro-Check (Tafel 86): jede Fehlerart zeigt nur die passenden Schritte,
// richtige Anleitung je Gerät und iOS-Version.
import { describe, expect, it } from "vitest";
import { anleitung, diagnose, ergebnisAusFehler, fehlerSatz, micFehler, PRIVAT_TEXT, schalterFuer, tonAngekommen, vielleichtPrivat, type CheckErgebnis } from "@/lib/core/micCheck";

const texte = (steps: { text: string }[]) => steps.map((s) => s.text).join(" | ");
const ok: CheckErgebnis = { mikro: "ok", erkennung: "ok", ton: "ok" };

describe("Fehlerarten sauber trennen", () => {
  it("getUserMedia NotAllowedError = gesperrt, Zeitlimit = hängt", () => {
    expect(micFehler("NotAllowedError", "ios")).toBe("gesperrt");
    expect(micFehler("MicTimeout", "ios")).toBe("haengt");
    expect(micFehler("NotFoundError", "ios")).toBeNull();
  });

  it("Spracherkennung: service-not-allowed = Diktieren/Spracherkennung aus; not-allowed bei erlaubtem Mikro ebenso (Felix’ Fall)", () => {
    expect(micFehler("service-not-allowed", "ios")).toBe("erkennung_aus");
    expect(micFehler("not-allowed", "ios", true)).toBe("erkennung_aus");
    expect(micFehler("not-allowed", "ios", false)).toBe("gesperrt");
    expect(micFehler("not-allowed", "android", true)).toBe("gesperrt");
  });

  it("Check: Mikro ok, Spracherkennung scheitert → erkennung_aus (nur Schalter 2 und 3)", () => {
    const f = diagnose({ mikro: "ok", erkennung: "fehler", erkennungFehler: "not-allowed", ton: "ok" }, "ios");
    expect(f).toBe("erkennung_aus");
    expect(schalterFuer(f!, "ios")).toEqual(["diktat", "spracherkennung"]);
  });

  it("Check: Mikro gesperrt → Schalter 1 und die Seiten-Sperre", () => {
    const f = diagnose({ mikro: "fehler", mikroFehler: "NotAllowedError", erkennung: "ungeprueft", ton: "ungeprueft" }, "ios");
    expect(f).toBe("gesperrt");
    expect(schalterFuer(f!, "ios")).toEqual(["mikrofon", "seite"]);
  });

  it("Check: kein Ton, hängt, unklar → alle drei Schalter", () => {
    expect(diagnose({ ...ok, ton: "fehler" }, "ios")).toBe("kein_ton");
    expect(diagnose({ mikro: "fehler", mikroFehler: "MicTimeout", erkennung: "ok", ton: "ungeprueft" }, "ios")).toBe("haengt");
    expect(diagnose({ mikro: "fehler", mikroFehler: "AbortError", erkennung: "ok", ton: "ungeprueft" }, "ios")).toBe("unklar");
    expect(diagnose({ mikro: "ok", erkennung: "fehler", erkennungFehler: "nicht_da", ton: "ok" }, "ios")).toBe("unklar");
    for (const f of ["kein_ton", "haengt", "unklar"] as const) expect(schalterFuer(f, "ios")).toEqual(["mikrofon", "diktat", "spracherkennung", "seite"]);
  });

  it("privater Tab: eigener Satz, keine Schritte", () => {
    expect(diagnose({ ...ok, mikro: "fehler", mikroFehler: "NotAllowedError" }, "ios", true)).toBe("privat");
    expect(schalterFuer("privat", "ios")).toEqual([]);
    expect(fehlerSatz("privat", "ios")).toBe(PRIVAT_TEXT);
    expect(PRIVAT_TEXT).toContain("privaten Tab");
    expect(vielleichtPrivat(50 * 1024 * 1024, false)).toBe(true);
    expect(vielleichtPrivat(50 * 1024 * 1024, true)).toBe(false);
    expect(vielleichtPrivat(2 * 1024 * 1024 * 1024, false)).toBe(false);
    expect(vielleichtPrivat(null, false)).toBe(false);
  });

  it("alles grün = kein Fehler; automatisch bekannter Fehler ergibt die Häkchen-Liste", () => {
    expect(diagnose(ok, "ios")).toBeNull();
    expect(ergebnisAusFehler("erkennung_aus")).toEqual({ mikro: "ok", erkennung: "fehler", ton: "ungeprueft" });
    expect(ergebnisAusFehler("gesperrt").mikro).toBe("fehler");
  });

  it("Pegel-Test", () => {
    expect(tonAngekommen([0, 0.01, 0.005])).toBe(false);
    expect(tonAngekommen([0, 0.05])).toBe(true);
  });
});

describe("Anleitung je Gerät", () => {
  it("iPhone, nur Spracherkennung/Diktieren: Zahnrad, Schalter 2, Schalter 3, neu öffnen – kein Mikrofon-Schritt", () => {
    const s = anleitung("ios", 26, schalterFuer("erkennung_aus", "ios"));
    expect(s).toHaveLength(4);
    expect(texte(s)).toContain("Diktierfunktion");
    expect(texte(s)).toContain("„Datenschutz & Sicherheit“ → „Spracherkennung“ → „Safari“ an");
    expect(texte(s)).not.toContain("Mikrofon");
    expect(s.at(-1)?.text).toBe("Mia ganz schließen und neu öffnen");
    expect(s.at(-1)?.screen.wischen).toBe(true);
  });

  it("iPhone, Mikro gesperrt: nur Schalter 1 (mit „Apps“ ab iOS 18, ohne bis iOS 17)", () => {
    const neu = anleitung("ios", 18, schalterFuer("gesperrt", "ios"));
    expect(neu).toHaveLength(3);
    expect(neu[1].text).toContain("„Apps“ → „Safari“ → „Mikrofon“ → „Erlauben“");
    expect(neu[1].text).toContain("Einstellungen für Websites");
    expect(anleitung("ios", null, ["mikrofon"])[1].text).toContain("„Apps“");
    const alt = anleitung("ios", 17, ["mikrofon"]);
    expect(alt[1].text).not.toContain("„Apps“");
    expect(alt[1].text).toContain("„Safari“ → „Mikrofon“");
  });

  it("iPhone, unklar: alle drei Schalter nummeriert", () => {
    const s = anleitung("ios", 26, schalterFuer("unklar", "ios"));
    expect(s.map((x) => x.schalter).filter(Boolean)).toEqual([1, 2, 3]);
    expect(s[1].text.startsWith("Schalter 1: ")).toBe(true);
    expect(s[3].text.startsWith("Schalter 3: ")).toBe(true);
    expect(s).toHaveLength(5);
  });

  it("Android: Chrome → ⋮ Einstellungen → Website-Einstellungen → Mikrofon → Adresse zulassen → neu öffnen", () => {
    const s = anleitung("android", null, ["mikrofon"], "mia.example");
    expect(s.map((x) => x.text)).toEqual([
      "Öffne Chrome",
      "Tippe oben rechts auf ⋮ und dann auf „Einstellungen“",
      "„Website-Einstellungen“ → „Mikrofon“",
      "Tippe auf mia.example → „Zulassen“. Steht sie unter „Blockiert“, dort antippen.",
      "Mia neu öffnen",
    ]);
  });

  it("jeder Schritt hat einen markierten Bildschirm", () => {
    for (const s of [...anleitung("ios", 26, ["mikrofon", "diktat", "spracherkennung"]), ...anleitung("android", null, ["mikrofon"]), ...anleitung("andere", null, ["mikrofon"])]) expect(s.screen.rows[s.screen.target]).toBeTruthy();
  });

  it("keine Gedankenstriche in den Texten", () => {
    const all = [...anleitung("ios", 26, ["mikrofon", "diktat", "spracherkennung"]), ...anleitung("android", null, ["mikrofon"])].map((s) => s.text).join(" ");
    expect(all).not.toMatch(/ [–—] /);
  });
});
