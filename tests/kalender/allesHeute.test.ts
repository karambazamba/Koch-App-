// Aufgaben: alles ist heute, eine Liste, Arbeit nur als Schild (Tafel 103/104).
// Screenshot 28.10. 07:28: Abschnitt „Irgendwann“ (darin „heute“), in jeder
// Zeile „von gestern“ + oranger Punkt, lange Namen abgeschnitten.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, aufgabe, fakeWindow, memoryStorage, termin } from "../helpers";
import { ohneZeitraum, taskOverview, type CalendarEntry } from "@/lib/kalender/model";
import { aufgabenAnsicht, aufgabenKopf, aufgabenSatz, arbeitMorgenText, ausgeblendetText, feierabendNachUhr, geplantText } from "@/lib/kalender/aufgaben";
import { migrateAufgabenFilter } from "@/lib/kalender/aufgabenFilter";
import { quickTaskData, readQuickText } from "@/lib/kalender/quick";
import { parseCalendar } from "@/lib/kalender/parse";
import { arbeitRuht, arbeitsEnde, istFeierabend } from "@/lib/heute/phases";
import { DEFAULT_ROUTINE } from "@/lib/heute/tagesablauf";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { parseBackup, restoreBackup } from "@/lib/core/backup";
import { vorschlaegeAus } from "@/lib/mails/vorschlag";

const HEUTE = "2026-10-28"; // Mittwoch
const NOPRESSURE = /überfällig|verpasst|fehlt|offen|noch zu erledigen|von gestern|von heute|irgendwann/i;
const src = (p: string) => readFileSync(p, "utf8");

beforeEach(() => at("2026-10-28T07:28"));

describe("Regel „alles ist heute“", () => {
  it("neue Aufgabe ohne Tag = heute (Hand, ＋, Mia, Mail-Vorschlag)", () => {
    // ＋ / Schnelleingabe: kein Tag genannt → heute
    expect(readQuickText("Fenster putzen", HEUTE).when).toBeNull();
    expect(quickTaskData("Fenster putzen", readQuickText("Fenster putzen", HEUTE).when ?? "heute", HEUTE).date).toBe(HEUTE);
    // Satz ohne Tag (Mia ohne KI) → heute
    const c = parseCalendar("Ich muss irgendwann mal den Keller aufräumen", HEUTE);
    expect(c?.kind === "create" && c.draft.typ === "aufgabe" ? c.draft.data.date : null).toBe(HEUTE);
    // Mail-Vorschlag mit Frist: übernommen steht sie ab heute
    expect(quickTaskData("Elternbrief", { due: "2026-11-02" }, HEUTE)).toMatchObject({ date: HEUTE, due: "2026-11-02" });
    const v = vorschlaegeAus("Bitte gebt den Elternbrief bis Montag unterschrieben ab.", HEUTE);
    expect(v.find((x) => x.kind === "aufgabe")).toMatchObject({ due: "2026-11-02" });
  });

  it("mit Tag = ab dem Tag; bis dahin unten leise „Geplant · 1“ (nur wenn vorhanden)", () => {
    const c = parseCalendar("Freitag KFZ-Steuer", HEUTE);
    const data = c?.kind === "create" && c.draft.typ === "aufgabe" ? c.draft.data : null;
    expect(data?.date).toBe("2026-10-30");
    const kfz = aufgabe({ title: "KFZ-Steuer", date: "2026-10-30" });
    const g = taskOverview([kfz, aufgabe({ title: "Müll" })], HEUTE);
    expect(g.heute.map((i) => i.title)).toEqual(["Müll"]);
    expect(g.geplant.map((i) => i.title)).toEqual(["KFZ-Steuer"]);
    expect(geplantText(g.geplant.length)).toBe("Geplant · 1");
    expect(taskOverview([aufgabe({ title: "Müll" })], HEUTE).geplant).toEqual([]);
    // Ab Freitag steht sie in der einen Liste
    expect(taskOverview([kfz], "2026-10-30").heute.map((i) => i.title)).toEqual(["KFZ-Steuer"]);
  });

  it("offene Aufgaben wandern still auf den nächsten Tag – ohne Etikett", () => {
    const gestern = aufgabe({ title: "Rad flicken", date: "2026-10-27" });
    const [item] = taskOverview([gestern], HEUTE).heute;
    expect(item.title).toBe("Rad flicken");
    expect(JSON.stringify(item)).not.toMatch(/von gestern|carried/);
  });
});

