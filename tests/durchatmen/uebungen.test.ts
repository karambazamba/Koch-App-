// Durchatmen (A-051, Tafel 138/139): die 12 Übungen laufen in simulierter
// Zeit vollständig durch (Phasen, Schritte, genau ein Ende), Pause hält die
// Zeit an, die Ansagen sind kurz (≤ 6 je Übung, keine Zahlen-Zählerei),
// Ende ohne Zähler. Ohne erzeugte Audiodateien spricht die Stimme des Handys.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Lauf, ereignisse, laufDauer, standBei, type Ereignis } from "@/lib/durchatmen/ablauf";
import { ANSAGEN, AUDIO_LISTE, HANDY_LAUT, HANDY_TEMPO, ansagenDer, liesAudioListe, stimmeWeg } from "@/lib/durchatmen/ansagen";
import { SORTEN, UEBUNGEN, dauerText, endeSatz, listenZeile, restText, sortiert, uebungVon } from "@/lib/durchatmen/uebungen";

/** Übung mit einer künstlichen Uhr in 100-ms-Schritten durchlaufen lassen */
function durchlaufen(id: string, schritt = 100) {
  const u = uebungVon(id)!;
  let t = 0;
  const log: Ereignis[] = [];
  const lauf = new Lauf(u, () => t, (e) => log.push(e));
  lauf.start();
  let stand = lauf.tick();
  let runden = 0;
  while (!stand.fertig && runden++ < 100_000) {
    t += schritt;
    stand = lauf.tick();
  }
  return { u, log, stand, t };
}

