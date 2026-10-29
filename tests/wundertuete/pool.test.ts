// Mias Wundertüte (A-022): der Pool – feste, eindeutige IDs, keine Dubletten
// (auch nicht ähnlich), Quelle Pflicht bei Fakten, Ton nach Leitbild (ohne
// Druck-Wörter, Gedankenstriche, Emojis, Namen der Begleitung), kurz genug
// für 3 Zeilen, genau EIN fettes Wort hinten, groß genug für Wochen.
import { describe, expect, it } from "vitest";
import { POOL, eintraegeDer, BEISPIEL_KARTE } from "@/lib/wundertuete/pool";
import { SORTEN, SORTE_IDS, antwortTeile, hinweisKurzFuer, ohneFett, sorteMeta, teilText } from "@/lib/wundertuete/sorten";

const STOP = new Set("aber also auch dann dass denn eine einem einen einer eines etwa euer eure eurem euren für habt hast hätte ihr immer kann man mehr mit nach nicht noch nur oder schon sehr sich sind über und viele vier fünf drei zwei eins wann warum was welche welcher welches wenn wer wie wieder wird würdet heute heißt dinge sachen nennt aufzählt findet zeigt etwas wort wörter los platt rund prozent jahre jahren kilometer meter stunden tage".split(" "));
const worte = (t: string) => new Set(ohneFett(t).toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").split(" ").filter((w) => w.length >= 4 && !STOP.has(w)));
const aehnlich = (a: Set<string>, b: Set<string>) => {
  if (a.size < 3 || b.size < 3) return false;
  const gemeinsam = [...a].filter((w) => b.has(w)).length;
  return gemeinsam / new Set([...a, ...b]).size >= 0.6;
};

describe("Pool: IDs und Dubletten", () => {
  it("jede ID gibt es genau einmal, Präfix passt zur Sorte", () => {
    const ids = POOL.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const PRAEFIX: Record<string, string> = { angeberwissen: "aw", platt: "pl", raetsel: "ra", heute100: "h1", tischrunde: "ti", schaetzmal: "sm", werzuerst: "wz" };
    for (const x of POOL) expect(x.id, x.id).toMatch(new RegExp(`^${PRAEFIX[x.sorte]}-\\d{3}$`));
  });

  it("keine gleichen oder ganz ähnlichen Texte (normalisiert, starke Stichwort-Überschneidung)", () => {
    const norm = (t: string) => ohneFett(t).toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();
    const vorne = POOL.map((x) => norm(x.vorne));
    expect(new Set(vorne).size).toBe(vorne.length);
    const sets = POOL.map((x) => worte(`${x.vorne} ${x.hinten ?? ""}`));
    const paare: string[] = [];
    for (let i = 0; i < POOL.length; i++) for (let j = i + 1; j < POOL.length; j++) if (aehnlich(sets[i], sets[j])) paare.push(`${POOL[i].id} ≈ ${POOL[j].id}`);
    expect(paare).toEqual([]);
  });

  it("der Dubletten-Test schlägt bei ähnlichen Texten an", () => {
    expect(aehnlich(worte("Wie schnell fällt ein Regentropfen vom Himmel?"), worte("Wie schnell fällt eigentlich ein Regentropfen vom Himmel?"))).toBe(true);
    expect(aehnlich(worte("Wie viele Herzen hat ein Oktopus?"), worte("Welche Farbe hat das Blut vom Oktopus?"))).toBe(false);
  });
});

describe("Pool: Inhalt", () => {
  it("Fakten, Zahlen, Jahrestage und Platt haben eine Quelle (intern, nie angezeigt)", () => {
    for (const x of POOL.filter((y) => sorteMeta(y.sorte).quellePflicht)) expect(x.quelle?.trim().length ?? 0, x.id).toBeGreaterThan(5);
    // Die Quelle steht nie im sichtbaren Text oder im Teilen-Text
    for (const x of POOL.filter((y) => y.quelle)) expect(teilText(x, "Mia")).not.toContain(x.quelle!);
  });

  it("mit Rückseite: genau EIN fettes Wort bzw. eine fette Zahl; ohne Rückseite (Tischrunde, Wer zuerst) keine Antwort", () => {
    for (const x of POOL) {
      if (!sorteMeta(x.sorte).rueckseite) {
        expect(x.hinten, x.id).toBeUndefined();
        continue;
      }
      expect(x.hinten, x.id).toBeTruthy();
      expect(antwortTeile(x.hinten!).filter((t) => t.fett), x.id).toHaveLength(1);
      expect((x.hinten!.match(/\*\*/g) ?? []).length, x.id).toBe(2);
    }
  });

  it("vorne kurz genug für höchstens 3 Zeilen (S), hinten 1–2 Sätze", () => {
    for (const x of POOL) {
      expect(x.vorne.length, x.id).toBeLessThanOrEqual(64);
      if (x.hinten) expect(ohneFett(x.hinten).split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 1).length, x.id).toBeLessThanOrEqual(2);
    }
  });

  it("Ton: keine Druck-Wörter, keine Gedanken- oder Spiegelstriche, kein Emoji, kein gerader Apostroph, kein fester Name", () => {
    const druck = /(?<![a-zäöüß])(fehlt|fehlen|offen|offene[nrs]?|überfällig\w*|verpasst\w*|noch zu erledigen|du musst|du solltest|vergiss nicht|alles da|alles erledigt|ich vermisse dich|nicht gemacht)(?![a-zäöüß])/i;
    const verboten: string[] = [];
    for (const x of POOL) {
      const t = `${x.vorne} ${x.hinten ?? ""}`;
      if (druck.test(t)) verboten.push(`${x.id}: Druck-Wort`);
      if (/[–—]|(^|\s)-\s/.test(t)) verboten.push(`${x.id}: Strich`);
      if (/\p{Extended_Pictographic}/u.test(t)) verboten.push(`${x.id}: Emoji`);
      if (/[a-zäöüß]'[a-zäöüß]/i.test(t)) verboten.push(`${x.id}: Apostroph`);
      if (/(?<![a-zäöüß])(mia|lotte)(?![a-zäöüß])/i.test(t)) verboten.push(`${x.id}: Name`);
      if (/(?<![a-zäöüß])(diät|kalorie\w*|abnehmen|gewicht|dick|dünn|krankheit|medikament\w*|gott|kirche|partei\w*|wahl|krieg\w*)(?![a-zäöüß])/i.test(t)) verboten.push(`${x.id}: Thema`);
    }
    expect(verboten).toEqual([]);
  });

  it("groß genug für Wochen ohne Wiederholung (jede Sorte gut gefüllt)", () => {
    const zahl = Object.fromEntries(SORTE_IDS.map((s) => [s, eintraegeDer(s).length]));
    expect(zahl.angeberwissen).toBeGreaterThanOrEqual(140);
    expect(zahl.platt).toBeGreaterThanOrEqual(80);
    expect(zahl.raetsel).toBeGreaterThanOrEqual(50);
    expect(zahl.tischrunde).toBeGreaterThanOrEqual(75);
    expect(zahl.schaetzmal).toBeGreaterThanOrEqual(30);
    expect(zahl.werzuerst).toBeGreaterThanOrEqual(35);
    expect(zahl.heute100).toBeGreaterThanOrEqual(10);
    // Tagsüber drei Sorten im Wechsel: über 270 Karten, abends über 140
    expect(zahl.angeberwissen + zahl.platt + zahl.raetsel).toBeGreaterThan(270);
    expect(zahl.tischrunde + zahl.schaetzmal + zahl.werzuerst).toBeGreaterThan(140);
  });

  it("Heute vor 100 Jahren: jeder Eintrag mit Tag und Jahr, „Schietwedder“ nur bei Regen", () => {
    for (const x of eintraegeDer("heute100")) {
      expect(x.tag, x.id).toMatch(/^\d{2}-\d{2}$/);
      expect(x.jahr, x.id).toBeGreaterThan(1900);
    }
    const schiet = POOL.filter((x) => /schietwedder/i.test(x.vorne));
    expect(schiet.length).toBeGreaterThan(0);
    for (const x of schiet) expect(x.anlass?.wetter).toBe("regen");
  });

  it("sieben Sorten mit Kopf, Farbe aus der Palette und Hinweis (Tafel 116)", () => {
    expect(SORTEN.map((s) => `${s.name}:${s.farbe}:${s.symbol}`)).toEqual([
      "Angeberwissen:flieder:lightbulb",
      "Platt för Plietsche:mint:anchor",
      "Rätselstunde:vanille:puzzle",
      "Heute vor 100 Jahren:sand:calendar",
      "Tischrunde:pfirsich:message",
      "Schätz mal!:lavendel:scale",
      "Wer zuerst:rose:dice",
    ]);
    expect(SORTEN.find((s) => s.id === "raetsel")!.hinweis).toBe("Kinder raten zuerst");
    // Nichts endet sichtbar auf „…“ (A-045), Kurzform im Kopf höchstens so lang wie der Name
    for (const s of SORTEN) {
      expect(`${s.name}|${s.kurz}|${s.hinweis}`).not.toMatch(/…|\.\.\./);
      expect(s.kurz.length).toBeLessThanOrEqual(s.name.length);
      expect(hinweisKurzFuer(s.id, false).length).toBeLessThanOrEqual(s.hinweis.length);
    }
    // Schätz mal auf dem iPhone SE (pruefen v0.156): langer Hinweis ließ der Frage zu wenig Platz
    expect(hinweisKurzFuer("schaetzmal", false)).toBe("Am nächsten dran gewinnt");
    expect(SORTEN.find((s) => s.id === "platt")!.hinweis).toBe("„Plietsch“ = schlau");
  });

  it("Beispiel-Tag: feste Karte Angeberwissen", () => {
    expect(BEISPIEL_KARTE.sorte).toBe("angeberwissen");
    expect(BEISPIEL_KARTE.vorne).toBe("Wie schnell fällt eigentlich ein Regentropfen?");
  });

  it("Teilen: „Wusstest du? …“ und „Von <Name>“, ohne Fett-Zeichen und ohne Gedankenstrich", () => {
    const t = teilText(BEISPIEL_KARTE, "Mia");
    expect(t).toBe("Wusstest du? Wie schnell fällt eigentlich ein Regentropfen?\nEin dicker Tropfen schafft rund 30 km/h. Kleine sind viel langsamer.\n\nVon Mia");
    expect(t).not.toMatch(/\*|[–—]/);
    expect(teilText(eintraegeDer("raetsel")[0], "Mia")).toMatch(/^Rätsel: /);
  });
});
