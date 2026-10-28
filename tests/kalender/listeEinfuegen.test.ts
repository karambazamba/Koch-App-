// „Liste einfügen“: Zeilen bereinigen (alle Kästchen-/Aufzählungsformen),
// Abgehaktes weglassen, Fristen, Überschriften → Listen, Doppelte.
import { describe, expect, it } from "vitest";
import { listeAusChat, cleanLine, hatDatum, isHeading, listSummary, looksLikeList, readPastedList, splitDuplicates, toAufgaben } from "@/lib/kalender/liste/einfuegen";
import { at, aufgabe } from "../helpers";
import { listenAnsicht } from "@/lib/kalender/liste/ordnung";
import { fuerHeute, migrateVorschlag, wochenVorschlag } from "@/lib/kalender/liste/vorschlag";
import { taskOverview, type CalendarEntry } from "@/lib/kalender/model";

const T = "2026-10-21"; // Mittwoch

describe("Zeilen bereinigen", () => {
  it("Kästchen, Striche, Punkte, Nummern fallen weg", () => {
    for (const raw of [
      "☐ Müll rausbringen",
      "- [ ] Müll rausbringen",
      "* Müll rausbringen",
      "• Müll rausbringen",
      "1. Müll rausbringen",
      "2) Müll rausbringen",
      "– Müll rausbringen",
      "[ ] Müll rausbringen",
      "  ○ Müll rausbringen",
    ]) {
      expect(cleanLine(raw)).toEqual({ text: "Müll rausbringen", done: false });
    }
  });
  it("Abgehaktes und Durchgestrichenes erkannt, Leeres weg", () => {
    for (const raw of ["☑ Steuer", "- [x] Steuer", "[X] Steuer", "✓ Steuer", "✅ Steuer", "~~Steuer~~", "S̶t̶e̶u̶e̶r̶"]) expect(cleanLine(raw)?.done).toBe(true);
    expect(cleanLine("")).toBeNull();
    expect(cleanLine("   -   ")).toBeNull();
    expect(cleanLine("123")).toBeNull();
  });
  it("Überschriften", () => {
    expect(isHeading("Haus:")).toBe(true);
    expect(isHeading("KINDER")).toBe(true);
    expect(isHeading("## Arbeit")).toBe(true);
    expect(isHeading("- Haus:")).toBe(false);
    expect(isHeading("Müll rausbringen")).toBe(false);
    expect(isHeading("TÜV")).toBe(true);
    expect(isHeading("OK")).toBe(false);
  });
});

describe("Liste lesen", () => {
  const text = [
    "HAUS",
    "☐ Dachrinne sauber machen",
    "- [ ] Steuer bis Freitag",
    "☑ Fenster putzen",
    "",
    "Arbeit:",
    "* Angebot schreiben bis 28.10.",
    "• Präsentation nächste Woche",
    "Kinder:",
    "1. Turnbeutel morgen waschen",
    "2. Laternen basteln",
  ].join("\n");
  const r = readPastedList(text, T);
  it("Listen aus Überschriften, Arbeit wird Arbeit", () => {
    expect(r.zeilen.map((z) => [z.title, z.liste, z.raum])).toEqual([
      ["Dachrinne sauber machen", "Haus", "familie"],
      ["Steuer", "Haus", "familie"],
      ["Angebot schreiben", "Arbeit", "arbeit"],
      ["Präsentation", "Arbeit", "arbeit"],
      ["Turnbeutel waschen", "Kinder", "familie"],
      ["Laternen basteln", "Kinder", "familie"],
    ]);
    expect(r.abgehakt).toBe(1);
  });
  it("Fristen und Tage wie beim Eintragen", () => {
    expect(r.zeilen[1].data).toEqual({ due: "2026-10-23" });
    expect(r.zeilen[2].data).toEqual({ due: "2026-10-28" });
    // „nächste Woche“ = ab Montag (alles ist heute, Tafel 103)
    expect(r.zeilen[3].data).toEqual({ date: "2026-10-26" });
    expect(r.zeilen[4].data).toEqual({ date: "2026-10-22" });
    expect(r.zeilen[0].data).toEqual({});
    expect(r.zeilen.filter(hatDatum)).toHaveLength(4);
  });
  it("Zusammenfassung", () => {
    expect(listSummary(r.zeilen)).toBe("6 Aufgaben gefunden · 4 mit Datum · 3 Listen (Haus, Arbeit, Kinder)");
    expect(listSummary(readPastedList("Milch\nBrot", T).zeilen)).toBe("2 Aufgaben gefunden");
  });
  it("sieht nach Liste aus ab 3 Zeilen", () => {
    expect(looksLikeList(text)).toBe(true);
    expect(looksLikeList("Ich muss noch\nwas machen")).toBe(false);
  });
  it("30 Zeilen", () => {
    const lang = Array.from({ length: 30 }, (_, i) => `- [ ] Sache ${i + 1}${i % 10 === 0 ? " bis Freitag" : ""}`).join("\n");
    const l = readPastedList(lang, T);
    expect(l.zeilen).toHaveLength(30);
    expect(listSummary(l.zeilen)).toBe("30 Aufgaben gefunden · 3 mit Datum");
  });
});

