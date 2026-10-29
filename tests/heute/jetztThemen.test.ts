// Jetzt-Karte nur mit Nutzen für heute (A-054): EINE feste Rangliste
// (Gleich → Wetter mit Folge → Essen mit Folge → Geburtstag → Timer/Kochen →
// Wochenende → abends „Morgen“), EIN Thema, höchstens zwei; nichts dran =
// keine Karte. Freitags 12–20 Uhr „Wochenende planen?“. Zeit über `now()`
// (Tag und Uhrzeit aus `at()`), nie „…“, nie „°“, keine Druck-Wörter.
import { afterEach, describe, expect, it } from "vitest";
import { JETZT_MAX, JETZT_RANG, LOSGEH_VORLAUF, isOutdoor, jetztThemen, jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
import { WOCHENENDE_FRAGE, wetterGrob, wochenendChips, type WochenendDaten } from "@/lib/heute/wochenende";
import { berlinTime, setNowForTests, todayIso } from "@/lib/core/now";
import { birthdayName } from "@/lib/kalender/anlass";
import { VERBOTEN } from "@/lib/mia/persona";
import { at, jetztInput, jetztTermin as termin } from "../helpers";

afterEach(() => setNowForTests(null));

/** Lage zur überschriebenen Uhr (`at`) – Datum und Minuten kommen aus `now()` */
function lage(iso: string, extra: Partial<JetztInput> = {}): JetztInput {
  at(iso);
  const today = todayIso();
  const morgen = new Date(`${today}T12:00:00Z`);
  morgen.setUTCDate(morgen.getUTCDate() + 1);
  const m = morgen.toISOString().slice(0, 10);
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][morgen.getUTCDay()];
  return jetztInput(berlinTime().minutes, { today, tomorrow: { label: `Morgen · ${wd}`, date: m, items: [] }, ...extra });
}

const kinds = (x: JetztInput) => jetztTopics(x).map((t) => t.kind);
const WOCHENENDE: WochenendDaten = {
  tage: [
    { date: "2026-10-24", kurz: "Sa", wetter: "sonnig", essen: false },
    { date: "2026-10-25", kurz: "So", wetter: null, essen: true },
  ],
  termine: [{ key: "v@2026-10-24", date: "2026-10-24", time: "10:00", title: "Volleyball" }],
  einkauf: 7,
  einkaufGeplant: false,
};

