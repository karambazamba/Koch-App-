// Ton-Feinschliff: Mia im Chat lockerer und kürzer. Prompt mit Ton vorn
// (≤ 15 Zeilen) und 20 Beispielen, gesprochenes Deutsch, Längen 120/240,
// Liste STEIF, tidyMiaText kürzt steife Anhängsel, Haiku für kurzes
// Plaudern, Prüfstand „Ton“ (30 Sätze, Ziel ≥ 90 %) – keine Kernregel geht
// beim Verschieben in die Werkzeug-Beschreibungen verloren.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { SYSTEM_PROMPT, TON_BEISPIELE, TON_PROMPT } from "@/lib/begleitung/prompt";
import { capabilities } from "@/lib/begleitung/wishTools";
import { toolDefinitions } from "@/lib/begleitung/toolset";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { ICH_HABE_START, LOCKER, SAETZE, STEIF, TON_LAENGE, VERBOTEN, willDetails } from "@/lib/mia/persona";
import { PLAUDER_ANTWORT, plauderArt } from "@/lib/mia/plaudern";
import { TON_SAETZE, TON_ZIEL, bewerteTon, tonGruende, tonLimit } from "@/lib/begleitung/pruefstand/ton";
import { fehlerText, laufQuote } from "@/lib/begleitung/pruefstand/lauf";
import { runAssistant } from "@/lib/begleitung/engine";
import { createMockModel } from "@/lib/begleitung/mock";
import { PRUEF_HEUTE, PRUEF_UHR, pruefHaushalt, pruefWetter } from "@/lib/begleitung/pruefstand/haushalt";
import type { AssistantReply } from "@/lib/begleitung/protocol";

const steif = (t: string) => STEIF.some((re) => re.test(t));
const antwort = (reply: string): AssistantReply => ({ reply, ops: [] });

describe("STEIF: was Mia nie sagt", () => {
  it.each([
    "Ich habe Milch für dich auf die Einkaufsliste gesetzt.",
    "Selbstverständlich, mach ich.",
    "Gerne helfe ich dir dabei.",
    "Möchtest du, dass ich das Rezept zeige?",
    "Wenn du noch etwas brauchst, melde dich.",
    "Brauchst du sonst noch etwas?",
    "Kann ich sonst noch was für dich tun?",
    "Gern geschehen!",
    "Lass es mich wissen.",
  ])("steif: %s", (t) => expect(steif(t)).toBe(true));

  it.each(["Is drauf.", "Steht drin.", "Wenn du was Schnelles willst: Nudeln mit Pesto.", "Sag Lisa, sie soll kommen.", "Ich hab schon was vorbereitet.", "Na klar.", "Gern."])("locker: %s", (t) => expect(steif(t)).toBe(false));

  it("feste Mia-Sätze sind nie steif", () => {
    for (const s of Object.values(SAETZE).flat()) expect(steif(s), s).toBe(false);
    for (const s of Object.values(PLAUDER_ANTWORT)) {
      expect(steif(s), s).toBe(false);
      expect(s.length).toBeLessThanOrEqual(TON_LAENGE.alltag);
    }
  });

  it("„Ich habe …“-Einstieg, „Hab …“ ist gut", () => {
    expect(ICH_HABE_START.test("Ich habe den Termin eingetragen.")).toBe(true);
    expect(ICH_HABE_START.test("Hab ich eingetragen.")).toBe(false);
    expect(ICH_HABE_START.test("Ich haben")).toBe(false);
  });

  it("„erklär mal genau“ = ausdrücklich Details", () => {
    expect(willDetails("Erklär mal genau, wie Hefeteig geht")).toBe(true);
    expect(willDetails("Schritt für Schritt bitte")).toBe(true);
    expect(willDetails("Wie lange kocht ein Ei?")).toBe(false);
  });
});

