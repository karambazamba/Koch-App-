// Pinnwand aufgeräumt, Größe, Ordnen, Ecke „Nur für mich“ (A-028, Tafel 123):
// Reihenfolge bleibt für alte Zettel gleich, Ziehen ändert nur den gezogenen
// Zettel, „Nach oben“ = ganz nach vorn, klein/groß, private Zettel unter der
// Linie (allein: ohne Linie), nie auf der Kachel, nie im Push, nie geteilt
// ohne Schutz; Ecke einklappbar und pro Gerät gemerkt; Mia versteht beides.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { at, fakeWindow, noBrowser } from "../helpers";
import { now } from "@/lib/core/now";
import { STORAGE } from "@/lib/core/storage";
import {
  FUER_ALLE,
  NACH_OBEN,
  NUR_FUER_MICH,
  NUR_FUER_MICH_ZEILE,
  VERSCHIEBEN_HINWEIS,
  createPin,
  doorOrder,
  faecherOf,
  guessHeight,
  hasUnread,
  loadPins,
  makePinPrivate,
  migratePinStore,
  moveInList,
  pinForAllCommand,
  pinPrivate,
  pinToShare,
  pinWriteCommand,
  sanitizePin,
  sortForMove,
  sortForTop,
  updatePin,
  visiblePins,
  wandBereiche,
  wandBlocks,
  zettelTitel,
  type PinMessage,
} from "@/lib/pinnwand";
import { loadPrivatZu, migratePinnwandAnsicht, setPrivatZu } from "@/lib/pinnwand/ansicht";
import { uploadPendingFotos } from "@/lib/pinnwand/foto";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { planPushes, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { NOTE_TOOLS } from "@/lib/begleitung/noteTools";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";

const read = (p: string) => readFileSync(p, "utf8");
afterEach(() => noBrowser());

/** Zettel, nacheinander geschrieben (jede Minute einer) */
function zettel(texts: string[], opts: Parameters<typeof createPin>[3] = {}): PinMessage[] {
  return texts.map((t, i) => {
    at(`2026-10-28T10:${String(10 + i).padStart(2, "0")}`);
    return createPin(t, "Lisa", null, opts)!;
  });
}
const texts = (list: PinMessage[]) => list.map((p) => p.data.text);

describe("Reihenfolge", () => {
  it("alte Zettel ohne Platz: genau wie bisher – „Bleibt hängen“ vorn, sonst neueste zuerst", () => {
    const [a, b, c] = zettel(["A", "B", "C"]);
    const bleibt = { ...a, data: { ...a.data, pinned: true } };
    expect(texts(doorOrder([bleibt, b, c]))).toEqual(["A", "C", "B"]);
    // v4-Zettel ohne die neuen Felder laden mit Größe klein, ohne Platz, für alle
    const alt = { ...c, data: { ...c.data } } as Record<string, unknown> & PinMessage;
    delete (alt.data as Partial<PinMessage["data"]>).groesse;
    delete (alt.data as Partial<PinMessage["data"]>).sort;
    delete (alt.data as Partial<PinMessage["data"]>).privat;
    expect(sanitizePin(alt)!.data).toMatchObject({ groesse: "klein", sort: null, privat: false });
  });

  it("ein neuer Zettel landet vorn, auch nach dem Ziehen anderer", () => {
    const [a, b] = zettel(["A", "B"]);
    const moved = updatePin([a, b], a.id, { sort: sortForMove(doorOrder([a, b]), a.id, 0)! }, "x");
    expect(texts(doorOrder(moved))).toEqual(["A", "B"]);
    at("2026-10-28T11:00");
    const neu = createPin("Neu", "Lisa")!;
    expect(texts(doorOrder([...moved, neu]))[0]).toBe("Neu");
  });

  it("Ziehen: nur der gezogene Zettel bekommt einen Platz zwischen seinen neuen Nachbarn", () => {
    const list = zettel(["A", "B", "C", "D"]); // Tür: D C B A
    const order = doorOrder(list);
    const a = list[0];
    const sort = sortForMove(order, a.id, 1)!; // A nach Platz 2
    const after = updatePin(list, a.id, { sort }, "x");
    expect(texts(doorOrder(after))).toEqual(["D", "A", "C", "B"]);
    expect(after.filter((p) => p.data.sort !== null)).toHaveLength(1);
    // ans Ende und an den Anfang
    expect(texts(doorOrder(updatePin(list, list[3].id, { sort: sortForMove(order, list[3].id, 3)! }, "x")))).toEqual(["C", "B", "A", "D"]);
    expect(texts(doorOrder(updatePin(list, a.id, { sort: sortForMove(order, a.id, 0)! }, "x")))).toEqual(["A", "D", "C", "B"]);
    // gleicher Platz = nichts zu tun
    expect(sortForMove(order, list[3].id, 0)).toBeNull();
    expect(sortForMove(order, "gibt-es-nicht", 0)).toBeNull();
  });

  it("„Bleibt hängen“ bleibt vorn: Ziehen bleibt in seiner Gruppe", () => {
    const [a, b, c] = zettel(["A", "B", "C"]);
    const list = [{ ...a, data: { ...a.data, pinned: true } }, b, c]; // Tür: A | C B
    const order = doorOrder(list);
    const s = sortForMove(order, b.id, 0)!; // B ganz nach vorn ziehen → hinter A
    expect(texts(doorOrder(updatePin(list, b.id, { sort: s }, "x")))).toEqual(["A", "B", "C"]);
  });

  it("„Nach oben“: vor alle anderen (auch vor gerade Geschriebenes)", () => {
    const list = zettel(["A", "B", "C"]);
    const sort = sortForTop(list, list[0].id, now().getTime())!;
    expect(texts(doorOrder(updatePin(list, list[0].id, { sort }, "x")))).toEqual(["A", "C", "B"]);
    expect(sortForTop(list, "nix", now().getTime())).toBeNull();
  });

  it("Vorschau beim Ziehen", () => {
    expect(moveInList([{ id: "a" }, { id: "b" }, { id: "c" }], "a", 2).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(moveInList([{ id: "a" }], "x", 0).map((x) => x.id)).toEqual(["a"]);
  });

  it("die Reihenfolge geht mit der Familie: Platz und Größe stehen im geteilten Eintrag", () => {
    const [a] = zettel(["A"]);
    const changed = updatePin([a], a.id, { sort: -5, groesse: "gross" }, "x");
    const pinnwand = ADAPTERS.find((x) => x.name === "pinnwand")!;
    const docs = pinnwand.toDocs({ version: 5, messages: changed, memos: [] });
    expect((docs[0].data as PinMessage).data).toMatchObject({ sort: -5, groesse: "gross" });
    const back = pinnwand.fromDocs(docs, null) as { messages: PinMessage[] };
    expect(back.messages[0].data).toMatchObject({ sort: -5, groesse: "gross" });
    expect(pinnwand.version).toBe(STORAGE.find((s) => s.key === "wasgibts.pinnwand")!.version);
  });

  it("nach Neuladen: Platz, Größe und „Nur für mich“ bleiben (v4-Speicher wird v5, nichts geht verloren)", () => {
    const [a, b] = zettel(["A", "B"]);
    const v4 = { version: 4, messages: [a, b].map((p) => ({ ...p, data: { ...p.data, groesse: undefined, sort: undefined, privat: undefined } })), memos: [] };
    expect(migratePinStore(JSON.parse(JSON.stringify(v4)))!.messages.map((p) => p.data.text)).toEqual(["A", "B"]);
    const moved = updatePin([a, b], a.id, { sort: -1e12, groesse: "gross", privat: true }, "x");
    fakeWindow({ "wasgibts.pinnwand": JSON.stringify({ version: 5, messages: moved, memos: [] }) });
    const loaded = loadPins();
    expect(loaded.find((p) => p.id === a.id)!.data).toMatchObject({ sort: -1e12, groesse: "gross", privat: true });
    expect(texts(visiblePins(loaded, now().getTime()))).toEqual(["A", "B"]);
  });
});

describe("Größe und Wand", () => {
  it("Standard klein (Text und Foto); groß liegt quer über beide Spalten", () => {
    const [a, b, c, d] = zettel(["A", "B", "C", "D"]);
    expect(a.data.groesse).toBe("klein");
    expect(createPin("", "Lisa", null, { foto: { path: null, w: 4, h: 3 } })!.data.groesse).toBe("klein");
    const gross = { ...b, data: { ...b.data, groesse: "gross" as const } };
    const blocks = wandBlocks([a, gross, c, d], (p) => p.data.groesse, () => 100);
    expect(blocks.map((x) => x.art)).toEqual(["paar", "breit", "paar"]);
    expect(blocks[2]).toEqual({ art: "paar", spalten: [[c], [d]] });
    expect(guessHeight("zettel", "x".repeat(60), true)).toBeLessThan(guessHeight("zettel", "x".repeat(60)));
  });

  it("Wand so hoch wie der Inhalt, Gesten wie das Kachel-Ziehen (Fenster bzw. ziehen), nur transform, reduziert ohne Gleiten", () => {
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view.match(/<div className="korkpunkte ([^"]*)"/)![1]).not.toMatch(/min-h|overflow|max-h/);
    const gesten = read("src/components/pinnwand/useWandGesten.ts");
    expect(gesten).toContain('"transform 0.8s cubic-bezier(.16,1,.3,1)"');
    expect(gesten).toMatch(/prefers-reduced-motion: reduce/);
    expect(gesten).toMatch(/passive: false/);
    expect(gesten).not.toMatch(/\.style\.(top|left|width|height)/);
    expect(read("src/components/pinnwand/Wand.tsx")).toMatch(/data-no-swipe=\{lifted \? true : undefined\}/);
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.zettel-hebt \{ transform: rotate\(var\(--kippen, 0deg\)\) scale\(1\.06\)/);
  });

  it("Fenster nach langem Drücken wie Tafel 123 C: Titel in „…“, nie mitten im Wort gekürzt", () => {
    expect(zettelTitel("Elternabend Do 19:30")).toBe("„Elternabend Do 19:30“");
    expect(zettelTitel("Samstag Omas Geburtstag. Wer backt den Kuchen?")).toBe("„Samstag Omas Geburtstag. Wer …“");
    expect(zettelTitel("")).toBe("Foto");
    const f = read("src/components/pinnwand/ZettelFenster.tsx");
    for (const w of ["GROESSEN", "NACH_OBEN", "NUR_FUER_MICH", "FUER_ALLE", "VERSCHIEBEN_HINWEIS", '"Erledigt"']) expect(f).toContain(w);
    expect([NACH_OBEN, NUR_FUER_MICH, FUER_ALLE, VERSCHIEBEN_HINWEIS]).toEqual(["Nach oben", "Nur für mich", "Für alle", "Zum Verschieben: halten und ziehen"]);
  });
});

describe("Ecke „Nur für mich“", () => {
  it("unter der Linie ganz unten; ohne private Zettel keine Linie; allein ohne Linie", () => {
    const [a, b] = zettel(["A", "B"]);
    const p = { ...b, data: { ...b.data, privat: true } };
    const isP = (x: PinMessage) => x.data.privat;
    expect(wandBereiche([a, p], isP, false)).toEqual({ alle: [a], privat: [p] });
    expect(wandBereiche([a], isP, false).privat).toEqual([]);
    expect(wandBereiche([a, p], isP, true)).toEqual({ alle: [a, p], privat: [] });
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view).toMatch(/bereiche\.privat\.length > 0 &&/);
    expect(NUR_FUER_MICH_ZEILE).toBe("Nur für mich · sieht nur du");
  });

  it("grau-weiß mit grauem Pin (Tokens hell, dunkel, automatisch), Schloss in der Meta-Zeile", () => {
    const css = read("src/app/globals.css");
    expect(css.match(/--app-zettel-privat: #[0-9a-f]{6}; --app-zettel-privat-mag: #[0-9a-f]{6}; --app-zettel-privat-line/g)).toHaveLength(3);
    const src = read("src/components/pinnwand/Zettel.tsx");
    expect(src).toContain('mag: "var(--app-zettel-privat-mag)"');
    expect(src).toMatch(/\{privat && <Lock /);
  });

  it("einklappbar: Linie antippen = zu (nur „Nur für mich ⌄“, ohne Anzahl) bzw. auf; pro Gerät gemerkt, Standard auf", () => {
    fakeWindow({});
    expect(loadPrivatZu()).toBe(false);
    setPrivatZu(true);
    expect(loadPrivatZu()).toBe(true);
    expect(JSON.parse(globalThis.window.localStorage.getItem("wasgibts.pinnwandansicht")!)).toEqual({ version: 1, privatZu: true });
    setPrivatZu(false);
    expect(loadPrivatZu()).toBe(false);
    expect(migratePinnwandAnsicht({ version: 1, privatZu: "ja" })).toEqual({ version: 1, privatZu: false });
    expect(migratePinnwandAnsicht(null)).toBeNull();
    expect(STORAGE.find((s) => s.key === "wasgibts.pinnwandansicht")).toMatchObject({ backup: false, version: 1 });
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view).toMatch(/aria-expanded=\{!privatZu\}/);
    const zu = view.slice(view.indexOf("{privatZu ? ("), view.indexOf(") : (", view.indexOf("{privatZu ? (")));
    expect(zu).toContain("{NUR_FUER_MICH}");
    expect(zu).toContain("<ChevronDown");
    expect(zu).not.toMatch(/length|count|anzahl/i);
    expect(view).toMatch(/className="flex min-h-11 w-full/);
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.wand-privat-auf \{ animation: none; \} \}/);
  });

  it("Kachel zeigt nur Zettel für alle; private zählen nie als ungelesen", () => {
    const [a, b] = zettel(["A", "B"]);
    const p = { ...b, data: { ...b.data, privat: true } };
    expect(faecherOf([a, p], now().getTime(), 3).map((x) => x.id)).toEqual([a.id]);
    const fremd = { ...p, data: { ...p.data, readBy: [] } };
    expect(hasUnread([fremd], "Felix", now().getTime())).toBe(false);
  });

  it("„Nur für mich“ an: neue ID (der alte geht als Lösch-Markierung weg), Bild bleibt auf dem Gerät", () => {
    at("2026-10-28T10:00");
    const foto = createPin("Fürs Wohnzimmer?", "Lisa", null, { foto: { path: "hh/f1.jpg", w: 4, h: 3 } })!;
    const out = makePinPrivate([foto], foto.id, "neu-1", "2026-10-28T10:05:00.000Z");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "neu-1", data: { privat: true, foto: { path: null } } });
    expect(makePinPrivate(out, "neu-1", "x", "s")).toBe(out);
    // Abgleich: Foto ohne Pfad bleibt auf dem Gerät, privater Text-Zettel geht (RLS schützt ihn)
    const text = { ...createPin("Geschenk", "Lisa")!, data: { ...createPin("Geschenk", "Lisa")!.data, privat: true } };
    const docs = ADAPTERS.find((x) => x.name === "pinnwand")!.toDocs({ version: 5, messages: [...out, text], memos: [] });
    expect(docs.map((d) => d.id)).toEqual([text.id]);
    expect((docs[0].data as PinMessage).data.privat).toBe(true);
  });

  it("Bilder privater Zettel werden nie hochgeladen", async () => {
    const pin = { ...createPin("", "Lisa", null, { foto: { path: null, w: 1, h: 1 } })!, data: { ...createPin("", "Lisa", null, { foto: { path: null, w: 1, h: 1 } })!.data, privat: true } };
    let uploads = 0;
    const done = await uploadPendingFotos({ householdId: "hh", pins: () => [pin], load: async () => new Blob(["x"]), upload: async () => (uploads++, { ok: true as const, value: true as const }), setPath: () => undefined });
    expect(done).toBe(0);
    expect(uploads).toBe(0);
  });

  it("Push nennt private Zettel nie – auch wenn der Server sie mitliest", () => {
    const T = "2026-10-21";
    const erstellt = new Date(Date.parse(`${T}T15:30:00+02:00`)).toISOString();
    const row = (id: string, privat: boolean): PushEntryRow => ({ household_id: "hh", id, typ: "pinnwand", raum: "familie", besitzer: "anna", erstellt, geaendert: erstellt, data: { id, typ: "pinnwand", data: { author: "Anna", text: "x", privat } } });
    const plan = (rows: PushEntryRow[]) => planPushes({ abos: [{ id: "B", user_id: "ben", household_id: "hh", settings: {} }], rows, today: T, minute: 15 * 60 + 31, nowMs: Date.parse(`${T}T15:31:00+02:00`), sent: new Set(), proactiveToday: new Set() });
    expect(plan([row("p1", true)])).toEqual([]);
    expect(plan([row("p2", false)])).toHaveLength(1);
  });

  it("Datenbank: privat nur für den Besitzer (RLS wie „Arbeit“), Bilder privater Zettel nur für ihn", () => {
    const sql = read("supabase/migrations/20261101130000_pinnwand_nur_fuer_mich.sql");
    expect(sql).toMatch(/when p_typ <> 'aufgabe' and public\.entry_privat\(p_data\) then p_besitzer = auth\.uid\(\)/);
    // baut auf den drei Räumen auf (A-034): „ich“ und „arbeit“ bleiben nur für den Besitzer, Familie für alle
    const vis = sql.slice(sql.indexOf("function public.entry_visible"), sql.indexOf("revoke all on function public.entry_visible"));
    expect(vis).toMatch(/when p_raum = 'familie' then true/);
    expect(vis).toMatch(/entry_holder\(p_data, 'fuer'\)/);
    expect(vis).toMatch(/else p_besitzer = auth\.uid\(\)/);
    expect(vis).not.toMatch(/p_raum = 'familie' or p_besitzer/);
    // die Raum-Migration läuft vorher (sonst überschriebe sie die Pinnwand-Regel)
    expect("20261101130000_pinnwand_nur_fuer_mich.sql" > "20261101120000_raeume_ich.sql").toBe(true);
    expect(sql).toMatch(/not public\.entry_privat\(data\) or besitzer = auth\.uid\(\)/);
    expect(sql).toMatch(/not public\.foto_fremd_privat\(name\)/);
    expect(read("tests/datenbank/sicherheit.test.sql")).toContain("Jan sieht Maras „Nur für mich“-Zettel nicht");
    expect(read("tests/datenbank/sicherheit.test.sql")).toContain("Jan sieht Maras Zettel in „ich“ und „arbeit“ nicht");
  });
});

