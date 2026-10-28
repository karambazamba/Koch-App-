// Seiten-Tipps oben statt unten (Screenshot 27.10. 21:22): der Erster-Besuch-
// Tipp von „Mia denkt mit“ schwebte als weiße Karte unten rechts über der
// Liste, ohne Mia-Gesicht. Jetzt: direkt unter dem Seitentitel im normalen
// Seitenfluss, warmer Verlauf wie die Jetzt-Karte, kleines Mia-Gesicht (nicht
// antippbar, ohne Ring), „Alles klar“ schließt weich nach oben, „Zeig mal“
// nur mit echter Aktion. „Mia stellt vor“ steht unter der Kachel, Pfeil hin.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pfeilZu, type Unit } from "@/lib/core/homeUnits";
import type { HomeTile } from "@/lib/core/homeLayout";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { EMPTY_DENKT } from "@/lib/mia/denktmit/store";
import { ersterBesuch, naechsteVorstellung } from "@/lib/mia/denktmit/vorstellen";
import { SEITE_FUER, VORSTELLEN } from "@/lib/mia/denktmit/seiten";

const read = (f: string) => readFileSync(f, "utf8");
const tile = (id: string, size: "S" | "M" | "L" = "M") => ({ id, size, visible: true }) as HomeTile;
const unit = (...tiles: HomeTile[]): Unit => ({ key: tiles.map((t) => t.id).join("+"), tiles });

describe("Texte der Seiten-Tipps", () => {
  it("Aufgaben: wie gewünscht", () => {
    expect(ersterBesuch({ ...EMPTY_DENKT }, "/aufgaben")).toBe("Hier steht, was ansteht. Was heute nicht klappt, nehm ich mit auf morgen.");
  });

  it("jeder Tipp: zwei kurze Sätze, im Ton, ohne Druck, ohne Fachwort", () => {
    const druck = /(?<![a-zäöüß])(fehlt|offen|überfällig|verpasst|noch zu erledigen|du musst|du solltest|vergiss nicht|alles da)(?![a-zäöüß])/i;
    const fach = /(?<![a-zäöüß])(titel|funktion|modul|feature|eintrag|einträge|kategorie|button|tab|app)(?![a-zäöüß])/i;
    for (const { seite } of VORSTELLEN) {
      expect(seite.split(/(?<=[.!?])\s+/), seite).toHaveLength(2);
      expect(seite.length, seite).toBeLessThanOrEqual(110);
      expect(tidyMiaText(seite), seite).toBe(seite);
      expect(seite, seite).not.toMatch(druck);
      expect(seite, seite).not.toMatch(fach);
      expect(seite, seite).not.toMatch(/ – | - |„|“/);
    }
  });

  it("jede Seite mit Tipp hat einen Text", () => {
    for (const seite of Object.keys(SEITE_FUER)) expect(ersterBesuch({ ...EMPTY_DENKT }, seite), seite).toBeTruthy();
  });
});