describe("tidyMiaText: steife Anhängsel weg, Inhalt bleibt", () => {
  it.each([
    ["Is drauf. Wenn du noch etwas brauchst, sag einfach Bescheid.", "Is drauf."],
    ["Steht drin. Brauchst du sonst noch etwas?", "Steht drin."],
    ["Do 16 Uhr Zahnarzt. Lass es mich wissen, wenn sich was ändert.", "Do 16 Uhr Zahnarzt."],
    ["Läuft. Ich hoffe, das hilft!", "Läuft."],
    ["Selbstverständlich! Steht drin.", "Steht drin."],
    ["Gerne helfe ich dir dabei. Nudeln mit Pesto?", "Nudeln mit Pesto?"],
    ["Gern geschehen! Wenn du noch etwas brauchst, sag Bescheid.", "Gern geschehen!"],
    ["Gern!", "Gern!"],
    ["Natürlich, aber erst ab 9.", "Natürlich, aber erst ab 9."],
    ["Sag Bescheid, wenn du noch was brauchst.", "Sag Bescheid, wenn du noch was brauchst."],
  ])("%s", (raw, tidy) => expect(tidyMiaText(raw)).toBe(tidy));

  it("schneidet nie Inhalt ab, auch nicht bei langen Antworten", () => {
    const lang = "Hefeteig: 500 g Mehl, ein Würfel Hefe, 250 ml lauwarme Milch, 80 g Butter, eine Prise Salz. Alles verkneten, eine Stunde gehen lassen, dann formen und nochmal 20 Minuten gehen lassen. Bei 180 Grad etwa 25 Minuten backen.";
    expect(tidyMiaText(lang)).toBe(lang);
  });
});

describe("Prompt: Ton vorn, kurz, 20 Beispiele", () => {
  it("Ton-Abschnitt steht ganz vorn und hat höchstens 15 Zeilen", () => {
    expect(SYSTEM_PROMPT.startsWith(TON_PROMPT)).toBe(true);
    expect(TON_PROMPT.split("\n").length).toBeLessThanOrEqual(15);
  });

  it("gesprochenes Deutsch und harte Längen", () => {
    for (const w of ["hab", "is", "nehm", "passt", "jo", "na klar", "Moin"]) expect(LOCKER).toContain(w);
    for (const w of LOCKER) expect(TON_PROMPT).toContain(`„${w}“`);
    expect(TON_PROMPT).toContain(`höchstens ${TON_LAENGE.alltag} Zeichen`);
    expect(TON_PROMPT).toContain(`höchstens ${TON_LAENGE.rat}`);
    expect(TON_PROMPT).toContain("erklär mal genau");
    expect(TON_LAENGE).toEqual({ alltag: 120, rat: 240 });
    for (const f of ["Ich habe … für dich", "Selbstverständlich", "Gerne helfe ich", "Möchtest du, dass ich", "Wenn du noch etwas brauchst"]) expect(TON_PROMPT).toContain(f);
  });

  it("20 Beispiele aus dem Alltag, im Prompt; ✓ besteht den Ton-Prüfstand, ✗ fällt durch", () => {
    expect(TON_BEISPIELE).toHaveLength(20);
    expect(SYSTEM_PROMPT.match(/✓ „/g)?.length).toBe(20);
    for (const b of TON_BEISPIELE) {
      expect(SYSTEM_PROMPT).toContain(`„${b.sagt}“ ✓ „${b.gut}“ ✗ „${b.schlecht}“`);
      expect(tonGruende({ text: b.sagt, art: "alltag" }, b.gut), b.gut).toEqual([]);
      expect(tidyMiaText(b.gut)).toBe(b.gut);
      const durch = tonGruende({ text: b.sagt, art: "alltag" }, b.schlecht).length > 0 || VERBOTEN.some((re) => re.test(b.schlecht));
      expect(durch, b.schlecht).toBe(true);
    }
    const sagt = TON_BEISPIELE.map((b) => b.sagt);
    for (const s of ["Milch auf die Liste", "Was gibt’s heute?", "Bin total platt", "Danke dir"]) expect(sagt).toContain(s);
    expect(TON_BEISPIELE.find((b) => b.sagt === "Milch auf die Liste")).toEqual({ sagt: "Milch auf die Liste", gut: "Is drauf.", schlecht: "Ich habe Milch auf deine Einkaufsliste gesetzt. Brauchst du sonst noch etwas?" });
  });
});

