import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "../helpers";

beforeEach(() => {
  (globalThis as { window?: unknown }).window = { localStorage: memoryStorage(), addEventListener() {}, removeEventListener() {} };
});

describe("v0.32: Schnellnotiz wird eine angeheftete Notiz", () => {
  it("alter gelber Zettel → Notiz „Schnellnotiz“, nichts geht verloren, nur einmal", async () => {
    const w = (globalThis as unknown as { window: { localStorage: Storage } }).window;
    w.localStorage.setItem("wasgibts.kladde", JSON.stringify({ version: 1, text: "Handwerker Müller 0172\nGeschenkpapier kaufen", geaendert: "2026-10-20T08:00:00.000Z" }));
    const { adoptSchnellnotiz, loadNotes, loadSchnellnotiz } = await import("@/lib/notizen");
    adoptSchnellnotiz();
    adoptSchnellnotiz();
    const notes = loadNotes().filter((n) => n.data.schnell);
    expect(notes).toHaveLength(1);
    expect(notes[0].data.title).toBe("Schnellnotiz");
    expect(notes[0].data.pinned).toBe(true);
    expect(notes[0].data.text).toBe("Handwerker Müller 0172\nGeschenkpapier kaufen");
    expect(loadSchnellnotiz().text).toContain("Geschenkpapier");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.kladde")!).text).toBe("");
  });

  it("Schreiben und Rückgängig gehen über die Notiz", async () => {
    const { appendLine, changeSchnellnotiz, loadSchnellnotiz, saveSchnellnotiz } = await import("@/lib/notizen");
    saveSchnellnotiz("Milch");
    const undo = changeSchnellnotiz(appendLine(loadSchnellnotiz().text, "Brot"));
    expect(loadSchnellnotiz().text).toBe("Milch\nBrot");
    undo();
    expect(loadSchnellnotiz().text).toBe("Milch");
  });
});
