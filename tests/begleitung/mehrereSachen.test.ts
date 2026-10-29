// A-056 Teil 2: Mia versteht mehrere Sachen. Füllwörter weg vor jeder
// Auswertung, Sofort-Weg nur bei GENAU EINER Sache, Aufzählungen ohne KI
// eindeutig aufteilen (sonst lieber merken), Prüfstand „mehrere Sachen“
// (≥ 30 Sätze, ohne KI ≥ 98 %), Titel sauber, Prompt sagt es der KI.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { ohneFuellwoerter, titelSauber } from "@/lib/begleitung/fuellwoerter";
import { mehrereOhneKi, mehrteilig } from "@/lib/begleitung/aufteilen";
import { sofortErkennen, type SofortKontext } from "@/lib/begleitung/sofort/erkennen";
import { AUFZAEHL_SAETZE } from "@/lib/begleitung/pruefstand/aufzaehlung";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { pruefHaushalt, PRUEF_HEUTE, type Lage } from "@/lib/begleitung/pruefstand/haushalt";
import { planningWeekStart } from "@/lib/essen/weekPlan";
import { isShoppingRequest, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { sectionFor } from "@/lib/einkauf/shoppingList";
import { SYSTEM_PROMPT } from "@/lib/begleitung/prompt";
import { CALENDAR_TOOLS } from "@/lib/begleitung/calendarTools";
import type { AssistantReply } from "@/lib/begleitung/protocol";
import type { ChangeOp } from "@/lib/begleitung/ops";

beforeEach(() => at("2026-10-21T10:30"));

function kontext(lage: Lage[] = []): SofortKontext {
  const d = pruefHaushalt(lage);
  return {
    today: PRUEF_HEUTE,
    nowMinutes: 10 * 60 + 30,
    persons: d.profile.persons.map((p) => ({ id: p.id, name: p.name })),
    laeden: ["Rewe", "Aldi", "Rossmann"],
    weekStart: planningWeekStart(new Date(`${PRUEF_HEUTE}T12:00:00`), d.profile.shoppingDay || "Montag").weekStart,
    aufDerListe: [],
    entries: d.entries ?? [],
  };
}

/**
 * Ohne KI, wie in der App (`useChatRules`): erst die Aufzählung
 * (`mehrereOhneKi`), sonst die Einzel-Regeln – stellvertretend der Sofort-Weg
 * und die Einkaufs-Regel (`isShoppingRequest` + `parseShoppingText`), jeweils
 * auf dem Text ohne Füllwörter.
 */
function ohneKi(text: string, ctx: SofortKontext): AssistantReply {
  const mehr = mehrereOhneKi(text, ctx);
  if (mehr) return { reply: mehr.reply, ops: mehr.ops };
  const t = ohneFuellwoerter(text);
  const sofort = sofortErkennen(t, ctx);
  if (sofort) return { reply: sofort.reply, ops: sofort.ops };
  if (isShoppingRequest(t)) {
    const ops: ChangeOp[] = parseShoppingText(t, ctx.laeden).map((i, n) => ({ id: `e-${n}`, type: "add_shopping", weekStart: ctx.weekStart, name: i.name, amount: i.amount, section: sectionFor(i.name) }));
    if (ops.length) return { reply: "Is drauf.", ops };
  }
  return { reply: "Merk ich mir.", ops: [] };
}

describe("Füllwörter weg (vor jeder Auswertung)", () => {
  it.each([
    ["Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen", "Aufgabe heute: Maler kommt und Bank anrufen"],
    ["äh äh Milch auf die Liste", "Milch auf die Liste"],
    ["Hm, also bitte noch Brot auf die Liste", "Brot auf die Liste"],
    ["Aufgabe Aufgabe Rasen mähen", "Aufgabe Rasen mähen"],
    ["pack mal Zahnpasta drauf", "pack Zahnpasta drauf"],
    ["Milch auf die Liste, bitte.", "Milch auf die Liste"],
    ["So, Termin morgen um 9 Friseur", "Termin morgen um 9 Friseur"],
    ["Noch dazu: Post holen", "Post holen"],
  ])("%s → %s", (roh, sauber) => {
    expect(ohneFuellwoerter(roh)).toBe(sauber);
  });

  it("was den Sinn trägt, bleibt", () => {
    for (const t of ["Was ist noch da?", "Noch nicht", "Plan noch mal neu", "Ja", "Mhm", "Treffen um 9 Uhr", "Hast du schon mal Pizza gemacht?", "Das erste Mal Hummus"]) expect(ohneFuellwoerter(t)).toBe(t);
    expect(ohneFuellwoerter("äh")).toBe("äh");
    expect(ohneFuellwoerter("ähm ja also nee doch nicht")).toBe("ja also nee doch nicht");
  });

  it("Regex ohne \\b an Umlauten (CLAUDE.md)", () => {
    for (const f of ["src/lib/begleitung/fuellwoerter.ts", "src/lib/begleitung/aufteilen.ts"]) expect(readFileSync(f, "utf8")).not.toMatch(/\\b[äöüß]|[äöüß]\\b/);
  });

  it("Titel: ohne Füll- und Steuerwörter, erster Buchstabe groß, kein Punkt", () => {
    expect(titelSauber("äh bank anrufen.")).toBe("Bank anrufen");
    expect(titelSauber("Aufgabe: Oma anrufen")).toBe("Oma anrufen");
    expect(titelSauber("Aufgabe heute Maler kommt")).toBe("Maler kommt");
    expect(titelSauber("und danach Bank")).toBe("Bank");
    expect(titelSauber("Termin: Zahnarzt")).toBe("Zahnarzt");
    expect(titelSauber("Termin beim Amt")).toBe("Termin beim Amt");
    expect(titelSauber("iPhone laden")).toBe("iPhone laden");
    expect(titelSauber("maler kommt")).toBe("Maler kommt");
  });
});

describe("Sofort-Weg nur bei GENAU EINER Sache", () => {
  it.each(["Milch und Eier auf die Liste", "Bank anrufen, Rechnung bezahlen", "Steuer machen außerdem Keller", "Paket abholen dann Bank", "Pinnwand: Einkauf: Milch", "Rechnung bezahlen?", "Termin morgen 10 Uhr Zahnarzt und danach Bank"])("mehrteilig: %s", (t) => {
    expect(mehrteilig(t)).toBe(true);
    expect(sofortErkennen(t, kontext())).toBeNull();
  });
  it.each(["Kinderarzt Montag 8:15", "Milch auf die Liste", "Dringend: Versicherung anrufen", "1,5 kg Mehl auf die Liste"])("eine Sache: %s", (t) => {
    expect(mehrteilig(t)).toBe(false);
  });
  it("Füllwörter stören den Sofort-Weg nicht", () => {
    expect(sofortErkennen("Ähm, Milch auf die Liste", kontext())?.ops).toHaveLength(1);
    const op = sofortErkennen("Also bitte Tim antworten", kontext())?.ops[0];
    expect(op?.type === "upsert_entry" && op.entry.data.title).toBe("Tim antworten");
  });
});

describe("Ohne KI aufteilen, wenn es eindeutig geht", () => {
  const titel = (r: ReturnType<typeof mehrereOhneKi>) => r?.ops.map((op) => (op.type === "upsert_entry" ? `${op.entry.typ}:${op.entry.data.title}:${op.entry.data.date}` : op.type === "add_shopping" ? `einkauf:${op.name}` : op.type));

  it("„Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen“ → zwei Aufgaben für heute", () => {
    expect(titel(mehrereOhneKi("Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen", kontext()))).toEqual(["aufgabe:Maler kommt:2026-10-21", "aufgabe:Bank anrufen:2026-10-21"]);
  });

  it("„Termin morgen 10 Uhr Zahnarzt und danach Bank“ → Termin + Aufgabe (morgen)", () => {
    expect(titel(mehrereOhneKi("Termin morgen 10 Uhr Zahnarzt und danach Bank", kontext(["ohne-zahnarzt"])))).toEqual(["termin:Zahnarzt:2026-10-22", "aufgabe:Bank:2026-10-22"]);
  });

  it("„Milch, Eier und Butter auf die Liste“ bleibt EINE Einkaufs-Sache (macht die Einkaufs-Regel)", () => {
    expect(mehrereOhneKi("Milch, Eier und Butter auf die Liste", kontext())).toBeNull();
    expect(titel(mehrereOhneKi("Einkauf: Milch, Eier und Butter", kontext()))).toEqual(["einkauf:Milch", "einkauf:Eier", "einkauf:Butter"]);
  });

  it("unklar → null (lieber merken und mit KI nachholen)", () => {
    for (const t of ["Zahnarzt morgen 10 Uhr und Milch", "Verschieb Friseur und lösch Zahnarzt", "Was steht an und wann kommt Lisa?", "Merk dir das Passwort und Timer 5 Minuten", "Jeden Montag Sport und Mittwoch Chor"]) expect(mehrereOhneKi(t, kontext()), t).toBeNull();
  });

  it("eine Sache ohne Steuerwort: die anderen Regeln", () => {
    expect(mehrereOhneKi("Bank anrufen", kontext())).toBeNull();
  });
});

describe("Prüfstand „mehrere Sachen“ (A-056)", () => {
  it("mindestens 30 Sätze, im großen Prüfstand dabei", () => {
    expect(AUFZAEHL_SAETZE.length).toBeGreaterThanOrEqual(30);
    for (const s of AUFZAEHL_SAETZE) expect(PRUEFSAETZE).toContain(s);
  });

  it("ohne KI (Regel-Notlösung) ≥ 98 % richtig", () => {
    const ergebnisse = AUFZAEHL_SAETZE.map((s) => ({ s, r: bewerte(s, ohneKi(s.text, kontext(s.lage ?? [])), 10) }));
    const falsch = ergebnisse.filter((e) => !e.r.ok).map((e) => `${e.s.text}: ${e.r.gruende.join("; ")}`);
    const quote = (ergebnisse.length - falsch.length) / ergebnisse.length;
    console.log(`Prüfstand „mehrere Sachen“ ohne KI: ${ergebnisse.length - falsch.length} von ${ergebnisse.length} (${Math.round(quote * 1000) / 10} %)`);
    expect(falsch, `Quote ${Math.round(quote * 1000) / 10} %`).toEqual([]);
    expect(quote).toBeGreaterThanOrEqual(0.98);
  });

  it("bewerten zählt Termine, Aufgaben und prüft Titel", () => {
    const s = AUFZAEHL_SAETZE[0];
    const schlecht = bewerte(s, { reply: "Steht drin.", ops: mehrereOhneKi("Aufgabe heute: Maler kommt", kontext())!.ops }, 10);
    expect(schlecht.gruende.join(" ")).toMatch(/1 statt 2 Aufgaben/);
    expect(schlecht.gruende.join(" ")).toMatch(/Titel nicht sauber/);
  });
});

describe("KI: Prompt und Werkzeuge sagen es", () => {
  it("Aufzählungen getrennt, gemischte Sätze, Titel ohne Füllwörter, erster Buchstabe groß", () => {
    expect(SYSTEM_PROMPT).toMatch(/Aufzählungen/);
    expect(SYSTEM_PROMPT).toContain("Maler kommt");
    expect(SYSTEM_PROMPT).toContain("Termin morgen 10 Uhr Zahnarzt und danach Bank");
    expect(SYSTEM_PROMPT).toMatch(/erster Buchstabe groß/);
    const aufgabe = CALENDAR_TOOLS.find((t) => t.definition.name === "aufgabe_anlegen")!;
    expect(aufgabe.definition.description).toMatch(/je Sache ein Aufruf/i);
  });

  it("Server räumt Titel der KI auf (Sicherheitsnetz)", () => {
    expect(readFileSync("src/lib/begleitung/calendarTools.ts", "utf8")).toMatch(/titelSauber\(/);
  });

  it("App: Füllwörter weg, bevor die Nachricht an die KI geht; angezeigt bleibt das Gesagte", () => {
    const ask = readFileSync("src/components/begleitung/useAskAssistant.ts", "utf8");
    expect(ask).toMatch(/ohneFuellwoerter\(/);
    const regeln = readFileSync("src/components/begleitung/useChatRules.ts", "utf8");
    expect(regeln).toMatch(/ohneFuellwoerter\(/);
    expect(regeln).toMatch(/mehrereRule\(/);
  });
});
