// Pinnwand als Kühlschranktür (Tafel 106/107): nichts verschwindet nach
// 24 Std.; Erledigt → blass → Archiv; 7 Tage → Archiv; Anheften bleibt;
// Personenfarben; Papierarten; Mia-Frage einmal; Fächer; Beispiel; allein =
// Pinnwand aus; Migration v3 → v4 behält alles.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { at, fakeWindow, noBrowser } from "../helpers";
import { now } from "@/lib/core/now";
import {
  ARCHIV_MS,
  ERLEDIGT_MS,
  FAECHER,
  FAECHER_WINKEL,
  FARB_NAMEN,
  activePins,
  archivedPins,
  createMemo,
  createPin,
  doneLine,
  doneValue,
  faecherOf,
  farbeOf,
  guessHeight,
  hasUnread,
  isArchived,
  looksLikeNote,
  magnetOf,
  migratePinStore,
  papierFor,
  personFarbe,
  setPinPinned,
  tiltOf,
  twoColumns,
  updatePin,
  visiblePins,
  zettelTon,
  type PinMessage,
} from "@/lib/pinnwand";
import { NOTIZ_FRAGE, archivePin, markNoteAsked, noteOfPin, noteQuestionFor } from "@/lib/pinnwand/notizBruecke";
import { demoBoard } from "@/lib/pinnwand/beispiel";

const H = 3_600_000;
const DAY = 24 * H;
const ms = () => now().getTime();
const pin = (text: string, author = "Felix", opts = {}) => createPin(text, author, null, opts)!;

afterEach(() => noBrowser());

describe("Nichts verschwindet ungefragt", () => {
  it("nach 24 Std. (und 6 Tagen) noch an der Tür – erst nach 7 Tagen leise ins Archiv „Ältere“", () => {
    at("2026-10-20T09:00");
    const p = pin("Bin um 18 Uhr zurück");
    const t0 = ms();
    expect(visiblePins([p], t0 + DAY + 60_000)).toHaveLength(1);
    expect(visiblePins([p], t0 + 6 * DAY)).toHaveLength(1);
    expect(visiblePins([p], t0 + ARCHIV_MS)).toHaveLength(0);
    expect(archivedPins([p], t0 + ARCHIV_MS).map((x) => x.id)).toEqual([p.id]);
    expect(ARCHIV_MS).toBe(7 * DAY);
  });

  it("Erledigt: blass an der Tür (24 Std.), „erledigt von Lisa“, dann ins Archiv; zurücknehmen geht", () => {
    at("2026-10-20T09:00");
    const p = pin("Brötchen holen?", "Lisa");
    const stamp = now().toISOString();
    const done = updatePin([p], p.id, { erledigt: doneValue(p, "Lisa", stamp) }, stamp);
    expect(done[0].data.erledigt).toEqual({ von: "Lisa", am: stamp });
    expect(doneLine(done[0].data.erledigt!, "Felix")).toBe("erledigt von Lisa");
    expect(doneLine(done[0].data.erledigt!, "Lisa")).toBe("erledigt von dir");
    expect(visiblePins(done, ms() + ERLEDIGT_MS - 1)).toHaveLength(1);
    expect(activePins(done, ms())).toHaveLength(0);
    expect(isArchived(done[0], ms() + ERLEDIGT_MS)).toBe(true);
    // zweimal = zurück
    expect(doneValue(done[0], "Lisa", stamp)).toBeNull();
    // Erledigtes zählt nie als ungelesen
    expect(hasUnread(done, "Felix", ms())).toBe(false);
    expect(hasUnread([p], "Felix", ms())).toBe(true);
  });

  it("Angeheftete bleiben dauerhaft (oben links), auch nach 30 Tagen", () => {
    at("2026-10-01T09:00");
    const wlan = setPinPinned([pin("WLAN Gast: Tohuus2026", "Lisa")], "x", true, "s")[0];
    const kept = setPinPinned([wlan], wlan.id, true, "s")[0];
    at("2026-10-31T09:00");
    const fresh = pin("Neu");
    expect(visiblePins([fresh, kept], ms()).map((m) => m.data.text)).toEqual(["WLAN Gast: Tohuus2026", "Neu"]);
  });

  it("Code: keine 24-Stunden-Regel mehr, Speichern räumt nichts weg, gelöscht wird nur von Hand", () => {
    const model = readFileSync("src/lib/pinnwand/model.ts", "utf8");
    expect(model).not.toMatch(/withinDay|prunePins|PIN_HOURS/);
    expect(readFileSync("src/lib/pinnwand/store.ts", "utf8")).not.toMatch(/prune/);
    expect(readFileSync("src/lib/pinnwand/memoAudio.ts", "utf8")).not.toMatch(/pruneMemos/);
    expect(readFileSync("src/components/pinnwand/boardActions.ts", "utf8")).toMatch(/showDeleted\(pushUndo\("das Löschen des Zettels"/);
  });
});

describe("Farbe = Person", () => {
  it("fünf Töne, je Mitglied fest (Reihenfolge im Haushalt, sonst aus dem Namen), wählbar und dann gespeichert", () => {
    expect(FARB_NAMEN).toEqual(["Gelb", "Rosa", "Grün", "Blau", "Lila"]);
    const house = ["Felix", "Lisa", "Ole"];
    expect(personFarbe("Felix", house)).toBe(0);
    expect(personFarbe("lisa", house)).toBe(1);
    expect(personFarbe("Oma", house)).toBe(personFarbe("Oma", []));
    expect(personFarbe("Oma")).toBeGreaterThanOrEqual(0);
    expect(personFarbe("Oma")).toBeLessThan(5);
    at("2026-10-20T09:00");
    const own = pin("Hallo", "Felix");
    expect(farbeOf(own, house)).toBe(0);
    expect(farbeOf(pin("Hallo", "Felix", { farbe: 3 }), house)).toBe(3);
    expect(zettelTon(2)).toEqual({ bg: "var(--app-zettel-2)", mag: "var(--app-zettel-2-mag)" });
  });

  it("Tokens hell und dunkel (Edelstahl), auch für „Automatisch“", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const t of ["--app-fridge-door-a", "--app-fridge-handle", "--app-fridge-pin", "--app-zettel-0", "--app-zettel-4-mag", "--app-zettel-mia"]) {
      expect(css.split(`${t}:`).length - 1, t).toBe(3);
    }
    expect(css).toMatch(/Kühlschranktür dunkel: Edelstahl/);
  });

  it("Fehler: .zettel setzte position (ohne Ebene schlägt es „absolute“) – der Fächer lag übereinander", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = css.slice(css.indexOf(".zettel {"), css.indexOf("}", css.indexOf(".zettel {")));
    expect(rule).not.toMatch(/position/);
    expect(readFileSync("src/components/pinnwand/Zettel.tsx", "utf8")).toMatch(/zettel relative/);
    expect(readFileSync("src/components/pinnwand/Faecher.tsx", "utf8")).toMatch(/className\.includes\("absolute"\) \? "" : "relative"/);
  });
});