describe("Migration: „Irgendwann“/„Diese Woche“ still auf heute, nichts verlieren", () => {
  it("ohneZeitraum: diese Woche → heute, nächste Woche → ab Montag, Rest unverändert", () => {
    const woche = aufgabe({ title: "Reifen", week: "2026-10-26" });
    const naechste = aufgabe({ title: "Keller", week: "2026-11-02" });
    const irgendwann = aufgabe({ title: "Fotos" });
    const mitTag = aufgabe({ title: "Steuer", date: "2026-10-30", week: "2026-10-26" });
    const t = termin({ title: "Arzt", date: HEUTE, start: "09:00" });
    const [a, b, c, d, e] = [woche, naechste, irgendwann, mitTag, t].map((x) => ohneZeitraum(x, HEUTE));
    expect(a.data).not.toHaveProperty("week");
    expect(a.data).toMatchObject({ title: "Reifen" });
    expect((a.data as { date?: string }).date).toBeUndefined();
    expect(b.data).toMatchObject({ title: "Keller", date: "2026-11-02" });
    expect(c).toBe(irgendwann);
    expect(d.data).toMatchObject({ date: "2026-10-30" });
    expect(e).toBe(t);
    expect(taskOverview([a, c], HEUTE).heute.map((i) => i.title)).toEqual(["Reifen", "Fotos"]);
  });

  it("Speicher v2 → v3: alles bleibt, „week“ ist weg", async () => {
    vi.resetModules();
    const entries = [aufgabe({ title: "Reifen", week: "2026-10-26" }, { id: "a" }), aufgabe({ title: "Keller", week: "2026-11-02" }, { id: "b" }), aufgabe({ title: "Fotos" }, { id: "c" })];
    const w = fakeWindow({ "wasgibts.eintraege": JSON.stringify({ version: 2, entries, migratedTermine: true, seenReminders: ["x@y"] }) });
    const { loadEntries, changeEntries } = await import("@/lib/kalender/store");
    const list = loadEntries();
    expect(list.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(list.every((e) => e.typ === "aufgabe" && !e.data.week)).toBe(true);
    expect(list[1].data).toMatchObject({ date: "2026-11-02" });
    changeEntries((l) => l);
    const saved = JSON.parse(w.localStorage.getItem("wasgibts.eintraege")!);
    expect(saved).toMatchObject({ version: 4, migratedTermine: true, seenReminders: ["x@y"] });
  });

  it("Abgleich hebt v2/v3 auf v4 (sonst bliebe der Stand liegen)", () => {
    const kal = ADAPTERS.find((a) => a.name === "kalender")!;
    expect(kal.version).toBe(4);
    const up = kal.upgrade!({ version: 2, entries: [aufgabe({ title: "Reifen", week: "2026-10-26" })], migratedTermine: true, seenReminders: [] })!;
    expect(up.version).toBe(4);
    expect((up.entries as CalendarEntry[])[0].data).not.toHaveProperty("week");
    expect(kal.upgrade!({ version: 3, entries: [] })?.version).toBe(4);
    expect(kal.upgrade!({ version: 4, entries: [] })).toBeNull();
  });

  it("alte Sicherung (v0.47): „Geschenk für Oma“ (früher Irgendwann) steht heute in der Liste", async () => {
    vi.resetModules();
    const storage = memoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    restoreBackup(parseBackup(src("tests/fixtures/sicherung-v0.47.json"))!, storage);
    const { loadEntries } = await import("@/lib/kalender/store");
    const g = taskOverview(loadEntries(), HEUTE);
    expect(g.heute.map((i) => i.title).sort()).toEqual(["Geschenk für Oma", "Kita-Formular abgeben"]);
  });
});

describe("Liste: eine weiße Liste, Arbeit nur als Schild", () => {
  const items = () =>
    taskOverview(
      [
        { ...aufgabe({ title: "Alt" }), erstellt: "2026-10-20T08:00:00.000Z" } as CalendarEntry,
        aufgabe({ title: "Bericht" }, "arbeit"),
        aufgabe({ title: "Müll" }),
        { ...aufgabe({ title: "Angebot" }, "arbeit"), erstellt: "2026-10-21T08:00:00.000Z" } as CalendarEntry,
        { ...aufgabe({ title: "Tierarzt", dringend: true }), erstellt: "2026-10-22T08:00:00.000Z" } as CalendarEntry,
      ],
      HEUTE,
    ).heute;

  it("Kopf: „Heute · Mi 28. Okt“, nach Feierabend „Heute Abend · Feierabend“", () => {
    expect(aufgabenKopf(HEUTE, false)).toBe("Heute · Mi 28. Okt");
    expect(aufgabenKopf(HEUTE, true)).toBe("Heute Abend · Feierabend");
  });

  it("Reihenfolge: dringend → neu → Erstellungszeit", () => {
    expect(items().map((i) => i.title)).toEqual(["Tierarzt", "Bericht", "Müll", "Alt", "Angebot"]);
  });

  it("Filter-Chips nur, wenn es Arbeitsaufgaben gibt; gefiltert leise „Familie · n ausgeblendet“", () => {
    const familie = items().filter((i) => i.room === "familie");
    expect(aufgabenAnsicht(familie, { filter: "arbeit", arbeitRuht: false })).toMatchObject({ chips: [], filter: "alle", ausgeblendet: 0 });
    const alle = aufgabenAnsicht(items(), { filter: "alle", arbeitRuht: false });
    expect(alle).toMatchObject({ chips: ["alle", "familie", "arbeit"], filter: "alle", ausgeblendet: 0 });
    expect(alle.items).toHaveLength(5);
    const nurFamilie = aufgabenAnsicht(items(), { filter: "familie", arbeitRuht: false });
    expect(nurFamilie.items.map((i) => i.title)).toEqual(["Tierarzt", "Müll", "Alt"]);
    expect(ausgeblendetText("Familie", nurFamilie.ausgeblendet)).toBe("Familie · 2 ausgeblendet");
    const nurArbeit = aufgabenAnsicht(items(), { filter: "arbeit", arbeitRuht: false });
    expect(ausgeblendetText("Arbeit", nurArbeit.ausgeblendet)).toBe("Arbeit · 3 ausgeblendet");
  });

  it("die Wahl wird gemerkt (pro Gerät, nicht in der Sicherung)", async () => {
    expect(migrateAufgabenFilter({ version: 1, filter: "arbeit" })).toEqual({ version: 1, filter: "arbeit" });
    expect(migrateAufgabenFilter({ version: 1, filter: "quatsch" })).toEqual({ version: 1, filter: "alle" });
    expect(migrateAufgabenFilter(null)).toBeNull();
    vi.resetModules();
    const w = fakeWindow();
    const { setAufgabenFilter } = await import("@/lib/kalender/aufgabenFilter");
    setAufgabenFilter("familie");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.aufgabenfilter")!)).toEqual({ version: 1, filter: "familie" });
    const { BACKUP_KEYS } = await import("@/lib/core/storage");
    expect(BACKUP_KEYS).not.toContain("wasgibts.aufgabenfilter");
  });

  it("Seite: keine Etiketten pro Zeile (kein „von gestern“, kein „heute“, kein Punkt), Schild Geschäftlich, Namen bis 2 Zeilen", () => {
    const zeile = src("src/components/heute/MiniCards.tsx");
    const taskLine = zeile.slice(zeile.indexOf("export function TaskLine"), zeile.indexOf("export function AufgabenSection"));
    expect(taskLine).toMatch(/line-clamp-2/);
    expect(taskLine).not.toMatch(/taskBadge|carried|roomBarProps|rounded-full \$\{roomBar/);
    expect(taskLine).toMatch(/<RaumSchild room=\{item\.room\} \/>/);
    expect(taskLine).toMatch(/<NeuSchild/);
    expect(src("src/components/kalender/AufgabeSchild.tsx")).toMatch(/bg-work-soft text-work/);
    expect(src("src/components/kalender/AufgabeSchild.tsx")).not.toMatch(/bg-ich|text-ich/);
    const seite = src("src/components/kalender/TasksView.tsx");
    expect(seite).not.toMatch(/Irgendwann|Diese Woche|Heute dran|von gestern/);
    // A-043: „Erledigt ⌄“ statt „Erledigte anzeigen“
    expect(seite).toMatch(/label="Erledigt" runter/);
    expect(seite).not.toMatch(/Erledigte anzeigen|Erledigte ausblenden/);
  });
});

describe("Nach Feierabend: Arbeit ruht", () => {
  const ctx = (minutes: number, extra: Partial<{ weekday: number; workEnd: number | null; ruhe: boolean; arbeitstage: number[] }> = {}) => ({
    minutes,
    weekday: extra.weekday ?? 2,
    workEnd: extra.workEnd ?? null,
    routine: { ...DEFAULT_ROUTINE, feierabendAb: "18:00", ruhe: extra.ruhe ?? true, arbeitstage: extra.arbeitstage ?? [0, 1, 2, 3, 4] },
  });

  it("ab Feierabend laut Tagesablauf (und an freien Tagen) ruht die Arbeit, morgens wieder normal", () => {
    expect(arbeitRuht(ctx(17 * 60))).toBe(false);
    expect(arbeitRuht(ctx(18 * 60))).toBe(true);
    expect(arbeitRuht(ctx(23 * 60))).toBe(true);
    expect(arbeitRuht(ctx(4 * 60))).toBe(true);
    expect(arbeitRuht(ctx(7 * 60))).toBe(false);
    // Freier Tag laut Tagesablauf: den ganzen Tag
    expect(arbeitRuht(ctx(10 * 60, { weekday: 5 }))).toBe(true);
    // Später Arbeit-Termin schiebt den Feierabend
    const spaet = termin({ title: "Call", date: HEUTE, start: "18:30", end: "19:15" }, "arbeit");
    const end = arbeitsEnde([{ entry: spaet, room: "arbeit", time: "18:30", end: "19:15" }]);
    expect(end).toBe(19 * 60 + 15);
    expect(arbeitRuht(ctx(19 * 60, { workEnd: end }))).toBe(false);
    // Ohne „Ruhe nach Feierabend“ bleibt sie; Feierabend ist trotzdem Feierabend
    expect(arbeitRuht(ctx(20 * 60, { ruhe: false }))).toBe(false);
    expect(istFeierabend(ctx(20 * 60, { ruhe: false }))).toBe(true);
    expect(feierabendNachUhr(21 * 60, "20:00")).toBe(true);
    expect(feierabendNachUhr(12 * 60)).toBe(false);
  });

  it("blendet Arbeit aus, ohne Chips, leise „Geschäftlich · n für morgen“ – antippen blendet kurz ein", () => {
    const list = taskOverview([aufgabe({ title: "Müll" }), aufgabe({ title: "Bericht" }, "arbeit"), aufgabe({ title: "Angebot" }, "arbeit")], HEUTE).heute;
    const abends = aufgabenAnsicht(list, { filter: "arbeit", arbeitRuht: true });
    expect(abends).toMatchObject({ chips: [], arbeitMorgen: 2, ausgeblendet: 0 });
    expect(abends.items.map((i) => i.title)).toEqual(["Müll"]);
    expect(arbeitMorgenText(abends.arbeitMorgen)).toBe("Geschäftlich · 2 für morgen");
    expect(aufgabenAnsicht(list, { filter: "alle", arbeitRuht: true, arbeitZeigen: true }).items).toHaveLength(3);
  });
});

describe("Startseite: gleiche Regeln in der Aufgaben-Kachel", () => {
  it("alles heute, keine Etiketten, Arbeit-Schild, nach Feierabend ohne Arbeit mit „Arbeit · n für morgen“", () => {
    const kachel = src("src/components/heute/MiniCards.tsx");
    const field = kachel.slice(kachel.indexOf("function TaskField"), kachel.indexOf("export function AufgabenSection"));
    expect(field).not.toMatch(/taskBadge|badge|carried/);
    expect(field).toMatch(/<RaumSchild room=\{item\.room\} klein \/>/);
    expect(kachel).toMatch(/arbeitMorgenText\(arbeitMorgen\)/);
    const seite = src("src/components/heute/TodayPage.tsx");
    expect(seite).toMatch(/arbeitMorgen=\{arbeitMorgen\}/);
    expect(seite).toMatch(/const arbeitMorgen = view\.hideWork \? tasksJetzt\.length - tasksAll\.length : 0/);
    expect(seite).not.toMatch(/group === "woche"|offeneAufgaben|aufgabenReihe/);
  });
});

describe("Mia: „Was steht heute an?“", () => {
  it("kurz die Zahl und die ersten drei – ruhig", () => {
    const list = taskOverview([aufgabe({ title: "Müll" }), aufgabe({ title: "Rad" }), aufgabe({ title: "Steuer" }), aufgabe({ title: "Fenster" })], HEUTE).heute;
    expect(aufgabenSatz(list)).toBe("4 Aufgaben, zuerst Müll, Rad und Steuer.");
    expect(aufgabenSatz(list.slice(0, 1))).toBe("Eine Aufgabe: Müll.");
    expect(aufgabenSatz([], "bei der Arbeit")).toBe("Gerade liegt bei der Arbeit keine Aufgabe an.");
    expect(aufgabenSatz(list)).not.toMatch(NOPRESSURE);
  });
});
