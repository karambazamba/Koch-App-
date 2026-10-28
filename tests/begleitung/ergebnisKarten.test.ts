// Mias Ergebnis-Karten wie im Clip (A-037, Tafel 126) und Aufleuchten in der
// Kachel: „Freitag 16 Uhr Zahnarzt mit Jonne. Und wir brauchen Milch.“ im
// Testmodus → zwei Karten (Termin · Familie, Einkauf · für alle), EIN
// „Rückgängig“ nimmt beide zurück; 1 → 1 Karte; 6 → 4 + „und 2 weitere“;
// große Dinge als dieselbe Karte mit „Übernehmen“; Aufleuchten nur einmal.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import { runAssistant } from "@/lib/begleitung/engine";
import { createMockModel } from "@/lib/begleitung/mock";
import { createPerson } from "@/lib/einstellungen/profile";
import { PRUEF_HEUTE, PRUEF_UHR, pruefHaushalt } from "@/lib/begleitung/pruefstand/haushalt";
import { ERGEBNIS_MAX, ergebnisse, ergebnisSummary, leuchtZiele, nachUebernehmen, sichtbareErgebnisse, unterzeile, vorschauAlsKarten, weitereText } from "@/lib/begleitung/ergebnis";
import { buehneGeoeffnet, geleuchtet, leuchtenJetzt, leuchtenMerken, leuchtenVergessen, leuchtenZuruecksetzen, leuchtSchluessel } from "@/lib/heute/aufleuchten";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import { aufgabe, termin, WOCHEN } from "./werkzeugKontext";

const SATZ = "Freitag 16 Uhr Zahnarzt mit Jonne. Und wir brauchen Milch.";
const read = (f: string) => readFileSync(f, "utf8");

/** Prüf-Haushalt mit Jonne (Kind) wie im Clip, ohne den schon eingetragenen Zahnarzt */
function familie(): AssistantData {
  const d = pruefHaushalt(["ohne-zahnarzt"]);
  return { ...d, profile: { ...d.profile, persons: [...d.profile.persons, { ...createPerson("kind"), id: "p-jonne", name: "Jonne", age: 6 }], kids: 2 } };
}
const fragen = (text: string, data = familie()) =>
  runAssistant({ deviceId: "test", today: PRUEF_HEUTE, clock: PRUEF_UHR, messages: [{ role: "user", text }], pending: [], data }, createMockModel(), "mock");

const shop = (name: string): ChangeOp => ({ id: `s-${name}`, type: "add_shopping", weekStart: WOCHEN.aktuell, name, amount: "", section: "sonstiges" }) as ChangeOp;

describe("Ergebnis-Karten aus dem Testmodus", () => {
  it("zwei Sätze → zwei Karten: Termin · Familie und Einkauf · für alle", async () => {
    const reply = await fragen(SATZ);
    expect(reply.ops.map((o) => o.type)).toEqual(["upsert_entry", "add_shopping"]);
    const karten = ergebnisse(reply.ops);
    expect(karten.map((k) => [k.text, unterzeile(k, k.raum === "familie" ? "Familie" : k.raum), k.pille])).toEqual([
      ["Fr 16:00 Zahnarzt mit Jonne", "Termin · Familie", "Eingetragen"],
      ["Milch", "Einkauf · für alle", "Steht drauf"],
    ]);
    expect(karten.map((k) => k.kachel)).toEqual(["termine", "einkauf"]);
    expect(karten[0].eintragId).toBeTruthy();
    expect(ergebnisSummary(karten)).toBe("Termin: Fr 16:00 Zahnarzt mit Jonne; Einkauf: Milch");
  });

  it("„nur für mich“ bleibt Ich – auch mit Kind", async () => {
    const reply = await fragen("Freitag 16 Uhr Zahnarzt mit Jonne, nur für mich");
    const op = reply.ops.find((o) => o.type === "upsert_entry");
    expect(op && op.type === "upsert_entry" && op.entry.raum).toBe("ich");
  });

  it("eine Sache → eine Karte", async () => {
    const reply = await fragen("Wir brauchen Milch");
    expect(ergebnisse(reply.ops).map((k) => k.text)).toEqual(["Milch"]);
  });

  it("nur wenn JEDER Satz etwas einträgt, gehen die Sätze einzeln", async () => {
    const reply = await fragen("Wir brauchen Milch. Wie wird das Wetter?");
    expect(reply.ops.filter((o) => o.type === "add_shopping")).toEqual([]);
  });
});