describe("Papierarten und Magnete", () => {
  it("Zettel, Karoblatt (Kinder), Foto (Polaroid), Sprachnachricht (Kassenbon)", () => {
    at("2026-10-20T09:00");
    expect(pin("Hallo").data.papier).toBe("zettel");
    expect(pin("Hallo", "Ole", { papier: "karo" }).data.papier).toBe("karo");
    const foto = createPin("", "Jonne", null, { foto: { path: null, w: 1600, h: 1200 } })!;
    expect(foto.data.papier).toBe("foto");
    expect(createPin("", "Jonne")).toBeNull();
    expect(papierFor("Ole", [{ name: "Ole", role: "kind" }, { name: "Felix", role: "erwachsener" }])).toBe("karo");
    expect(papierFor("Felix", [{ name: "Felix", role: "erwachsener" }])).toBe("zettel");
    expect([magnetOf("zettel"), magnetOf("karo"), magnetOf("foto"), magnetOf("memo"), magnetOf("zettel", true)]).toEqual(["punkt", "stern", "apfel", "herz", "pin"]);
    expect(guessHeight("memo")).toBeLessThan(guessHeight("foto", "Laternenumzug"));
    expect(guessHeight("zettel", "a\nb\nc")).toBeGreaterThan(guessHeight("zettel", "a"));
  });

  it("fest leicht schief (−3° bis +3°), bei jedem Laden gleich", () => {
    for (const id of ["a", "b", "3f1c-uuid", "beispiel:mia", "x".repeat(40)]) {
      expect(tiltOf(id)).toBe(tiltOf(id));
      expect(Math.abs(tiltOf(id))).toBeLessThanOrEqual(3);
    }
    expect(new Set(["a", "b", "c", "d", "e"].map(tiltOf)).size).toBeGreaterThan(1);
  });

  it("zwei Spalten: das Erste oben links, dann immer in die kürzere Spalte", () => {
    const [l, r] = twoColumns([{ id: 1, h: 100 }, { id: 2, h: 50 }, { id: 3, h: 50 }, { id: 4, h: 50 }], (i) => i.h);
    expect(l.map((i) => i.id)).toEqual([1, 4]);
    expect(r.map((i) => i.id)).toEqual([2, 3]);
  });
});

