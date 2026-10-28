// Termine – Raumauswahl Familie / Geschäftlich (A-021, ersetzt den Raum „Ich“
// aus A-020 vor dem Ausliefern): genau zwei Räume, intern „familie“ und
// „arbeit“, sichtbar „Familie“ (zu zweit „Wir“) und „Geschäftlich“. Termine
// und Aufgaben haben denselben Schalter, dieselben Farben, denselben Filter.
// „Privat“ gibt es nirgends mehr; alte „Privat“-Einträge werden einmalig
// Familie (nur auf dem Gerät, nie ungefragt für andere). Geschäftliches sieht
// nur der Besitzer – nicht im Abgleich, Push, Pinnwand, Heute oder bei Mia.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, aufgabe, memoryStorage, termin } from "../helpers";
import { nurBesitzer, roomOf } from "@/lib/core/entries";
import { GESCHAEFTLICH, RAUM_WAHL, raumLabel, raumName } from "@/lib/core/haushalt";
import { aufgabenAnsicht, arbeitMorgenText, filterLabel, passtZurAnsicht, raumChips } from "@/lib/kalender/aufgaben";
import { arbeitsWorte, guessRoom, ohneRaumWorte, parseCalendar, raumAusText, raumUnklar } from "@/lib/kalender/parse";
import { etikettZeigen, itemsForDay, ohnePrivat, sanitizeEntry, taskOverview, type CalendarEntry } from "@/lib/kalender/model";
import { calendarDots, termineOn } from "@/lib/kalender/monat";
import { itemFromEntry, parseWeekTalk } from "@/lib/kalender/wochencheck";
import { migrateAufgabenFilter } from "@/lib/kalender/aufgabenFilter";
import { migrateEintragRaum } from "@/lib/kalender/eintragen/raumStore";
import { schalterRaum, startRaum } from "@/lib/kalender/eintragen/raum";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { planPushes, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { newsFromDocs } from "@/lib/konten/wer";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { calendarContext } from "@/lib/begleitung/calendarTools";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { STORAGE } from "@/lib/core/storage";
import type { CloudDoc } from "@/lib/konten/sync/docs";

const HEUTE = "2026-10-28";
at(`${HEUTE}T10:30`);
const src = (f: string) => readFileSync(f, "utf8");

describe("Zwei Räume: Familie und Geschäftlich", () => {
  it("Namen: „Familie“ (allein auch – kein „Privat“), zu zweit „Wir“, „arbeit“ heißt „Geschäftlich“", () => {
    expect(RAUM_WAHL).toEqual(["familie", "arbeit"]);
    expect(RAUM_WAHL.map((r) => raumLabel(r, "familie"))).toEqual(["Familie", "Geschäftlich"]);
    expect(RAUM_WAHL.map((r) => raumLabel(r, "allein"))).toEqual(["Familie", "Geschäftlich"]);
    expect(RAUM_WAHL.map((r) => raumLabel(r, "paar"))).toEqual(["Wir", "Geschäftlich"]);
    expect(raumName("allein")).toBe("Familie");
    expect(GESCHAEFTLICH).toBe("Geschäftlich");
  });

  it("nur „arbeit“ sieht der Besitzer allein; altes „ich“ wird Arbeit (nie ungefragt geteilt), „privat“ Familie", () => {
    expect([nurBesitzer("arbeit"), nurBesitzer("familie"), nurBesitzer("ich"), nurBesitzer("privat")]).toEqual([true, false, true, false]);
    expect([roomOf("arbeit"), roomOf("ich"), roomOf("privat"), roomOf(undefined)]).toEqual(["arbeit", "arbeit", "familie", "familie"]);
    expect(sanitizeEntry({ ...termin({ title: "Therapie", date: HEUTE, start: "17:00" }), raum: "ich" })?.raum).toBe("arbeit");
  });

  it("„Privat“ und „Ich“ stehen nirgends mehr in der Oberfläche; keine Ich-Farben", () => {
    for (const f of ["src/components/kalender/WeekPreview.tsx", "src/components/kalender/WochencheckSheet.tsx", "src/lib/core/haushalt.ts", "src/components/kalender/eintragen/EintragTeile.tsx", "src/components/kalender/AufgabeSchild.tsx"]) {
      expect(src(f), f).not.toMatch(/"Privat"|„Privat“|"Ich"|„Ich“|bg-ich|text-ich/);
    }
    const css = src("src/app/globals.css");
    expect(css).not.toMatch(/--app-ich|--color-ich/);
  });

  it("Schalter: derselbe für Termin und Aufgabe, Start = letzte Wahl, nach Feierabend Familie, von Hand geht vor", () => {
    for (const f of ["src/components/kalender/eintragen/TerminFenster.tsx", "src/components/kalender/eintragen/AufgabeFenster.tsx"]) {
      const code = src(f);
      expect(code, f).toMatch(/<EintragZeile/);
      expect(code, f).toMatch(/startRaum\(\{ letzte: letzterRaum\(\), feierabend: feierabend \|\| ruht \}\)/);
      expect(code, f).toMatch(/raumMerken\(raum\)/);
    }
    expect(src("src/components/kalender/eintragen/EintragTeile.tsx")).toMatch(/RAUM_WAHL\.map/);
    expect(startRaum({ letzte: null, feierabend: false })).toBe("familie");
    expect(startRaum({ letzte: "arbeit", feierabend: false })).toBe("arbeit");
    expect(startRaum({ letzte: "arbeit", feierabend: true })).toBe("familie");
    expect(schalterRaum({ hand: null, ausText: "arbeit", start: "familie" })).toBe("arbeit");
    expect(schalterRaum({ hand: "familie", ausText: "arbeit", start: "arbeit" })).toBe("familie");
    expect(migrateEintragRaum({ version: 1, raum: "ich" })).toEqual({ version: 1, raum: "arbeit" });
  });

  it("Raum nachträglich änderbar: Termin öffnen zeigt den Schalter mit dem gespeicherten Raum", () => {
    const code = src("src/components/kalender/eintragen/TerminFenster.tsx");
    expect(code).toMatch(/useState<Room \| null>\(entry \? entry\.raum : null\)/);
    expect(code).toMatch(/\{ \.\.\.entry, raum: gespeichert, data:/);
  });
});

describe("Filter und Farben: Termine wie Aufgaben", () => {
  const list = () => taskOverview([aufgabe({ title: "Geschenk für Oma" }), aufgabe({ title: "Lieferant anrufen" }, "arbeit"), aufgabe({ title: "Wäsche" })], HEUTE).heute;

  it("Chips „Alle · Familie · Geschäftlich“ nur mit Geschäftlichem (Lisa hat keins, sieht keine)", () => {
    expect(raumChips(["familie", "familie"])).toEqual([]);
    expect(raumChips(["familie", "arbeit"])).toEqual(["alle", "familie", "arbeit"]);
    expect(raumChips(["arbeit"]).map((c) => filterLabel(c, "familie"))).toEqual(["Alle", "Familie", "Geschäftlich"]);
    expect(raumChips(["arbeit"]).map((c) => filterLabel(c, "paar"))).toEqual(["Alle", "Wir", "Geschäftlich"]);
    expect(migrateAufgabenFilter({ version: 1, filter: "ich" })).toEqual({ version: 1, filter: "alle" });
  });

  it("Filter und Feierabend: „Geschäftlich · 1 für morgen“", () => {
    const a = aufgabenAnsicht(list(), { filter: "arbeit", arbeitRuht: false });
    expect(a.items.map((i) => i.title)).toEqual(["Lieferant anrufen"]);
    const abends = aufgabenAnsicht(list(), { filter: "alle", arbeitRuht: true });
    expect(abends.items.map((i) => i.title)).not.toContain("Lieferant anrufen");
    expect(abends.arbeitMorgen).toBe(1);
    expect(arbeitMorgenText(1)).toBe("Geschäftlich · 1 für morgen");
    expect(passtZurAnsicht({ room: "familie" }, { filter: "arbeit" }, { arbeitRuht: false })).toBe(false);
  });

  it("Kalender: Chips aus den Terminen, Strich/Punkt/Uhrzeit in Raumfarbe, Schild „Geschäftlich“", () => {
    const cal = src("src/components/kalender/CalendarPage.tsx");
    expect(cal).toMatch(/raumChips\(entries\.filter\(\(e\) => e\.typ === "termin"\)\.map\(\(e\) => e\.raum\)\)/);
    expect(cal).toMatch(/zeitFarbe\(i\.room\)/);
    const day = src("src/components/kalender/DayPanel.tsx");
    expect(day).toMatch(/roomBarProps\(i\)/);
    expect(day).toMatch(/zeitFarbe\(i\.room\)/);
    expect(day).toMatch(/<RaumSchild room=\{i\.room\} \/>/);
    expect(src("src/components/kalender/Items.tsx")).toMatch(/room === "arbeit" \? "text-work" : "text-accent-strong"/);
    expect(src("src/components/kalender/AufgabeSchild.tsx")).toMatch(/bg-work-soft text-work/);
    const dots = calendarDots(termineOn([termin({ title: "Lieferant", date: HEUTE, start: "09:00" }, "arbeit"), termin({ title: "Kita", date: HEUTE, start: "08:00" })], HEUTE, HEUTE), [], null);
    expect(dots.map((d) => d.kind).sort()).toEqual(["arbeit", "familie"]);
  });
});

describe("Mia erkennt den Raum aus dem Inhalt", () => {
  it("Tohuus, KARAMBA Eis, Lieferant, Personal, Großhandel → Geschäftlich; Kinder, Arzt, Kita, Schule → Familie", () => {
    for (const t of ["Lieferant im Tohuus", "Termin bei KARAMBA Eis", "Personal einteilen", "Großhandel anrufen", "Meeting im Büro", "Schulung Kasse"]) expect(guessRoom(t), t).toBe("arbeit");
    for (const t of ["Kinderarzt mit Mathis", "Elternabend Schule", "Kita-Fest", "Zahnarzt", "Kinder abholen", "Personalausweis beantragen"]) expect(guessRoom(t), t).toBe("familie");
    expect(raumAusText("Wäsche aufhängen")).toBeNull();
  });

  it("„privat“/„nur für mich“ ist Familie (außer der Inhalt ist geschäftlich); „für alle“ entscheidet", () => {
    expect(guessRoom("Tim antworten, nur für mich")).toBe("familie");
    expect(guessRoom("Privat: Geschenk für Lisa")).toBe("familie");
    expect(guessRoom("Privat: Lieferant anrufen")).toBe("arbeit");
    expect(guessRoom("Für alle: Eis essen im Café")).toBe("familie");
    expect(ohneRaumWorte("Privat: Geschenk für Lisa")).toBe("Geschenk für Lisa");
    expect(parseCalendar("Lieferant Tohuus Donnerstag 9 Uhr", HEUTE)).toMatchObject({ kind: "create", draft: { typ: "termin", raum: "arbeit" } });
  });

  it("nur bei echter Unklarheit nachfragen: Familie und Geschäftlich zugleich", () => {
    expect(raumUnklar("Kinder zum Tohuus bringen")).toBe(true);
    expect(raumUnklar("Lieferant im Tohuus")).toBe(false);
    expect(raumUnklar("Für alle: Kinder ins Café")).toBe(false);
    expect(raumUnklar("Kinderarzt")).toBe(false);
  });

  it("gelernte Arbeits-Stichworte (Laden, Küche …) zählen als Geschäftlich, Familie-Wörter gehen vor", () => {
    const worte = arbeitsWorte([termin({ title: "Laden aufschließen", date: HEUTE, start: "09:00" }, "arbeit"), termin({ title: "Küche mit Oma", date: HEUTE, start: "15:00" })]);
    expect(worte).toEqual(["laden"]);
    expect(guessRoom("Laden putzen", worte)).toBe("arbeit");
    expect(guessRoom("Laden mit den Kindern", worte)).toBe("familie");
  });

  it("Werkzeuge: raum familie · arbeit; „privat“ (alt) wird Familie; Beschreibung nennt die Stichwörter und die Rückfrage", () => {
    const ctx = kontext();
    rufe(ctx, "termin_anlegen", { titel: "Lieferant", datum: "2026-10-29", start: "09:00", raum: "arbeit" });
    rufe(ctx, "termin_anlegen", { titel: "Therapie", datum: "2026-10-29", start: "17:00", raum: "privat" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Kita-Formular" });
    expect(ctx.ops.map((o) => (o.type === "upsert_entry" ? o.entry.raum : null))).toEqual(["arbeit", "familie", "familie"]);
    const tools = src("src/lib/begleitung/calendarTools.ts");
    expect(tools).toMatch(/enum: \["familie", "arbeit"\]/);
    expect(tools).not.toMatch(/"ich"/);
    expect(tools).toMatch(/Tohuus, KARAMBA Eis/);
    expect(tools).toMatch(/antwort_knoepfe \['Familie', 'Geschäftlich'\]/);
    expect(src("src/lib/begleitung/prompt.ts")).toMatch(/"arbeit" = Geschäftlich/);
  });

  it("Prüfstand: Termine per Sprache mit Raum, beide Räume, keiner mit „ich“", () => {
    const mitRaum = PRUEFSAETZE.filter((s) => s.raum);
    expect(new Set(mitRaum.map((s) => s.raum))).toEqual(new Set(["familie", "arbeit"]));
    expect(mitRaum.length).toBeGreaterThanOrEqual(13);
    const satz = mitRaum.find((s) => s.text === "Morgen um 9 Lieferant im Tohuus")!;
    const reply = (raum: string) => ({ reply: "Steht drin.", ops: [{ id: "1", type: "upsert_entry", entry: { ...termin({ title: "Lieferant", date: "2026-10-22", start: "09:00" }), raum }, isNew: true }] }) as never;
    expect(bewerte(satz, reply("arbeit"), 100).gruende).toEqual([]);
    expect(bewerte(satz, reply("familie"), 100).gruende.join()).toMatch(/Raum arbeit nicht getroffen/);
  });

  it("Wochencheck: „privat“/Arzt sind Familie, Geschäftliches aus dem Inhalt", () => {
    const { items } = parseWeekTalk("Donnerstag 10 Uhr Zahnarzt. Freitag 9 Uhr Lieferant im Tohuus. Montag privat Physio um 8", HEUTE);
    expect(items.map((i) => i.raum)).toEqual(["familie", "arbeit", "familie"]);
    const alt = itemFromEntry({ ...termin({ title: "Physio", date: HEUTE, start: "08:00", label: "Privat" }), raum: "arbeit" } as CalendarEntry, "w1");
    expect(alt.raum).toBe("familie");
  });
});

describe("Migration: „Privat“ → Familie (einmalig, ohne Datenverlust)", () => {
  const privat = (besitzer: string) => ({ ...termin({ title: "Physio", date: HEUTE, start: "08:00", label: "Privat" }, "arbeit"), besitzer }) as CalendarEntry;

  it("nur auf dem Gerät wird Familie, mit Konto bleibt es beim Besitzer; das Etikett bleibt gespeichert, wird nie gezeigt", () => {
    expect(ohnePrivat(privat("lokal"))).toMatchObject({ raum: "familie", data: { label: "Privat" } });
    expect(ohnePrivat(privat("konto-felix")).raum).toBe("arbeit");
    expect(ohnePrivat({ ...privat("lokal"), data: { ...privat("lokal").data, label: "Sport" } } as CalendarEntry).raum).toBe("arbeit");
    expect(etikettZeigen("Privat")).toBeNull();
    expect(etikettZeigen("Kita")).toBe("Kita");
    expect(itemsForDay([ohnePrivat(privat("lokal"))], HEUTE, HEUTE)[0].label).toBeNull();
  });

  it("Speicher v3 → v4 über das Speicher-Verzeichnis, alles bleibt da", async () => {
    expect(STORAGE.find((s) => s.key === "wasgibts.eintraege")?.version).toBe(4);
    vi.resetModules();
    const old = { version: 3, migratedTermine: true, seenReminders: ["x@y"], entries: [privat("lokal"), termin({ title: "Kita", date: HEUTE, start: "08:00" }), termin({ title: "Lieferant", date: HEUTE, start: "09:00" }, "arbeit")] };
    const storage = memoryStorage({ "wasgibts.eintraege": JSON.stringify(old) });
    (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    const { loadEntries, changeEntries } = await import("@/lib/kalender/store");
    expect(loadEntries().map((e) => [e.data.title, e.raum, e.data.label ?? null])).toEqual([
      ["Physio", "familie", "Privat"],
      ["Kita", "familie", null],
      ["Lieferant", "arbeit", null],
    ]);
    changeEntries((l) => l);
    expect(JSON.parse(storage.getItem("wasgibts.eintraege")!)).toMatchObject({ version: 4, seenReminders: ["x@y"] });
    // ein zweites Laden ändert nichts mehr (einmalig)
    expect(loadEntries().map((e) => e.raum)).toEqual(["familie", "familie", "arbeit"]);
    delete (globalThis as { window?: unknown }).window;
  });

  it("Abgleich hebt v3 auf v4 – auch dort wird nur Lokales Familie", () => {
    const kal = ADAPTERS.find((a) => a.name === "kalender")!;
    const up = kal.upgrade!({ version: 3, entries: [privat("lokal"), privat("konto-felix")] })!;
    expect((up.entries as CalendarEntry[]).map((e) => e.raum)).toEqual(["familie", "arbeit"]);
  });
});

describe("Sichtbarkeit: Geschäftliches sieht nur der Besitzer (Felix), nie Lisa", () => {
  beforeEach(() => resetTestKonten());

  const login = (email: string) => {
    testKonten({ action: "send_code", email });
    const code = testKonten({ action: "admin_code", email }).code as string;
    return testKonten({ action: "verify", email, code }) as { token: string; user: { userId: string } };
  };
  const T = "2026-10-28T08:00:00.000Z";
  const doc = (id: string, raum: string, title: string, typ = "termin") => ({ id, typ, raum, besitzer: null, erstellt: T, geaendert: T, geloescht: false, data: { id, typ, raum, data: { title, date: "2026-10-29", start: "09:00", reminder: "30" } } });

  function haushalt() {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" });
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    testKonten({ action: "push_entries", token: felix.token, docs: [doc("g1", "arbeit", "Lieferant Tohuus"), doc("f1", "familie", "Kita-Fest"), doc("i1", "ich", "Therapie")] });
    const pull = (token: string) => testKonten({ action: "pull_entries", token, since: 0 }).docs as CloudDoc[];
    return { felix, lisa, pull };
  }

  it("Abgleich (Test-Backend wie RLS): Lisa bekommt nur Familie, kann Geschäftliches nicht überschreiben", () => {
    const { lisa, felix, pull } = haushalt();
    expect(pull(felix.token).map((d) => d.id).sort()).toEqual(["f1", "g1", "i1"]);
    expect(pull(lisa.token).map((d) => d.id)).toEqual(["f1"]);
    const later = { ...doc("g1", "familie", "Gehackt"), geaendert: "2026-10-29T08:00:00.000Z" };
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [later] }).skipped).toEqual(["g1"]);
  });

  it("Heute, Kalender und Mia bei Lisa: Felix’ Geschäftliches kommt gar nicht erst an", () => {
    const { lisa, pull } = haushalt();
    const kalender = ADAPTERS.find((a) => a.name === "kalender")!;
    const bei = kalender.fromDocs(pull(lisa.token), null) as { entries: CalendarEntry[] };
    const entries = bei.entries.map(sanitizeEntry).filter((e): e is CalendarEntry => e !== null);
    expect(entries.map((e) => e.data.title)).toEqual(["Kita-Fest"]);
    expect(termineOn(entries, "2026-10-29", HEUTE).map((i) => i.title)).toEqual(["Kita-Fest"]);
    const fuerMia = calendarContext(entries, HEUTE);
    expect(fuerMia).toContain("Kita-Fest");
    expect(fuerMia).not.toMatch(/Lieferant|Tohuus|Therapie/);
    expect(raumChips(entries.map((e) => e.raum))).toEqual([]);
  });

  it("Pinnwand/Neuigkeiten: Geschäftliches erzeugt nie eine Meldung für andere", () => {
    const members = [
      { userId: "felix", displayName: "Felix", role: "erwachsen" },
      { userId: "lisa", displayName: "Lisa", role: "erwachsen" },
    ] as never;
    const d = (id: string, raum: "familie" | "arbeit") => ({ id, typ: "termin", raum, besitzer: "felix", erstellt: T, geaendert: T, data: { data: { title: id, date: "2026-10-29", start: "09:00" } } }) as unknown as CloudDoc;
    const news = newsFromDocs([d("Lieferant", "arbeit"), d("Kita-Fest", "familie")], () => false, members, "lisa");
    expect(JSON.stringify(news)).not.toMatch(/Lieferant/);
  });

  it("Push vom Server: Felix’ geschäftliche Termine erinnern nur Felix", () => {
    const row = (id: string, raum: string, besitzer: string): PushEntryRow => ({
      household_id: "hh",
      id,
      typ: "termin",
      raum,
      besitzer,
      erstellt: `${HEUTE}T06:00:00.000Z`,
      geaendert: `${HEUTE}T06:00:00.000Z`,
      data: { id, typ: "termin", raum, besitzer, data: { title: id, date: HEUTE, start: "12:00", reminder: "30" } },
    });
    const abos = [
      { id: "F", user_id: "felix", household_id: "hh", settings: {} },
      { id: "L", user_id: "lisa", household_id: "hh", settings: {} },
    ];
    const plan = (rows: PushEntryRow[]) => planPushes({ abos, rows, today: HEUTE, minute: 11 * 60 + 31, nowMs: Date.parse(`${HEUTE}T11:31:00+01:00`), sent: new Set(), proactiveToday: new Set() });
    expect(plan([row("Lieferant", "arbeit", "felix")]).map((m) => m.aboId)).toEqual(["F"]);
    expect(plan([row("Therapie", "ich", "felix")]).map((m) => m.aboId)).toEqual(["F"]);
    expect(plan([row("Kita-Fest", "familie", "felix")]).map((m) => m.aboId).sort()).toEqual(["F", "L"]);
  });
});

describe("Datenbank und Doku", () => {
  it("keine Migration für einen Raum „ich“ (nie ausgeliefert), die Pinnwand-Migration bleibt", () => {
    const files = readdirSync("supabase/migrations");
    expect(files.some((f) => f.includes("raum_ich"))).toBe(false);
    expect(files.some((f) => f.startsWith("20261031120000"))).toBe(true);
    expect(existsSync("tests/datenbank/raumIch.test.sql")).toBe(false);
  });

  it("Leitbild und Datenkarte: zwei Räume, „Geschäftlich“ nur du", () => {
    const leitbild = src("CLAUDE.md");
    expect(leitbild).toMatch(/„Geschäftlich“/);
    expect(leitbild).not.toMatch(/„Ich“ = nur ich/);
    expect(src("docs/datenschutz/datenkarte.md")).toMatch(/„Geschäftlich“/);
    expect(src("src/lib/datenschutz/rechtstexte.ts")).toMatch(/„Geschäftlich“ nur du/);
  });
});
