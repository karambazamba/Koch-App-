// „Was los?“ (A-055): Abruf beim Kreis Ostholstein. Der HTML-Parser WARTET
// AUF ECHTE BEISPIELSEITEN (tests/fixtures/kreis-oh/) und liefert bis dahin
// sicher nichts; geprüft wird alles drumherum: ID aus dem Link, Blättern über
// ofs_1, robots.txt, 1 Anfrage pro Sekunde, User-Agent, Auswertung der Texte.
import { describe, expect, it, vi } from "vitest";
import { holeKreisOh, JE_SEITE, listenUrl, USER_AGENT, zuEvent, type Holer } from "@/lib/region/kreisOh/abruf";
import { idAusLink, parseDetail, parseListe, PARSER_BEREIT, type ListenEintrag, type ListenSeite } from "@/lib/region/kreisOh/parser";
import { leseRobots } from "@/lib/region/kreisOh/robots";

describe("Parser (wartet auf echte Beispielseiten)", () => {
  it("liefert sicher nichts und ist als nicht bereit markiert", () => {
    expect(PARSER_BEREIT).toBe(false);
    expect(parseListe("<html><body>irgendwas</body></html>")).toEqual({ eintraege: [], weiter: false });
    expect(parseDetail("<html></html>")).toBeNull();
  });

  it("ID aus FID=3906.<id>.1, auch URL-kodiert", () => {
    expect(idAusLink("https://www.kreis-oh.de/index.php?ModID=11&FID=3906.12345.1&object=tx%7C3906.12345.1")).toBe("12345");
    expect(idAusLink("/index.php?FID%3D3906.987.1")).toBe("987");
    expect(idAusLink("/index.php?FID=3906.987.12")).toBeNull();
    expect(idAusLink("/index.php?FID=1234.5.1")).toBeNull();
    expect(idAusLink("%E0%A4%A")).toBeNull();
  });

  it("Blättern über ofs_1 (25 je Seite), eigener User-Agent", () => {
    expect(JE_SEITE).toBe(25);
    expect(listenUrl(0)).toBe("https://www.kreis-oh.de/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/");
    expect(listenUrl(25)).toMatch(/\/Veranstaltungen\/\?ofs_1=25$/);
    expect(USER_AGENT).toBe("Mia-App (mia.karamba-eis.de)");
  });
});

describe("robots.txt", () => {
  it("Gruppe „*“, längste Regel gewinnt, Allow schlägt Disallow, Crawl-delay mindestens 1 s", () => {
    const r = leseRobots("User-agent: *\nDisallow: /intern/\nAllow: /intern/frei\nCrawl-delay: 3\n\nUser-agent: BoeserBot\nDisallow: /", USER_AGENT);
    expect(r.erlaubt("/Bildung-Kultur-Sport/Veranstaltungen/")).toBe(true);
    expect(r.erlaubt("/intern/geheim")).toBe(false);
    expect(r.erlaubt("/intern/frei/x")).toBe(true);
    expect(r.pauseMs).toBe(3000);
    expect(leseRobots(null, USER_AGENT)).toMatchObject({ pauseMs: 1000 });
    expect(leseRobots("", USER_AGENT).erlaubt("/x")).toBe(true);
  });
  it("eigene Gruppe für Mia-App gilt vor „*“; Muster mit * und $", () => {
    const r = leseRobots("User-agent: *\nDisallow:\n\nUser-agent: Mia-App\nDisallow: /*.pdf$\nDisallow: /suche", USER_AGENT);
    expect(r.erlaubt("/flyer.pdf")).toBe(false);
    expect(r.erlaubt("/flyer.pdf?x")).toBe(true);
    expect(r.erlaubt("/suche?q=1")).toBe(false);
  });
});

const eintrag = (o: Partial<ListenEintrag> = {}): ListenEintrag => ({ id: "4711", titel: "Nachtwächter-Rundgang", datumText: "Sa, 24.10.2026", zeitText: "17:00 Uhr", ortText: "Treffpunkt Tourist-Info, Markt 19, Eutin", artText: null, link: "https://www.kreis-oh.de/index.php?FID=3906.4711.1", ...o });

describe("Text eines Eintrags → Veranstaltung", () => {
  it("nur ID, Titel, Datum, Uhrzeit, Ort, Link, Kategorien", () => {
    const e = zuEvent(eintrag(), null, 2026)!;
    expect(e).toEqual({ id: "kreisoh-4711", quelle: "kreisoh", titel: "Nachtwächter-Rundgang", datum: "2026-10-24", bis_datum: null, beginn: "17:00", ende: null, ganztags: false, ort: "Treffpunkt Tourist-Info, Markt 19, Eutin", gemeinde: "Eutin", link: "https://www.kreis-oh.de/index.php?FID=3906.4711.1", kategorien: ["draussen"] });
  });
  it("Detail ergänzt Uhrzeit/Ort; ohne lesbares Datum nichts", () => {
    const e = zuEvent(eintrag({ zeitText: null, ortText: null }), { id: "4711", titel: "Nachtwächter-Rundgang", datumText: "Sa, 24.10.2026", zeitText: "17:00 – 18:30 Uhr", ortText: "Markt 19, Eutin", artText: "Führung" }, 2026)!;
    expect(e).toMatchObject({ beginn: "17:00", ende: "18:30", gemeinde: "Eutin", kategorien: ["draussen", "kultur"] });
    expect(zuEvent(eintrag({ datumText: "demnächst" }), null, 2026)).toBeNull();
  });
});

