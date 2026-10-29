// Durchatmen (A-051): Vorschlag nach Tageszeit (Lieblinge öfter), Art und
// Lieblinge pro Gerät gemerkt (Speicher-Verzeichnis, Sicherung), leises
// Angebot höchstens 2× am Tag und nie nachts (nie Push), „Eine Sache“ legt die
// Aufgabe ganz oben an, „Kopf leeren“ ohne KI sortiert, Mia versteht die Sätze,
// Baustein standardmäßig an (auch nach dem Update).
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, aufgabe, fakeWindow, jetztInput, noBrowser } from "../helpers";
import { setNowForTests } from "@/lib/core/now";
import { STORAGE, BACKUP_KEYS } from "@/lib/core/storage";
import { kreisText, tageszeitSorte, vorschlag } from "@/lib/durchatmen/vorschlag";
import { durchatmenAngebot, type AngebotLage } from "@/lib/durchatmen/angebot";
import { durchatmenAusSatz, durchatmenBefehl } from "@/lib/durchatmen/erkennen";
import { eineSacheEintrag, eineSacheTitel, gedanken, kopfLeerenOhneKi } from "@/lib/durchatmen/fokus";
import { migrateDurchatmen, START } from "@/lib/durchatmen/store";
import { uebungVon } from "@/lib/durchatmen/uebungen";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { taskOverview } from "@/lib/kalender/model";
import { guessRoom } from "@/lib/kalender/raum/raten";
import { sofortErkennen, type SofortKontext } from "@/lib/begleitung/sofort/erkennen";

const berlin = (iso: string) => new Date(`${iso}:00+01:00`);

afterEach(() => {
  setNowForTests(null);
  noBrowser();
});

describe("Vorschlag nach Tageszeit", () => {
  it("morgens Fokus, nachmittags Augen, abends und nachts Atmen", () => {
    expect(tageszeitSorte(8 * 60)).toBe("fokus");
    expect(tageszeitSorte(15 * 60)).toBe("augen");
    expect(tageszeitSorte(19 * 60)).toBe("atmen");
    expect(tageszeitSorte(2 * 60)).toBe("atmen");
    for (const tag of ["2026-10-28", "2026-10-29", "2026-10-30", "2026-11-02"]) {
      expect(uebungVon(vorschlag(berlin(`${tag}T08:15`)).id)!.sorte).toBe("fokus");
      expect(uebungVon(vorschlag(berlin(`${tag}T15:30`)).id)!.sorte).toBe("augen");
      expect(uebungVon(vorschlag(berlin(`${tag}T20:10`)).id)!.sorte).toBe("atmen");
    }
  });

  it("fest je Tag und Abschnitt (Kreis, Fenster, Jetzt-Karte zeigen dasselbe)", () => {
    expect(vorschlag(berlin("2026-10-29T15:01")).id).toBe(vorschlag(berlin("2026-10-29T15:20")).id);
  });

  it("Lieblinge kommen öfter dran – auch aus anderen Sorten", () => {
    const zaehlen = (lieblinge: string[]) => {
      const n: Record<string, number> = {};
      for (let d = 1; d <= 28; d++)
        for (const zeit of ["08:10", "09:40", "12:10", "13:40", "15:10", "18:10", "19:40", "21:10"]) {
          const id = vorschlag(berlin(`2026-11-${String(d).padStart(2, "0")}T${zeit}`), lieblinge).id;
          n[id] = (n[id] ?? 0) + 1;
        }
      return n;
    };
    const ohne = zaehlen([]);
    const mit = zaehlen(["fuesse"]);
    expect(ohne.fuesse ?? 0).toBe(0);
    expect(mit.fuesse).toBeGreaterThan(40);
    const mitSeufzer = zaehlen(["seufzer"]);
    expect(mitSeufzer.seufzer).toBeGreaterThan(ohne.seufzer ?? 0);
  });

  it("Kreis auf der Startseite: „1 Min“ / „Handy-Pause“", () => {
    expect(kreisText(uebungVon("handy-pause")!)).toEqual(["1 Min", "Handy-Pause"]);
    expect(kreisText(uebungVon("seufzer")!)).toEqual(["30 s", "Seufzer"]);
  });
});