describe("Tipp im Seitenfluss unter dem Titel", () => {
  const tipp = read("src/components/begleitung/denktmit/SeitenTipp.tsx");
  const besuch = read("src/components/begleitung/denktmit/ErsterBesuch.tsx");

  it("schwebt nicht mehr: kein fixed, nicht mehr aus KitchenHelper, nicht mehr unter dem Pager", () => {
    for (const src of [tipp, besuch]) expect(src).not.toMatch(/\bfixed\b|UEBER_LEISTE|bottom:/);
    expect(read("src/components/begleitung/KitchenHelper.tsx")).not.toMatch(/ErsterBesuch/);
    const pager = read("src/components/heute/HomePager.tsx");
    expect(pager).not.toMatch(/<\/main>\s*\{tab !== "heute" && <ErsterBesuch/);
    // Kalender/Essen: direkt unter dem großen Titel, nur auf der sichtbaren Seite
    expect(pager).toMatch(/<\/h1>\s*\{t === tab && <ErsterBesuch seite=\{seiteFuerTab\(t\)\} \/>\}/);
  });

  it("Unterseiten: PageHeader setzt den Tipp direkt hinter den festen Kopf (nicht hinein)", () => {
    const header = read("src/components/ui/PageHeader.tsx");
    expect(header).toMatch(/<\/header>\s*<ErsterBesuch /);
    expect(header.indexOf("<ErsterBesuch")).toBeGreaterThan(header.indexOf("</header>"));
  });

  it("Aussehen: Verlauf wie die Jetzt-Karte, feiner orange Rand, „MIA“ in Orange, Mia-Gesicht ohne Ring und nicht antippbar", () => {
    expect(tipp).toMatch(/bg-linear-to-br from-jetzt-from to-jetzt-to/);
    expect(tipp).toMatch(/border border-accent\//);
    expect(tipp).toMatch(/text-accent-strong uppercase">\{helperName\(\)\}/);
    const face = tipp.split("\n").find((l) => l.includes("<BegleitungAvatar"));
    expect(face?.trim()).toBe("<BegleitungAvatar size={36} />");
    expect([...tipp.matchAll(/<button\b[\s\S]*?<\/button>/g)].some((m) => m[0].includes("BegleitungAvatar"))).toBe(false);
    expect(tipp).not.toMatch(/mia-wellen|data-pause-ring|zuhoeren/);
  });

  it("„Alles klar“ orange, „Zeig mal“ weiß und nur mit Aktion; weich nach oben (transform/opacity, 0,8 s, Mia-Kurve)", () => {
    expect(tipp).toMatch(/buttonClass\("primary", "sm"\)[^\n]*\n\s*Alles klar/);
    expect(tipp).toMatch(/aktion \?\? \(zeigMal \? \{ label: "Zeig mal", onClick: zeigMal \} : null\)/);
    expect(tipp).toMatch(/\{knopf &&/);
    expect(tipp).toMatch(/buttonClass\("secondary", "sm"\)[^\n]*\n\s*>\n\s*\{knopf\.label\}/);
    expect(tipp).toMatch(/transition-\[transform,opacity\] duration-\[800ms\] ease-\(--mia-ease\)/);
    expect(tipp).toMatch(/-translate-y-3 opacity-0 motion-reduce:translate-y-0/);
    expect(tipp).toMatch(/TIPP_ZU_MS = 800;/);
    // Tippflächen ≥ 44 px
    expect(tipp.match(/min-h-11/g)).toHaveLength(3);
  });

  it("„Zeig mal“ nur, wo es schon etwas zu zeigen gibt: Einkauf öffnet „Meine Läden“", () => {
    expect(read("src/components/einkauf/EinkaufSeite.tsx")).toMatch(/title="Einkauf"[\s\S]*?tippZeigMal=\{\(\) => setShopsOpen\(true\)\}/);
    expect(read("src/components/kalender/TasksView.tsx")).not.toMatch(/tippZeigMal/);
  });
});

describe("Mia stellt vor: unter der Kachel, Pfeil zur Kachel", () => {
  it("Pfeil links/rechts bei halben Kacheln, mittig bei voller Breite, sonst kein Tipp in der Reihe", () => {
    expect(pfeilZu([unit(tile("termine"))], "termine")).toBe("mitte");
    expect(pfeilZu([unit(tile("pinnwand", "S")), unit(tile("wetter", "S"))], "wetter")).toBe("rechts");
    expect(pfeilZu([unit(tile("pinnwand", "S")), unit(tile("wetter", "S"))], "pinnwand")).toBe("links");
    expect(pfeilZu([unit(tile("essen", "S"), tile("einkauf", "S"))], "einkauf")).toBe("rechts");
    expect(pfeilZu([unit(tile("essen", "S"), tile("einkauf", "S"))], "essen")).toBe("links");
    expect(pfeilZu([unit(tile("notizen", "S"))], "notizen")).toBe("links");
    expect(pfeilZu([unit(tile("termine"))], "aufgaben")).toBeNull();
  });

  it("HomeBoard setzt den Tipp hinter die Reihe der Kachel, nicht im Bearbeiten; keine Karte mehr unter der Jetzt-Karte", () => {
    const board = read("src/components/heute/HomeBoard.tsx");
    expect(board).toMatch(/vorstellen && !editing \? pfeilZu\(row, vorstellen\.tile\)/);
    expect(board).toMatch(/<SeitenTipp [^\n]*pfeil=\{pfeil\}/);
    expect(board).toMatch(/return \[\.\.\.unitRow\(row, r\), tipp\];/);
    const denkt = read("src/components/begleitung/denktmit/useMiaDenkt.ts");
    expect(denkt).toMatch(/karte && karte\.art !== "vorstellen"/);
    expect(denkt).not.toMatch(/vorstellungSpaeter|label: "Später"/);
  });

  it("„Alles klar“ = diese Kachel nie wieder vorstellen", () => {
    const o = { today: "2026-10-25", since: "2026-10-23" };
    const visible = VORSTELLEN.map((v) => v.tile);
    const fertig = { ...EMPTY_DENKT, vorgestellt: { termine: { spaeter: 0, fertig: true } } };
    expect(naechsteVorstellung(fertig, visible, o)?.tile).toBe("aufgaben");
  });
});