describe("Rangliste mit überschriebenem now()", () => {
  it("Donnerstag 8:47 ohne passendes Thema → keine Karte", () => {
    const x = lage("2026-10-22T08:47", { upcoming: [termin("Bastelkreis", "15:30", {}, "2026-10-22")] });
    expect(jetztTopics(x)).toEqual([]);
  });

  it("mit Regen am Nachmittag → Wetter-Hinweis mit Folge", () => {
    const x = lage("2026-10-22T08:47", { upcoming: [termin("Bastelkreis", "15:30", {}, "2026-10-22")], rainHours: [15, 16, 17] });
    expect(jetztTopics(x)).toEqual([expect.objectContaining({ kind: "wetter", title: "Ab 15 Uhr Regen.", detail: "Schirm für Bastelkreis." })]);
  });

  it("Regen ohne Plan ändert nichts → keine Karte; draußen „lieber drinnen?“", () => {
    expect(jetztTopics(lage("2026-10-22T08:47", { rainHours: [15, 16] }))).toEqual([]);
    const draussen = lage("2026-10-22T08:47", { upcoming: [termin("Fußball", "17:00", { outdoor: true }, "2026-10-22")], rainHours: [16, 17] });
    expect(jetztTopics(draussen)[0]).toMatchObject({ title: "Ab 16 Uhr Regen.", detail: "Fußball: lieber drinnen?" });
  });

  it("Termin in 40 Min → Gleich-Hinweis zuerst (vor Wetter und Essen), mit Losgehzeit", () => {
    const x = lage("2026-10-22T09:20", {
      upcoming: [termin("Klettergerüst", "10:00", { place: "Spielplatz Mühlenweg" }, "2026-10-22"), termin("Bastelkreis", "15:30", {}, "2026-10-22")],
      rainHours: [15],
      dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: ["Eier"] },
    });
    const list = jetztTopics(x);
    expect(list).toHaveLength(JETZT_MAX);
    expect(list[0]).toMatchObject({ kind: "gleich", title: "Gleich 10:00 Klettergerüst.", detail: `Losgehen um ${9}:45.` });
    expect(list[1].kind).toBe("wetter");
    expect(LOSGEH_VORLAUF).toBe(15);
  });

  it("Gleich: Notiz wird zur Vorbereitung, ohne Ort keine Losgehzeit, ab 60 Min noch nicht", () => {
    expect(jetztTopics(lage("2026-10-22T15:40", { upcoming: [termin("Zahnarzt", "16:15", { note: "Versichertenkarte einpacken", place: "Praxis" }, "2026-10-22")] }))[0]).toMatchObject({ detail: "Versichertenkarte einpacken?" });
    expect(jetztTopics(lage("2026-10-22T09:50", { upcoming: [termin("Klettergerüst", "10:00", {}, "2026-10-22")] }))[0]).toMatchObject({ title: "Gleich 10:00 Klettergerüst.", detail: "" });
    expect(jetztTopics(lage("2026-10-22T09:00", { upcoming: [termin("Klettergerüst", "10:00", {}, "2026-10-22")] }))).toEqual([]);
  });

  it("Essen mit Folge: „Pad Thai heute Abend.“ + Knopf „Auf die Liste: Eier“ – nie „fehlt“", () => {
    const x = lage("2026-10-22T11:00", { dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: ["Eier"] } });
    const [t] = jetztTopics(x);
    expect(t).toMatchObject({ kind: "essen", title: "Pad Thai heute Abend.", aktion: { art: "liste", label: "Auf die Liste: Eier", namen: ["Eier"], gericht: "Pad Thai" } });
    expect(`${t.title} ${t.detail} ${t.aktion?.label}`).not.toMatch(/fehl/i);
    // zum Kochstart ist es zu spät; schon auf der Liste bzw. ohne „Im Haus“ = nichts
    expect(jetztTopics(lage("2026-10-22T18:05", { dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: ["Eier"] } }))).toEqual([]);
    expect(jetztTopics(lage("2026-10-22T11:00", { dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: [] } }))).toEqual([]);
  });

  it("Geburtstag heute oder morgen aus dem Kalender", () => {
    const x = lage("2026-10-22T11:00", { birthdays: [{ title: "Geburtstag Lisa", date: "2026-10-22", when: "heute" }] });
    expect(jetztTopics(x)[0]).toMatchObject({ kind: "geburtstag", title: "Heute hat Lisa Geburtstag." });
    const y = lage("2026-10-22T11:00", { birthdays: [{ title: "Omas Geburtstag", date: "2026-10-23", when: "morgen" }] });
    expect(jetztTopics(y)[0]).toMatchObject({ title: "Morgen hat Oma Geburtstag.", detail: "Noch Zeit für eine Kleinigkeit." });
  });

  it("Timer läuft (ohne Timer-Kachel) und Kochmodus läuft", () => {
    expect(kinds(lage("2026-10-22T11:00", { timer: { name: "Nudeln", left: "4 Min" }, tiles: [] }))).toEqual(["timer"]);
    expect(kinds(lage("2026-10-22T11:00", { timer: { name: "Nudeln", left: "4 Min" }, tiles: ["timer"] }))).toEqual([]);
    expect(jetztTopics(lage("2026-10-22T18:10", { cookingStep: "Zwiebeln würfeln", dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: true, missing: [] } }))[0]).toMatchObject({ kind: "kochen", title: "Kochmodus läuft.", detail: "Pad Thai" });
  });

  it("Freitag 13 Uhr → Wochenende-Karte (allein), mit Chips aus den eigenen Daten", () => {
    const list = jetztTopics(lage("2026-10-23T13:00", { wochenende: WOCHENENDE }));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "wochenende", title: "Wochenende planen?", detail: "Sa 10:00 Volleyball steht schon." });
    expect(list[0].chips?.map((c) => c.label)).toEqual(["Sa sonnig: raus?", "Wochenplan Sa füllen", "Großeinkauf Sa?"]);
  });

  it("Freitag 12:00 ja, 11:59 und 20:30 nicht; „Später“ = heute weg", () => {
    expect(kinds(lage("2026-10-23T12:00", { wochenende: WOCHENENDE }))).toEqual(["wochenende"]);
    expect(kinds(lage("2026-10-23T11:59", { wochenende: WOCHENENDE }))).not.toContain("wochenende");
    expect(kinds(lage("2026-10-23T20:30", { wochenende: WOCHENENDE }))).not.toContain("wochenende");
    expect(kinds(lage("2026-10-23T13:00", { wochenende: WOCHENENDE, hidden: ["wochenende:2026-10-23"] }))).toEqual([]);
  });

  it("Samstag (und jeder andere Tag) → nie eine Wochenende-Karte", () => {
    for (const iso of ["2026-10-24T13:00", "2026-10-25T13:00", "2026-10-22T13:00", "2026-10-19T13:00"]) expect(kinds(lage(iso, { wochenende: WOCHENENDE }))).not.toContain("wochenende");
  });

  it("Wichtigeres vor dem Wochenende: es wartet, bis das erledigt ist", () => {
    const upcoming = [termin("Zahnarzt", "13:30", {}, "2026-10-23")];
    expect(kinds(lage("2026-10-23T13:00", { wochenende: WOCHENENDE, upcoming }))).toEqual(["gleich"]);
    expect(kinds(lage("2026-10-23T13:00", { wochenende: WOCHENENDE, upcoming, hidden: ["gleich:Zahnarzt@2026-10-23"] }))).toEqual(["wochenende"]);
  });

  it("abends ab 18 Uhr → „Morgen · Fr: 8:00 Laufen“ · „2 Termine.“", () => {
    const items = [termin("Laufen", "08:00", {}, "2026-10-23"), termin("Kita-Fest", "15:00", {}, "2026-10-23")];
    const x = lage("2026-10-22T18:00", {});
    const t = jetztTopics({ ...x, tomorrow: { ...x.tomorrow, items } })[0];
    expect(t).toMatchObject({ kind: "morgen", title: "Morgen · Fr: 8:00 Laufen", detail: "2 Termine. Wecker auf 7?", target: { href: "/tag?datum=2026-10-23" } });
    const vorher = lage("2026-10-22T17:59", {});
    expect(jetztTopics({ ...vorher, tomorrow: { ...vorher.tomorrow, items } })).toEqual([]);
    // morgen nichts mit Uhrzeit = keine Karte (kein „Morgen ist ruhig.“)
    expect(jetztTopics(lage("2026-10-22T19:00"))).toEqual([]);
  });

  it("nachts → nur Erlaubtes (Erinnerung, Timer, Kochen, Pause, ab 22 Uhr „Morgen“)", () => {
    const voll = (iso: string) => {
      const x = lage(iso, {
        upcoming: [termin("Spätschicht", iso.slice(11, 13) === "23" ? "23:40" : "05:30", {}, iso.slice(0, 10))],
        rainHours: [0, 1, 2, 3, 4, 5, 23],
        reminder: { key: "r", text: "Tabletten" },
        birthdays: [{ title: "Geburtstag Lisa", date: iso.slice(0, 10), when: "heute" }],
        dish: { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: ["Eier"] },
        tiles: [],
        timer: { name: "Tee", left: "2 Min" },
      });
      return { ...x, tomorrow: { ...x.tomorrow, items: [termin("Laufen", "08:00", {}, x.tomorrow.date)] } };
    };
    expect(kinds(voll("2026-10-22T23:10"))).toEqual(["erinnerung", "timer"]);
    expect(jetztThemen(voll("2026-10-22T23:10")).map((t) => t.kind)).toEqual(["erinnerung", "timer", "morgen"]);
    expect(jetztThemen(voll("2026-10-22T03:00")).map((t) => t.kind)).toEqual(["erinnerung", "timer"]);
  });

  it("Feierabend mit Ruhe und Wochenende: nichts zu Arbeit", () => {
    const upcoming = [termin("Kundentermin", "10:00", { work: true }, "2026-10-24")];
    expect(kinds(lage("2026-10-24T09:30", { upcoming, calm: true }))).toEqual([]);
    expect(kinds(lage("2026-10-22T09:30", { upcoming: [termin("Kundentermin", "10:00", { work: true }, "2026-10-22")] }))).toEqual(["gleich"]);
  });

  it("Rangliste ist fest und erweiterbar: jede Art hat einen Rang, Bausteine ganz hinten", () => {
    expect(JETZT_RANG.gleich).toBeLessThan(JETZT_RANG.wetter);
    expect(JETZT_RANG.wetter).toBeLessThan(JETZT_RANG.essen);
    expect(JETZT_RANG.essen).toBeLessThan(JETZT_RANG.geburtstag);
    expect(JETZT_RANG.geburtstag).toBeLessThan(JETZT_RANG.timer);
    expect(JETZT_RANG.timer).toBeLessThan(JETZT_RANG.wochenende);
    expect(JETZT_RANG.wochenende).toBeLessThan(JETZT_RANG.morgen);
    expect(Math.min(JETZT_RANG.tipp, JETZT_RANG.mail, JETZT_RANG.region)).toBeGreaterThan(JETZT_RANG.morgen);
  });
});

