// Fotos an der Pinnwand (Polaroid, Tafel 106): vor dem Speichern verkleinert
// (längste Seite 1600 px, JPEG), mit Konto im Bucket „fotos“ nur für den
// Haushalt (RLS, Pfad-Regel wie in der Datenbank), geteilt erst mit Bild,
// nicht in der Sicherung, Aufräumen nur bei gelöschten Zetteln.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { at } from "../helpers";
import { FOTO_MAX_BYTES, FOTO_MAX_PX, fitFoto, fotoPath, uploadPendingFotos } from "@/lib/pinnwand/foto";
import { createPin, type PinMessage } from "@/lib/pinnwand";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { STORAGE } from "@/lib/core/storage";

const HH = "0b5f3c2e-1111-4222-8333-444455556666";
const foto = (id: string, path: string | null = null): PinMessage => ({ ...createPin("Laternenumzug Fr 17 Uhr", "Jonne", null, { foto: { path, w: 1600, h: 1200 } })!, id });

describe("Verkleinern", () => {
  it("längste Seite höchstens 1600 px, Seitenverhältnis bleibt, nie größer", () => {
    expect(FOTO_MAX_PX).toBe(1600);
    expect(fitFoto(4032, 3024)).toEqual({ w: 1600, h: 1200 });
    expect(fitFoto(3024, 4032)).toEqual({ w: 1200, h: 1600 });
    expect(fitFoto(800, 600)).toEqual({ w: 800, h: 600 });
    expect(fitFoto(0, -5)).toEqual({ w: 1, h: 1 });
  });
});

describe("Haushalt (Bucket „fotos“)", () => {
  it("Pfad <haushalt>/<id>.jpg passt zur Regel in der Datenbank; RLS nur für Mitglieder", () => {
    at("2026-10-28T09:00");
    const sql = readFileSync("supabase/migrations/20261031120000_pinnwand_fotos.sql", "utf8");
    const rule = new RegExp(sql.match(/p_name !~ '([^']+)'/)![1]);
    expect(rule.test(fotoPath(HH, foto("3f1c-uuid_1")))).toBe(true);
    expect(fotoPath(HH, foto("a/../b c"))).toBe(`${HH}/abc.jpg`);
    expect(rule.test(`${HH}/../x.jpg`)).toBe(false);
    expect(sql).toMatch(/values \('fotos', 'fotos', false, 1572864, array\['image\/jpeg'\]\)/);
    for (const p of ["fotos_select", "fotos_insert", "fotos_delete"]) expect(sql).toContain(`create policy ${p} on storage.objects`);
    expect(sql).toMatch(/public\.is_member\(public\.foto_household\(name\)\)/);
    expect(FOTO_MAX_BYTES).toBe(1572864);
    expect(readFileSync("tests/datenbank/fotos.test.sql", "utf8")).toContain("Fremde sehen nichts");
  });

  it("hochladen: nur Fotos ohne Pfad mit Bild auf dem Gerät; Fehler halten nichts auf", async () => {
    at("2026-10-28T09:00");
    const text = createPin("Nur Text", "Felix")!;
    const paths: Record<string, string> = {};
    const done = await uploadPendingFotos({
      householdId: HH,
      pins: () => [text, foto("schon", `${HH}/schon.jpg`), foto("ohneBild"), foto("kaputt"), foto("gross"), foto("gut")],
      load: async (p) => (p.id === "ohneBild" ? null : p.id === "gross" ? new Blob([new Uint8Array(FOTO_MAX_BYTES + 1)]) : new Blob(["x"])),
      upload: async (path) => (path.includes("kaputt") ? { ok: false, error: "x" } : { ok: true, value: true }),
      setPath: (id, path) => (paths[id] = path),
    });
    expect(done).toBe(1);
    expect(paths).toEqual({ gut: `${HH}/gut.jpg` });
  });

  it("geteilt wird ein Foto-Zettel erst mit Bild im Haushalt; der Rest bleibt auf dem Gerät erhalten", () => {
    at("2026-10-28T09:00");
    const a = ADAPTERS.find((x) => x.name === "pinnwand")!;
    const text = createPin("Hallo", "Felix")!;
    const value = { version: 4, messages: [text, foto("lokal"), foto("oben", `${HH}/oben.jpg`)], memos: [] };
    expect(a.toDocs(value).map((d) => d.id)).toEqual([text.id, "oben"]);
    const back = a.fromDocs(a.toDocs(value), value) as { messages: PinMessage[] };
    expect(back.messages.map((m) => m.id).sort()).toEqual([text.id, "lokal", "oben"].sort());
  });

  it("Bilder nicht in der Sicherung; eigene IndexedDB im Verzeichnis", () => {
    expect(STORAGE.find((s) => s.key === "wasgibts-fotos")).toMatchObject({ area: "indexeddb", backup: false });
  });
});