describe("Art und Lieblinge pro Gerät", () => {
  beforeEach(() => vi.resetModules());

  it("im Speicher-Verzeichnis mit Version, in der Sicherung", () => {
    const def = STORAGE.find((s) => s.key === "wasgibts.durchatmen");
    expect(def).toMatchObject({ version: 1, area: "local", backup: true });
    expect(BACKUP_KEYS).toContain("wasgibts.durchatmen");
  });

  it("Standard „Stimme + Klang“, Art gemerkt, Lieblinge an/aus, Stumm-Hinweis einmal", async () => {
    const w = fakeWindow();
    const s = await import("@/lib/durchatmen/store");
    expect(s.loadDurchatmen()).toEqual(START);
    expect(START.art).toBe("stimme");
    s.setArt("klang");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.durchatmen")!).art).toBe("klang");
    vi.resetModules();
    const neu = await import("@/lib/durchatmen/store");
    expect(neu.loadDurchatmen().art).toBe("klang");
    expect(neu.lieblingUmschalten("seufzer")).toBe(true);
    expect(neu.lieblingUmschalten("fuesse")).toBe(true);
    expect(neu.lieblingUmschalten("seufzer")).toBe(false);
    expect(neu.loadDurchatmen().lieblinge).toEqual(["fuesse"]);
    neu.stummHinweisGesehen();
    expect(neu.loadDurchatmen().stummHinweis).toBe(true);
  });

  it("Migration: Unbekanntes fällt raus, kaputt = Standard", () => {
    expect(migrateDurchatmen({ version: 1, art: "laut", lieblinge: ["seufzer", "quatsch", 3, "seufzer"], angebot: false })).toMatchObject({ art: "stimme", lieblinge: ["seufzer"], angebot: false, stummHinweis: false });
    expect(migrateDurchatmen(null)).toBeNull();
    expect(migrateDurchatmen({ angebote: { tag: "2026-10-29", anlaesse: ["a", "b", "c"] } })?.angebote.anlaesse).toEqual(["a", "b"]);
  });
});

