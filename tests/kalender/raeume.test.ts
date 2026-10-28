// A-034: gleiche Räume für Termine und Aufgaben (Familie · Ich · Arbeit),
// klare Vorauswahl, Mia rät und lernt, EINE Raum-Wahl (ui/RaumChips),
// Familien-Aufgaben für alle („erledigt von Lisa“), Ich/Arbeit nur für den
// Besitzer (Test-Backend wie RLS), Migration ohne Datenverlust, Prüfstand.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, aufgabe, fakeWindow, memoryStorage, noBrowser, termin } from "../helpers";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { nurBesitzer, roomOf } from "@/lib/core/entries";
import { raumAktion, raumLabel, raumName, raumWahl, sichtRaum } from "@/lib/core/haushalt";
import { arbeitsWorte, guessRoom, ohneRaumWorte, raumAusText, raumBefehl, raumRaten, raumUnklar, standardRaum, stichwort } from "@/lib/kalender/raum/raten";
import { migrateRaumGedaechtnis, mitWort } from "@/lib/kalender/raum/gedaechtnis";
import { RAUM_SAETZE } from "@/lib/begleitung/pruefstand/raeume";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { parseCalendar } from "@/lib/kalender/parse";
import { calendarChat } from "@/lib/kalender/chat";
import { aufgabeIch, etikettZeigen, itemsForDay, ohnePrivat, sanitizeEntry, setDone, setRoom, taskOverview, type CalendarEntry } from "@/lib/kalender/model";
import { darfRaumAendern, fromLabel, isMyTask, mitErledigtVon, taskRole } from "@/lib/kalender/abgeben/model";
import { aufgabenAnsicht, filterLabel, raumChips } from "@/lib/kalender/aufgaben";
import { calendarDots, termineOn } from "@/lib/kalender/monat";
import { calendarContext } from "@/lib/begleitung/calendarTools";
import { eingetragenMitRaum } from "@/lib/begleitung/miaDone";
import { merkListe } from "@/lib/mia/denktmit/merken";
import { ADAPTERS, type CloudDoc } from "@/lib/konten/sync/docs";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { planPushes, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { BACKUP_KEYS, STORAGE } from "@/lib/core/storage";
import { parseWeekTalk } from "@/lib/kalender/wochencheck";
import type { ChangeOp } from "@/lib/begleitung/ops";

const HEUTE = "2026-10-28";
at(`${HEUTE}T10:30`);
const src = (f: string) => readFileSync(f, "utf8");

describe("Drei Räume für Termine und Aufgaben", () => {
  it("Namen: Familie (zu zweit „Wir“, allein „Privat“) · Ich · Arbeit; allein entfällt „Ich“", () => {
    expect(raumWahl("familie").map((r) => raumLabel(r, "familie"))).toEqual(["Familie", "Ich", "Arbeit"]);
    expect(raumWahl("paar").map((r) => raumLabel(r, "paar"))).toEqual(["Wir", "Ich", "Arbeit"]);
    expect(raumWahl("allein").map((r) => raumLabel(r, "allein"))).toEqual(["Privat", "Arbeit"]);
    expect(raumName("allein")).toBe("Privat");
    expect(sichtRaum("ich", "allein")).toBe("familie");
    expect(sichtRaum("ich", "familie")).toBe("ich");
    expect(raumWahl("familie").map((r) => raumAktion(r, "familie"))).toEqual(["Für Familie", "Nur ich", "Arbeit"]);
    expect(raumAktion("familie", "paar")).toBe("Für uns beide");
  });

  it("Ich und Arbeit sieht nur der Besitzer; nichts geht verloren", () => {
    expect([nurBesitzer("familie"), nurBesitzer("ich"), nurBesitzer("arbeit")]).toEqual([false, true, true]);
    expect([roomOf("ich"), roomOf("arbeit"), roomOf("privat"), roomOf(undefined)]).toEqual(["ich", "arbeit", "familie", "familie"]);
    expect(sanitizeEntry({ ...termin({ title: "Zahnarzt", date: HEUTE, start: "09:00" }), raum: "ich" })?.raum).toBe("ich");
  });

  it("Vorauswahl: Termine Familie, Aufgaben Ich", () => {
    expect(standardRaum("termin")).toBe("familie");
    expect(standardRaum("aufgabe")).toBe("ich");
    expect(raumRaten("Kino", "termin")).toEqual({ raum: "familie", grund: "standard" });
    expect(raumRaten("Fahrrad putzen", "aufgabe")).toEqual({ raum: "ich", grund: "standard" });
  });
});

describe("Mia rät aus dem Satz", () => {
  it.each([
    ["Elternabend in der Schule", "familie"],
    ["Kinder abholen", "familie"],
    ["Oma besuchen", "familie"],
    ["Geburtstag von Mathis", "familie"],
    ["Kinderarzt mit Mathis", "familie"],
    ["Meeting mit dem Team", "arbeit"],
    ["Kunde anrufen", "arbeit"],
    ["Lieferant im Tohuus", "arbeit"],
    ["Büro aufräumen", "arbeit"],
    ["Termin bei KARAMBA Eis", "arbeit"],
    ["Zahnarzt", "ich"],
    ["Friseur", "ich"],
    ["Hausarzt anrufen", "ich"],
    ["Physio", "ich"],
  ] as const)("„%s“ → %s", (t, r) => {
    expect(guessRoom(t, "termin")).toBe(r);
    expect(guessRoom(t, "aufgabe")).toBe(r);
  });

  it("ausdrücklich gesagt geht vor dem Inhalt; „privat“ ist jetzt Ich", () => {
    expect(raumRaten("Nur für mich: Bewerbung schreiben", "aufgabe")).toEqual({ raum: "ich", grund: "gesagt" });
    expect(guessRoom("Privat: Geschenk für Lisa", "aufgabe")).toBe("ich");
    expect(guessRoom("Für alle: Zahnarzt", "termin")).toBe("familie");
    expect(guessRoom("Geschäftlich: Essen mit Peter", "termin")).toBe("arbeit");
    expect(ohneRaumWorte("Nur für mich: Bewerbung schreiben")).toBe("Bewerbung schreiben");
  });

  it("Familie vor Ich (mit dem Kind zum Arzt), Arbeit und Familie zugleich ist unklar", () => {
    expect(guessRoom("Mit den Kindern zum Zahnarzt", "termin")).toBe("familie");
    expect(raumUnklar("Kinder zum Tohuus bringen")).toBe(true);
    expect(raumUnklar("Lieferant im Tohuus")).toBe(false);
    expect(raumUnklar("Für alle: Kinder ins Tohuus")).toBe(false);
    expect(raumUnklar("Kinder zum Tohuus bringen", { gelernt: [{ wort: "tohuus", raum: "familie" }] })).toBe(false);
  });

  it("Personen aus dem Haushalt machen nichts zu Familie („Geschenk für Lisa“ soll Lisa nicht sehen)", () => {
    expect(guessRoom("Geschenk für Lisa besorgen", "aufgabe")).toBe("ich");
  });

  it("Arbeits-Stichworte aus früheren Arbeits-Einträgen zählen (Laden, Küche …)", () => {
    const worte = arbeitsWorte([termin({ title: "Laden aufschließen", date: HEUTE, start: "09:00" }, "arbeit"), termin({ title: "Küche mit Oma", date: HEUTE, start: "15:00" })]);
    expect(worte).toEqual(["laden"]);
    expect(guessRoom("Laden putzen", "aufgabe", { arbeitWorte: worte })).toBe("arbeit");
    expect(raumAusText("Wäsche aufhängen")).toBeNull();
  });

  it("Regex nie mit \\b an Umlauten", () => {
    expect(src("src/lib/kalender/raum/raten.ts")).not.toMatch(/\\b/);
  });
});

describe("Mia lernt aus Korrekturen", () => {
  beforeEach(() => noBrowser());

  it("Stichwort aus dem Titel: Name bzw. Ding, nie Tag, Uhrzeit oder Füllwort", () => {
    expect(stichwort("Zahnarzt Freitag 13 Uhr")).toBe("zahnarzt");
    expect(stichwort("Peter anrufen")).toBe("peter");
    expect(stichwort("Rechnung an Peter schicken")).toBe("peter");
    expect(stichwort("zahnarzt morgen")).toBe("zahnarzt");
    expect(stichwort("um 9")).toBeNull();
  });

  it("gelernt geht vor dem Inhalt und dem Standard, gesagt geht vor gelernt", () => {
    const gelernt = [{ wort: "peter", raum: "arbeit" as const }, { wort: "zahnarzt", raum: "familie" as const }];
    expect(raumRaten("Peter anrufen", "aufgabe", { gelernt })).toEqual({ raum: "arbeit", grund: "gelernt" });
    expect(raumRaten("Zahnarzt Freitag 9 Uhr", "termin", { gelernt })).toEqual({ raum: "familie", grund: "gelernt" });
    expect(raumRaten("Peter anrufen, nur für mich", "aufgabe", { gelernt }).raum).toBe("ich");
    expect(parseCalendar("Peter Freitag 9 Uhr", HEUTE, [], { gelernt })).toMatchObject({ kind: "create", draft: { raum: "arbeit" } });
  });

  it("Gedächtnis: neuestes vorn, umlernen ersetzt, höchstens 60, alte Stände sicher", () => {
    const leer = { version: 1 as const, worte: [], hinweisGesehen: false };
    const a = mitWort(mitWort(leer, "Zahnarzt", "ich", "t1"), "peter", "arbeit", "t2");
    expect(a.worte.map((w) => [w.wort, w.raum])).toEqual([["peter", "arbeit"], ["zahnarzt", "ich"]]);
    expect(mitWort(a, "zahnarzt", "familie", "t3").worte.map((w) => [w.wort, w.raum])).toEqual([["zahnarzt", "familie"], ["peter", "arbeit"]]);
    let viele = leer as ReturnType<typeof mitWort>;
    for (let i = 0; i < 70; i++) viele = mitWort(viele, `wort${i}`, "ich", "t");
    expect(viele.worte).toHaveLength(60);
    expect(migrateRaumGedaechtnis({ version: 1, worte: [{ wort: " Peter ", raum: "arbeit" }, { wort: "x" }, null], hinweisGesehen: true })).toEqual({ version: 1, worte: [{ wort: "peter", raum: "arbeit", seit: "" }], hinweisGesehen: true });
    expect(migrateRaumGedaechtnis({ version: 2 })).toBeNull();
  });

  it("Speicher: lokal, in der Sicherung, löschbar; der Satz „Hab … gewählt“ nur einmal", async () => {
    vi.resetModules();
    const w = fakeWindow();
    const g = await import("@/lib/kalender/raum/gedaechtnis");
    expect(g.raumHinweisOffen()).toBe(true);
    expect(g.raumLernen("Zahnarzt Freitag 13 Uhr", "ich")).toBe("zahnarzt");
    expect(g.raumLernen("Telefonat mit Peter", "arbeit")).toBe("peter");
    expect(g.gelernteRaeume()).toEqual([{ wort: "peter", raum: "arbeit" }, { wort: "zahnarzt", raum: "ich" }]);
    g.raumVergessen("zahnarzt");
    expect(g.gelernteRaeume()).toEqual([{ wort: "peter", raum: "arbeit" }]);
    g.raumHinweisGesehen();
    expect(g.raumHinweisOffen()).toBe(false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.raumgedaechtnis")!)).toMatchObject({ version: 1, hinweisGesehen: true });
    expect(BACKUP_KEYS).toContain("wasgibts.raumgedaechtnis");
    expect(STORAGE.find((s) => s.key === "wasgibts.raumgedaechtnis")?.what).not.toMatch(/Mia/);
  });

  it("Einstellungen → Mia → „Was ich mir gemerkt hab“ zeigt die Räume, einzeln löschbar", () => {
    const s = { version: 1, rituale: [], antworten: {} } as never;
    expect(merkListe(s, {}, [{ wort: "zahnarzt", raum: "ich" }, { wort: "peter", raum: "arbeit" }]).map((e) => [e.gruppe, e.titel, e.wert])).toEqual([
      ["Wer was sieht", "Zahnarzt", "Nur ich"],
      ["Wer was sieht", "Peter", "Arbeit"],
    ]);
    const view = src("src/components/einstellungen/settings/MiaMerktView.tsx");
    expect(view).toMatch(/title="Was ich mir gemerkt hab"/);
    expect(view).toMatch(/raumVergessen\(e\.key\)/);
    expect(src("src/components/einstellungen/settings/MiaView.tsx")).toMatch(/title="Was ich mir gemerkt hab"/);
  });
});

describe("Raum ändern ohne KI: „Mach den Zahnarzt nur für mich“", () => {
  const entries = () => [
    { ...termin({ title: "Zahnarzt", date: "2026-10-30", start: "13:00" }), erstellt: "2026-10-27T08:00:00.000Z" } as CalendarEntry,
    { ...aufgabe({ title: "Peter anrufen" }, "ich"), erstellt: "2026-10-28T08:00:00.000Z" } as CalendarEntry,
  ];

  it.each([
    ["Mach den Zahnarzt nur für mich", "Zahnarzt", "ich"],
    ["Stell den Zahnarzt auf Arbeit", "Zahnarzt", "arbeit"],
    ["Der Zahnarzt ist privat", "Zahnarzt", "ich"],
    ["Das gehört zur Familie", "das", "familie"],
    ["Das ist Arbeit", "das", "arbeit"],
  ] as const)("„%s“", (t, query, raum) => {
    expect(raumBefehl(t)).toEqual({ query, raum });
  });

  it("ändert den Raum, sagt es kurz und lernt; „das“ = zuletzt eingetragen; unbekannt = keine Regel", () => {
    const list = entries();
    const r = calendarChat("Mach den Zahnarzt nur für mich", list, HEUTE, [])!;
    expect(r.text).toBe("Nur für dich.");
    expect(r.change!(list, "2026-10-28T11:00:00.000Z").find((e) => e.data.title === "Zahnarzt")?.raum).toBe("ich");
    expect(r.gelernt).toEqual({ title: "Zahnarzt", raum: "ich" });
    const das = calendarChat("Das ist Arbeit", list, HEUTE, [])!;
    expect(das.change!(list, "s").find((e) => e.data.title === "Peter anrufen")?.raum).toBe("arbeit");
    expect(calendarChat("Mach den Friseur nur für mich", list, HEUTE, [])).toBeNull();
    expect(raumBefehl("Lisa ist bei der Arbeit")).toBeNull();
  });

  it("fremde Einträge (Familien-Aufgabe von Lisa) ändert die Regel nicht", () => {
    const lisas = { ...aufgabe({ title: "Müll rausbringen" }), besitzer: "lisa" } as CalendarEntry;
    expect(calendarChat("Mach Müll rausbringen nur für mich", [lisas], HEUTE, [], false, false, {}, "felix")).toBeNull();
    expect(darfRaumAendern(lisas, "felix")).toBe(false);
    expect(darfRaumAendern({ besitzer: "lokal" }, null)).toBe(true);
  });

  it("neu eingetragen: Raum-Chip unter der Bestätigung", () => {
    const r = calendarChat("Zahnarzt Freitag 13 Uhr", [], HEUTE, [])!;
    expect(r.neu).toMatchObject({ title: "Zahnarzt", raum: "ich", typ: "termin" });
    const entry = termin({ title: "Kino", date: HEUTE, start: "20:00" });
    expect(eingetragenMitRaum([{ id: "1", type: "upsert_entry", isNew: true, entry } as ChangeOp])).toEqual({ id: entry.id, title: "Kino", raum: "familie", typ: "termin" });
    expect(eingetragenMitRaum([{ id: "1", type: "upsert_entry", isNew: false, entry } as ChangeOp])).toBeNull();
    expect(setRoom([entry], entry.id, "ich", "s")[0]).toMatchObject({ raum: "ich", geaendert: "s" });
  });
});

describe("Mias Werkzeuge: Raum setzen, raten und ändern", () => {
  it("raum familie · ich · arbeit, „privat“ = Ich, ohne Angabe rät die App (Aufgaben Ich, Termine Familie)", () => {
    const ctx = kontext({ raumWorte: [{ wort: "peter", raum: "arbeit" }] });
    rufe(ctx, "termin_anlegen", { titel: "Lieferant", datum: "2026-10-29", start: "09:00", raum: "arbeit" });
    rufe(ctx, "termin_anlegen", { titel: "Therapie", datum: "2026-10-29", start: "17:00", raum: "privat" });
    rufe(ctx, "termin_anlegen", { titel: "Kino", datum: "2026-10-29", start: "20:00" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Fahrrad putzen" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Kita-Formular abgeben" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Peter zurückrufen" });
    expect(ctx.ops.map((o) => (o.type === "upsert_entry" ? o.entry.raum : null))).toEqual(["arbeit", "ich", "familie", "ich", "familie", "arbeit"]);
    const tools = src("src/lib/begleitung/calendarTools.ts");
    expect(tools).toMatch(/enum: \["familie", "ich", "arbeit"\]/);
    expect(src("src/lib/begleitung/prompt.ts")).toMatch(/Raum ändern \("Mach das nur für mich"/);
  });

  it("aufgabe_aendern / termin_aendern mit raum ändern den Raum (Vorschau)", () => {
    const z = termin({ title: "Zahnarzt", date: "2026-10-30", start: "13:00" });
    const ctx = kontext({ entries: [z] });
    rufe(ctx, "termin_aendern", { id: z.id, raum: "ich" });
    expect(ctx.ops[0]).toMatchObject({ type: "upsert_entry", isNew: false, entry: { raum: "ich" } });
  });

  it("Kontext nennt die gelernten Räume", () => {
    expect(calendarContext([], HEUTE, false, false, undefined, [{ wort: "peter", raum: "arbeit" }])).toContain("Gelernte Räume: peter → arbeit");
  });

  it("Wochencheck: Raum je Punkt aus dem Inhalt, Aufgaben sonst Ich", () => {
    const { items } = parseWeekTalk("Donnerstag 10 Uhr Zahnarzt. Freitag 9 Uhr Lieferant im Tohuus. Mittwoch muss ich das Paket zur Post bringen. Samstag 11 Uhr Kita-Fest", HEUTE);
    expect(items.map((i) => [i.title, i.raum])).toEqual([
      ["Zahnarzt", "ich"],
      ["Lieferant im Tohuus", "arbeit"],
      ["Paket Post bringen", "ich"],
      ["Kita Fest", "familie"],
    ]);
  });
});

describe("Prüfstand Raum-Wahl (≥ 30 Sätze, Ziel ≥ 95 %)", () => {
  it("Termine und Aufgaben, alle drei Räume, im großen Prüfstand mit Raum-Prüfung", () => {
    expect(RAUM_SAETZE.length).toBeGreaterThanOrEqual(30);
    for (const art of ["termin", "aufgabe"] as const) for (const raum of ["familie", "ich", "arbeit"] as const) expect(RAUM_SAETZE.some((s) => s.art === art && s.raum === raum), `${art}/${raum}`).toBe(true);
    for (const s of RAUM_SAETZE) expect(PRUEFSAETZE.find((p) => p.text === s.text)?.raum, s.text).toBe(s.raum);
    const satz = PRUEFSAETZE.find((s) => s.text === "Friseur Samstag 10 Uhr")!;
    const reply = (raum: string) => ({ reply: "Steht drin.", ops: [{ id: "1", type: "upsert_entry", isNew: true, entry: { ...termin({ title: "Friseur", date: "2026-10-24", start: "10:00" }), raum } }] }) as never;
    expect(bewerte(satz, reply("ich"), 100).gruende).toEqual([]);
    expect(bewerte(satz, reply("familie"), 100).gruende.join()).toMatch(/Raum ich nicht getroffen/);
  });

  it("ohne KI (Testmodus, Schnelleingabe, Sofort-Weg) ≥ 95 % richtig", () => {
    const at21 = "2026-10-21";
    const falsch = RAUM_SAETZE.filter((s) => {
      const cmd = parseCalendar(s.text, at21);
      const raum = cmd?.kind === "create" ? cmd.draft.raum : raumRaten(s.text, s.art).raum;
      return raum !== s.raum;
    }).map((s) => s.text);
    const quote = (RAUM_SAETZE.length - falsch.length) / RAUM_SAETZE.length;
    expect(quote, `falsch: ${falsch.join(" | ")}`).toBeGreaterThanOrEqual(0.95);
  });
});

describe("Familien-Aufgaben: alle sehen sie, jeder darf abhaken", () => {
  const lisas = (raum: "familie" | "ich", data: Record<string, unknown> = {}) => ({ ...aufgabe({ title: "Müll rausbringen", ...data }, raum), besitzer: "lisa" }) as CalendarEntry;
  const members = [
    { userId: "felix", displayName: "Felix", role: "erwachsen" },
    { userId: "lisa", displayName: "Lisa", role: "erwachsen" },
  ] as never;

  it("fremde Familien-Aufgabe steht in meiner Liste („von Lisa“), fremde Ich-Aufgabe nie", () => {
    expect(taskRole(lisas("familie"), "felix")).toBe("familie");
    expect(isMyTask(lisas("familie"), "felix")).toBe(true);
    expect(isMyTask(lisas("ich"), "felix")).toBe(false);
    expect(fromLabel(lisas("familie"), "felix", members)).toBe("von Lisa");
    expect(isMyTask(lisas("ich", { fuer: "felix" }), "felix")).toBe(true);
  });

  it("abhaken merkt, wer es war („erledigt von Lisa“); wieder öffnen nimmt es weg", () => {
    const a = { ...aufgabe({ title: "Müll rausbringen" }), besitzer: "felix" } as CalendarEntry;
    const item = itemsForDay([a], HEUTE, HEUTE)[0];
    const erledigt = mitErledigtVon([a], setDone([a], item, true, "s"), "lisa");
    expect(erledigt[0].data).toMatchObject({ doneOn: HEUTE, doneBy: "lisa" });
    expect(fromLabel(erledigt[0], "felix", members)).toBe("erledigt von Lisa");
    expect(fromLabel(erledigt[0], "lisa", members)).toBe("von Felix");
    const offen = mitErledigtVon(erledigt, setDone(erledigt, item, false, "s2"), "felix");
    expect(offen[0].data).not.toHaveProperty("doneBy");
    expect(mitErledigtVon([a], setDone([a], item, true, "s"), null)[0].data).not.toHaveProperty("doneBy");
    expect(sanitizeEntry(erledigt[0])?.data).toMatchObject({ doneBy: "lisa" });
    expect(src("src/lib/kalender/store.ts")).toMatch(/mitErledigtVon\(before, change\(before, nowIso\(\)\), myUserId\(\)\)/);
  });
});

describe("Gleiche Anzeige überall: Familie ohne Kennzeichen, Ich Schloss, Arbeit Schild", () => {
  it("Schild, Kalender-Punkte, Strich und Uhrzeit in Raumfarbe", () => {
    const schild = src("src/components/kalender/AufgabeSchild.tsx");
    expect(schild).toMatch(/<Lock[^>]*text-ich/);
    expect(schild).toMatch(/bg-work-soft text-work/);
    const dots = calendarDots(termineOn([termin({ title: "Lieferant", date: HEUTE, start: "09:00" }, "arbeit"), termin({ title: "Zahnarzt", date: HEUTE, start: "10:00" }, "ich"), termin({ title: "Kita", date: HEUTE, start: "08:00" })], HEUTE, HEUTE), [], null);
    expect(dots.map((d) => d.kind).sort()).toEqual(["arbeit", "familie", "nurIch"]);
    expect(src("src/components/kalender/Items.tsx")).toMatch(/room === "ich" \? "text-ich"/);
    expect(src("src/app/globals.css")).toMatch(/--app-ich: #5c6168/);
  });

  it("Chips „Alle · Familie · Ich · Arbeit“ nur mit mindestens zwei Räumen, nur die vorhandenen", () => {
    expect(raumChips(["ich", "ich"])).toEqual([]);
    expect(raumChips(["familie", "ich"])).toEqual(["alle", "familie", "ich"]);
    expect(raumChips(["familie", "ich", "arbeit"]).map((c) => filterLabel(c, "familie"))).toEqual(["Alle", "Familie", "Ich", "Arbeit"]);
    expect(raumChips(["familie", "ich"], "allein")).toEqual([]);
    const list = taskOverview([aufgabe({ title: "Müll" }), aufgabe({ title: "Zahnarzt anrufen" }, "ich"), aufgabe({ title: "Angebot" }, "arbeit")], HEUTE).heute;
    expect(aufgabenAnsicht(list, { filter: "ich", arbeitRuht: false }).items.map((i) => i.title)).toEqual(["Zahnarzt anrufen"]);
    // Feierabend: Arbeit ruht, „Ich“ bleibt
    expect(aufgabenAnsicht(list, { filter: "alle", arbeitRuht: true }).items.map((i) => i.title).sort()).toEqual(["Müll", "Zahnarzt anrufen"]);
  });

  it("EINE Raum-Wahl (ui/RaumChips) überall: Fenster, Detail, Mias Bestätigung; lange drücken auf die Zeile", () => {
    const chips = src("src/components/ui/RaumChips.tsx");
    expect(chips).toMatch(/raumWahl\(haushalt\)\.map/);
    expect(chips).toMatch(/familie: "border-accent bg-accent-soft text-accent-strong"/);
    expect(chips).toMatch(/ich: "border-ich bg-ich-soft text-ich"/);
    expect(chips).toMatch(/arbeit: "border-work bg-work-soft text-work"/);
    expect(src("src/components/kalender/eintragen/EintragTeile.tsx")).toMatch(/<RaumChips /);
    expect(src("src/components/kalender/Items.tsx")).toMatch(/<RaumChips /);
    expect(src("src/components/kalender/Items.tsx")).toMatch(/raumAktion\(r, haushalt\)/);
    expect(src("src/components/kalender/raum/RaumBestaetigung.tsx")).toMatch(/<RaumChips /);
    // Mias Bestätigung: die Raum-Zeile „Termin · Familie ⌄“ in der Ergebnis-Karte (A-037)
    expect(src("src/components/begleitung/ErgebnisKarten.tsx")).toMatch(/<RaumZeile /);
    expect(src("src/components/begleitung/ChatTurnItem.tsx")).toMatch(/<EintragErgebnis eintrag=\{turn\.raum\}/);
    expect(src("src/components/kalender/DayPanel.tsx")).toMatch(/onLang=\{\(\) => setMenu\(\{ item: i, start: "raum" \}\)\}/);
    expect(src("src/components/kalender/TasksView.tsx")).toMatch(/onLang=\{raumMenu\}/);
    expect(src("src/components/heute/MiniCards.tsx")).toMatch(/useLangDruecken\(onLang/);
    // Raum ändern immer mit Rückgängig und Lernen
    const aendern = src("src/components/kalender/raum/raumAendern.ts");
    expect(aendern).toMatch(/pushUndo\(/);
    expect(aendern).toMatch(/raumLernen\(entry\.data\.title, raum\)/);
    // Kein zweites Bedienmuster: kein alter Schalter mehr
    expect(src("src/components/kalender/eintragen/EintragTeile.tsx")).not.toMatch(/bg-segment/);
  });
});

describe("Migration: bestehende Aufgaben → Ich, Termine bleiben", () => {
  it("rein: Familien-Aufgabe → Ich, Termin und Arbeit bleiben; Etikett „Privat“ → Ich (Etikett nie gezeigt)", () => {
    const a = aufgabe({ title: "Steuer" });
    expect(aufgabeIch(a).raum).toBe("ich");
    expect(aufgabeIch(aufgabe({ title: "Angebot" }, "arbeit")).raum).toBe("arbeit");
    const t = termin({ title: "Kita", date: HEUTE, start: "08:00" });
    expect(aufgabeIch(t)).toBe(t);
    const privat = termin({ title: "Physio", date: HEUTE, start: "08:00", label: "Privat" }, "arbeit");
    expect(ohnePrivat(privat)).toMatchObject({ raum: "ich", data: { label: "Privat" } });
    expect(ohnePrivat({ ...privat, raum: "familie" })).toMatchObject({ raum: "ich" });
    expect(etikettZeigen("Privat")).toBeNull();
  });

  it("Speicher v4 → v5 über das Speicher-Verzeichnis, nichts geht verloren, einmalig", async () => {
    expect(STORAGE.find((s) => s.key === "wasgibts.eintraege")?.version).toBe(5);
    vi.resetModules();
    const old = { version: 4, migratedTermine: true, seenReminders: ["x@y"], entries: [aufgabe({ title: "Steuer" }), termin({ title: "Kita", date: HEUTE, start: "08:00" }), aufgabe({ title: "Angebot" }, "arbeit")] };
    const storage = memoryStorage({ "wasgibts.eintraege": JSON.stringify(old) });
    (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    const { loadEntries, changeEntries } = await import("@/lib/kalender/store");
    expect(loadEntries().map((e) => [e.data.title, e.raum])).toEqual([
      ["Steuer", "ich"],
      ["Kita", "familie"],
      ["Angebot", "arbeit"],
    ]);
    // Neue Familien-Aufgabe nach der Umstellung bleibt Familie
    changeEntries((l) => [...l, aufgabe({ title: "Müll" })]);
    expect(JSON.parse(storage.getItem("wasgibts.eintraege")!)).toMatchObject({ version: 5, seenReminders: ["x@y"] });
    expect(loadEntries().map((e) => e.raum)).toEqual(["ich", "familie", "arbeit", "familie"]);
    delete (globalThis as { window?: unknown }).window;
  });

  it("Abgleich hebt v4 auf v5", () => {
    const kal = ADAPTERS.find((a) => a.name === "kalender")!;
    const up = kal.upgrade!({ version: 4, entries: [aufgabe({ title: "Steuer" }), termin({ title: "Kita", date: HEUTE, start: "08:00" })] })!;
    expect((up.entries as CalendarEntry[]).map((e) => e.raum)).toEqual(["ich", "familie"]);
  });
});

describe("Zwei Konten (Test-Backend wie RLS): Familie kommt an, Ich/Arbeit nicht", () => {
  beforeEach(() => resetTestKonten());

  const login = (email: string) => {
    testKonten({ action: "send_code", email });
    const code = testKonten({ action: "admin_code", email }).code as string;
    return testKonten({ action: "verify", email, code }) as { token: string; user: { userId: string } };
  };
  const T = "2026-10-28T08:00:00.000Z";
  const doc = (id: string, typ: string, raum: string, title: string, extra: Record<string, unknown> = {}, geaendert = T) => ({
    id,
    typ,
    raum,
    besitzer: null,
    erstellt: T,
    geaendert,
    geloescht: false,
    data: { id, typ, raum, data: { title, date: "2026-10-29", start: "09:00", reminder: "30", ...extra } },
  });

  function haushalt() {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" });
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const lisaId = lisa.user.userId;
    testKonten({
      action: "push_entries",
      token: felix.token,
      docs: [
        doc("tf", "termin", "familie", "Elternabend"),
        doc("ti", "termin", "ich", "Zahnarzt"),
        doc("ta", "termin", "arbeit", "Lieferant"),
        doc("af", "aufgabe", "familie", "Müll rausbringen"),
        doc("ai", "aufgabe", "ich", "Geschenk für Lisa"),
        doc("aa", "aufgabe", "arbeit", "Angebot schreiben"),
        doc("ag", "aufgabe", "ich", "Turnbeutel waschen", { fuer: lisaId }),
      ],
    });
    const pull = (token: string) => (testKonten({ action: "pull_entries", token, since: 0 }).docs as CloudDoc[]).map((d) => d.id).sort();
    return { felix, lisa, pull };
  }

  it("Lisa bekommt Familie-Termin, Familie-Aufgabe und die ihr gegebene Aufgabe – nie Ich oder Arbeit", () => {
    const { felix, lisa, pull } = haushalt();
    expect(pull(felix.token)).toEqual(["aa", "af", "ag", "ai", "ta", "tf", "ti"]);
    expect(pull(lisa.token)).toEqual(["af", "ag", "tf"]);
  });

  it("Lisa hakt die Familien-Aufgabe ab, stellt sie aber nicht auf „ich“ und fasst Ich nicht an", () => {
    const { lisa, felix } = haushalt();
    const spaeter = "2026-10-28T09:00:00.000Z";
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [doc("af", "aufgabe", "familie", "Müll rausbringen", { doneOn: HEUTE, doneBy: "lisa" }, spaeter)] }).skipped).toEqual([]);
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [doc("af", "aufgabe", "ich", "weg", {}, "2026-10-28T10:00:00.000Z")] }).skipped).toEqual(["af"]);
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [doc("ti", "termin", "familie", "gehackt", {}, spaeter)] }).skipped).toEqual(["ti"]);
    const docs = testKonten({ action: "pull_entries", token: felix.token, since: 0 }).docs as CloudDoc[];
    expect(docs.find((d) => d.id === "af")).toMatchObject({ raum: "familie", data: { data: { doneBy: "lisa" } } });
  });

  it("Push: Ich- und Arbeit-Termine erinnern nur den Besitzer, Familie alle", () => {
    const row = (id: string, raum: string): PushEntryRow => ({
      household_id: "hh",
      id,
      typ: "termin",
      raum,
      besitzer: "felix",
      erstellt: `${HEUTE}T06:00:00.000Z`,
      geaendert: `${HEUTE}T06:00:00.000Z`,
      data: { id, typ: "termin", raum, besitzer: "felix", data: { title: id, date: HEUTE, start: "12:00", reminder: "30" } },
    });
    const abos = [
      { id: "F", user_id: "felix", household_id: "hh", settings: {} },
      { id: "L", user_id: "lisa", household_id: "hh", settings: {} },
    ];
    const plan = (r: PushEntryRow) => planPushes({ abos, rows: [r], today: HEUTE, minute: 11 * 60 + 31, nowMs: Date.parse(`${HEUTE}T11:31:00+01:00`), sent: new Set(), proactiveToday: new Set() }).map((m) => m.aboId).sort();
    expect(plan(row("Zahnarzt", "ich"))).toEqual(["F"]);
    expect(plan(row("Lieferant", "arbeit"))).toEqual(["F"]);
    expect(plan(row("Elternabend", "familie"))).toEqual(["F", "L"]);
  });
});

