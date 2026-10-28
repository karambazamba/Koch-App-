// Raum „Ich“ (Tafel 114): drei Räume, benannt nach „wer sieht es“ –
// Familie/Wir (alle im Haushalt), Ich (nur ich, abends sichtbar), Arbeit
// (nur ich, nach Feierabend weg). Allein nur „Ich | Arbeit“. Ich wird nie
// geteilt (Abgleich, Test-Backend, Push), Listen zeigen das grüne Schild,
// Filter „Alle · Familie · Ich · Arbeit“ nur mit Ich/Arbeit, Mia erkennt
// den Raum, alte Einträge bleiben unverändert.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { at, aufgabe, termin } from "../helpers";
import { nurBesitzer, roomOf } from "@/lib/core/entries";
import { raumLabel, raumName, raumWahl, sichtRaum } from "@/lib/core/haushalt";
import { aufgabenAnsicht, filterLabel, passtZurAnsicht, raumChips } from "@/lib/kalender/aufgaben";
import { arbeitsWorte, guessRoom, ohneRaumWorte, parseCalendar, raumAusText } from "@/lib/kalender/parse";
import { sanitizeEntry, taskOverview } from "@/lib/kalender/model";
import { calendarDots, termineOn } from "@/lib/kalender/monat";
import { migrateAufgabenFilter } from "@/lib/kalender/aufgabenFilter";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { planPushes, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";

const HEUTE = "2026-10-28";
at(`${HEUTE}T10:30`);
const src = (f: string) => readFileSync(f, "utf8");

describe("Drei Räume je Haushalt", () => {
  it("Namen: Familie/Wir · Ich · Arbeit; allein nur Ich | Arbeit", () => {
    expect(raumWahl("familie").map((r) => raumLabel(r, "familie"))).toEqual(["Familie", "Ich", "Arbeit"]);
    expect(raumWahl("paar").map((r) => raumLabel(r, "paar"))).toEqual(["Wir", "Ich", "Arbeit"]);
    expect(raumWahl("allein").map((r) => raumLabel(r, "allein"))).toEqual(["Ich", "Arbeit"]);
    expect(raumName("allein")).toBe("Ich");
    expect(sichtRaum("familie", "allein")).toBe("ich");
    expect(sichtRaum("familie", "paar")).toBe("familie");
  });

  it("„ich“ und „arbeit“ sieht nur der Besitzer; Unbekanntes wird Familie, „ich“ geht nie verloren", () => {
    expect([nurBesitzer("ich"), nurBesitzer("arbeit"), nurBesitzer("familie")]).toEqual([true, true, false]);
    expect([roomOf("ich"), roomOf("arbeit"), roomOf("privat"), roomOf(undefined)]).toEqual(["ich", "arbeit", "familie", "familie"]);
    expect(sanitizeEntry({ ...termin({ title: "Therapie", date: HEUTE, start: "17:00" }), raum: "ich" })?.raum).toBe("ich");
    expect(sanitizeEntry({ ...aufgabe({ title: "Tim antworten" }), raum: "ich" })?.raum).toBe("ich");
  });

  it("„privat“ heißt in der Oberfläche nirgends mehr so (nur noch die alten Etiketten im Speicher)", () => {
    for (const f of ["src/components/kalender/WeekPreview.tsx", "src/components/kalender/WochencheckSheet.tsx", "src/lib/core/haushalt.ts"]) expect(src(f), f).not.toMatch(/"Privat"|„Privat“/);
  });
});

describe("Listen: Schilder und Filter (Tafel 114, Bild 6)", () => {
  const list = () =>
    taskOverview(
      [aufgabe({ title: "Geschenk für Oma" }), aufgabe({ title: "Tim antworten" }, "ich"), aufgabe({ title: "Rechnung Steuerberater" }, "arbeit"), aufgabe({ title: "Wäsche" }), aufgabe({ title: "Soulmate antworten" }, "ich")],
      HEUTE,
    ).heute;

  it("Chips „Alle · Familie · Ich · Arbeit“ nur, wenn es Ich/Arbeit gibt", () => {
    expect(raumChips(["familie", "familie"])).toEqual([]);
    expect(raumChips(["familie", "ich"])).toEqual(["alle", "familie", "ich"]);
    expect(raumChips(["familie", "ich", "arbeit"])).toEqual(["alle", "familie", "ich", "arbeit"]);
    expect(raumChips(["arbeit"], "paar").map((c) => filterLabel(c, "paar"))).toEqual(["Alle", "Wir", "Arbeit"]);
    // allein: Gemeinsames zählt wie „Ich“, Chips nur mit Arbeit
    expect(raumChips(["familie", "ich"], "allein")).toEqual([]);
    expect(raumChips(["familie", "arbeit"], "allein")).toEqual(["alle", "ich", "arbeit"]);
  });

  it("Filter Ich zeigt nur Ich, „Familie · n ausgeblendet“ bleibt leise", () => {
    const a = aufgabenAnsicht(list(), { filter: "ich", arbeitRuht: false });
    expect(a.items.map((i) => i.title).sort()).toEqual(["Soulmate antworten", "Tim antworten"]);
    expect(a.ausgeblendet).toBe(3);
    // allein: „Ich“ umfasst Gemeinsames von früher
    expect(aufgabenAnsicht(list(), { filter: "ich", arbeitRuht: false, haushalt: "allein" }).items).toHaveLength(4);
    expect(passtZurAnsicht({ room: "familie" }, { filter: "ich" }, { arbeitRuht: false, haushalt: "allein" })).toBe(true);
    expect(passtZurAnsicht({ room: "arbeit" }, { filter: "alle" }, { arbeitRuht: true })).toBe(false);
  });

  it("nach Feierabend: nur Arbeit ausgeblendet („Arbeit · 1 für morgen“), Ich bleibt sichtbar", () => {
    const abends = aufgabenAnsicht(list(), { filter: "alle", arbeitRuht: true });
    expect(abends.items.map((i) => i.title)).toContain("Tim antworten");
    expect(abends.items.map((i) => i.title)).not.toContain("Rechnung Steuerberater");
    expect(abends.arbeitMorgen).toBe(1);
    expect(abends.chips).toEqual(["alle", "familie", "ich"]);
  });

  it("gemerkter Filter kennt „ich“", () => {
    expect(migrateAufgabenFilter({ version: 1, filter: "ich" })).toEqual({ version: 1, filter: "ich" });
  });

  it("Schilder: Familie ohne, Ich grün, Arbeit blau – in Kachel, Aufgaben-Seite, Dein Tag; Strich und Punkt Grün", () => {
    const schild = src("src/components/kalender/AufgabeSchild.tsx");
    expect(schild).toMatch(/room === "ich" && haushalt !== "allein"/);
    expect(schild).toMatch(/bg-ich-soft text-ich/);
    expect(src("src/components/heute/MiniCards.tsx").match(/<RaumSchild room=\{item\.room\}/g)).toHaveLength(2);
    expect(src("src/components/heute/DeinTag.tsx")).toMatch(/<RaumSchild room=\{r\.item\.room\} \/>/);
    expect(src("src/components/kalender/Items.tsx")).toMatch(/room === "ich" \? "bg-ich"/);
    const dots = calendarDots(termineOn([termin({ title: "Therapie", date: HEUTE, start: "17:00" }, "ich"), termin({ title: "Kita", date: HEUTE, start: "08:00" })], HEUTE, HEUTE), [], null);
    expect(dots.map((d) => d.kind).sort()).toEqual(["familie", "nurIch"]);
    const css = src("src/app/globals.css");
    expect(css).toMatch(/--app-ich: #3e7a62;/);
    expect(css).toMatch(/--app-ich-soft: #e3f0ea;/);
    expect(css.match(/--app-ich:/g)).toHaveLength(3);
  });
});

describe("Mia erkennt den Raum", () => {
  it("lokale Regeln: nur für mich/privat → Ich, für alle/Familie → Familie, Büro → Arbeit", () => {
    expect(guessRoom("Tim antworten, nur für mich")).toBe("ich");
    expect(guessRoom("Privat: Geschenk für Lisa")).toBe("ich");
    expect(guessRoom("Für alle: Kaffee bei Oma")).toBe("familie");
    expect(guessRoom("Meeting im Büro")).toBe("arbeit");
    expect(guessRoom("Wäsche aufhängen")).toBe("familie");
    expect(raumAusText("Wäsche aufhängen")).toBeNull();
    // „privat“ geht vor Arbeit-Wörtern („nur für mich“ entscheidet)
    expect(raumAusText("Bewerbung schreiben, nur für mich")).toBe("ich");
    expect(ohneRaumWorte("Tim antworten, nur für mich")).toBe("Tim antworten");
    expect(parseCalendar("Therapie Donnerstag 17 Uhr nur für mich", HEUTE)).toMatchObject({ kind: "create", draft: { raum: "ich", data: { title: "Therapie" } } });
  });

  it("Laden/Café sind Arbeit, wenn sie schon an Arbeits-Einträgen stehen (gelernt)", () => {
    const worte = arbeitsWorte([termin({ title: "Eisladen aufschließen", date: HEUTE, start: "09:00" }, "arbeit"), termin({ title: "Café mit Oma", date: HEUTE, start: "15:00" })]);
    expect(worte).toEqual(["eisladen"]);
    expect(guessRoom("Eisladen putzen", worte)).toBe("arbeit");
    expect(guessRoom("Café mit Lisa")).toBe("familie");
    expect(arbeitsWorte([termin({ title: "Laden", date: HEUTE, start: "09:00", label: "Café" }, "arbeit")])).toEqual(["laden", "café"]);
  });

  it("Werkzeuge: raum familie · ich · arbeit; „privat“ (alt) wird Ich", () => {
    const ctx = kontext();
    rufe(ctx, "aufgabe_anlegen", { titel: "Tim antworten", raum: "ich" });
    rufe(ctx, "termin_anlegen", { titel: "Therapie", datum: "2026-10-22", start: "17:00", raum: "privat" });
    rufe(ctx, "termin_anlegen", { titel: "Kita", datum: "2026-10-22", start: "08:00" });
    expect(ctx.ops.map((o) => (o.type === "upsert_entry" ? o.entry.raum : null))).toEqual(["ich", "ich", "familie"]);
    const tools = src("src/lib/begleitung/calendarTools.ts");
    expect(tools).toMatch(/enum: \["familie", "ich", "arbeit"\]/);
    expect(tools).toMatch(/Arbeits-Stichworte/);
    expect(src("src/lib/begleitung/prompt.ts")).toMatch(/"ich" = nur ich, abends sichtbar/);
  });

  it("Prüfstand: Sätze für Familie · Ich · Arbeit, der Raum wird geprüft", () => {
    const mitRaum = PRUEFSAETZE.filter((s) => s.raum);
    expect(new Set(mitRaum.map((s) => s.raum))).toEqual(new Set(["ich", "familie", "arbeit"]));
    expect(mitRaum.length).toBeGreaterThanOrEqual(7);
    const satz = mitRaum.find((s) => s.text === "Tim antworten, nur für mich")!;
    const reply = (raum: string) => ({ reply: "Steht drin.", ops: [{ id: "1", type: "upsert_entry", entry: { ...aufgabe({ title: "Tim antworten" }), raum }, isNew: true }] }) as never;
    expect(bewerte(satz, reply("ich"), 100).gruende).toEqual([]);
    expect(bewerte(satz, reply("familie"), 100).gruende.join()).toMatch(/Raum ich nicht getroffen/);
  });
});

describe("Ich wird nie geteilt", () => {
  beforeEach(() => resetTestKonten());

  it("Abgleich: „ich“ geht als „ich“ hoch – nie als Familie", () => {
    const kalender = ADAPTERS.find((a) => a.name === "kalender")!;
    const docs = kalender.toDocs({ version: 3, migratedTermine: true, seenReminders: [], entries: [{ ...aufgabe({ title: "Tim antworten" }, "ich") }, { ...termin({ title: "Kita", date: HEUTE, start: "08:00" }) }] });
    expect(docs.map((d) => d.raum)).toEqual(["ich", "familie"]);
    const back = kalender.fromDocs(docs, null) as { entries: { raum: string }[] };
    expect(back.entries.map((e) => e.raum)).toEqual(["ich", "familie"]);
  });

  it("Test-Backend (zwei Konten): Lisa sieht Felix’ „Ich“ nicht, kann es nicht ändern; wer geht, nimmt es mit", () => {
    const login = (email: string) => {
      testKonten({ action: "send_code", email });
      const code = testKonten({ action: "admin_code", email }).code as string;
      return testKonten({ action: "verify", email, code }) as { token: string; user: { userId: string } };
    };
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" });
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const T = "2026-10-28T08:00:00.000Z";
    const doc = (id: string, raum: string, title: string, typ = "termin") => ({ id, typ, raum, besitzer: null, erstellt: T, geaendert: T, geloescht: false, data: { data: { title } } });
    testKonten({ action: "push_entries", token: felix.token, docs: [doc("i1", "ich", "Therapie"), doc("f1", "familie", "Kita"), doc("n1", "ich", "Tagebuch", "notiz")] });
    const sieht = (token: string) => (testKonten({ action: "pull_entries", token, since: 0 }).docs as { id: string; raum: string }[]).map((d) => d.id).sort();
    expect(sieht(felix.token)).toEqual(["f1", "i1", "n1"]);
    expect(sieht(lisa.token)).toEqual(["f1"]);
    // überschreiben, auch als Familie getarnt: abgelehnt
    const later = { ...doc("i1", "familie", "Gehackt"), geaendert: "2026-10-29T08:00:00.000Z" };
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [later] }).skipped).toEqual(["i1"]);
    // Familie zu ihrem „Ich“ machen: abgelehnt
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [{ ...doc("f1", "ich", "Meins"), geaendert: "2026-10-29T08:00:00.000Z" }] }).skipped).toEqual(["f1"]);
    expect(testKonten({ action: "leave_household", token: felix.token }).error).toBeUndefined();
    expect(sieht(lisa.token)).toEqual(["f1"]);
  });

  it("Push vom Server: fremde Ich-Termine nie, eigene schon (auch nach Feierabend)", () => {
    const row = (id: string, raum: string, besitzer: string): PushEntryRow => ({
      household_id: "hh",
      id,
      typ: "termin",
      raum,
      besitzer,
      erstellt: `${HEUTE}T06:00:00.000Z`,
      geaendert: `${HEUTE}T06:00:00.000Z`,
      data: { id, typ: "termin", raum, besitzer, data: { title: id, date: HEUTE, start: "21:00", reminder: "30" } },
    });
    const out = planPushes({ abos: [{ id: "A", user_id: "anna", household_id: "hh", settings: {} }, { id: "B", user_id: "ben", household_id: "hh", settings: {} }], rows: [row("Therapie", "ich", "anna")], today: HEUTE, minute: 20 * 60 + 31, nowMs: Date.parse(`${HEUTE}T20:31:00+01:00`), sent: new Set(), proactiveToday: new Set() });
    expect(out.map((m) => m.aboId)).toEqual(["A"]);
  });
});

describe("Datenbank und Doku", () => {
  it("Migration: Raum „ich“ wie „arbeit“, nimmt man beim Verlassen mit; RLS-Test mit zwei Konten", () => {
    const m = readdirSync("supabase/migrations").find((f) => f.endsWith("_raum_ich.sql"))!;
    expect(m > "20261031120000").toBe(true);
    const sql = src(`supabase/migrations/${m}`);
    expect(sql).toMatch(/check \(raum in \('familie', 'ich', 'arbeit'\)\)/);
    expect(sql).toMatch(/raum in \('arbeit', 'ich'\)/);
    expect(existsSync("tests/datenbank/raumIch.test.sql")).toBe(true);
    expect(src("tests/datenbank/raumIch.test.sql")).toMatch(/Ben sieht nichts aus Annas „Ich“/);
  });

  it("Leitbild und Datenkarte kennen „Ich“", () => {
    expect(src("CLAUDE.md")).toMatch(/„Ich“ = nur ich/);
    expect(src("docs/datenschutz/datenkarte.md")).toMatch(/„Ich“/);
  });
});
