// Datenschutz & Sicherheit (Platz 23): Server in Frankfurt, Sicherheits-
// Header für alle Seiten, Protokolle ohne Inhalte, Rechtstexte vollständig
// und als Entwurf markiert, alle Anbieter aus docs/datenschutz/anbieter.md
// stehen in der Datenschutzerklärung.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { SOURCES, stripComments, texts } from "../textQuellen";
import { BETREIBER, DATENSCHUTZ, ENTWURF, IMPRESSUM, KURZ_GESAGT, NUTZUNGSBEDINGUNGEN, RECHTSTEXTE_STAND, VOR_DEM_START, entwurfOffen } from "@/lib/datenschutz/rechtstexte";
import { leisteVersteckt } from "@/lib/core/leiste";
import { zustimmungNoetig } from "@/lib/datenschutz/zustimmung";
import { TEXT_VERSION } from "@/lib/datenschutz/einwilligung";

describe("Technik", () => {
  it("Server-Funktionen in Frankfurt (vercel.json)", () => {
    expect(JSON.parse(readFileSync("vercel.json", "utf8")).regions).toEqual(["fra1"]);
  });

  it("Sicherheits-Header für alle Seiten", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((r) => r.source === "/:path*");
    const h = Object.fromEntries((all?.headers ?? []).map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("microphone=(self)");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  it("Protokolle nur mit Technik-Zahlen – nie Inhalte (Text, Mail, Link, Namen …)", () => {
    const content = /\b(text|texte|message|messages|body|title|titel|email|mail|url|link|prompt|content|input|eingabe|name|displayName|ort|place|data)\b(?!\s*:)/;
    const lines = SOURCES.filter(({ file }) => file.startsWith("app/api/") || file.startsWith("lib/")).flatMap(({ file, code }) =>
      [...stripComments(code).matchAll(/console\.(log|info|warn|error|debug)\(([^;]*)\);?/g)]
        // nur, was außerhalb von Anführungszeichen steht (feste Wörter im Text sind erlaubt), `e.name`/`constructor.name` = Fehlerart
        .map((m) => m[2].replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "").replace(/\b(e|err|error)\.name\b|\bconstructor\.name\b/g, ""))
        .filter((args) => content.test(args))
        .map((args) => `${file}: ${args.trim()}`),
    );
    expect(lines).toEqual([]);
  });
});

describe("Seiten Datenschutz, Impressum, Nutzungsbedingungen", () => {
  it("„Kurz gesagt“ in sechs Punkten, Texte als Entwurf markiert", () => {
    expect(KURZ_GESAGT).toHaveLength(6);
    expect(ENTWURF).toMatch(/juristisch prüfen/);
    for (const list of [DATENSCHUTZ, IMPRESSUM, NUTZUNGSBEDINGUNGEN]) expect(list.length).toBeGreaterThan(2);
  });

  it("Platzhalter statt erfundener Angaben (Datenschutz), Impressum ohne Platzhalter", () => {
    expect(JSON.stringify(DATENSCHUTZ)).toContain("[Supabase-Region]");
    for (const a of IMPRESSUM) for (const t of [a.titel, ...a.absaetze]) expect(t).not.toMatch(/\[[^\]]*\]/);
  });

  it("Impressum im Wortlaut von Felix (A-070)", () => {
    const text = IMPRESSUM.map((a) => [a.titel, ...a.absaetze].join("\n")).join("\n");
    for (const z of [
      "Angaben gemäß § 5 DDG",
      "KARAMBA Eis GmbH\nAm Rosengarten 11\n23701 Eutin",
      "Handelsregister: HRB 25642 HL\nRegistergericht: Amtsgericht Lübeck",
      "Vertreten durch den Geschäftsführer:\nFelix Gabriel",
      "E-Mail: eis.karamba@gmail.com\nWeb: www.karamba-eis.de",
      "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG\nDE450967067",
      "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV\nFelix Gabriel\nAm Rosengarten 11\n23701 Eutin",
      "Verbraucherstreitbeilegung / Universalschlichtungsstelle",
      "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      "Haftung für Inhalte",
      "Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.",
      "Haftung für Links",
      "(z. B. Veranstaltungen bei „Was los?“)",
    ])
      expect(text).toContain(z);
    const seite = readFileSync("src/app/impressum/page.tsx", "utf8");
    expect(seite).toMatch(/entwurf=\{false\}/);
  });

  it("„Impressum · Datenschutz“ überall unten: Einstellungen, Begrüßung, Anmelden, Erster Start, Zugangscode, Einladung", () => {
    for (const f of [
      "src/components/einstellungen/FamilyOverview.tsx",
      "src/components/konten/WelcomeLogin.tsx",
      "src/components/datenschutz/ZustimmungStep.tsx",
      "src/components/begleitung/ZeigMalStep.tsx",
      "src/components/begleitung/CodeScreen.tsx",
      "src/components/konten/EinladungView.tsx",
    ])
      expect(readFileSync(f, "utf8"), f).toMatch(/<RechtLinks/);
    expect(readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8")).toMatch(/href="\/impressum"/);
  });

  it("jeder Anbieter mit Personendaten steht in der Datenschutzerklärung", () => {
    const text = JSON.stringify(DATENSCHUTZ);
    for (const a of ["Vercel", "Supabase", "Anthropic", "Resend", "Bright Sky", "Open-Meteo", "Nominatim", "Google", "Apple"]) expect(text).toContain(a);
  });

  it("KI klar als KI benannt (Nutzungsbedingungen und Datenschutz)", () => {
    expect(JSON.stringify(NUTZUNGSBEDINGUNGEN)).toMatch(/ist eine KI/);
    expect(JSON.stringify(DATENSCHUTZ)).toMatch(/ist eine KI/);
  });

  it("Werbung ehrlich: kein Text verspricht „keine Werbung“, Werbe-Profile und Tracking ausgeschlossen", () => {
    const promise = /keine Werbung|ohne Werbung|werbefrei|nie Werbung/i;
    const bad = SOURCES.flatMap(({ file, code }) => texts(code).filter((t) => promise.test(t)).map((t) => `${file}: ${t.slice(0, 80)}`));
    expect(bad).toEqual([]);
    expect(KURZ_GESAGT.find((k) => k.titel === "Nie verkauft")?.text).toBe("Keine Tracker, keine Werbe-Profile. Eure Daten werden nie verkauft.");
    const abschnitt = DATENSCHUTZ.find((a) => a.titel === "Kein Tracking, keine Werbe-Profile");
    expect(abschnitt?.absaetze.join(" ")).toMatch(/nur allgemeine Werbung, ohne Tracking und ohne eure Daten/);
  });

  it("Band „Entwurf“, solange Verantwortlicher, Anschrift oder Kontakt-Mail Platzhalter sind", () => {
    expect(entwurfOffen()).toBe(false);
    const fertig = { name: "Felix Muster", anschrift: "Musterweg 1, 23701 Eutin", mail: "hallo@example.de" };
    expect(entwurfOffen(fertig)).toBe(false);
    for (const k of ["name", "anschrift", "mail"] as const) expect(entwurfOffen({ ...fertig, [k]: "[offen]" })).toBe(true);
    expect(BETREIBER.name).toBe("KARAMBA Eis GmbH");
    expect(readFileSync("src/components/datenschutz/RechtstextView.tsx", "utf8")).toMatch(/entwurfOffen\(\) &&/);
  });

  it("Rechtsseiten ohne Mia-Knopf, andere Unterseiten mit", () => {
    for (const p of ["/datenschutz", "/impressum", "/nutzungsbedingungen", "/anmelden", "/beitreten"]) expect(leisteVersteckt(p, true)).toBe(true);
    for (const p of ["/", "/aufgaben", "/profil", "/einkaufsliste"]) expect(leisteVersteckt(p, true)).toBe(false);
    expect(leisteVersteckt("/profil", false)).toBe(true);
  });

  it("„Bevor’s losgeht“: vor der App für alle, Rechtstexte und Anmelden frei, neu gefragt bei neuer Fassung", () => {
    for (const p of ["/", "/aufgaben", "/profil", "/kochbuch"]) expect(zustimmungNoetig(p, false)).toBe(true);
    for (const p of ["/datenschutz", "/impressum", "/nutzungsbedingungen", "/anmelden", "/beitreten", "/e/abc"]) expect(zustimmungNoetig(p, false)).toBe(false);
    expect(zustimmungNoetig("/", true)).toBe(false);
    expect(TEXT_VERSION.bedingungen).toBe(RECHTSTEXTE_STAND.version);
    expect(VOR_DEM_START.saetze).toHaveLength(3);
    expect(VOR_DEM_START.haken).toBe("Ich akzeptiere die Nutzungsbedingungen und hab die Datenschutzerklärung gelesen.");
    // A-027: ohne „ihr“ – und nie „keine Werbung“
    expect(VOR_DEM_START.saetze).toEqual(["Deine Sachen bleiben auf diesem Handy. Mit Konto teilst du sie mit deinen Leuten.", "Ich bin eine KI und kann mich auch mal irren.", "Deine Daten werden nie verkauft."]);
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain("<ZustimmungGate />");
    // A-027: Zustimmung steht im Hallo-Bildschirm (Häkchen), „Los geht’s“ erst damit – kein eigener Schritt mehr
    const hallo = readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8");
    expect(hallo).toContain("<BedingungenHaken links={false} />");
    expect(hallo).toContain("disabled={!zugestimmt}");
    expect(hallo).not.toContain("ZustimmungStep");
  });

  it("Seiten gibt es", () => {
    for (const p of ["datenschutz", "impressum", "nutzungsbedingungen"]) expect(readFileSync(`src/app/${p}/page.tsx`, "utf8")).toContain("RechtstextView");
  });
});