describe("Die 12 Übungen", () => {
  it("genau 12, je Sorte vertreten, Dauer 30 s bis 2 Min", () => {
    expect(UEBUNGEN).toHaveLength(12);
    expect(new Set(UEBUNGEN.map((u) => u.id)).size).toBe(12);
    for (const s of SORTEN.filter((x) => x.id !== "alle")) expect(UEBUNGEN.some((u) => u.sorte === s.id), s.id).toBe(true);
    for (const u of UEBUNGEN) {
      expect(u.dauer).toBeGreaterThanOrEqual(30);
      expect(u.dauer).toBeLessThanOrEqual(120);
      // Takt oder Schritte, nie keins von beiden
      expect(u.takt.length + u.schritte.length, u.id).toBeGreaterThan(0);
    }
    expect(UEBUNGEN.map((u) => `${u.titel} ${dauerText(u.dauer)}`)).toEqual([
      "Kästchen-Atmen 2 Min",
      "Lang ausatmen 1 Min",
      "Seufzer 30 s",
      "Handy-Pause 1 Min",
      "Augen kreisen 1 Min",
      "Hände auf die Augen 1 Min",
      "Schultern lockern 1 Min",
      "Kurz strecken 1 Min",
      "5 Dinge sehen 1 Min",
      "Füße spüren 1 Min",
      "Eine Sache 2 Min",
      "Kopf leeren 2 Min",
    ]);
  });

  it("Kästchen-Atmen 4 ein · 4 halten · 4 aus · 4 halten, Lang ausatmen 4 · 6, Seufzer 3 Runden", () => {
    expect(uebungVon("kaestchen")!.takt.map((t) => `${t.phase} ${t.s}`)).toEqual(["ein 4", "halten 4", "aus 4", "halten 4"]);
    expect(uebungVon("lang-aus")!.takt.map((t) => t.s)).toEqual([4, 6]);
    const seufzer = durchlaufen("seufzer");
    expect(seufzer.log.filter((e) => e.art === "phase" && e.phase === "lang-aus")).toHaveLength(3);
  });

  it.each(UEBUNGEN.map((u) => u.id))("%s läuft in simulierter Zeit vollständig durch", (id) => {
    const { u, log, stand, t } = durchlaufen(id);
    expect(stand.fertig).toBe(true);
    expect(stand.rest).toBe(0);
    expect(t).toBe(laufDauer(u));
    expect(log.filter((e) => e.art === "ende")).toHaveLength(1);
    expect(log[log.length - 1]).toEqual({ art: "ende" });
    if (u.takt.length) {
      // Erste Phase gleich beim Start, jede Phase des Takts kommt vor
      expect(log[0]).toMatchObject({ art: "phase", phase: u.takt[0].phase, runde: 0 });
      for (const p of u.takt) expect(log.some((e) => e.art === "phase" && e.phase === p.phase), p.phase).toBe(true);
    }
    // Alle Schritte in der richtigen Reihenfolge, jeder genau einmal
    expect(log.flatMap((e) => (e.art === "schritt" ? [e.ansage] : []))).toEqual(u.schritte.map((s) => s.ansage));
  });

  it("grobe Uhr (Bildschirm aus, 1,7 s Sprünge): nichts geht verloren, nichts doppelt", () => {
    for (const u of UEBUNGEN) {
      const fein = durchlaufen(u.id, 100).log;
      const grob = durchlaufen(u.id, 1700).log;
      expect(grob, u.id).toEqual(fein);
    }
  });

  it("Pause hält die Zeit an, Weiter läuft dort weiter", () => {
    const u = uebungVon("lang-aus")!;
    let t = 0;
    const lauf = new Lauf(u, () => t);
    lauf.start();
    t = 10_000;
    expect(lauf.tick().ms).toBe(10_000);
    lauf.pause();
    t = 50_000;
    expect(lauf.tick().ms).toBe(10_000);
    expect(lauf.laeuft).toBe(false);
    lauf.weiter();
    t = 60_000;
    expect(lauf.tick().ms).toBe(20_000);
  });

  it("Stand: Phase, Sekunde, Schritt, Rest", () => {
    const k = uebungVon("kaestchen")!;
    expect(standBei(k, 0)).toMatchObject({ phase: "ein", phaseSekunde: 1, runde: 0 });
    expect(standBei(k, 5_500)).toMatchObject({ phase: "halten", phaseIndex: 1, phaseSekunde: 2 });
    expect(standBei(k, 16_100)).toMatchObject({ phase: "ein", runde: 1 });
    expect(restText(standBei(k, 48_000).rest)).toBe("Noch 1:12");
    const h = uebungVon("handy-pause")!;
    expect(standBei(h, 31_000).schritt).toBe("noch-bisschen");
    expect(standBei(h, 61_000)).toMatchObject({ fertig: true, rest: 0, anteil: 1 });
    // Fokus: gezählt wird nur die Atem-Minute
    expect(laufDauer(uebungVon("eine-sache")!)).toBe(60_000);
    expect(ereignisse(k, 0, 0)).toEqual([]);
  });
});

describe("Liste, Lieblinge, Ende", () => {
  it("Zeilen wie auf der Tafel, Lieblinge oben, Sorten filtern", () => {
    expect(listenZeile(uebungVon("kaestchen")!)).toBe("2 Min · 4 ein, 4 halten, 4 aus");
    expect(listenZeile(uebungVon("handy-pause")!)).toBe("1 Min · in die Ferne schauen");
    expect(sortiert(["fuesse", "seufzer"])[0].id).toBe("seufzer");
    expect(sortiert(["fuesse", "seufzer"]).slice(0, 2).map((u) => u.id).sort()).toEqual(["fuesse", "seufzer"]);
    expect(sortiert([], "augen").map((u) => u.id)).toEqual(["handy-pause", "augen-kreisen", "haende-augen"]);
  });

  it("Ende ohne Zähler, ohne Serie, ohne Feuerwerk – nur Dauer passend", () => {
    expect(endeSatz(30)).toBe("Eine halbe Minute nur für dich.");
    expect(endeSatz(60)).toBe("Eine Minute nur für dich.");
    expect(endeSatz(120)).toBe("Zwei Minuten nur für dich.");
    const ende = readFileSync("src/components/durchatmen/UebungVollbild.tsx", "utf8").slice(readFileSync("src/components/durchatmen/UebungVollbild.tsx", "utf8").indexOf("function Ende("));
    expect(ende).toContain("Gut gemacht.");
    expect(ende).toContain("Noch eine");
    expect(ende).toContain("Fertig");
    expect(ende).not.toMatch(/\d+\s*(?:×|mal|Tage|Übungen)|Serie|Streak|Rekord|🎉|🔥|Konfetti|confetti/i);
  });
});