describe("Datenbank und Datenschutz", () => {
  it("Migration raeume_ich mit RLS-Test, Fehler aus A-028 (fuer in data.data) behoben", () => {
    const sql = src("supabase/migrations/20261101120000_raeume_ich.sql");
    expect(sql).toMatch(/check \(raum in \('familie', 'ich', 'arbeit'\)\)/);
    expect(sql).toMatch(/p_data -> 'data' ->> p_key/);
    expect(sql).toMatch(/update public\.entries set raum = 'ich' where typ = 'aufgabe' and raum = 'familie'/);
    const test = src("tests/datenbank/sicherheit.test.sql");
    expect(test).toMatch(/Ich und Arbeit \(Termine und Aufgaben\) kommen bei Lisa nie an/);
    expect(test).toMatch(/fuer in data\.data, Fehler A-028/);
  });

  it("Rechtstexte: „Ich“ und „Arbeit“ nur du; gelernte Räume als Datenart", () => {
    const recht = src("src/lib/datenschutz/rechtstexte.ts");
    expect(recht).toMatch(/„Ich“ und „Arbeit“ nur du/);
    expect(recht).toMatch(/Stichwort/);
    expect(src("docs/datenschutz/datenkarte.md")).toMatch(/wasgibts\.raumgedaechtnis/);
  });
});
