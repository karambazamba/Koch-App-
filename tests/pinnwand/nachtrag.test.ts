// Pinnwand-Nachtrag (A-024, Video 28.10. 12:10): Wörter klarer, Erledigtes
// geht sofort von der Tür. Abhaken → 3 s blass mit Haken → Archiv „Ältere“,
// „Erledigt · Rückgängig“ (5 s) holt zurück; Archiv nach 30 Tagen still leer
// (beim Start, als Lösch-Markierung über den Abgleich); „Bleibt hängen“ nie
// im Archiv; Fächer nur Nicht-Erledigtes; Wörter überall gleich. Dazu zwei
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

describe("Abhaken: 3 s blass mit Haken, dann ins Archiv", () => {
  it("nach 3 s im Archiv „Ältere“, vorher blass an der Tür (keine 24 Std. mehr)", () => {
    at("2026-10-28T12:10");
    const p = pin("Brötchen holen?");
    const done = abhaken([p], p.id);
    expect(ABHAK_MS).toBe(3_000);
    expect(visiblePins(done, ms() + 2_999).map((x) => x.id)).toEqual([p.id]);
    expect(activePins(done, ms())).toHaveLength(0);
    expect(leavesIn(done[0], ms())).toBe(3_000);
    expect(leavesIn(done[0], ms() + 1_000)).toBe(2_000);
    expect(visiblePins(done, ms() + 3_000)).toHaveLength(0);
    expect(archivedPins(done, ms() + 3_000).map((x) => x.id)).toEqual([p.id]);
    expect(leavesIn(done[0], ms() + 3_000)).toBeNull();
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

  it("„Erledigt · Rückgängig“ für 5 s, nur dieser Zettel wird zurückgenommen", () => {
    const actions = read("src/components/pinnwand/boardActions.ts");
    expect(actions).toMatch(/const ERLEDIGT_TOAST_S = 5;/);
    expect(actions).toMatch(/showToast\(\{ text: "Erledigt", undo, undoneText: "Hängt wieder", seconds: ERLEDIGT_TOAST_S/);
    expect(actions).toMatch(/pushUndo\("Erledigt", \(\) => setDone\(item, null\)\)/);
  });

  it("Bewegung: blass + Haken, im letzten Teil der 3 s weich hinaus (transform/opacity), reduziert nur Überblenden", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.zettel-geht \{ animation: zettel-geht 0\.9s cubic-bezier\(\.16, 1, \.3, 1\) var\(--geht-in, 0ms\) both; \}/);
    const keyframes = css.slice(css.indexOf("@keyframes zettel-geht"), css.indexOf("@keyframes zettel-blende"));
    expect(keyframes).not.toMatch(/(top|left|height|margin):/);
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)", css.indexOf(".zettel-geht { animation-name")));
    expect(reduced.slice(0, 200)).toContain(".zettel-geht { animation-name: zettel-blende; }");
    expect(read("src/components/pinnwand/useBoard.ts")).toMatch(/setTimeout\(\(\) => tick/);
  });

  it("Sprachnachrichten genauso", () => {
    at("2026-10-28T12:10");
    const m = createMemo({ author: "Lisa", dauer: 8, mime: "audio/mp4", wave: [0.4] });
    const s = now().toISOString();
    const done = updateMemo([m], m.id, { erledigt: { von: "Felix", am: s } }, s);
    expect(archivedMemos(done, ms() + 2_999)).toHaveLength(0);
    expect(archivedMemos(done, ms() + 3_000)).toHaveLength(1);
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
    expect(archivedPins(list, t0 + 30 * DAY + 3_000).map((p) => p.data.text)).toEqual(["Alt"]);
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

describe("Kachel (Fächer): nur nicht Erledigtes", () => {
  it("ein abgehakter Zettel verschwindet sofort aus dem Fächer, auch während er noch blass an der Tür hängt", () => {
    at("2026-10-28T12:10");
    const a = pin("Eins");
    const b = pin("Zwei");
    const list = abhaken([a, b], a.id);
    expect(faecherOf(list, ms(), 3).map((p) => p.data.text)).toEqual(["Zwei"]);
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
    expect(read("src/components/pinnwand/Zettel.tsx")).toContain("· bleibt hängen`");
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
    const minH = Number(door.match(/min-h-\[(\d+)px\]/)![1]);
    expect(minH).toBeLessThanOrEqual(240);
    const css = read("src/app/globals.css");
    const griff = css.slice(css.indexOf(".kuehlschrank::after"), css.indexOf("}", css.indexOf(".kuehlschrank::after")));
    expect(Number(griff.match(/width: (\d+)px/)![1])).toBeGreaterThanOrEqual(8);
    expect(Number(griff.match(/height: (\d+)px/)![1])).toBeLessThanOrEqual(80);
    expect(griff).not.toMatch(/9999px/);
    expect(css.slice(css.indexOf(".kuehlschrank {"), css.indexOf("}", css.indexOf(".kuehlschrank {")))).not.toMatch(/overflow/);
  });

  it("Name · Zeit unter dem Zettel nie abgeschnitten (lieber zweizeilig), rechts Platz für den Haken-Kreis", () => {
    const zettel = read("src/components/pinnwand/Zettel.tsx");
    const meta = zettel.slice(zettel.indexOf("data-meta"), zettel.indexOf("{meta}</span>"));
    expect(meta).not.toMatch(/truncate|text-ellipsis|whitespace-nowrap/);
    expect(meta).toMatch(/break-words/);
    expect(zettel).toMatch(/pr-8 text-\[12px\]/);
  });
});
