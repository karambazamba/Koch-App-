// Notizen-Kachel: Vorschau der neuesten Notiz (A-060, Tafel 144) – bis zu 2
// Zeilen, weich ausgeblendet statt „…“; leer „Schnell notieren …“ in Grau.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNote, noteFromText } from "@/lib/notizen/model";
import { notizAnfang, notizVorschau } from "@/lib/heute/notizenKachel";

const css = readFileSync("src/app/globals.css", "utf8");
const vorschau = readFileSync("src/components/notizen/NotizVorschau.tsx", "utf8");
const kachel = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
const regeln = readFileSync("e2e/regeln.mjs", "utf8");

describe("Notizen-Vorschau (A-060)", () => {
  it("kurze Notiz: Titel und Anfang", () => {
    expect(notizVorschau({ title: "WLAN", line: "Passwort: Sonnenblume42" })).toEqual({ titel: "WLAN", rest: "Passwort: Sonnenblume42" });
    expect(notizVorschau({ title: "Paket für Oma", line: "" })).toEqual({ titel: "Paket für Oma", rest: "" });
  });

  it("sehr lange Notiz: gekürzter Titel („… …“) → voller Anfang, nie ein „…“", () => {
    const lang = "Okay, kann ich jetzt schon mal den Maler anrufen wegen dem Flur und dem Kinderzimmer, und bitte auch gleich nach einem Termin fragen";
    const n = noteFromText(lang)!;
    expect(n.data.title.endsWith("…")).toBe(true);
    const v = notizVorschau({ title: n.data.title, line: notizAnfang(n) });
    expect(v).toEqual({ titel: lang, rest: "" });
    expect(notizVorschau({ title: "Einkauf …", line: "Milch" }).titel).toBe("Einkauf");
  });

  it("leere Notiz ohne Text bleibt ein Titel ohne Anhang", () => {
    const n = createNote({ title: "Ideen" });
    expect(notizVorschau({ title: n.data.title, line: notizAnfang(n) })).toEqual({ titel: "Ideen", rest: "" });
  });

  it("2 Zeilen, Umbruch an Wortgrenzen, zweite Zeile weich per Maske (Kachelfarbe in jedem Look)", () => {
    const regel = css.match(/\.notiz-ausblenden \{[^}]+\}/)![0];
    expect(regel).toMatch(/max-height: calc\(2 \* var\(--zeile\)\)/);
    expect(regel).toMatch(/mask-image: linear-gradient\(#000, #000\), linear-gradient\(to right/);
    expect(regel).not.toMatch(/ellipsis|line-clamp|break-all|hyphens: auto/);
    expect(vorschau).toMatch(/break-words/);
    expect(vorschau).toMatch(/data-ausblenden/);
    expect(vorschau).not.toMatch(/truncate|data-freitext/);
    // „·“ hängt am Anfang statt allein am Zeilenende (sonst bliebe ein einsamer Punkt stehen)
    expect(vorschau).toContain('{" ·\\u00a0"}');
  });

  it("leer: „Schnell notieren …“ in Grau (XS und S)", () => {
    expect(kachel.match(/text-muted[^"]*" data-zeile data-notiz-leer>\s*<span className="kachel-frei" data-platzhalter-text>\{NOTIZ_LEERTEXT\}/g)?.length).toBe(2);
  });

  it("„nichts abgeschnitten“ erlaubt nur Ausblenden mit Maske, nie seitlich", () => {
    expect(regeln).toMatch(/hasAttribute\("data-ausblenden"\)/);
    expect(regeln).toMatch(/ausblenden ohne Verlauf/);
    expect(regeln).toMatch(/sicht\.bottom = Math\.min\(sicht\.bottom, b\.bottom\)/);
  });
});
