// Server-Versand (Tafel 77, Teil 2): wer bekommt welche Mitteilung – Familie
// alle, Arbeit nur Besitzer, Aufgaben nur wer sie hat, Pause = Ruhe, Pinnwand
// und Abgeben proaktiv (1 am Tag, nicht 20–7), nie doppelt, nie Eigenes.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planPushes, proactiveAbos, sentKeys, type PushAbo, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";

const HH = "hh-1";
const T = "2026-10-21";
const at = (clock: string) => Date.parse(`${T}T${clock}:00+02:00`);
const row = (id: string, typ: string, data: Record<string, unknown>, extra: Partial<PushEntryRow> = {}): PushEntryRow => ({
  household_id: HH,
  id,
  typ,
  raum: "familie",
  besitzer: "anna",
  erstellt: `${T}T06:00:00.000Z`,
  geaendert: `${T}T06:00:00.000Z`,
  data: { id, typ, raum: extra.raum ?? "familie", besitzer: extra.besitzer ?? "anna", erstellt: `${T}T06:00:00.000Z`, geaendert: `${T}T06:00:00.000Z`, data },
  ...extra,
});
const abo = (id: string, user: string, settings: PushAbo["settings"] = {}): PushAbo => ({ id, user_id: user, household_id: HH, settings });

const ROWS = [
  row("t1", "termin", { title: "Zahnarzt", date: T, start: "16:00", reminder: "30" }),
  row("t2", "termin", { title: "Kunde", date: T, start: "16:00", reminder: "30" }, { raum: "arbeit" }),
  row("a1", "aufgabe", { title: "Wäsche", date: T, time: "15:30", reminder: "30" }),
  row("a2", "aufgabe", { title: "Paket", date: T, time: "15:30", reminder: "30", fuer: "ben" }),
];

const plan = (abos: PushAbo[], rows = ROWS, minute = 15 * 60 + 31, extra: Partial<Parameters<typeof planPushes>[0]> = {}) =>
  planPushes({ abos, rows, today: T, minute, nowMs: at("15:31"), sent: new Set(), proactiveToday: new Set(), ...extra });

describe("Erinnerungen vom Server", () => {
  it("Familie an alle, Arbeit nur Besitzer, Aufgaben nur wer sie hat", () => {
    const out = plan([abo("A", "anna"), abo("B", "ben")]);
    const by = (id: string) => out.filter((m) => m.aboId === id).map((m) => m.payload.body).sort();
    expect(by("A")).toEqual(["In 30 Min: Kunde · 16:00", "In 30 Min: Zahnarzt · 16:00", "Jetzt: Wäsche · 15:30"]);
    expect(by("B")).toEqual(["In 30 Min: Zahnarzt · 16:00", "Jetzt: Paket · 15:30"]);
    expect(out[0].payload).toMatchObject({ title: "Mia", href: expect.stringMatching(new RegExp(`^/tag\\?datum=${T}&eintrag=`)) });
  });

  it("nie doppelt, Pause = Ruhe, Schalter aus = nichts, Absender aus den Einstellungen", () => {
    const first = plan([abo("A", "anna")]);
    expect(plan([abo("A", "anna")], ROWS, 15 * 60 + 32, { sent: sentKeys(first.map((m) => ({ abo_id: m.aboId, key: m.key }))) })).toEqual([]);
    expect(plan([abo("A", "anna", { pause: { from: "2026-10-20", until: null } })])).toEqual([]);
    expect(plan([abo("A", "anna", { kinds: { erinnerungen: false } })])).toEqual([]);
    expect(plan([abo("A", "anna", { name: "Mia" })])[0].payload.title).toBe("Mia");
  });

  it("ohne Haushalt nichts", () => {
    expect(plan([{ ...abo("A", "anna"), household_id: null }])).toEqual([]);
  });
});

describe("Pinnwand und Abgeben (proaktiv)", () => {
  const pin = row("p1", "pinnwand", { author: "Anna", text: "Bin später da" }, { erstellt: new Date(at("15:30")).toISOString() });
  const given = row("a3", "aufgabe", { title: "Müll raus", fuer: "ben" }, { geaendert: new Date(at("15:30")).toISOString() });

  it("Pinnwand an andere, nie an den Absender; Text ohne Inhalt", () => {
    const out = plan([abo("A", "anna"), abo("B", "ben")], [pin]);
    expect(out.map((m) => [m.aboId, m.payload.body])).toEqual([["B", "Anna hat etwas an die Pinnwand gehängt."]]);
  });

  it("Abgeben: „Neu für dich“", () => {
    expect(plan([abo("B", "ben")], [given])[0].payload.body).toBe("Neu für dich: „Müll raus“.");
  });

  it("höchstens 1 am Tag, nicht in der Ruhezeit, Schalter aus", () => {
    const out = plan([abo("B", "ben")], [pin, given]);
    expect(out).toHaveLength(1);
    expect(plan([abo("B", "ben")], [pin], 15 * 60 + 31, { proactiveToday: proactiveAbos([{ abo_id: "B", key: `proaktiv:${T}:x` }], T) })).toEqual([]);
    expect(plan([abo("B", "ben")], [{ ...pin, erstellt: new Date(at("20:30")).toISOString() }], 20 * 60 + 31, { nowMs: at("20:31") })).toEqual([]);
    expect(plan([abo("B", "ben", { kinds: { pinnwand: false } })], [pin])).toEqual([]);
  });

  it("gesendete Schlüssel: proaktive auch unter dem Kern-Schlüssel", () => {
    expect([...sentKeys([{ abo_id: "B", key: `proaktiv:${T}:pin:p1` }])]).toEqual([`B|proaktiv:${T}:pin:p1`, "B|pin:p1"]);
  });
});

describe("Sicherheit", () => {
  it("privater Schlüssel nur in den Server-Routen, nie ausgegeben", () => {
    const key = readFileSync("src/app/api/push/schluessel/route.ts", "utf8");
    expect(key).toMatch(/Response\.json\(\{ key: row\.vapid_public \}\)/);
    expect(key).not.toMatch(/console\./);
    const send = readFileSync("src/app/api/push/senden/route.ts", "utf8");
    expect(send).toContain("timingSafeEqual");
    expect(send).not.toMatch(/console\./);
    const client = readFileSync("src/lib/heute/mitteilungen/serverPush.ts", "utf8");
    expect(client).not.toMatch(/vapid_private|supabaseSecret/);
  });
});
