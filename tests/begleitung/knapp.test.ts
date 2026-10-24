// Mia spricht knapp: nie vorstellen, keine Gedankenstriche als Satzverbindung,
// keine Spiegelstriche, höchstens ein „!“ – in allen festen Mia-Texten und
// (über tidyMiaText) in jeder KI-Antwort vor Anzeige und Vorlesen.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { greetingText } from "@/components/begleitung/ChatHistory";
import { identityPrompt, SYSTEM_PROMPT } from "@/lib/begleitung/prompt";
import { haushalt } from "./werkzeugKontext";

describe("tidyMiaText – typische KI-Antworten", () => {
  it.each([
    ["Regen ab 14 Uhr – Regenjacke für Mathis?", "Regen ab 14 Uhr. Regenjacke für Mathis?"],
    ["Erledigt – schau dir den Vorschlag unten an.", "Erledigt, schau dir den Vorschlag unten an."],
    ["Alles klar — steht drin.", "Alles klar, steht drin."],
    ["Super!! Ist drauf!", "Super. Ist drauf!"],
    ["Hier deine Liste:\n- Milch\n- Brot\n• Butter", "Hier deine Liste:\nMilch\nBrot\nButter"],
    ["1. Nudeln kochen\n2. Soße rühren", "Nudeln kochen\nSoße rühren"],
    ["Termin von 9 – 11 Uhr steht drin.", "Termin von 9–11 Uhr steht drin."],
    ["Klappt.", "Klappt."],
  ])("%s", (raw, tidy) => {
    expect(tidyMiaText(raw)).toBe(tidy);
  });

  it("läuft vor Anzeige und Vorlesen", () => {
    expect(readFileSync("src/lib/begleitung/client.ts", "utf8")).toMatch(/onText\?\.\(tidyMiaText\(text\)\)/);
    expect(readFileSync("src/lib/begleitung/client.ts", "utf8")).toMatch(/reply: tidyMiaText\(event\.reply\)/);
    expect(readFileSync("src/lib/begleitung/speech.ts", "utf8")).toMatch(/cleanForSpeech\(tidyMiaText\(text\)\)/);
  });
});

describe("Nie vorstellen", () => {
  it("Begrüßung „Was steht an?“, morgens „Moin! Was steht an?“", () => {
    expect(greetingText(7)).toBe("Moin! Was steht an?");
    expect(greetingText(15)).toBe("Was steht an?");
  });

  it("Hallo-Bildschirm „Moin, ich bin Mia.“ (einzige Vorstellung, Name über helperName), Stimmprobe und Vorlese-Probe ohne", () => {
    const hello = readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8");
    expect(hello).toMatch(/const name = helperName\(\);/);
    expect(hello).toMatch(/const lead = "Moin, ich bin ";/);
    expect(hello).toMatch(/const title = `\$\{lead\}\$\{name\}\.`;/);
    expect(readFileSync("src/components/begleitung/VoiceOffer.tsx", "utf8")).toContain("Moin! So klinge ich.");
    expect(readFileSync("src/lib/begleitung/speech.ts", "utf8")).toContain("Moin! So klinge ich.");
    expect(readFileSync("src/components/einstellungen/settings/ReadingView.tsx", "utf8")).toContain("Moin! Heute gibt’s Spaghetti. Um 18:30 ist alles fertig.");
  });

  it("Prompt: nie vorstellen, knapp, Beispiele gut/schlecht", () => {
    const p = identityPrompt(haushalt());
    expect(p).toContain("Stell dich nie vor");
    expect(p).toContain("Ich organisier euren Alltag.");
    expect(SYSTEM_PROMPT).toContain("Höchstens 2 kurze Sätze");
    expect(SYSTEM_PROMPT).toContain("Keine Gedankenstriche als Satzverbindung");
    expect(SYSTEM_PROMPT.match(/✓ „/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

// Feste Mia-Texte: Begleitung (ohne Werkzeug-Beschreibungen und den Prompt –
// die liest nur die KI), Jetzt-Karte, Kochidee, Pinnwand, Wetter
const DIRS = ["src/lib/begleitung", "src/components/begleitung", "src/lib/heute", "src/lib/essen/kochtipp", "src/lib/pinnwand", "src/lib/wetter"];
const files = DIRS.flatMap((d) => readdirSync(d).filter((f) => /\.tsx?$/.test(f) && !/Tools\.ts$|^prompt\.ts$|^tidy\.ts$/.test(f)).map((f) => `${d}/${f}`));
const DASH = /(?<=[\wäöüß.?!)“"])\s[–—]\s(?=[\wÄÖÜäöü„"(])/;

function literals(src: string): string[] {
  const out: string[] = [];
  const re = /(?<![\w/])(["`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const m of src.matchAll(re)) {
    const lineStart = src.lastIndexOf("\n", m.index) + 1;
    const before = src.slice(lineStart, m.index).trim();
    if (before.startsWith("//") || before.startsWith("*")) continue;
    out.push(m[2]);
  }
  return out;
}

describe("Feste Mia-Texte", () => {
  it("kein „ich bin Mia“, kein Gedankenstrich als Satzverbindung, kein Spiegelstrich, höchstens ein „!“", () => {
    const bad: string[] = [];
    for (const f of files) {
      // Regex-Bausteine und das Kontext-Format für die KI zählen nicht als Text
      for (const s of literals(readFileSync(f, "utf8")).filter((x) => !/\(\?<|\\p\{|\[id=/.test(x))) {
        // Einzige Ausnahme: der Hallo-Bildschirm beim allerersten Start
        if (/ich bin (mia|\$\{name\})|ich bin $/i.test(s) && !f.endsWith("begleitung/HelloScreen.tsx")) bad.push(`${f}: vorgestellt: ${s}`);
        // Zahlen-Spannen („19.10. – 25.10.“) sind erlaubt
        if (DASH.test(s.replace(/\d[\d.:]*\s[–—]\s\d/g, ""))) bad.push(`${f}: Strich: ${s.slice(0, 80)}`);
        if (/(^|\\n)[-•] [A-ZÄÖÜa-zäöü]/.test(s)) bad.push(`${f}: Spiegelstrich: ${s.slice(0, 80)}`);
        if (/!!|!.*!/.test(s.replace(/!==?|![\w[.(]|\)!/g, ""))) bad.push(`${f}: Ausrufezeichen: ${s.slice(0, 80)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
