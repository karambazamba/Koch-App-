// Pinnwand-Nachtrag (A-024, Video 28.10. 12:10): Wörter klarer, Erledigtes
// geht sofort von der Tür. Abhaken → Häkchen orange, 1 s stehen, 0,8 s weich
// weg → Archiv „Ältere“ (v0.145), „Erledigt · Rückgängig“ (5 s) holt zurück; Archiv nach 30 Tagen still leer
// (beim Start, als Lösch-Markierung über den Abgleich); „Bleibt hängen“ nie
// im Archiv; Fächer genauso; Wörter überall gleich. Dazu zwei
// Fehler vom Bildschirmfoto: Tür wächst mit dem Inhalt (Griff sah wie ein
// Scrollbalken aus), Name · Zeit unter dem Zettel nie abgeschnitten.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { at, fakeWindow, noBrowser } from "../helpers";
import { now } from "@/lib/core/now";
import {
  ABHAK_MS,
  ARCHIV_MS,
  VERGESSEN_MS,
  activePins,
  archivedMemos,
  archivedPins,
  createMemo,
  createPin,
  doneValue,
  faecherOf,
  forgetMemos,
  forgetOldArchive,
  forgetPins,
  isArchived,
  isForgotten,
  leavesIn,
  loadMemos,
  loadPins,
  pinStays,
  pinWriteCommand,
  updateMemo,
  updatePin,
  visiblePins,
  type PinMessage,
} from "@/lib/pinnwand";
import { archivePin } from "@/lib/pinnwand/notizBruecke";
import { PINNWAND } from "@/lib/mia/denktmit/seiten/pinnwand";
import { NOTE_TOOLS } from "@/lib/begleitung/noteTools";

const DAY = 86_400_000;
const ms = () => now().getTime();
const pin = (text: string, opts = {}) => createPin(text, "Lisa", null, opts)!;
const read = (p: string) => readFileSync(p, "utf8");

afterEach(() => noBrowser());

/** Abhaken wie der Haken-Kreis: erledigt jetzt */
const abhaken = (list: PinMessage[], id: string) => {
  const s = now().toISOString();
  return updatePin(list, id, { erledigt: doneValue(list.find((p) => p.id === id)!, "Felix", s) }, s);
};

