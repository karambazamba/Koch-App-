// Pinnwand-Kachel (Tafel 80): Aufnahme = EINE Leiste (Mülleimer, Punkt, Zeit,
// Welle, rechts ➤), ＋ und Mikro während der Aufnahme weg, Senden nur über ➤;
// in Ruhe unten nur „Sprachnachricht“, beim ersten Mal das Schild „schreiben“
// unter dem ＋ (bis zum Tipp darauf oder nach 2 Besuchen); nach dem Senden
// „✓ Gesendet“ und die neue Sprachnachricht zart hervorgehoben.
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

  it("während der Aufnahme: kein ＋, kein Mikro – Senden nur über ➤ (nur antippen, kein Halten)", () => {
    expect(tile).toMatch(/\{recording \? \(\s*<span className="h-\[26px\] w-\[26px\] shrink-0" aria-hidden \/>/);
    expect(tile).toMatch(/\{!recording && canRecord && \(/);
    expect(tile).toMatch(/<MemoMic recorder=\{recorder\} size=\{34\} tapOnly \/>/);
    expect(parts).toMatch(/if \(e\.button !== 0 \|\| freeMode \|\| tapOnly\) return;/);
  });

  it("in Ruhe unten nur „Sprachnachricht“ – der alte Hinweis ist weg; Schild „schreiben“ beim ersten Mal", () => {
    expect(tile).toContain(">Sprachnachricht</span>");
    expect(tile).not.toContain("＋ = schreiben");
    expect(tile).toMatch(/hintSeen === false && \(\s*<span className="pointer-events-none absolute/);
    expect(tile).toContain("schreiben\n");
    expect(tile).toMatch(/markHintSeen\("pinnwand-kachel-1"\)/);
    expect(tile).toMatch(/return \(\) => markHintSeen\("pinnwand-kachel"\)/);
  });

  it("nach dem Senden: „✓ Gesendet“ 1,5 s, neue Sprachnachricht hervorgehoben", () => {
    expect(tile).toMatch(/setTimeout\(\(\) => setSent\(null\), 1500\)/);
    expect(tile).toMatch(/useMemoRecorder\(\{ me, onSent: \(m\) => setSent\(m\.id\) \}\)/);
    expect(tile).toMatch(/sent === item\.id \? "pin-hervor" : ""/);
    expect(tile).toMatch(/Gesendet/);
  });
});
