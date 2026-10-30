// A-068: Paket 002 – jede Sorte mindestens 180 Karten. Neue Karten sind
// vorher gegen alle vorhandenen geprüft, mit derselben Ähnlichkeitsprüfung
// wie Mias KI-Nachschub (`aehnlichkeitsIndex`: Frage allein und Frage +
// Antwort, Trigramme): Witze und Rätsel dürfen keiner früheren Karte und
// keiner anderen neuen ähneln, Rätsel-Lösungen gibt es nur einmal. Bei
// Platt ist der Fragerahmen („Was ist ein …?“) immer gleich – dort zählen
// das Wort selbst und seine Bedeutung: beides nur einmal.
import { describe, expect, it } from "vitest";
import { aehnlichkeitsIndex, normalisiere } from "@/lib/wundertuete/aehnlich";
import { PAKETE } from "@/lib/wundertuete/pakete";
import { RAETSEL_PAKETE } from "@/lib/raetsel/pakete";

const [alt, neu] = PAKETE;
const [rAlt, rNeu] = RAETSEL_PAKETE;
const fett = (t: string) => normalisiere(t.match(/\*\*(.+?)\*\*/)?.[1] ?? "");
const wort = (t: string) => normalisiere(t.match(/„(.+?)“/)?.[1] ?? t);

/** Neue Karten der Reihe nach gegen alle früheren (alte und schon geprüfte neue) */
function zuAehnliche(fruehere: { v: string; h: string }[], neue: { id: string; v: string; h: string }[]) {
  const index = aehnlichkeitsIndex(fruehere.flatMap((k) => [k.v, `${k.v} ${k.h}`]));
  const treffer: string[] = [];
  for (const k of neue) {
    if (index.zuAehnlich(k.v) || index.zuAehnlich(`${k.v} ${k.h}`)) treffer.push(k.id);
    index.merke(k.v);
    index.merke(`${k.v} ${k.h}`);
  }
  return treffer;
}

describe("Paket 002 (A-068)", () => {
  it("neue Karten: 148 Witze, 90 Platt, 89 Rätsel – zusammen je Sorte 180", () => {
    const zahl = (s: string) => neu.eintraege.filter((e) => e.sorte === s).length;
    expect([zahl("witz"), zahl("platt"), zahl("angeberwissen"), rNeu.eintraege.length]).toEqual([148, 90, 0, 89]);
    const alle = [...alt.eintraege, ...neu.eintraege];
    for (const s of ["witz", "platt", "angeberwissen"]) expect(alle.filter((e) => e.sorte === s).length, s).toBe(180);
    expect(rAlt.eintraege.length + rNeu.eintraege.length).toBe(180);
  });

  it("Witze: keiner ähnelt einem vorhandenen oder einem anderen neuen", () => {
    const k = (e: { id: string; vorne: string; hinten?: string }) => ({ id: e.id, v: e.vorne, h: e.hinten ?? "" });
    expect(zuAehnliche(alt.eintraege.filter((e) => e.sorte === "witz").map(k), neu.eintraege.filter((e) => e.sorte === "witz").map(k))).toEqual([]);
  });

  it("Rätsel: keins ähnelt einem vorhandenen, jede Lösung nur einmal", () => {
    const k = (e: { id: string; frage: string; loesung: string }) => ({ id: e.id, v: e.frage, h: e.loesung });
    expect(zuAehnliche(rAlt.eintraege.map(k), rNeu.eintraege.map(k))).toEqual([]);
    const loesungen = [...rAlt.eintraege, ...rNeu.eintraege].map((e) => fett(e.loesung));
    const doppelt = rNeu.eintraege.filter((e) => loesungen.filter((l) => l === fett(e.loesung)).length > 1).map((e) => e.id);
    expect(doppelt).toEqual([]);
  });

  it("Platt: jedes Wort und jede Bedeutung nur einmal, immer mit Quelle", () => {
    const pl = [...alt.eintraege, ...neu.eintraege].filter((e) => e.sorte === "platt");
    const neuePl = neu.eintraege.filter((e) => e.sorte === "platt");
    const doppelt = (f: (t: string) => string, feld: "vorne" | "hinten") => neuePl.filter((e) => pl.filter((x) => f(x[feld] ?? "") === f(e[feld] ?? "")).length > 1).map((e) => e.id);
    expect(doppelt(wort, "vorne")).toEqual([]);
    expect(doppelt(fett, "hinten")).toEqual([]);
    for (const e of neuePl) expect(e.quelle, e.id).toMatch(/Sass|Duden/);
  });

  it("die Prüfung schlägt bei umformulierten Doppelten an", () => {
    expect(zuAehnliche([{ v: "Was ist orange und läuft durch den Wald?", h: "Eine Wanderine." }], [{ id: "x", v: "Was ist orange und wandert durch den Wald?", h: "Eine Wanderine." }])).toEqual(["x"]);
  });
});