describe("Abruf (höflich)", () => {
  it("ohne fertigen Parser kein einziger Abruf beim Kreis", async () => {
    const holen = vi.fn<Holer>();
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen })).toEqual({ events: [], seiten: 0, grund: "wartet" });
    expect(holen).not.toHaveBeenCalled();
  });

  it("robots.txt zuerst; verboten → nichts weiter", async () => {
    const holen = vi.fn<Holer>(async () => ({ status: 200, text: "User-agent: *\nDisallow: /" }));
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, bereit: true, warten: async () => {} })).toMatchObject({ grund: "robots", seiten: 0 });
    expect(holen).toHaveBeenCalledTimes(1);
    expect(holen.mock.calls[0][0]).toBe("https://www.kreis-oh.de/robots.txt");
  });

  it("leerer Parser: eine Listenseite, dann Schluss (0 Treffer = „leer“)", async () => {
    const urls: string[] = [];
    const pausen: number[] = [];
    const holen: Holer = async (url) => (urls.push(url), { status: url.endsWith("robots.txt") ? 404 : 200, text: "<html></html>" });
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, bereit: true, warten: async (ms) => void pausen.push(ms) })).toEqual({ events: [], seiten: 1, grund: "leer" });
    expect(urls).toEqual(["https://www.kreis-oh.de/robots.txt", listenUrl(0)]);
    expect(pausen).toEqual([1000]);
  });

  it("Fehler der Seite oder des Netzes → „fehler“, nichts Kaputtes", async () => {
    const kaputt: Holer = async (url) => ({ status: url.endsWith("robots.txt") ? 404 : 503, text: "" });
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen: kaputt, bereit: true, warten: async () => {} })).toMatchObject({ events: [], grund: "fehler" });
    const offline: Holer = async () => {
      throw new Error("offline");
    };
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen: offline, bereit: true, warten: async () => {} })).toEqual({ events: [], seiten: 0, grund: "fehler" });
  });
});

describe("Blättern (mit gestelltem Parser, nur für den Ablauf)", () => {
  it("weiter über ofs_1, Schluss wenn alles nach dem Zeitraum liegt; Detail nur bei Bedarf; 1 s Pause", async () => {
    vi.resetModules();
    const seiten: Record<string, ListenSeite> = {
      "0": { eintraege: [eintrag({ id: "1" }), eintrag({ id: "2", zeitText: null, ortText: null, link: "https://www.kreis-oh.de/index.php?FID=3906.2.1" })], weiter: true },
      "25": { eintraege: [eintrag({ id: "3", datumText: "Mo, 30.11.2026" })], weiter: true },
    };
    vi.doMock("@/lib/region/kreisOh/parser", async (orig) => ({
      ...(await orig<typeof import("@/lib/region/kreisOh/parser")>()),
      parseListe: (html: string) => seiten[html] ?? { eintraege: [], weiter: false },
      parseDetail: () => ({ id: "2", titel: "Laternenbasteln für Kinder", datumText: "So, 25.10.2026", zeitText: "11:00 Uhr", ortText: "Kreisbibliothek Eutin", artText: null }),
    }));
    const { holeKreisOh: hole } = await import("@/lib/region/kreisOh/abruf");
    const urls: string[] = [];
    const pausen: number[] = [];
    const holen: Holer = async (url) => {
      urls.push(url);
      if (url.endsWith("robots.txt")) return { status: 404, text: "" };
      const ofs = url.match(/ofs_1=(\d+)/)?.[1] ?? (url.includes("FID") ? "detail" : "0");
      return { status: 200, text: ofs };
    };
    const r = await hole({ heute: "2026-10-21", bis: "2026-11-04", holen, bereit: true, warten: async (ms) => void pausen.push(ms) });
    expect(r.grund).toBe("ok");
    expect(r.seiten).toBe(2);
    expect(r.events.map((e) => e.id)).toEqual(["kreisoh-1", "kreisoh-2"]);
    expect(r.events[1]).toMatchObject({ titel: "Laternenbasteln für Kinder", datum: "2026-10-25", beginn: "11:00", kategorien: ["kinder"] });
    expect(urls).toEqual(["https://www.kreis-oh.de/robots.txt", listenUrl(0), "https://www.kreis-oh.de/index.php?FID=3906.2.1", listenUrl(25)]);
    expect(pausen.every((ms) => ms >= 1000)).toBe(true);
    vi.doUnmock("@/lib/region/kreisOh/parser");
  });
});