describe("Leises Angebot in der Jetzt-Karte", () => {
  const lage = (extra: Partial<AngebotLage> = {}): AngebotLage => ({ heute: "2026-10-29", minuten: 15 * 60, an: true, gezeigt: { tag: "", anlaesse: [] }, termine: [], ...extra });
  const termine = [
    { start: 9 * 60, ende: 10 * 60 },
    { start: 10 * 60 + 15, ende: 11 * 60 },
    { start: 11 * 60, ende: 12 * 60 },
  ];

  it("nach drei Terminen am Stück oder im Nachmittagstief – sonst nichts", () => {
    expect(durchatmenAngebot(lage())).toBe("nachmittag");
    expect(durchatmenAngebot(lage({ minuten: 12 * 60 + 20, termine }))).toBe("termine:720");
    expect(durchatmenAngebot(lage({ minuten: 12 * 60 + 20, termine: termine.slice(0, 2) }))).toBeNull();
    expect(durchatmenAngebot(lage({ minuten: 14 * 60, termine }))).toBeNull();
    // Lücke über 20 Minuten = kein „am Stück“
    expect(durchatmenAngebot(lage({ minuten: 12 * 60 + 20, termine: [termine[0], { start: 10 * 60 + 40, ende: 11 * 60 }, termine[2]] }))).toBeNull();
    expect(durchatmenAngebot(lage({ minuten: 10 * 60 }))).toBeNull();
  });

  it("höchstens 2× am Tag (zwei Anlässe), am nächsten Tag wieder", () => {
    const zwei = { tag: "2026-10-29", anlaesse: ["termine:720", "termine:840"] };
    expect(durchatmenAngebot(lage({ gezeigt: zwei }))).toBeNull();
    // ein Anlass, der schon stand, darf stehen bleiben
    expect(durchatmenAngebot(lage({ minuten: 12 * 60 + 30, termine, gezeigt: zwei }))).toBe("termine:720");
    expect(durchatmenAngebot(lage({ gezeigt: { tag: "2026-10-29", anlaesse: ["termine:720"] } }))).toBe("nachmittag");
    expect(durchatmenAngebot(lage({ heute: "2026-10-30", gezeigt: zwei }))).toBe("nachmittag");
  });

  it("nie nachts, abschaltbar", () => {
    for (const m of [0, 3 * 60, 6 * 60 + 59, 21 * 60, 23 * 60]) expect(durchatmenAngebot(lage({ minuten: m, termine: [{ start: m - 200, ende: m - 140 }, { start: m - 130, ende: m - 70 }, { start: m - 60, ende: m - 5 }] }))).toBeNull();
    expect(durchatmenAngebot(lage({ an: false }))).toBeNull();
  });

  it("mehrfach am Tag abgefragt: der Speicher zählt höchstens 2 Anlässe", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-29T12:30");
    const s = await import("@/lib/durchatmen/store");
    let gezeigt = 0;
    for (let m = 7 * 60; m < 21 * 60; m += 10) {
      const a = durchatmenAngebot({ ...lage({ minuten: m, termine: [...termine, { start: 13 * 60, ende: 14 * 60 }, { start: 14 * 60, ende: 15 * 60 }, { start: 15 * 60 + 10, ende: 16 * 60 }] }), gezeigt: s.loadDurchatmen().angebote });
      if (a && !s.loadDurchatmen().angebote.anlaesse.includes(a)) gezeigt++;
      if (a) s.angebotGezeigt(a, "2026-10-29");
    }
    expect(gezeigt).toBe(2);
    expect(s.loadDurchatmen().angebote.anlaesse).toHaveLength(2);
  });

  it("Jetzt-Karte: leiser Satz, nie nachts, höchstens 3 Themen, Antippen öffnet das Fenster", () => {
    const atem = { anlass: "nachmittag", detail: "1 Min · Handy-Pause" };
    const t = jetztTopics(jetztInput(15 * 60, { durchatmen: atem })).find((x) => x.kind === "durchatmen");
    expect(t).toMatchObject({ title: "Kurz durchatmen?", detail: "1 Min · Handy-Pause", target: { action: "durchatmen" } });
    expect(jetztTopics(jetztInput(23 * 60, { durchatmen: atem })).some((x) => x.kind === "durchatmen")).toBe(false);
    // Wichtigeres geht vor: mit drei anderen Themen bleibt es weg
    const voll = jetztTopics(jetztInput(15 * 60 + 30, { durchatmen: atem, reminder: { key: "r", text: "Paket" }, timer: { name: "Tee", left: "3:00" }, tiles: [], cookingStep: "Wasser aufsetzen" }));
    expect(voll).toHaveLength(3);
    expect(voll.some((x) => x.kind === "durchatmen")).toBe(false);
    // Feierabend/Wochenende: sanft genug
    expect(jetztTopics(jetztInput(15 * 60, { durchatmen: atem, calm: true })).some((x) => x.kind === "durchatmen")).toBe(true);
  });

  it("nie als Mitteilung (Push kennt Durchatmen nicht)", () => {
    for (const f of ["src/lib/heute/push.ts", "src/lib/heute/mitteilungen/einstellungen.ts", "public/sw.js"]) expect(readFileSync(f, "utf8").includes("Kurz durchatmen"), f).toBe(false);
    expect(readFileSync("src/lib/heute/push.ts", "utf8")).not.toMatch(/durchatmen/i);
  });
});