describe("Karten: Inhalt, Anzahl, Vorschau", () => {
  it("sechs Sachen → 4 Karten und „und 2 weitere“, aufgeklappt alle", () => {
    const karten = ergebnisse(["Milch", "Brot", "Eier", "Butter", "Käse", "Äpfel"].map(shop));
    expect(ERGEBNIS_MAX).toBe(4);
    const zu = sichtbareErgebnisse(karten, false);
    expect(zu.zeigen.map((k) => k.text)).toEqual(["Milch", "Brot", "Eier", "Butter"]);
    expect(weitereText(zu.weitere)).toBe("und 2 weitere");
    expect(sichtbareErgebnisse(karten, true)).toMatchObject({ weitere: 0 });
    expect(sichtbareErgebnisse(karten, true).zeigen).toHaveLength(6);
    expect(sichtbareErgebnisse(karten.slice(0, 4), false).weitere).toBe(0);
  });

  it("doppelt Gesagtes nur einmal; jede Art mit eigener Pille und Kachelfarbe", () => {
    const ops: ChangeOp[] = [
      shop("Milch"),
      shop("milch"),
      { id: "p", type: "add_pin", text: "Bin um 20 Uhr da" },
      { id: "a", type: "upsert_entry", isNew: true, entry: aufgabe({ title: "Geschenk für Oma" }) },
      { id: "h", type: "add_pantry", name: "Hack", place: "kuehlschrank" } as ChangeOp,
      { id: "t", type: "set_jetzt", on: true } as ChangeOp,
    ];
    expect(ergebnisse(ops).map((k) => [k.art, k.kachel, k.pille])).toEqual([
      ["einkauf", "einkauf", "Steht drauf"],
      ["pinnwand", "pinnwand", "Hängt dran"],
      ["aufgabe", "aufgaben", "Eingetragen"],
      ["haus", "vorrat", "Notiert"],
    ]);
  });

  it("große Dinge: Vorschau als Karten nur bei neuen, einfachen Dingen; „Übernehmen“ macht eine Karte grün, zuletzt alle", () => {
    const ops: ChangeOp[] = [{ ...shop("Brötchen"), vorschlag: true } as ChangeOp, { id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Kino", date: "2026-10-23", start: "20:00" }) }];
    expect(vorschauAlsKarten(ops)).toBe(true);
    expect(vorschauAlsKarten([{ id: "t", type: "upsert_entry", isNew: false, entry: termin({ title: "Kino", date: "2026-10-23", start: "20:00" }) }])).toBe(false);
    expect(vorschauAlsKarten([{ id: "w", type: "set_meal", slot: { weekStart: WOCHEN.aktuell, weekday: "Montag" }, dish: { kind: "text", title: "Suppe", category: null } } as ChangeOp])).toBe(false);
    const p = { ops, selected: new Set(["s-Brötchen", "t"]) };
    const eins = nachUebernehmen(p, "t");
    expect(eins).toMatchObject({ uebernommen: ["t"] });
    expect([...eins!.selected]).toEqual(["s-Brötchen"]);
    expect(nachUebernehmen(eins!, "s-Brötchen")).toBeNull();
  });
});

describe("Rückgängig nimmt alle Karten einer Antwort zurück", () => {
  let local: Storage;
  beforeEach(async () => {
    local = memoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: local, sessionStorage: memoryStorage(), addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true, location: { search: "", pathname: "/", href: "http://localhost/" } };
    vi.resetModules();
    (await import("@/lib/core/now")).setNowForTests(new Date("2026-10-21T10:30:00+02:00"));
  });
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("Satz aus dem Clip: beide sofort (kein „Übernehmen“), ein Rückgängig – beide weg, „Mia hat schon …“ auch", async () => {
    const data = familie();
    const reply = await fragen(SATZ, data);
    const { isSafeOp, noteMiaDone, miaDoneOn } = await import("@/lib/begleitung/miaDone");
    const { commitOps } = await import("@/lib/begleitung/client");
    const { loadEntries } = await import("@/lib/kalender/store");
    expect(reply.ops.every(isSafeOp)).toBe(true);
    const r = commitOps({ ...data, entries: [] }, reply.ops, new Set(reply.ops.map((o) => o.id)), SATZ);
    noteMiaDone(reply.ops, r.undo);
    expect(loadEntries().map((e) => [e.data.title, e.raum])).toEqual([["Zahnarzt mit Jonne", "familie"]]);
    expect(local.getItem("wasgibts.einkaufsliste")).toMatch(/Milch/);
    expect(miaDoneOn("2026-10-21")).toHaveLength(2);
    r.undo();
    expect(loadEntries()).toEqual([]);
    expect(JSON.stringify(JSON.parse(local.getItem("wasgibts.einkaufsliste") ?? "{}").weeks ?? {})).not.toMatch(/Milch/);
  });

  it("die Karten tragen EIN „Rückgängig“ (10 s) statt einer Übersicht; danach in „Mia hat schon …“", () => {
    const karten = read("src/components/begleitung/ErgebnisKarten.tsx");
    expect(karten).toMatch(/const UNDO_MS = 10_000/);
    expect(karten.match(/>\s*Rückgängig\s*</g)).toHaveLength(1);
    expect(karten).toMatch(/VERSATZ_S = 0\.15/);
    expect(karten).toMatch(/<RaumZeile /);
    expect(karten).toMatch(/Übernehmen/);
    // nie abgeschnitten: kein line-clamp/truncate am Inhalt, Pille schrumpft aufs Häkchen
    expect(karten).not.toMatch(/line-clamp|truncate/);
    expect(karten).toMatch(/data-pille=\{kurz \? "kurz" : "lang"\}/);
    const item = read("src/components/begleitung/ChatTurnItem.tsx");
    expect(item).toMatch(/<ErgebnisKarten karten=\{turn\.ergebnisse\}/);
    expect(item).not.toMatch(/MiaDoneCard/);
    // Vorgelesen wird nur Mias Satz (turn.text), nie die Karten
    expect(read("src/components/begleitung/ChatHistory.tsx")).toMatch(/toggleSpeak\(turn\.text/);
    // Farben nur über Tokens
    expect(karten).toMatch(/var\(--app-tile-\$\{karte\.kachel\}\)/);
    expect(karten).toMatch(/bg-good-pill text-\[13px\] font-extrabold text-on-good-pill/);
    expect(karten).not.toMatch(/var\(--color-/);
  });
});

describe("Aufleuchten in der Kachel", () => {
  beforeEach(() => leuchtenZuruecksetzen());

  it("erst nach dem Schließen der Bühne, dann genau einmal", () => {
    const karten = ergebnisse([{ id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Zahnarzt", date: "2026-10-23", start: "16:00" }) }, shop("Milch")]);
    buehneGeoeffnet(true);
    leuchtenMerken(leuchtZiele(karten));
    expect(leuchtenJetzt()).toEqual([]);
    buehneGeoeffnet(false);
    expect(leuchtenJetzt().map((z) => z.kachel)).toEqual(["termine", "einkauf"]);
    expect(leuchtenJetzt()[1].schluessel).toBe(leuchtSchluessel("einkauf", "Milch"));
    geleuchtet(leuchtenJetzt());
    expect(leuchtenJetzt()).toEqual([]);
    buehneGeoeffnet(true);
    buehneGeoeffnet(false);
    expect(leuchtenJetzt()).toEqual([]);
  });

  it("doppelt gemerkt leuchtet einmal; Rückgängig vergisst es", () => {
    const ziele = leuchtZiele(ergebnisse([shop("Milch")]));
    leuchtenMerken(ziele);
    leuchtenMerken(ziele);
    expect(leuchtenJetzt()).toHaveLength(1);
    leuchtenVergessen(ziele);
    expect(leuchtenJetzt()).toEqual([]);
  });

  it("Schlüssel: klein, ohne Leerzeichen; Zeilen der Kacheln tragen sie", () => {
    expect(leuchtSchluessel("einkauf", " Frische Milch ")).toBe("einkauf:frische_milch");
    expect(read("src/components/heute/MiniCards.tsx")).toMatch(/data-leuchte=\{leuchtSchluessel\("eintrag", item\.entry\.id\)\}/);
    expect(read("src/components/heute/HomeTiles.tsx")).toMatch(/data-leuchte=\{names\.map\(\(n\) => leuchtSchluessel\("einkauf", n\)\)\.join\(" "\)\}/);
    expect(read("src/components/heute/HomeBoard.tsx")).toMatch(/useAufleuchten\(board, editing\)/);
  });

  it("weich und einmal: 1,5 s, nur opacity, reduzierte Bewegung nur kurz hervorgehoben", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\[data-leuchtet\]::after \{[^}]*box-shadow: var\(--app-leuchten\)[^}]*animation: leuchten 1\.5s cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
    expect(css).toMatch(/@keyframes leuchten \{ 0% \{ opacity: 0; \} 35% \{ opacity: 1; \} 100% \{ opacity: 0; \} \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ergebnis-karte \{ animation: ergebnis-fade[^}]*\}[\s\S]*?\[data-leuchtet\]::after \{ animation: leuchten-still/);
    expect(read("src/components/begleitung/KitchenHelper.tsx")).toMatch(/useEffect\(\(\) => buehneGeoeffnet\(open\), \[open\]\)/);
  });
});