describe("Mia: „nur für mich an die Pinnwand“ und „für alle sichtbar machen“", () => {
  it("ohne KI erkannt", () => {
    expect(pinWriteCommand("Häng nur für mich an die Pinnwand: Geschenk für Lisa")).toBe("Geschenk für Lisa");
    expect(pinWriteCommand("Schreib an die Pinnwand, aber nur für mich: Zahnarzt anrufen")).toBe("Zahnarzt anrufen");
    expect(pinPrivate("Häng nur für mich an die Pinnwand: Geschenk")).toBe(true);
    expect(pinPrivate("Häng an die Pinnwand: Oma kommt")).toBe(false);
    expect(pinForAllCommand("Mach den Zettel mit dem Geschenk für alle sichtbar")).toBe("Geschenk");
    expect(pinForAllCommand("Zettel für alle sichtbar machen")).toBe("");
    expect(pinForAllCommand("Häng an die Pinnwand: Pizza für alle")).toBeNull();
  });

  it("welcher Zettel: passendes Wort, sonst der neueste eigene private", () => {
    const [a, b] = zettel(["Geschenk für Jan", "Steuerbüro anrufen"], { privat: true });
    const fremd = { ...createPin("Fremd", "Jan", null, { privat: true })! };
    const nowMs = now().getTime();
    expect(pinToShare([a, b, fremd], "Geschenk", "Lisa", nowMs)?.id).toBe(a.id);
    expect(pinToShare([a, b, fremd], "", "Lisa", nowMs)?.id).toBe(b.id);
    expect(pinToShare([a, b], "Fahrrad", "Lisa", nowMs)).toBeNull();
    expect(pinToShare([a], "Fahrrad", "Lisa", nowMs)?.id).toBe(a.id);
  });

  it("Werkzeug und Prüfstand-Sätze", () => {
    const tool = NOTE_TOOLS.find((t) => t.definition.name === "pinnwand_schreiben")!;
    expect(JSON.stringify(tool.definition.input_schema)).toContain("nur_fuer_mich");
    expect(tool.definition.description).toContain("app_befehl");
    const s = PRUEFSAETZE.filter((x) => x.privat !== undefined || /für alle sichtbar/.test(x.text));
    expect(s.length).toBeGreaterThanOrEqual(5);
    const satz = PRUEFSAETZE.find((x) => x.privat === true)!;
    const reply = (privat: boolean) => ({ reply: "Hängt, sieht nur du.", ops: [{ id: "1", type: "add_pin" as const, text: "x", ...(privat ? { privat } : {}) }] });
    expect(bewerte(satz, reply(true), 100).ok).toBe(true);
    expect(bewerte(satz, reply(false), 100).gruende).toContain("nicht „Nur für mich“");
  });
});