describe("Texte: nur Nutzen, nie Stimmung, nie „…“", () => {
  it("keine Füllsätze mehr: ohne Thema leer statt „Alles ruhig“ oder Spruch", () => {
    for (let h = 0; h < 24; h++) expect(jetztTopics(jetztInput(h * 60 + 5))).toEqual([]);
  });

  it("lange Titel werden nie gekürzt; nie „°“, keine Druck-Wörter", () => {
    const lang = "Elternabend in der Grundschule am Mühlenteich";
    const x = lage("2026-10-22T19:10", { upcoming: [termin(lang, "19:40", { note: "Zettel unterschreiben" }, "2026-10-22")], rainHours: [19] });
    for (const t of jetztThemen(x)) {
      expect(`${t.title} ${t.detail}`).not.toMatch(/…|\.\.\.|°/);
      for (const re of VERBOTEN) expect(re.test(`${t.title} ${t.detail}`)).toBe(false);
    }
    expect(jetztTopics(x)[0].title).toBe(`Gleich 19:40 ${lang}.`);
  });

  it("Felix: nie „…“ – auch bei langen Termin-, Gerichts-, Geburtstags- und Erinnerungstexten", () => {
    const lang = "Zahnarzt Dr. Berg-Hinrichsen mit Jonne und Mathis";
    const x = lage("2026-10-22T09:20", {
      upcoming: [termin(lang, "10:00", { place: "Gemeinschaftspraxis am Mühlenteich, Eingang hinten" }, "2026-10-22")],
      rainHours: [10],
      dish: { name: "Gemüselasagne mit Béchamel und Ziegenkäse", clock: "18:30", minutes: 45, ready: false, missing: ["Ziegenkäse", "Zucchini", "Lasagneplatten"], liste: ["Ziegenkäse", "Zucchini", "Lasagneplatten"] },
      birthdays: [{ title: "Geburtstag Annemarie-Luise von Petersen", date: "2026-10-22", when: "heute" }],
      reminder: { key: "r", text: "Rückruf bei der Krankenkasse wegen der Zahnspange von Mathis" },
      family: { id: "f", title: "Hafermilch ohne Zucker Barista steht auf der Liste", detail: "Hat Lisa gerade gesetzt.", href: "/einkaufsliste" },
    });
    const alle = jetztThemen(x);
    expect(alle.length).toBeGreaterThanOrEqual(5);
    for (const t of alle) expect(`${t.title} ${t.detail} ${t.aktion?.label ?? ""}`).not.toMatch(/…|\.\.\./);
    expect(alle.find((t) => t.kind === "gleich")?.title).toBe(`Gleich 10:00 ${lang}.`);
    expect(alle.find((t) => t.kind === "essen")).toMatchObject({ title: "Gemüselasagne mit Béchamel und Ziegenkäse heute Abend.", aktion: { label: "Auf die Liste: Ziegenkäse, Zucchini +1" } });
    expect(alle.find((t) => t.kind === "erinnerung")?.title).toBe("Rückruf bei der Krankenkasse wegen der Zahnspange von Mathis");
  });

  it("Wochenende: kein „du solltest“, keine Zähler; ohne Daten weniger Chips", () => {
    const chips = wochenendChips(WOCHENENDE);
    for (const c of chips) expect(c.label).not.toMatch(/solltest|musst|\d+ /);
    expect(wochenendChips({ ...WOCHENENDE, tage: WOCHENENDE.tage.map((t) => ({ ...t, wetter: null, essen: true })), einkauf: 2 })).toEqual([]);
    expect(wochenendChips({ ...WOCHENENDE, solo: true })[0].ziel).toEqual({ art: "fragen", text: "Samstag soll’s sonnig werden. Hast du eine Idee, was ich draußen mache?" });
    expect(WOCHENENDE_FRAGE).toBe("Lass uns das Wochenende planen.");
    expect(wetterGrob({ text: "Sonnig", wet: 0, sun: 8 })).toBe("sonnig");
    expect(wetterGrob({ text: "Regnerisch", wet: 5, sun: 0 })).toBe("nass");
    expect(wetterGrob({ text: "Wolkig", wet: 0, sun: 1 })).toBeNull();
  });
});

describe("Hilfen", () => {
  it("draußen: Sport, Spielplatz, Garten – nicht Zahnarzt", () => {
    expect(isOutdoor("Spielplatz")).toBe(true);
    expect(isOutdoor("Zahnarzt")).toBe(false);
    expect(isOutdoor("Training", "", false)).toBe(true);
  });
  it("Geburtstagsname", () => {
    expect(birthdayName("Geburtstag Lisa")).toBe("Lisa");
  });
});