describe("Brücke zu Notizen", () => {
  it("„In Notizen“: Text wird eigene Notiz (erste Zeile = Titel), Zettel ins Archiv – nichts gelöscht", () => {
    at("2026-10-20T09:00");
    const p = pin("Einkauf Oma\nMilch\nBrot");
    expect(noteOfPin(p)?.data).toMatchObject({ title: "Einkauf Oma", text: "Milch\nBrot" });
    const list = archivePin([p], p.id, now().toISOString());
    expect(list).toHaveLength(1);
    expect(isArchived(list[0], ms())).toBe(true);
    expect(noteOfPin(createPin("", "Jonne", null, { foto: { path: null, w: 1, h: 1 } })!)).toBeNull();
  });

  it("sieht nach Notiz aus: Liste mit 3+ Zeilen, Passwort/PIN/WLAN, Telefonnummer, Adresse", () => {
    expect(looksLikeNote("Milch\nBrot\nEier")).toBe(true);
    expect(looksLikeNote("WLAN Gast: Tohuus2026")).toBe(true);
    expect(looksLikeNote("PIN fürs Fahrradschloss 4711")).toBe(true);
    expect(looksLikeNote("Handwerker: 0171 2345678")).toBe(true);
    expect(looksLikeNote("Treffpunkt Hauptstraße 12")).toBe(true);
    expect(looksLikeNote("23701 Eutin")).toBe(true);
    expect(looksLikeNote("Bin um 18 Uhr zurück")).toBe(false);
    expect(looksLikeNote("Pinnwand ist toll")).toBe(false);
  });

  it("Mia fragt EINMAL je eigenem Zettel – danach nie wieder (Ja oder „Bleibt hier“)", () => {
    at("2026-10-20T09:00");
    const mine = pin("WLAN Gast: Tohuus2026", "Felix");
    const other = pin("Passwort Kita: Igel", "Lisa");
    expect(noteQuestionFor([mine, other], "Felix", ms())?.id).toBe(mine.id);
    expect(noteQuestionFor([other], "Felix", ms())).toBeNull();
    const asked = markNoteAsked([mine, other], mine.id, now().toISOString());
    expect(noteQuestionFor(asked, "Felix", ms())).toBeNull();
    expect(NOTIZ_FRAGE).toBe("Klingt nach Notiz. Soll ich’s bei deinen Notizen ablegen?");
    const view = readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8");
    expect(view).toMatch(/>\s*Ja\s*</);
    expect(view).toMatch(/>\s*Bleibt hier\s*</);
  });
});

