// „Was los?“ (A-055): Abruf beim Kreis Ostholstein. Parser an echten Seiten
// (tests/fixtures/kreis-oh/, 29.10.2026), dazu alles drumherum: ID aus dem
// Link, Abfrage je Gemeinde mit Zeitraum, Blättern über ofs_1, robots.txt,
// 1 Anfrage pro Sekunde, User-Agent, Kodierung, Auswertung der Texte.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { holeKreisOh, JE_SEITE, listenUrl, USER_AGENT, zuEvent, type Holer } from "@/lib/region/kreisOh/abruf";
import { dekodiere, entitaeten, idAusLink, parseDetail, parseGemeinden, parseListe, PARSER_BEREIT, type ListenEintrag, type ListenSeite } from "@/lib/region/kreisOh/parser";
import { leseRobots } from "@/lib/region/kreisOh/robots";

const fixture = (name: string) => readFileSync(join(__dirname, "../fixtures/kreis-oh", name));
const seite = (name: string) => dekodiere(fixture(name), null);

describe("Parser (echte Seiten vom 29.10.2026)", () => {
  it("ist bereit", () => expect(PARSER_BEREIT).toBe(true));

  it("Seiten sind ISO-8859-15: Umlaute kommen richtig an", () => {
    const html = seite("liste-0.html");
    expect(html).toContain("Ganzkörpertraining");
    expect(html).not.toContain("\uFFFD");
    expect(dekodiere(new TextEncoder().encode("Grömitz"), "text/html; charset=utf-8")).toBe("Grömitz");
  });

  it("Liste: 25 Einträge mit ID, Titel, Datum, Uhrzeit, Link; weiter = ja", () => {
    const { eintraege, weiter } = parseListe(seite("liste-0.html"));
    expect(eintraege).toHaveLength(25);
    expect(weiter).toBe(true);
    expect(eintraege[0]).toEqual({
      id: "10211",
      titel: "Wochenmarkt in Malente",
      datumText: "29.10.2026",
      zeitText: "08:00 bis 12:00 Uhr",
      ortText: null,
      artText: null,
      link: "https://www.kreis-oh.de/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/Wochenmarkt-in-Malente.php?object=tx,3906.4.1&ModID=11&FID=3906.10211.1&NavID=2454.143",
    });
    expect(eintraege[1].titel).toBe("GESUND & ENTSPANNT - Pilates");
    expect(eintraege.every((e) => /^\d+$/.test(e.id) && /^\d\d\.\d\d\.\d{4}/.test(e.datumText))).toBe(true);
    expect(new Set(eintraege.map((e) => e.id)).size).toBe(25);
  });

  it("mehrtägig ohne Uhrzeit: „31.10.2026 bis 14.11.2026“, ganztags", () => {
    const e = parseListe(seite("liste-25.html")).eintraege.find((x) => x.datumText.includes("bis"))!;
    expect(e.datumText).toBe("31.10.2026 bis 14.11.2026");
    expect(e.zeitText).toBeNull();
    expect(zuEvent(e, null, 2026, "Eutin")).toMatchObject({ datum: "2026-10-31", bis_datum: "2026-11-14", ganztags: true, beginn: null });
  });

  it("letzte Seite einer Gemeinde: 2 Einträge, weiter = nein", () => {
    const { eintraege, weiter } = parseListe(seite("eutin-75.html"));
    expect(eintraege).toHaveLength(2);
    expect(weiter).toBe(false);
  });

  it("Gemeinden aus dem Suchformular", () => {
    const g = parseGemeinden(seite("liste-0.html"));
    expect(g).toHaveLength(31);
    expect(g).toContainEqual({ wert: "247.1", name: "Eutin" });
    expect(g).toContainEqual({ wert: "247.64", name: "Bad Malente-Gremsmühlen" });
    expect(g).toContainEqual({ wert: "247.83", name: "Kreis Ostholstein" });
  });

  it("Detailseite: Datum, Uhrzeit, Ort mit Ortschaft", () => {
    expect(parseDetail(seite("detail-10211.html"))).toEqual({ id: "10211", titel: "Wochenmarkt in Malente", datumText: "29.10.2026", zeitText: "08:00 bis 12:00 Uhr", ortText: "Lenter Platz Malente, Bahnhofstraße 42, Bad Malente-Gremsmühlen", artText: null });
    expect(parseDetail("<html></html>")).toBeNull();
    expect(parseListe("<html><body>irgendwas</body></html>")).toEqual({ eintraege: [], weiter: false });
  });

  it("Eintrag einer Gemeinde → Veranstaltung mit Gemeinde als Ort", () => {
    const [e] = parseListe(seite("eutin-0.html")).eintraege;
    expect(zuEvent(e, null, 2026, "Eutin")).toMatchObject({ quelle: "kreisoh", datum: "2026-10-29", beginn: "11:00", ort: "Eutin", gemeinde: "Eutin" });
    expect(zuEvent(e, null, 2026, "Schönwalde a. B.")).toMatchObject({ gemeinde: "Schönwalde am Bungsberg" });
    expect(zuEvent({ ...e, titel: "Kreisweiter Aktionstag" }, null, 2026, "Kreis Ostholstein")).toMatchObject({ ort: "Ostholstein", gemeinde: null });
  });

  it("Entitäten", () => {
    expect(entitaeten("&quot;Urbane Realit&auml;t&quot; &amp; mehr&#160;&#x2013;")).toBe('"Urbane Realität" & mehr\u00a0–');
    expect(entitaeten("&unbekannt; &#0;")).toBe("&unbekannt; &#0;");
  });

  it("ID aus FID=3906.<id>.1, auch URL-kodiert", () => {
    expect(idAusLink("https://www.kreis-oh.de/index.php?ModID=11&FID=3906.12345.1&object=tx%7C3906.12345.1")).toBe("12345");
    expect(idAusLink("/index.php?FID%3D3906.987.1")).toBe("987");
    expect(idAusLink("/index.php?FID=3906.987.12")).toBeNull();
    expect(idAusLink("/index.php?FID=1234.5.1")).toBeNull();
    expect(idAusLink("%E0%A4%A")).toBeNull();
  });

  it("Adresse: Zeitraum, Gemeinde, Blättern über ofs_1 (25 je Seite), eigener User-Agent", () => {
    expect(JE_SEITE).toBe(25);
    const u = new URL(listenUrl({ von: "2026-10-29", bis: "2026-11-12", ort: "247.1", ofs: 25 }));
    expect(u.pathname).toBe("/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/index.php");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ dat_tv: "2026-10-29", dat_tb: "2026-11-12", ort: "247.1", ofs_1: "25", ModID: "11", object: "tx,3906.4.1" });
    expect(new URL(listenUrl({ von: "2026-10-29", bis: "2026-11-12" })).searchParams.has("ort")).toBe(false);
    expect(USER_AGENT).toBe("Mia-App (mia.karamba-eis.de)");
  });

  it("robots.txt des Kreises erlaubt die Liste", () => {
    const r = leseRobots(fixture("robots.txt").toString("latin1"), USER_AGENT);
    expect(r.erlaubt("/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/index.php")).toBe(true);
    expect(r.erlaubt("/output/options.php")).toBe(false);
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

const LISTE_HTML = (gemeinden: string, eintraege: string, weiter = false) =>
  `<select name="ort" id="ort"><option value="">-keine Auswahl-</option>${gemeinden}</select><ul class="result-list veranstaltungen">${eintraege}</ul><nav><ul><li><span class="pn_active">1</span></li>${weiter ? '<li><a href="?ofs_1=25">2</a></li>' : ""}</ul></nav>`;
const LI = (id: string, titel: string, datum: string, zeit = "") =>
  `<li><a href="/x.php?FID=3906.${id}.1" title="${titel}"><h3 class="list-title">${titel}</h3><p class="list-icons"><time datetime="">${datum}</time>${zeit ? `<span><i title="Uhrzeit"></i>${zeit} </span>` : ""} </p></a></li>`;

describe("Abruf (höflich)", () => {
  const ruhig = { warten: async () => {}, bereit: true };

  it("nicht bereit: kein einziger Abruf beim Kreis", async () => {
    const holen = vi.fn<Holer>();
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, bereit: false })).toEqual({ events: [], seiten: 0, grund: "wartet" });
    expect(holen).not.toHaveBeenCalled();
  });

  it("robots.txt zuerst; verboten → nichts weiter", async () => {
    const holen = vi.fn<Holer>(async () => ({ status: 200, text: "User-agent: *\nDisallow: /" }));
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, ...ruhig })).toMatchObject({ grund: "robots", seiten: 0 });
    expect(holen).toHaveBeenCalledTimes(1);
    expect(holen.mock.calls[0][0]).toBe("https://www.kreis-oh.de/robots.txt");
  });

  it("je Gemeinde mit Zeitraum, blättert, Gemeinde = Ort, keine Doppelten, 1 s Pause", async () => {
    const urls: string[] = [];
    const pausen: number[] = [];
    const gemeinden = '<option value="247.1">Eutin</option><option value="247.11">Grömitz</option><option value="247.83">Kreis Ostholstein</option>';
    const holen: Holer = async (url) => {
      urls.push(url);
      if (url.endsWith("robots.txt")) return { status: 404, text: "" };
      const q = new URL(url).searchParams;
      const ort = q.get("ort");
      const ofs = q.get("ofs_1");
      if (!ort) return { status: 200, text: LISTE_HTML(gemeinden, LI("1", "Laternenumzug", "24.10.2026"), true) };
      if (ort === "247.1" && !ofs) return { status: 200, text: LISTE_HTML(gemeinden, LI("1", "Laternenumzug", "24.10.2026", "17:00 Uhr") + LI("2", "Lesung", "25.10.2026", "19:00 bis 20:30 Uhr"), true) };
      if (ort === "247.1") return { status: 200, text: LISTE_HTML(gemeinden, LI("3", "Nachtwächter-Rundgang", "26.10.2026", "20:00 Uhr")) };
      if (ort === "247.11") return { status: 200, text: LISTE_HTML(gemeinden, LI("1", "Laternenumzug", "24.10.2026") + LI("4", "Wintermarkt", "30.11.2026")) };
      return { status: 200, text: LISTE_HTML(gemeinden, "") };
    };
    const r = await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, bereit: true, warten: async (ms) => void pausen.push(ms) });
    expect(r.grund).toBe("ok");
    expect(r.seiten).toBe(5);
    expect(r.events.map((e) => [e.id, e.gemeinde, e.beginn])).toEqual([
      ["kreisoh-1", "Eutin", "17:00"],
      ["kreisoh-2", "Eutin", "19:00"],
      ["kreisoh-3", "Eutin", "20:00"],
    ]);
    expect(urls.slice(1).map((u) => Object.fromEntries(new URL(u).searchParams))).toMatchObject([
      { dat_tv: "2026-10-21", dat_tb: "2026-11-04" },
      { ort: "247.1" },
      { ort: "247.1", ofs_1: "25" },
      { ort: "247.11" },
      { ort: "247.83" },
    ]);
    expect(pausen).toHaveLength(5);
    expect(pausen.every((ms) => ms >= 1000)).toBe(true);
  });

  it("hört nach der Zeitgrenze auf und liefert, was schon da ist", async () => {
    let t = 0;
    const gemeinden = '<option value="247.1">Eutin</option><option value="247.11">Grömitz</option>';
    const holen: Holer = async (url) => {
      t += 40_000;
      if (url.endsWith("robots.txt")) return { status: 404, text: "" };
      return { status: 200, text: LISTE_HTML(gemeinden, LI(new URL(url).searchParams.get("ort") === "247.11" ? "9" : "8", "Konzert", "24.10.2026", "19:00 Uhr")) };
    };
    const r = await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen, ...ruhig, uhr: () => t });
    expect(r.events.map((e) => e.id)).toEqual(["kreisoh-8"]);
  });

  it("ohne Gemeinden-Liste oder bei Fehlern → „leer“ bzw. „fehler“, nichts Kaputtes", async () => {
    const leer: Holer = async (url) => ({ status: url.endsWith("robots.txt") ? 404 : 200, text: "<html></html>" });
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen: leer, ...ruhig })).toEqual({ events: [], seiten: 1, grund: "leer" });
    const kaputt: Holer = async (url) => ({ status: url.endsWith("robots.txt") ? 404 : 503, text: "" });
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen: kaputt, ...ruhig })).toMatchObject({ events: [], grund: "fehler" });
    const offline: Holer = async () => {
      throw new Error("offline");
    };
    expect(await holeKreisOh({ heute: "2026-10-21", bis: "2026-11-04", holen: offline, ...ruhig })).toEqual({ events: [], seiten: 0, grund: "fehler" });
  });
});