describe("Keine Kernregel verloren (Prompt oder Werkzeug-Beschreibungen)", () => {
  const tools = toolDefinitions();
  const desc = (name: string) => tools.find((t) => t.name === name)?.description ?? "";
  const alles = `${SYSTEM_PROMPT}\n${capabilities(tools)}\n${tools.map((t) => t.description).join("\n")}`;

  it("Kernregeln", () => {
    expect(SYSTEM_PROMPT).toMatch(/Allergien und "mag nicht" gelten immer strikt/);
    expect(SYSTEM_PROMPT).toContain("Termin = feste Uhrzeit");
    expect(SYSTEM_PROMPT).toContain("Aufgabe = zu erledigen");
    expect(SYSTEM_PROMPT).toContain("Notiz = nur festhalten");
    expect(SYSTEM_PROMPT).toMatch(/Große Dinge \(Wochenplan, Rezept, Mail, Ändern, Löschen\) sind ein Vorschlag mit "Übernehmen"/);
    expect(alles).toContain("Kann ich noch nicht.");
    expect(SYSTEM_PROMPT).toMatch(/Gesundheit: keine Diagnosen.*Arzt oder Ärztin/);
    expect(SYSTEM_PROMPT).toContain("Versprich nur, was die App halten kann");
    expect(SYSTEM_PROMPT).toContain('Nie "du musst"');
  });

  it("verschobene Regeln leben in den Werkzeugen weiter", () => {
    expect(desc("woche_eintragen")).toMatch(/\[Wochencheck\].*genau EINMAL.*halb acht.*19:30/);
    expect(desc("app_befehl")).toMatch(/'Kochidee'.*'Wochencheck'|'Wochencheck'.*'Kochidee'/);
    expect(desc("app_befehl")).toContain("Zeig mir meine Aufgaben");
    expect(desc("mail_entwurf")).toMatch(/Kurz gesagt.*antwort_knoepfe.*nie erfinden.*Sie-Mail.*Signatur nur bei förmlichen/);
    expect(desc("einkaufsliste_hinzufuegen")).toMatch(/Eier sind drauf.*nur_vorschlag/);
    expect(desc("startseite_anpassen")).toContain("Mach die Einkaufsliste wieder klein");
    expect(desc("baustein_an")).toContain("Was kannst du noch?");
    expect(desc("pause_setzen")).toContain("Ab Montag sind wir eine Woche im Urlaub");
    expect(desc("portionen_anpassen")).toContain("NIE eine Pause");
    expect(desc("termin_anlegen")).toMatch(/'vorabend'/);
    expect(desc("termin_anlegen")).toContain("bis_datum");
    expect(desc("sport_eintragen")).toContain("Apple Health");
    expect(desc("pinnwand_schreiben")).toContain("Sprachnachricht");
    expect(desc("notiz_anlegen")).toContain("wunsch_merken");
    expect(desc("vorliebe_merken")).toContain("Gemerkt.");
    expect(desc("gericht_setzen")).toContain("Planungswoche");
    expect(desc("vorrat_hinzufuegen")).toContain("Kommt bald.");
    expect(desc("aufgabe_anlegen")).toContain("diese_woche");
    // Kein Widerspruch zu „Erklär keine Oberfläche“
    expect(desc("wochenplan_anzeigen")).not.toMatch(/unter Essen/);
  });
});

describe("Plaudern → kleines Modell, im Testmodus feste lockere Sätze", () => {
  it.each([
    ["Danke dir", "danke"],
    ["Danke, super", "danke"],
    ["Super gemacht!", "lob"],
    ["Moin Mia 😊", "gruss"],
    ["Gute Nacht", "tschuess"],
    ["Bin total platt", "muede"],
    ["War ein langer Tag", "muede"],
    ["Wie geht’s dir?", "wiegehts"],
    ["Passt", "ok"],
  ])("%s → %s", (t, art) => expect(plauderArt(t)).toBe(art));

  it.each(["Danke, und Milch auf die Liste", "Hey, wann ist Zahnarzt?", "Milch auf die Liste", "Ja", "Topf raus", "Wie wird das Wetter morgen?"])("kein Plaudern: %s", (t) => expect(plauderArt(t)).toBeNull());

  it("„Passt“ nach einer Rückfrage ist eine Antwort", () => {
    expect(plauderArt("Passt", "Um wie viel Uhr?")).toBeNull();
    expect(plauderArt("Passt", "Steht drin.")).toBe("ok");
  });
});

