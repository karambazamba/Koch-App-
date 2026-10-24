// Datenschutz & Sicherheit (Platz 23): Server in Frankfurt, Sicherheits-
// Header für alle Seiten, Protokolle ohne Inhalte, Rechtstexte vollständig
// und als Entwurf markiert, alle Anbieter aus docs/datenschutz/anbieter.md
// stehen in der Datenschutzerklärung.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { SOURCES, stripComments } from "../textQuellen";
import { DATENSCHUTZ, ENTWURF, IMPRESSUM, KURZ_GESAGT, NUTZUNGSBEDINGUNGEN } from "@/lib/datenschutz/rechtstexte";

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

  it("Platzhalter statt erfundener Angaben", () => {
    const all = JSON.stringify([DATENSCHUTZ, IMPRESSUM]);
    for (const p of ["[Verantwortlicher]", "[Anschrift]", "[Datenschutz-Kontakt-Mail]", "[Supabase-Region]"]) expect(all).toContain(p);
  });

  it("jeder Anbieter mit Personendaten steht in der Datenschutzerklärung", () => {
    const text = JSON.stringify(DATENSCHUTZ);
    for (const a of ["Vercel", "Supabase", "Anthropic", "Resend", "Bright Sky", "Open-Meteo", "Nominatim", "Google", "Apple"]) expect(text).toContain(a);
  });

  it("KI klar als KI benannt (Nutzungsbedingungen und Datenschutz)", () => {
    expect(JSON.stringify(NUTZUNGSBEDINGUNGEN)).toMatch(/ist eine KI/);
    expect(JSON.stringify(DATENSCHUTZ)).toMatch(/ist eine KI/);
  });

  it("Seiten gibt es", () => {
    for (const p of ["datenschutz", "impressum", "nutzungsbedingungen"]) expect(readFileSync(`src/app/${p}/page.tsx`, "utf8")).toContain("RechtstextView");
  });
});