describe("Kachel „Fächer“", () => {
  const door = (id: string, iso: string, extra: Partial<PinMessage["data"]> = {}) => ({ id, erstellt: iso, data: { author: "Felix", pinned: false, erledigt: null, archiv: null, farbe: null, ...extra } });
  const NOW = Date.parse("2026-10-21T10:00:00Z");

  it("1, 2, 3+ Zettel: die neuesten nicht erledigten, neueste zuerst; leer = nichts", () => {
    const a = door("a", "2026-10-21T08:00:00Z");
    const b = door("b", "2026-10-21T09:00:00Z");
    const c = door("c", "2026-10-21T09:30:00Z");
    const d = door("d", "2026-10-21T09:45:00Z");
    expect(faecherOf([], NOW, 3)).toEqual([]);
    expect(faecherOf([a], NOW, 3).map((x) => x.id)).toEqual(["a"]);
    expect(faecherOf([a, b], NOW, 3).map((x) => x.id)).toEqual(["b", "a"]);
    expect(faecherOf([a, b, c, d], NOW, 3).map((x) => x.id)).toEqual(["d", "c", "b"]);
    const done = door("e", "2026-10-21T09:50:00Z", { erledigt: { von: "Lisa", am: "2026-10-21T09:55:00Z" } });
    expect(faecherOf([a, done], NOW, 3).map((x) => x.id)).toEqual(["a"]);
  });

  it("Angehefteter zählt nur mit, wenn weniger als 3 neue da sind", () => {
    const old = door("p", "2026-10-01T08:00:00Z", { pinned: true });
    const n = ["1", "2", "3"].map((i) => door(i, `2026-10-21T0${i}:00:00Z`));
    expect(faecherOf([old, ...n], NOW, 3).map((x) => x.id)).toEqual(["3", "2", "1"]);
    expect(faecherOf([old, n[0]], NOW, 3).map((x) => x.id)).toEqual(["1", "p"]);
  });

  it("S und M zeigen drei, L bis sechs; Winkel −10°, −2°, +7°", () => {
    expect(FAECHER).toEqual({ S: 3, M: 3, L: 6 });
    expect(FAECHER_WINKEL).toEqual([-10, -2, 7]);
    const tile = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
    expect(tile).toMatch(/size === "S" \? \(\s*<Faecher /);
    expect(tile).toMatch(/<ZettelReihe /);
    expect(tile).toMatch(/size === "S" \? "h-\[156px\]"/);
  });

  it("leer: gestrichelter Zettel mit Magnet und ＋, „Erster Zettel?“, „Oder 🎙 Sprachnachricht“ (lucide Mikro)", () => {
    const f = readFileSync("src/components/pinnwand/Faecher.tsx", "utf8");
    expect(f).toMatch(/zettel zettel-leer/);
    expect(f).toContain("Erster Zettel?");
    expect(f).toMatch(/Oder <Mic /);
    expect(f).toMatch(/href=\{`\/pinnwand\?n=\$\{item\.id\}`\}/);
    expect(f).toMatch(/▶ \{formatDauer\(item\.memo\.data\.dauer\)\}/);
    expect(f).toMatch(/<FotoBild pin=\{item\.pin\}/);
  });

  it("Look „Schlicht“: Kachel weiß (TILE), die Zettel behalten ihre Farbe (Token direkt am Zettel)", () => {
    const f = readFileSync("src/components/pinnwand/Faecher.tsx", "utf8");
    expect(f).toMatch(/background: tone\.bg/);
    expect(f).not.toMatch(/bg-tile\b/);
    expect(readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8")).toMatch(/\$\{TILE\}/);
  });

  it("Beispiel: Mia orange vorn, Ole grün, Sprachnachricht rosa 0:08 – nie in echten Speichern", () => {
    const d = demoBoard("Mia");
    expect(d.pins.map((p) => [p.data.author, p.data.text])).toEqual([
      ["Mia", "Moin! Hier hängen eure Zettel."],
      ["Ole", "Gummistiefel!"],
    ]);
    expect(d.pins[1].data.farbe).toBe(2);
    expect(d.memos[0].data).toMatchObject({ dauer: 8, farbe: 1 });
    expect([...d.pins, ...d.memos].every((e) => e.id.startsWith("beispiel:"))).toBe(true);
    const tile = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
    expect(tile).toMatch(/tone: item\.id === d\.mia \? \("mia" as const\)/);
    expect(tile).toMatch(/>Beispiel</);
    expect(tile).toMatch(/if \(demo && hasOwn\) clearDemoTile\("pinnwand"\)/);
    for (const f of ["src/lib/pinnwand/beispiel.ts", "src/components/pinnwand/PinboardTile.tsx", "src/components/pinnwand/PinboardView.tsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/changePins\(\(all\) => addPin\(all, d\.|changeMemos\(\(all\) => addMemo\(all, d\./);
    }
  });
});

describe("Haushalt allein = Pinnwand aus (Baustein)", () => {
  it("„Nur für mich“: Baustein und Kachel aus; zu zweit und Familie an; Mia schaltet sie beim Schreiben frei", async () => {
    fakeWindow();
    const { startFresh } = await import("@/lib/einstellungen/welcomeStore");
    const f = await import("@/lib/core/features");
    startFresh("farbig", "allein");
    expect(f.featureOn("pinnwand")).toBe(false);
    expect(f.featureOn("notizen")).toBe(true);
    startFresh("farbig", "familie");
    expect(f.featureOn("pinnwand")).toBe(true);
    expect(f.bausteinOf("pinnwand")?.name).toBe("Pinnwand");
    expect(readFileSync("src/lib/begleitung/client.ts", "utf8")).toMatch(/unlockFeature\("pinnwand"\)/);
    expect(readFileSync("src/components/heute/TodayPage.tsx", "utf8")).toMatch(/\(t\.id !== "pinnwand" \|\| pinboardOn\)/);
  });

  it("wer die Pinnwand schon nutzt, behält sie (Update v5 → v6)", async () => {
    fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 5, on: ["notizen"], launch: true, imHaus: true }) });
    const f = await import("@/lib/core/features");
    expect(f.featureOn("pinnwand")).toBe(true);
  });
});

describe("Migration v3 → v4", () => {
  it("alle noch vorhandenen Zettel bleiben, Farbe = Person, nichts erledigt oder archiviert", () => {
    const v3 = {
      version: 3,
      messages: [
        { id: "a", typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: "2026-10-27T07:00:00.000Z", geaendert: "2026-10-27T07:00:00.000Z", data: { text: "Bin um 20 Uhr da", author: "Lisa", reactions: { Felix: "❤️" }, readBy: ["Lisa"], pinned: true, replyTo: null } },
      ],
      memos: [createMemo({ author: "Ole", dauer: 4, mime: "audio/mp4", wave: [0.2] })],
    };
    const v4 = migratePinStore(v3)!;
    expect(v4.version).toBe(4);
    expect(v4.messages[0].data).toMatchObject({ text: "Bin um 20 Uhr da", pinned: true, farbe: null, papier: "zettel", erledigt: null, archiv: null, reactions: { Felix: "❤️" } });
    expect(farbeOf(v4.messages[0], ["Felix", "Lisa"])).toBe(1);
    expect(v4.memos[0].data).toMatchObject({ farbe: null, erledigt: null, archiv: null });
  });
});