describe("Ansagen und Stimme", () => {
  it("höchstens 6 Sätze je Übung, alle vorhanden, kurz, keine Zahlen-Zählerei, keine Gesundheitsversprechen", () => {
    for (const u of UEBUNGEN) {
      expect(u.ansagen.length, u.id).toBeLessThanOrEqual(6);
      expect(ansagenDer(u)).toHaveLength(u.ansagen.length);
      for (const p of u.takt) expect(ANSAGEN[p.phase], p.phase).toBeTruthy();
      for (const s of u.schritte) expect(ANSAGEN[s.ansage], s.ansage).toBeTruthy();
    }
    for (const [id, text] of Object.entries(ANSAGEN)) {
      expect(text.length, id).toBeLessThanOrEqual(60);
      expect(text, id).not.toMatch(/\b(?:eins|zwei|drei|vier)\s*,|\d\s*,\s*\d/i);
      expect(text, id).not.toMatch(/heilt|gesund|Stress weg|Blutdruck|Diagnose|du musst|du solltest/i);
    }
    expect(ANSAGEN.start).toBe("Leg das Handy weg. Ich sag dir, wann.");
    expect(ANSAGEN.ende).toBe("Gut gemacht.");
    expect([ANSAGEN.ferne, ANSAGEN["noch-bisschen"], ANSAGEN.zurueck]).toEqual(["Schau so weit weg, wie es geht.", "Noch ein bisschen.", "Komm zurück."]);
  });

  it("ohne Audiodateien wird die Handy-Stimme gewählt – langsamer und leiser", () => {
    expect(stimmeWeg(null, "ein")).toEqual({ art: "handy", text: "Ein" });
    // Die mitgelieferte Liste ist leer (der Schlüssel liegt nur in Vercel)
    const liste = liesAudioListe(JSON.parse(readFileSync(`public${AUDIO_LISTE}`, "utf8")));
    expect(liste).toBeNull();
    expect(stimmeWeg(liste, "start").art).toBe("handy");
    expect(HANDY_TEMPO).toBeLessThan(1);
    expect(HANDY_LAUT).toBeLessThan(1);
  });

  it("mit erzeugter Datei: die Datei; kaputte oder fremde Einträge zählen nicht", () => {
    const liste = liesAudioListe({ version: 1, stimme: "abc", dateien: { ein: "ein.mp3", aus: "../geheim.mp3", quatsch: "q.mp3" } });
    expect(stimmeWeg(liste, "ein")).toEqual({ art: "datei", url: "/audio/durchatmen/ein.mp3" });
    expect(stimmeWeg(liste, "aus").art).toBe("handy");
    expect(liste?.dateien).toEqual({ ein: "ein.mp3", aus: "../geheim.mp3" });
    expect(liesAudioListe("kaputt")).toBeNull();
  });

  it("Sprachausgabe nur über den einen Weg (speak), Klang erst nach einer Berührung", () => {
    const anleitung = readFileSync("src/lib/durchatmen/anleitung.ts", "utf8");
    expect(anleitung).toMatch(/speak\(text, \{ id: "durchatmen", quelle: "handy"/);
    expect(anleitung).not.toMatch(/speechSynthesis|new Audio\(/);
    const klang = readFileSync("src/lib/durchatmen/klang.ts", "utf8");
    expect(klang.match(/new AC\(\)/g)).toHaveLength(1);
    expect(klang).toMatch(/export function klangFreischalten/);
    // Im Tipp freigeschaltet (Fenster: „Los“ und jede Zeile)
    expect(readFileSync("src/components/durchatmen/DurchatmenFenster.tsx", "utf8")).toMatch(/klangFreischalten\(\);\s*unlockSpeech\(\);\s*starteDurchatmen\(id\);/);
  });
});
