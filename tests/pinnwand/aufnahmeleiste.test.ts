// Pinnwand-Kachel (Tafel 80, 107): Aufnahme = EINE Leiste (Mülleimer, Punkt,
// Zeit, Welle, rechts ➤), ＋ während der Aufnahme weg, Senden nur über ➤;
// leer startet „Oder 🎙 Sprachnachricht“ die Aufnahme direkt.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tile = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
const parts = readFileSync("src/components/pinnwand/MemoParts.tsx", "utf8");
const compact = parts.slice(parts.indexOf("{compact ? ("), parts.indexOf(") : (", parts.indexOf("{compact ? (")));

describe("Aufnahme-Leiste in der Kachel", () => {
  it("eine weiße Pille 44 px: 🗑 links, Zeit, Welle (wird schmaler statt abgeschnitten), ➤ rechts 38 px mit 44 px Tippfläche", () => {
    expect(compact).toMatch(/h-11 min-w-0 items-center[^"]*rounded-full bg-tile-inner/);
    expect(compact.indexOf('aria-label="Verwerfen"')).toBeLessThan(compact.indexOf('aria-label="Senden"'));
    expect(compact).toMatch(/aria-label="Senden" className="hit flex h-\[38px\] w-\[38px\]/);
    expect(compact).toMatch(/<MemoWave [^>]*\bfit\b/);
    expect(parts).toMatch(/fit \? "min-w-0 max-w-\[3px\] flex-1"/);
    expect(compact).toContain("Aufnahme läuft – sprich einfach");
    expect(compact).toMatch(/senden ·[\s\S]*verwerfen/);
  });

  it("während der Aufnahme: kein ＋ – die Leiste ersetzt die Zettel, Senden nur über ➤ (nur antippen, kein Halten)", () => {
    expect(tile).toMatch(/\{recording \? <span className="h-\[26px\] w-\[26px\] shrink-0" aria-hidden \/> :/);
    expect(tile).toMatch(/<RecordingRow recorder=\{recorder\} compact \/>/);
    expect(parts).toMatch(/if \(e\.button !== 0 \|\| freeMode \|\| tapOnly\) return;/);
  });

  it("leer: „Oder 🎙 Sprachnachricht“ nimmt gleich auf; im Fenster „Neuer Zettel“ Mikro antippen, nach dem Senden zu", () => {
    expect(tile).toMatch(/onRecord=\{canRecord \? \(\) => void recorder\.start\("tippen"\) : null\}/);
    const sheet = readFileSync("src/components/pinnwand/NeuerZettel.tsx", "utf8");
    expect(sheet).toMatch(/<MemoMic recorder=\{recorder\} size=\{56\} tapOnly \/>/);
    expect(sheet).toMatch(/useMemoRecorder\(\{ me, farbe, onSent: \(\) => onClose\(\) \}\)/);
  });
});