describe("Abhaken: 1 s Häkchen, dann ins Archiv (Einzelheiten in abhaken.test.ts)", () => {
  it("nach 1,8 s im Archiv „Ältere“, vorher an der Tür (keine 24 Std. mehr)", () => {
    at("2026-10-28T12:10");
    const p = pin("Brötchen holen?");
    const done = abhaken([p], p.id);
    expect(ABHAK_MS).toBe(1_800);
    expect(visiblePins(done, ms() + 1_799).map((x) => x.id)).toEqual([p.id]);
    expect(activePins(done, ms())).toHaveLength(0);
    expect(leavesIn(done[0], ms())).toBe(1_800);
    expect(leavesIn(done[0], ms() + 1_000)).toBe(800);
    expect(visiblePins(done, ms() + 1_800)).toHaveLength(0);
    expect(archivedPins(done, ms() + 1_800).map((x) => x.id)).toEqual([p.id]);
    expect(leavesIn(done[0], ms() + 1_800)).toBeNull();
    expect(leavesIn(p, ms())).toBeNull();
  });

  it("Rückgängig holt ihn zurück an die Tür – auch wenn er schon im Archiv liegt", () => {
    at("2026-10-28T12:10");
    const p = pin("Paket ist bei Nachbarn");
    const done = abhaken([p], p.id);
    const later = ms() + 4_500;
    expect(isArchived(done[0], later)).toBe(true);
    const back = updatePin(done, p.id, { erledigt: null }, new Date(later).toISOString());
    expect(visiblePins(back, later).map((x) => x.id)).toEqual([p.id]);
    expect(activePins(back, later)).toHaveLength(1);
  });

  it("„Erledigt · Rückgängig“ für 5 s, erst wenn er im Archiv liegt, nur dieser Zettel wird zurückgenommen", () => {
    const actions = read("src/components/pinnwand/boardActions.ts");
    expect(actions).toMatch(/const ERLEDIGT_TOAST_S = 5;/);
    expect(actions).toMatch(/showToast\(\{ text: "Erledigt", undo, undoneText: "Hängt wieder", seconds: ERLEDIGT_TOAST_S/);
    expect(actions).toMatch(/pushUndo\("Erledigt", \(\) => setDone\(item, null\)\)/);
    expect(actions).toMatch(/\}, ABHAK_MS\);/);
    expect(read("src/components/pinnwand/useBoard.ts")).toMatch(/setTimeout\(\(\) => tick/);
  });

  it("Sprachnachrichten genauso", () => {
    at("2026-10-28T12:10");
    const m = createMemo({ author: "Lisa", dauer: 8, mime: "audio/mp4", wave: [0.4] });
    const s = now().toISOString();
    const done = updateMemo([m], m.id, { erledigt: { von: "Felix", am: s } }, s);
    expect(archivedMemos(done, ms() + 1_799)).toHaveLength(0);
    expect(archivedMemos(done, ms() + 1_800)).toHaveLength(1);
  });
});

describe("Archiv: nach 30 Tagen still gelöscht", () => {
  it("abgehakt, 7 Tage alt oder von Hand: 30 Tage im Archiv, dann leer", () => {
    at("2026-10-01T09:00");
    const alt = pin("Alt");
    const notiz = pin("In Notizen");
    let list = archivePin([alt, notiz], notiz.id, now().toISOString());
    const erledigt = pin("Erledigt");
    list = abhaken([...list, erledigt], erledigt.id);
    const t0 = ms();
    expect(VERGESSEN_MS).toBe(30 * DAY);
    // Von Hand und abgehakt: 30 Tage ab heute; „Alt“: 7 + 30 Tage
    expect(archivedPins(list, t0 + 30 * DAY - 60_000)).toHaveLength(3);
    expect(archivedPins(list, t0 + 30 * DAY + 1_800).map((p) => p.data.text)).toEqual(["Alt"]);
    expect(isForgotten(alt, t0 + ARCHIV_MS + VERGESSEN_MS - 1)).toBe(false);
    expect(archivedPins(list, t0 + ARCHIV_MS + VERGESSEN_MS)).toHaveLength(0);
    expect(forgetPins(list, t0 + ARCHIV_MS + VERGESSEN_MS)).toEqual([]);
    // Nichts zu tun = gleiche Liste (kein unnötiges Speichern)
    expect(forgetPins(list, t0)).toBe(list);
  });

  it("„Bleibt hängen“ nie im Archiv – auch nach einem Jahr nicht, also auch nie gelöscht", () => {
    at("2026-01-01T09:00");
    const wlan = pin("WLAN Gast: Tohuus2026", { pinned: true });
    const inYear = ms() + 365 * DAY;
    expect(isArchived(wlan, inYear)).toBe(false);
    expect(isForgotten(wlan, inYear)).toBe(false);
    expect(archivedPins([wlan], inYear)).toHaveLength(0);
    expect(visiblePins([wlan], inYear)).toHaveLength(1);
    expect(forgetPins([wlan], inYear)).toHaveLength(1);
  });

  it("beim Start: Zettel und Sprachnachrichten aus dem Speicher – der Abgleich macht daraus eine Lösch-Markierung", () => {
    at("2026-09-01T09:00");
    const alt = pin("Alt");
    const bleibt = pin("Müll dienstags", { pinned: true });
    const memo = createMemo({ author: "Lisa", dauer: 5, mime: "audio/mp4", wave: [0.2] });
    fakeWindow({ "wasgibts.pinnwand": JSON.stringify({ version: 4, messages: [alt, bleibt], memos: [memo] }) });
    at("2026-10-28T12:10");
    expect(forgetOldArchive(ms())).toBe(2);
    expect(loadPins().map((p) => p.data.text)).toEqual(["Müll dienstags"]);
    expect(loadMemos()).toEqual([]);
    expect(forgetOldArchive(ms())).toBe(0);
    expect(forgetMemos([memo], ms())).toEqual([]);
    expect(read("src/lib/pinnwand/memoAudio.ts")).toMatch(/forgetOldArchive\(now\(\)\.getTime\(\)\);\n {2}await sweepMemoAudio/);
    // Der Server löscht nie nach Alter – nur Dateien gelöschter (markierter) Einträge
    expect(read("src/app/api/memos/aufraeumen/route.ts")).toMatch(/geloescht=is\.false/);
  });
});

describe("Kachel (Fächer): Erledigtes geht wie an der Tür", () => {
  it("ein abgehakter Zettel steht 1 s mit Häkchen im Fächer und ist nach 1,8 s weg", () => {
    at("2026-10-28T12:10");
    const a = pin("Eins");
    const b = pin("Zwei");
    const list = abhaken([a, b], a.id);
    expect(faecherOf(list, ms(), 3).map((p) => p.data.text).sort()).toEqual(["Eins", "Zwei"]);
    expect(faecherOf(list, ms() + 1_800, 3).map((p) => p.data.text)).toEqual(["Zwei"]);
    expect(visiblePins(list, ms())).toHaveLength(2);
  });
});

describe("Wörter überall gleich", () => {
  const ALT = /Anpinnen|Anheften|Angepinnt|Nicht mehr anheften|Wird angeheftet|· angeheftet/;
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  const pinnwandFiles = [
    ...files("src/components/pinnwand"),
    ...files("src/lib/pinnwand").filter((f) => !f.endsWith("woerter.ts")),
    "src/lib/mia/denktmit/seiten/pinnwand.ts",
    "src/components/ui/quickSave.ts",
    "src/components/heute/DeinTag.tsx",
    "e2e/ablaeufe/pinnwandgesten.mjs",
    "e2e/lib.mjs",
  ];

  it("keine alten Wörter mehr an der Pinnwand (Notizen dürfen weiter „Anheften“)", () => {
    for (const f of pinnwandFiles) expect(read(f), f).not.toMatch(ALT);
  });

  it("Seite, Menü, Fenster, Seiten-Tipp und Mia nutzen dieselben Wörter", () => {
    expect(read("src/components/pinnwand/ReactionMenu.tsx")).toMatch(/label=\{item\.pin\.data\.pinned \? NICHT_MEHR_FESTHALTEN : BLEIBT_HAENGEN\}/);
    expect(read("src/components/pinnwand/PinboardView.tsx")).toContain("{PINNWAND_TIPP}");
    expect(PINNWAND.seite).toContain("‚Bleibt hängen‘");
    // „Bleibt hängen“ zeigt der Zettel als kleine Markierung „OBEN“ (Tafel 123), nicht mehr in der Meta-Zeile
    expect(read("src/components/pinnwand/Zettel.tsx")).toContain("{OBEN}");
    const tool = NOTE_TOOLS.find((t) => t.definition.name === "pinnwand_schreiben")!;
    expect(tool.definition.description).toContain("„Bleibt hängen“");
    expect(tool.definition.description).not.toMatch(ALT);
    expect(JSON.stringify(tool.definition.input_schema)).toContain("bleibt_haengen");
    expect(read("src/components/ui/quickSave.ts")).toContain('pinnwand: "Hängt"');
  });

  it("Mia ohne KI: „Häng dauerhaft an die Pinnwand: …“ = Bleibt hängen", () => {
    expect(pinWriteCommand("Häng dauerhaft an die Pinnwand: Müll ist immer dienstags")).toBe("Müll ist immer dienstags");
    expect(pinStays("Häng dauerhaft an die Pinnwand: Müll ist immer dienstags")).toBe(true);
    expect(pinStays("Schreib an die Pinnwand, das soll hängen bleiben: Gäste kommen")).toBe(true);
    expect(pinStays("Schreib an die Pinnwand: Bin um 18 Uhr da")).toBe(false);
  });
});

describe("Behoben (Bildschirmfoto v0.138, iPhone 15 Pro)", () => {
  it("die Tür wächst mit dem Inhalt: kleine Mindesthöhe, kein innerer Scrollbereich, der Griff sieht nicht wie ein Scrollbalken aus", () => {
    const view = read("src/components/pinnwand/PinboardView.tsx");
    const door = view.match(/<section className="kuehlschrank ([^"]*)"/)![1];
    expect(door).not.toMatch(/overflow|max-h|h-screen|dvh/);
    // Tafel 123: so hoch wie der Inhalt – gar keine Mindesthöhe mehr
    expect(door).not.toMatch(/min-h/);
    const css = read("src/app/globals.css");
    const griff = css.slice(css.indexOf(".kuehlschrank::after"), css.indexOf("}", css.indexOf(".kuehlschrank::after")));
    expect(Number(griff.match(/width: (\d+)px/)![1])).toBeGreaterThanOrEqual(8);
    expect(Number(griff.match(/height: (\d+)px/)![1])).toBeLessThanOrEqual(80);
    expect(griff).not.toMatch(/9999px/);
    expect(css.slice(css.indexOf(".kuehlschrank {"), css.indexOf("}", css.indexOf(".kuehlschrank {")))).not.toMatch(/overflow/);
  });

  it("Name · Zeit unter dem Zettel nie abgeschnitten (Tafel 123: eine Zeile, bei Platzmangel nur die Zeit), rechts Platz für den Haken-Kreis", () => {
    const zettel = read("src/components/pinnwand/Zettel.tsx");
    const meta = zettel.slice(zettel.indexOf("function MetaZeile"), zettel.indexOf("export function Zettel"));
    expect(meta).not.toMatch(/truncate|text-ellipsis/);
    // Zeit zuerst im DOM, rückwärts umbrechend: passt der Name nicht, rutscht er in die unsichtbare zweite Zeile
    expect(meta).toMatch(/flex-row-reverse flex-wrap/);
    expect(meta).toMatch(/overflow-hidden/);
    expect(meta.indexOf("{wann}")).toBeLessThan(meta.indexOf("{wer}"));
    // rechts genau Platz für den Haken-Kreis (Tafel 123: Name und Zeit passen, pr-8 schnitt „Mathis“ und privat „Du“ weg)
    expect(zettel).toMatch(/pr-6 text-\[12px\]/);
  });
});
