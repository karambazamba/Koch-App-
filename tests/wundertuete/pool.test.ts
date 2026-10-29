// Mias Wundertüte und Rätsel (A-022/A-052): Inhalte der Pakete – feste,
// eindeutige IDs, keine Dubletten (auch nicht ähnlich), Quelle Pflicht bei
// Fakten und Platt, Ton nach Leitbild (ohne Druck-Wörter, Gedankenstriche,
// Emojis, Namen der Begleitung), kurz genug für die Kachel, genau EIN fettes
// Wort in Lösungen, nur noch Witze, Plattdeutsch, Angeberwissen in der Tüte.
import { describe, expect, it } from "vitest";
import { POOL, eintraegeDer, BEISPIEL_KARTE } from "@/lib/wundertuete/pool";
import { RT_POOL } from "@/lib/raetsel/auswahl";
import { ANTIPPEN, FILTER, KOMMT_BALD, SORTEN, SORTE_IDS, antwortTeile, ohneFett, sorteMeta, teilText } from "@/lib/wundertuete/sorten";
import type { Karte } from "@/lib/wundertuete/vorrat";

const RAETSEL = RT_POOL.karten;
const ALLE: Karte[] = [...POOL, ...RAETSEL];

const STOP = new Set("aber also auch dann dass denn eine einem einen einer eines etwa euer eure eurem euren für habt hast hätte ihr immer kann man mehr mit nach nicht noch nur oder schon sehr sich sind über und viele vier fünf drei zwei eins wann warum was welche welcher welches wenn wer wie wieder wird würdet heute heißt dinge sachen nennt aufzählt findet zeigt etwas wort wörter los platt rund prozent jahre jahren kilometer meter stunden tage keine keinen kein trotzdem".split(" "));
const worte = (t: string) => new Set(ohneFett(t).toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").split(" ").filter((w) => w.length >= 4 && !STOP.has(w)));
const aehnlich = (a: Set<string>, b: Set<string>) => {
  if (a.size < 3 || b.size < 3) return false;
  const gemeinsam = [...a].filter((w) => b.has(w)).length;
  return gemeinsam / new Set([...a, ...b]).size >= 0.6;
};

describe("Pakete: IDs und Dubletten", () => {
  it("jede ID gibt es genau einmal (Wundertüte und Rätsel zusammen), Präfix passt zur Sorte", () => {
    const ids = ALLE.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const PRAEFIX: Record<string, RegExp> = { angeberwissen: /^(aw|sm)-\d{3}$/, platt: /^pl-\d{3}$/, witz: /^wi-\d{3}$/, raetsel: /^ra-\d{3}$/ };
    for (const x of ALLE) expect(x.id, x.id).toMatch(PRAEFIX[x.sorte]);
  });

  it("keine gleichen oder ganz ähnlichen Texte (normalisiert, starke Stichwort-Überschneidung)", () => {
    const norm = (t: string) => ohneFett(t).toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();
    const vorne = ALLE.map((x) => norm(x.vorne));
    expect(new Set(vorne).size).toBe(vorne.length);
    const sets = ALLE.map((x) => worte(`${x.vorne} ${x.hinten ?? ""}`));
    const paare: string[] = [];
    for (let i = 0; i < ALLE.length; i++) for (let j = i + 1; j < ALLE.length; j++) if (aehnlich(sets[i], sets[j])) paare.push(`${ALLE[i].id} ≈ ${ALLE[j].id}`);
    expect(paare).toEqual([]);
  });

  it("der Dubletten-Test schlägt bei ähnlichen Texten an", () => {
    expect(aehnlich(worte("Wie schnell fällt ein Regentropfen vom Himmel?"), worte("Wie schnell fällt eigentlich ein Regentropfen vom Himmel?"))).toBe(true);
    expect(aehnlich(worte("Wie viele Herzen hat ein Oktopus?"), worte("Welche Farbe hat das Blut vom Oktopus?"))).toBe(false);
  });
});

describe("Pakete: Inhalt", () => {
  it("nur noch Witze, Plattdeutsch und Angeberwissen in der Tüte; Rätsel eigener Bereich", () => {
    expect(new Set(POOL.map((x) => x.sorte))).toEqual(new Set(["witz", "platt", "angeberwissen"]));
    expect(RAETSEL.every((x) => x.sorte === "raetsel")).toBe(true);
  });

  it("Plattdeutsch und Angeberwissen haben eine Quelle (intern, nie angezeigt), Witze und Rätsel keine nötig", () => {
    for (const x of POOL.filter((y) => sorteMeta(y.sorte).quellePflicht)) expect(x.quelle?.trim().length ?? 0, x.id).toBeGreaterThan(5);
    for (const x of POOL.filter((y) => y.quelle)) expect(teilText(x, "Mia")).not.toContain(x.quelle!);
  });

  it("Lösungen mit genau EINEM fetten Wort; Witze mit Pointe ohne Fett", () => {
    for (const x of [...POOL.filter((y) => sorteMeta(y.sorte).frage), ...RAETSEL]) {
      expect(x.hinten, x.id).toBeTruthy();
      expect(antwortTeile(x.hinten!).filter((t) => t.fett), x.id).toHaveLength(1);
      expect((x.hinten!.match(/\*\*/g) ?? []).length, x.id).toBe(2);
    }
    for (const x of eintraegeDer("witz")) {
      expect(x.hinten, x.id).toBeTruthy();
      expect(x.hinten, x.id).not.toContain("**");
    }
  });

  it("kurz genug: vorne höchstens 64 Zeichen (Rätsel 70, Witze 80), Lösung 1–2 Sätze", () => {
    for (const x of ALLE) {
      expect(x.vorne.length, x.id).toBeLessThanOrEqual(x.sorte === "raetsel" ? 70 : x.sorte === "witz" ? 80 : 64);
      if (x.hinten) expect(ohneFett(x.hinten).split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 1).length, x.id).toBeLessThanOrEqual(2);
    }
  });

  it("Ton: keine Druck-Wörter, keine Gedanken- oder Spiegelstriche, kein Emoji, kein gerader Apostroph, kein fester Name, keine heiklen Themen", () => {
    const druck = /(?<![a-zäöüß])(fehlt|fehlen|offen|offene[nrs]?|überfällig\w*|verpasst\w*|noch zu erledigen|du musst|du solltest|vergiss nicht|alles da|alles erledigt|ich vermisse dich|nicht gemacht)(?![a-zäöüß])/i;
    const verboten: string[] = [];
    for (const x of ALLE) {
      const t = `${x.vorne} ${x.hinten ?? ""}`;
      if (druck.test(t)) verboten.push(`${x.id}: Druck-Wort`);
      if (/[–—]|(^|\s)-\s/.test(t)) verboten.push(`${x.id}: Strich`);
      if (/\p{Extended_Pictographic}/u.test(t)) verboten.push(`${x.id}: Emoji`);
      if (/[a-zäöüß]'[a-zäöüß]/i.test(t)) verboten.push(`${x.id}: Apostroph`);
      if (/(?<![a-zäöüß])(mia|lotte)(?![a-zäöüß])/i.test(t)) verboten.push(`${x.id}: Name`);
      if (/(?<![a-zäöüß])(diät|kalorie\w*|abnehmen|gewicht|dick|dünn|krankheit|medikament\w*|gott|kirche|partei\w*|wahl|krieg\w*|waffe\w*|tot)(?![a-zäöüß])/i.test(t)) verboten.push(`${x.id}: Thema`);
    }
    expect(verboten).toEqual([]);
  });

  it("genug für den Anfang: Angeberwissen, Platt, Witze und Rätsel gut gefüllt", () => {
    const zahl = Object.fromEntries(SORTE_IDS.map((s) => [s, eintraegeDer(s).length]));
    expect(zahl.angeberwissen).toBeGreaterThanOrEqual(175);
    expect(zahl.platt).toBeGreaterThanOrEqual(90);
    expect(zahl.witz).toBeGreaterThanOrEqual(30);
    expect(RAETSEL.length).toBeGreaterThanOrEqual(90);
  });

  it("„Schietwedder“ nur bei Regen", () => {
    const schiet = POOL.filter((x) => /schietwedder/i.test(x.vorne));
    expect(schiet.length).toBeGreaterThan(0);
    for (const x of schiet) expect(x.anlass?.wetter).toBe("regen");
  });
});

describe("Sorten, Kachel-Texte, Teilen", () => {
  it("vier Sorten (A-064: Rätsel dazu) mit Titel je Sorte (Tafel 140), Symbol, Farbe aus der Palette; KI für Witze und Rätsel", () => {
    expect(SORTEN.map((s) => `${s.id}:${s.titel}:${s.symbol}:${s.tone}:${s.ki}`)).toEqual(["witz:Wundertüte:gift:notizen:true", "platt:Platt för Plietsche:anchor:aufgaben:false", "angeberwissen:Wundertüte:gift:sport:false", "raetsel:Wundertüte:gift:essen:true"]);
    for (const s of SORTEN) {
      expect(`${s.titel}|${s.kurz}`).not.toMatch(/…|\.\.\./);
      expect(s.kurz.length).toBeLessThanOrEqual(s.titel.length);
    }
    expect(FILTER.map((f) => f.label)).toEqual(["Alles", "Witze", "Platt", "Wissen", "Rätsel"]);
    expect(ANTIPPEN).toBe("Antippen für die Lösung");
    expect(Object.values(KOMMT_BALD).every((t) => / kommt bald\.$| kommen bald\.$/.test(t))).toBe(true);
  });

  it("Beispiel-Tag: „Was heißt ‚Kiek mol an‘?“ (Tafel 140)", () => {
    expect(BEISPIEL_KARTE.sorte).toBe("platt");
    expect(BEISPIEL_KARTE.vorne).toBe("Was heißt „Kiek mol an“?");
  });

  it("Teilen: „Wusstest du? …“ bei Wissen, „Von <Name>“, ohne Fett-Zeichen und ohne Gedankenstrich", () => {
    const wissen = eintraegeDer("angeberwissen").find((x) => x.id === "aw-001")!;
    const t = teilText(wissen, "Mia");
    expect(t).toBe("Wusstest du? Wie schnell fällt eigentlich ein Regentropfen?\nEin dicker Tropfen schafft rund 30 km/h. Kleine sind viel langsamer.\n\nVon Mia");
    expect(t).not.toMatch(/\*|[–—]/);
    expect(teilText(eintraegeDer("witz")[0], "Mia")).not.toMatch(/^Wusstest/);
  });
});