describe("Doppelte und Anlegen", () => {
  it("gleicher Text + gleiche Liste + offen = schon vorhanden; auch doppelt im Text", () => {
    const zeilen = readPastedList("Haus:\nDachrinne sauber machen\nSteuer\nSteuer\nKinder:\nSteuer", T).zeilen;
    const vorhanden = aufgabe({ title: "dachrinne sauber machen!", liste: "Haus" });
    const erledigt = aufgabe({ title: "Steuer", liste: "Haus", doneOn: "2026-10-01" });
    const r = splitDuplicates(zeilen, [vorhanden, erledigt]);
    expect(r.vorhanden).toBe(2);
    expect(r.neu.map((z) => `${z.liste}/${z.title}`)).toEqual(["Haus/Steuer", "Kinder/Steuer"]);
  });
  it("als Aufgaben mit Liste und Frist", () => {
    const [a] = toAufgaben(readPastedList("Haus:\nSteuer bis Freitag", T).zeilen, "u-felix");
    expect(a).toMatchObject({ typ: "aufgabe", raum: "familie", besitzer: "u-felix", data: { title: "Steuer", due: "2026-10-23", liste: "Haus", reminder: "aus" } });
  });
});

describe("Im Gespräch", () => {
  it("Einleitung weg, Liste bleibt; nur der Satz öffnet leer; sonst nichts", () => {
    expect(listeAusChat("Ich hab hier meine To-do-Liste:\n- Müll\n- Steuer\n- Fenster")).toBe("- Müll\n- Steuer\n- Fenster");
    expect(listeAusChat("Haus:\nMüll\nSteuer\nFenster")).toBe("Haus:\nMüll\nSteuer\nFenster");
    expect(listeAusChat("Ich hab hier meine To-do-Liste")).toBe("");
    expect(listeAusChat("Milch auf die Liste")).toBeNull();
    expect(listeAusChat("Was steht heute an?")).toBeNull();
  });
});

describe("Ordnung: importiert wird alles, angezeigt, was jetzt dran ist", () => {
  const lang = ["Haus:", ...Array.from({ length: 14 }, (_, i) => `Haus-Sache ${i + 1}`), "Kinder:", "Turnbeutel morgen waschen", ...Array.from({ length: 12 }, (_, i) => `Kinder-Sache ${i + 1}`), "Arbeit:", "Angebot bis Freitag", "Präsentation nächste Woche"].join("\n");
  const entries = () => toAufgaben(readPastedList(lang, T).zeilen) as CalendarEntry[];
  it("die eine Liste zeigt nur, was einen Tag, eine Frist hat oder dringend ist; der Rest bleibt in den Listen", () => {
    at("2026-10-21T09:00");
    const a = listenAnsicht(taskOverview(entries(), T).heute);
    expect(a.jetzt.map((i) => i.title)).toEqual(["Angebot"]);
    expect(a.listen.map((l) => `${l.name} · ${l.items.length}`)).toEqual(["Haus · 14", "Kinder · 12"]);
    // Ab morgen steht der Turnbeutel in der Liste, ab Montag die Präsentation
    expect(listenAnsicht(taskOverview(entries(), "2026-10-22").heute).jetzt.map((i) => i.title)).toEqual(["Turnbeutel waschen", "Angebot"]);
    expect(taskOverview(entries(), T).geplant.map((i) => i.title)).toEqual(["Turnbeutel waschen", "Präsentation"]);
  });
  it("ohne Listen bleibt die eine Liste, wie sie ist", () => {
    const a = listenAnsicht(taskOverview([aufgabe({ title: "Müll" })], T).heute);
    expect(a.jetzt.map((i) => i.title)).toEqual(["Müll"]);
    expect(a.listen).toEqual([]);
  });
});

describe("Vorschlag „Drei für heute?“: höchstens einmal pro Woche, nicht in den ersten 3 Tagen", () => {
  // Neun in der Liste „Haus“ geparkt; Sache 1 ist dringend und steht deshalb schon in der einen Liste
  const viele = (stamp: string) => Array.from({ length: 10 }, (_, i) => ({ ...aufgabe({ title: `Sache ${i}`, liste: "Haus", ...(i === 1 ? { dringend: true } : {}) }), erstellt: `${stamp}T08:0${i}:00.000Z` }) as CalendarEntry);
  it("frisch eingefügt: noch nicht; nach 3 Tagen: die ältesten aus den Listen", () => {
    expect(wochenVorschlag(viele("2026-10-20"), T, { version: 1 })).toBeNull();
    expect(wochenVorschlag(viele("2026-10-18"), T, { version: 1 })?.map((i) => i.title)).toEqual(["Sache 0", "Sache 2", "Sache 3"]);
  });
  it("„Nicht jetzt“ = Ruhe bis nächste Woche; wenige in den Listen = nie", () => {
    expect(wochenVorschlag(viele("2026-10-18"), T, { version: 1, weekOff: "2026-10-19" })).toBeNull();
    expect(wochenVorschlag(viele("2026-10-18"), "2026-10-26", { version: 1, weekOff: "2026-10-19" })).not.toBeNull();
    expect(wochenVorschlag(viele("2026-10-18").slice(0, 5), T, { version: 1 })).toBeNull();
    expect(migrateVorschlag({ version: 1, weekOff: "x" })).toEqual({ version: 1 });
    expect(migrateVorschlag(null)).toBeNull();
  });
  it("Übernehmen holt sie für heute in die eine Liste", () => {
    at("2026-10-21T09:00");
    const list = viele("2026-10-18");
    const next = fuerHeute(list, [list[0].id], T, "2026-10-21T10:00:00.000Z");
    expect(next[0].data).toMatchObject({ date: T, liste: "Haus" });
    expect(next[2]).toBe(list[2]);
    expect(listenAnsicht(taskOverview(next, T).heute).jetzt.map((i) => i.title)).toEqual(["Sache 1", "Sache 0"]);
  });
});