describe("„Eine Sache“ und „Kopf leeren“", () => {
  beforeEach(() => at("2026-10-29T08:15"));

  it("„Eine Sache“ legt die Aufgabe heute ganz oben an, Raum geraten", () => {
    const vorher = [aufgabe({ title: "Steuer machen", date: "2026-10-28" }, "ich"), aufgabe({ title: "Kita-Formular", date: "2026-10-28", dringend: true }), aufgabe({ title: "Blumen gießen" }, "ich")];
    const e = eineSacheEintrag("Das Angebot für Edeka fertig machen.", { today: "2026-10-29", entries: vorher })!;
    expect(e.typ).toBe("aufgabe");
    expect(e.data).toMatchObject({ title: "Angebot für Edeka fertig machen", date: "2026-10-29", dringend: true });
    const liste = taskOverview([e, ...vorher], "2026-10-29").heute;
    expect(liste[0].title).toBe("Angebot für Edeka fertig machen");
    expect(liste).toHaveLength(4);
    // Raum wie überall geraten: Arbeit aus dem Inhalt, sonst Aufgaben „Ich“
    expect(eineSacheEintrag("Kunden anrufen wegen Angebot", { today: "2026-10-29", entries: [] })!.raum).toBe("arbeit");
    expect(eineSacheEintrag("Geschenk für Oma", { today: "2026-10-29", entries: [] })!.raum).toBe(guessRoom("Geschenk für Oma", "aufgabe"));
    expect(eineSacheEintrag("Steuer machen", { today: "2026-10-29", entries: [] })!.raum).toBe("ich");
    expect(eineSacheEintrag("  ", { today: "2026-10-29", entries: [] })).toBeNull();
    expect(eineSacheTitel("äh also erst mal die Steuer", "2026-10-29")).toBe("Steuer");
  });

  it("Die App legt sie über das Speicher-Verzeichnis an (changeEntries), ganz vorn", () => {
    const code = readFileSync("src/components/durchatmen/FokusGespraech.tsx", "utf8");
    expect(code).toMatch(/changeEntries\(\(list\) => \[e, \.\.\.list\]\)/);
    expect(code).toContain("Steht oben");
  });

  const ctx: SofortKontext = { today: "2026-10-29", nowMinutes: 8 * 60 + 15, persons: [{ id: "p1", name: "Felix" }, { id: "p2", name: "Lisa" }], laeden: [], weekStart: "2026-10-26", aufDerListe: [], entries: [] };

  it("„Kopf leeren“ ohne KI: Termin, Aufgabe, Einkauf erkannt, der Rest als EINE Notiz", () => {
    const ops = kopfLeerenOhneKi("Zahnarzt Freitag 10 Uhr und Steuerberater anrufen. Milch auf die Liste\nGeschenk für Oma überlegen. Irgendwie ist alles viel gerade", ctx);
    const arten = ops.map((o) => o.type);
    expect(arten.filter((a) => a === "upsert_entry")).toHaveLength(2);
    expect(arten).toContain("add_shopping");
    const notizen = ops.filter((o) => o.type === "upsert_note");
    expect(notizen).toHaveLength(1);
    expect(notizen[0].type === "upsert_note" && notizen[0].note.data).toMatchObject({ title: "Aus dem Kopf" });
    expect(new Set(ops.map((o) => o.id)).size).toBe(ops.length);
    expect(gedanken("Eins. Zwei!\nDrei;vier")).toEqual(["Eins", "Zwei", "Drei", "vier"]);
    expect(kopfLeerenOhneKi("", ctx)).toEqual([]);
  });
});