describe("Prüfstand „Ton“", () => {
  it("30 verschiedene Alltagssätze, alle Themen, Ziel 90 %", () => {
    expect(TON_SAETZE).toHaveLength(30);
    expect(new Set(TON_SAETZE.map((s) => s.text)).size).toBe(30);
    expect(TON_ZIEL).toBe(90);
    const texte = TON_SAETZE.map((s) => s.text).join(" | ");
    for (const t of ["Milch", "Zahnarzt", "Was gibt’s heute?", "Danke", "platt", "Moin", "Wetter", "Super"]) expect(texte).toContain(t);
    expect(TON_SAETZE.filter((s) => s.art === "rat").length).toBeGreaterThanOrEqual(2);
  });

  it("Längengrenze: Alltag 120, Rat 240, „erklär mal genau“ ohne", () => {
    expect(tonLimit({ text: "Milch auf die Liste", art: "alltag" })).toBe(120);
    expect(tonLimit({ text: "Kann man Reis aufwärmen?", art: "rat" })).toBe(240);
    expect(tonLimit({ text: "Erklär mal genau, wie man Hefeteig macht", art: "details" })).toBeNull();
    expect(tonLimit({ text: "Erklär mal genau, wie Reis geht", art: "rat" })).toBeNull();
  });

  it("bewertet Länge, Floskel, Fragen und „Ich habe …“", () => {
    const milch = TON_SAETZE.find((s) => s.text === "Milch auf die Liste")!;
    expect(bewerteTon(milch, antwort("Is drauf."), 800)).toMatchObject({ ok: true, gruende: [] });
    expect(bewerteTon(milch, antwort("Is drauf. (Testmodus)"), 800).ok).toBe(true);
    expect(bewerteTon(milch, antwort("Ich habe Milch auf deine Einkaufsliste gesetzt. Brauchst du sonst noch etwas?"), 800).gruende).toEqual(["steif: „Brauchst du sonst noch etwas?“", "„Ich habe …“-Einstieg"]);
    expect(bewerteTon(milch, antwort("Is drauf. Für morgen? Oder heute?"), 800).gruende).toEqual(["mehr als eine Frage"]);
    expect(bewerteTon(milch, antwort("x".repeat(121)), 800).gruende).toEqual(["zu lang (121 statt höchstens 120 Zeichen)"]);
    expect(bewerteTon(milch, antwort(""), 800).gruende).toEqual(["keine Antwort"]);
    const hefe = TON_SAETZE.find((s) => s.art === "details")!;
    expect(bewerteTon(hefe, antwort("y".repeat(600)), 800).ok).toBe(true);
  });

  it("Quote und Fehlschläge zum Kopieren mit der erwarteten Länge", () => {
    const results = TON_SAETZE.slice(0, 10).map((s, i) => bewerteTon(s, antwort(i === 0 ? "Selbstverständlich! Brauchst du sonst noch etwas?" : "Passt."), 500));
    expect(laufQuote(results)).toBe(90);
    const text = fehlerText(results, TON_SAETZE, "Prüfstand Ton");
    expect(text).toContain("Prüfstand Ton: 9 von 10 richtig (90 %)");
    expect(text).toContain("✗ Milch auf die Liste\n  erwartet: locker, höchstens 120 Zeichen, eine Frage, ohne Floskel");
  });

  it("Testmodus: alle 30 Sätze laufen durch die Engine, Quote ≥ 90 %", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const results = [];
    for (const satz of TON_SAETZE) {
      const reply = await runAssistant({ deviceId: "pruefstand", today: PRUEF_HEUTE, clock: PRUEF_UHR, messages: [{ role: "user", text: satz.text }], pending: [], data: pruefHaushalt(satz.lage), forecast: pruefWetter(), tipsThisWeek: 0, shoppingNames: [] } as never, createMockModel(), "mock");
      results.push(bewerteTon(satz, reply, 1));
    }
    expect(results).toHaveLength(30);
    expect(laufQuote(results)).toBeGreaterThanOrEqual(TON_ZIEL);
  });

  it("gleiche geschützte Route und Seite wie der Prüfstand", () => {
    const route = readFileSync("src/app/api/pruefstand/route.ts", "utf8");
    expect(route).toMatch(/const ton = body\.art === "ton";/);
    expect(route).toMatch(/if \(!allowed\(request\)\) return/);
    expect(route).toMatch(/bewerteTon\(satz, reply/);
    expect(route).not.toMatch(/console\.\w+\([^)]*(satz\.text|antwort|reply)/);
    const view = readFileSync("src/components/einstellungen/settings/AdminView.tsx", "utf8");
    expect(view).toMatch(/<PruefstandLauf titel="Prüfstand Ton" art="ton" saetze=\{TON_SAETZE\}/);
    expect(view).toContain("Ziel: mindestens ${TON_ZIEL} %.");
    expect(readFileSync("src/components/einstellungen/settings/PruefstandLauf.tsx", "utf8")).toMatch(/\.\.\.\(art \? \{ art \} : \{\}\)/);
  });
});