describe("Mia versteht Durchatmen", () => {
  it.each([
    ["Ich brauch kurz Ruhe", "lang-aus"],
    ["ich bräuchte mal kurz ein bisschen Ruhe", "lang-aus"],
    ["Atemübung", "lang-aus"],
    ["Mach mit mir eine Atemübung", "lang-aus"],
    ["Handy-Pause", "handy-pause"],
    ["Zeit für ne Bildschirmpause", "handy-pause"],
    ["Kopf leeren", "kopf-leeren"],
    ["Ich muss mal meinen Kopf frei kriegen", "kopf-leeren"],
    ["Was ist jetzt wichtig?", "eine-sache"],
    ["Was ist gerade am wichtigsten?", "eine-sache"],
    ["Kästchen-Atmen bitte", "kaestchen"],
    ["Kurz durchatmen", "vorschlag"],
    ["Durchatmen: seufzer", "seufzer"],
    ["Durchatmen: Handy-Pause", "handy-pause"],
  ])("„%s“ → %s", (satz, id) => {
    expect(durchatmenAusSatz(satz)).toBe(id);
  });

  it.each(["Lass mich in Ruhe", "Wir machen Pause bis Sonntag", "Ruhezeit 20 Uhr", "Milch auf die Liste", "Was steht heute an?", "Wir fahren in den Urlaub", "Timer stoppen"])("nicht: „%s“", (satz) => {
    expect(durchatmenAusSatz(satz)).toBeNull();
  });

  it("Sofort-Weg nur für eindeutige Kurzbefehle (keine Frage), startet per App-Befehl", () => {
    expect(durchatmenBefehl("Was ist jetzt wichtig?")).toBeNull();
    const ctx: SofortKontext = { today: "2026-10-29", nowMinutes: 600, persons: [], laeden: [], weekStart: "2026-10-26", aufDerListe: [], entries: [] };
    expect(sofortErkennen("Handy-Pause", ctx)).toMatchObject({ art: "durchatmen", ops: [{ type: "app_command", text: "Durchatmen: handy-pause" }], reply: "Handy weg. Ich sag Bescheid." });
    expect(sofortErkennen("Atemübung nicht jetzt", ctx)).toBeNull();
  });

  it("App-Befehl startet die Übung sofort (Bühne geht zu), versteckt → freigeschaltet", async () => {
    fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 7, on: ["notizen"], launch: true, imHaus: true }) });
    vi.resetModules();
    const client = await import("@/lib/begleitung/client");
    const oeffnen = await import("@/lib/durchatmen/oeffnen");
    const f = await import("@/lib/core/features");
    const gestartet: string[] = [];
    oeffnen.onDurchatmenStart((id) => gestartet.push(id));
    const r = client.runInstantOps([{ id: "1", type: "app_command", text: "Kopf leeren" }]);
    expect(r.rest).toEqual([]);
    expect(gestartet).toEqual(["kopf-leeren"]);
    expect(oeffnen.durchatmenZustand()).toMatchObject({ uebung: "kopf-leeren", fenster: false });
    expect(f.featureOn("durchatmen")).toBe(true);
    expect(r.notes.join(" ")).toContain("Durchatmen");
    // Andere App-Befehle bleiben für die Vorschau
    expect(client.runInstantOps([{ id: "2", type: "app_command", text: "Mach die Ansicht dunkel" }]).rest).toHaveLength(1);
  });

  it("Werkzeug-Beschreibung und Testmodus kennen die Sätze", async () => {
    expect(readFileSync("src/lib/begleitung/homeTools.ts", "utf8")).toMatch(/Durchatmen \(kurze Übung, startet sofort\): 'Ich brauch kurz Ruhe', 'Atemübung', 'Handy-Pause', 'Kopf leeren', 'Was ist jetzt wichtig\?'/);
    expect(readFileSync("src/lib/begleitung/mockAlltag.ts", "utf8")).toMatch(/if \(durchatmenAusSatz\(latest\)\) return tools\(\[\{ name: "app_befehl"/);
  });
});

describe("Baustein „durchatmen“", () => {
  beforeEach(() => vi.resetModules());

  it("neu: an; nach dem Update (v6 gespeichert) einmal an; danach selbst abschaltbar", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    expect(f.featureOn("durchatmen")).toBe(true);
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 6, on: ["notizen"], launch: true, imHaus: true }) });
    vi.resetModules();
    const g = await import("@/lib/core/features");
    expect(g.featureOn("durchatmen")).toBe(true);
    g.setFeature("durchatmen", false);
    vi.resetModules();
    const h = await import("@/lib/core/features");
    expect(h.featureOn("durchatmen")).toBe(false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!).version).toBe(7);
  });

  it("steht in „Mehr Funktionen“, nicht im Launch-Aus", async () => {
    const f = await import("@/lib/core/features");
    expect(f.bausteinOf("durchatmen")).toMatchObject({ name: "Durchatmen", icon: "wind" });
    expect(f.LAUNCH_AUS).not.toContain("durchatmen");
  });
});
