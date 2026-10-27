// Jetzt-Karte neu gedacht (Tafel 60): nur, was die Kacheln nicht zeigen, mit
// höchstens einem Knopf. Ein Tag wie auf der Tafel (7:00 … 21:00) mit
// Beispieldaten; nie „°“, nie Wetter ohne Plan, keine Zähler, keine
// Druck-Wörter, Zeile 1 höchstens 32 Zeichen.
import { describe, expect, it } from "vitest";
import { QUIET_TEXT, TITLE_MAX, isOutdoor, jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
import { birthdayName } from "@/lib/kalender/anlass";
import { jetztCommand } from "@/lib/heute/jetztCommand";
import { jetztInput as base, jetztTermin as termin } from "../helpers";

const H = (h: number, m = 0) => h * 60 + m;

/** Der Tag von Tafel 60 (Mi): Kita, Zahnarzt mit Karte, Fußball, Elternabend; morgen Spiel */
function tafelTag(minutes: number, extra: Partial<JetztInput> = {}): JetztInput {
  const all = [
    termin("Kita bringen", "08:20", { note: "Turnbeutel für Mathis – liegt im Flur" }),
    termin("Zahnarzt Jonne", "16:15", { note: "Versichertenkarte einpacken" }),
    termin("Mathis Fußball", "17:00", { outdoor: true }),
    termin("Elternabend", "19:30"),
  ];
  return base(minutes, {
    upcoming: all.filter((t) => H(Number(t.time.slice(0, 2)), Number(t.time.slice(3))) >= minutes),
    tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [termin("Mathis Spiel", "10:00", { note: "Trikot gewaschen" }, "2026-10-22")] },
    kids: true,
    pin: minutes >= H(12) && minutes < H(13) ? { id: "p1", author: "Lisa", text: "Bin um 18 Uhr da", when: "12:31" } : null,
    shop: { shop: "REWE", names: ["Milch", "Brot"] },
    dish: { name: "Gemüsepfanne", clock: "18:30", minutes: 45, ready: true, missing: [] },
    ...extra,
  });
}

const first = (x: JetztInput) => jetztTopics(x)[0];
const kinds = (x: JetztInput) => jetztTopics(x).map((t) => t.kind);

describe("Jetzt-Karte: ein Tag wie auf Tafel 60", () => {
  it("7:00 – Vorbereiten (Kita mit Turnbeutel), Knopf „Erledigt“", () => {
    const t = first(tafelTag(H(7)));
    expect(t.kind).toBe("vorbereiten");
    expect(t.title).toBe("Turnbeutel für Mathis – liegt…");
    expect(t.detail).toBe("Heute 8:20 · Kita bringen");
    expect(t.button).toBe("Erledigt");
  });

  it("8:10 – Gleich: in 10 Min mit Zusatz aus der Notiz, „Öffnen“", () => {
    const t = first(tafelTag(H(8, 10)));
    expect(t).toMatchObject({ kind: "gleich", title: "In 10 Min: Kita bringen", detail: "Turnbeutel für Mathis – liegt im Flur", button: "Öffnen" });
  });

  it("10:20 – Vorbereiten für den Zahnarzt", () => {
    expect(first(tafelTag(H(10, 20)))).toMatchObject({ kind: "vorbereiten", title: "Versichertenkarte einpacken?", detail: "Heute 16:15 · Zahnarzt Jonne" });
  });

  it("12:40 – Neu von der Familie: „Antworten“", () => {
    expect(first(tafelTag(H(12, 40)))).toMatchObject({ kind: "pinnwand", title: "Lisa: Bin um 18 Uhr da", button: "Antworten" });
  });

  it("16:45 – Heimweg-Einkauf vor dem Kochen, ohne Zahl, „Liste“", () => {
    const t = first(tafelTag(H(16, 45)));
    expect(t).toMatchObject({ kind: "einkauf", title: "Auf dem Heimweg bei REWE?", detail: "Milch, Brot", button: "Liste" });
  });

  it("17:35 – Kochstart, „Kochen“", () => {
    expect(first(tafelTag(H(17, 35)))).toMatchObject({ kind: "kochstart", title: "17:45 kochen: Gemüsepfanne", detail: "Essen um 18:30 · alles im Haus", button: "Kochen" });
  });

  it("19:00 – Absprache Elternabend mit Kindern; mit Eintrag ✓", () => {
    expect(kinds(tafelTag(H(19)))).toContain("absprache");
    const t = jetztTopics(tafelTag(H(19))).find((x) => x.kind === "absprache");
    expect(t).toMatchObject({ title: "19:30 Elternabend", detail: "Wer bleibt bei den Kindern?" });
    const noted = tafelTag(H(19), { upcoming: [termin("Elternabend", "19:30", { note: "Oma bleibt bei den Kindern" })] });
    expect(jetztTopics(noted).find((x) => x.kind === "absprache")?.detail).toBe("Oma bleibt bei den Kindern ✓");
    expect(jetztTopics({ ...noted, kids: false }).some((x) => x.kind === "absprache")).toBe(false);
  });

  it("21:00 – abends nur noch EIN Thema (Tafel 98): morgen steht schon in den Kacheln", () => {
    expect(jetztTopics(tafelTag(H(21)))).toEqual([{ id: "abend:2026-10-21", kind: "abend", title: "Für morgen ist alles sortiert.", detail: "Schönen Abend.", score: 1, target: { href: "/tag?datum=2026-10-22" }, button: null }]);
  });

  it("den ganzen Tag: nie „°“, Zeile 1 ≤ 32 Zeichen, höchstens drei, ein Knopf aus der Liste", () => {
    for (let m = 0; m < 24 * 60; m += 10) {
      const list = jetztTopics(tafelTag(m));
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(3);
      for (const t of list) {
        expect(`${t.title} ${t.detail}`).not.toMatch(/°/);
        expect(t.title.length).toBeLessThanOrEqual(TITLE_MAX);
        expect([null, "Erledigt", "Öffnen", "Antworten", "Liste", "Kochen", "Packliste"]).toContain(t.button);
        // keine Zähler („3 Sachen“, „noch 2“)
        expect(`${t.title} ${t.detail}`).not.toMatch(/\b\d+\s+(Sachen|Dinge|Aufgaben|Termine)\b|noch \d/);
      }
    }
  });
});

describe("Jetzt-Karte: Wetter nur mit Plan", () => {
  it("Regen zur Zeit eines Draußen-Termins → „Regen um 17 Uhr“, sonst nie Wetter", () => {
    const rain = { key: "fb", title: "Mathis Fußball", time: "17:00", word: "Regen" };
    expect(first(tafelTag(H(14), { planWeather: rain, upcoming: [termin("Mathis Fußball", "17:00", { outdoor: true })], pin: null, shop: null, dish: null }))).toMatchObject({
      kind: "wetter",
      title: "Regen um 17 Uhr",
      detail: "Mathis Fußball – lieber drinnen?",
    });
    expect(kinds(tafelTag(H(14), { planWeather: null }))).not.toContain("wetter");
  });

  it("draußen erkennen: Fußball, Spielplatz, Laufen – nicht Zahnarzt", () => {
    expect(isOutdoor("Mathis Fußball")).toBe(true);
    expect(isOutdoor("Treffen", "Spielplatz am See")).toBe(true);
    expect(isOutdoor("Training", "", false)).toBe(true);
    expect(isOutdoor("Zahnarzt Jonne", "Praxis Dr. Meier")).toBe(false);
    expect(isOutdoor("Yoga", "", true)).toBe(true);
  });
});

describe("Jetzt-Karte: nichts doppelt", () => {
  it("Termin ohne Zusatz in ≤ 15 Min nur, wenn die Termine-Kachel fehlt", () => {
    const x = base(H(9, 50), { upcoming: [termin("Telefonat", "10:00")] });
    expect(kinds(x)).not.toContain("gleich");
    expect(kinds({ ...x, tiles: [] })).toContain("gleich");
  });

  it("Gericht erst zum Kochstart (die Essen-Kachel zeigt es sonst); Aufgaben nur ohne Aufgaben-Kachel", () => {
    const dish = { name: "Pasta", clock: "18:30", minutes: 30, ready: true, missing: [] };
    expect(kinds(base(H(15), { dish }))).not.toContain("kochstart");
    expect(kinds(base(H(15), { dish, tiles: [] }))).toContain("kochstart");
    expect(kinds(base(H(17, 40), { dish }))).toContain("kochstart");
    expect(kinds(base(H(10), { urgent: [{ key: "a", title: "Formular" }] }))).not.toContain("aufgabe");
    expect(kinds(base(H(10), { urgent: [{ key: "a", title: "Formular" }], tiles: [] }))).toContain("aufgabe");
  });

  it("abends nie die Kachel-Zeile „Morgen · Do: 9:00 Arzt“ (die Termine-Kachel zeigt sie schon)", () => {
    const x = base(H(20), { tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [termin("Arzt", "09:00", {}, "2026-10-22")] } });
    expect(jetztTopics(x).every((t) => !t.title.startsWith("Morgen · "))).toBe(true);
  });

  it("Einkauf zuerst, wenn der Kochstart noch > 30 Min weg ist – mit Zutaten fürs Essen", () => {
    const x = base(H(17, 30), { shop: { shop: "REWE", names: ["Milch"] }, dish: { name: "Pasta", clock: "18:40", minutes: 30, ready: false, missing: ["Basilikum"] } });
    const t = first(x);
    expect(t.kind).toBe("einkauf");
    expect(t.detail).toBe("Milch, Basilikum fürs Essen");
  });
});

describe("Jetzt-Karte: Knöpfe und Ruhe", () => {
  it("Erinnerung zuerst mit „Erledigt“; erledigt (hidden) kommt heute nicht wieder", () => {
    const x = base(H(9), { reminder: { key: "e1", text: "In 30 Minuten: Jonne abholen." } });
    expect(first(x)).toMatchObject({ kind: "erinnerung", button: "Erledigt" });
    expect(kinds({ ...x, hidden: ["erinnerung:e1"] })).not.toContain("erinnerung");
  });

  it("Packliste fürs Training heute", () => {
    expect(first(base(H(9), { sport: { key: "s", title: "Fußball", time: "17:00", pack: ["Fußballschuhe", "Schienbeinschoner", "Trinkflasche"] } }))).toMatchObject({
      kind: "packliste",
      title: "Fußballschuhe einpacken?",
      detail: "Heute 17:00 · Fußball",
      button: "Erledigt",
    });
  });

  it("nichts Passendes: „Alles ruhig. Ich sag Bescheid.“ ohne Zahlen", () => {
    const t = jetztTopics(base(H(11)));
    expect(t).toEqual([{ id: "ruhig:2026-10-21", kind: "ruhig", title: QUIET_TEXT, detail: "", score: 1, target: null, button: null }]);
  });

  it("nachts nur Erinnerung/Timer/Geburtstag; Feierabend nur Sanftes", () => {
    const x = base(H(23), { pin: { id: "p", author: "Lisa", text: "Hi", when: "22:50" }, reminder: { key: "r", text: "Morgen um 8:00: Arzt." } });
    expect(kinds(x)).toEqual(["erinnerung"]);
    expect(kinds(base(H(10), { calm: true, upcoming: [termin("Meeting", "10:05", { work: true, note: "Folien" })] }))).not.toContain("gleich");
  });

  it("Geburtstag heute mit „Erledigt“, Wochencheck mit „Öffnen“, Beispiel-Tag ohne Knopf", () => {
    expect(first(base(H(9), { birthdays: [{ title: "Omas Geburtstag", date: "2026-10-21", when: "heute" }] }))).toMatchObject({ title: "Heute hat Oma Geburtstag", button: "Erledigt" });
    expect(first(base(H(18), { weekCheck: "2026-10-19" }))).toMatchObject({ kind: "wochencheck", button: "Öffnen" });
    expect(first(base(H(11), { demo: true }))).toMatchObject({ kind: "beispiel", button: null });
  });

  it("selbst eingeschaltete Bausteine leise: Region-Tipp nur ohne Tipps-Kachel, kleiner Tipp", () => {
    const region = { id: "t1", title: "Tipp: Laternenumzug", detail: "Sa · Eutin" };
    expect(kinds(base(H(11), { region }))).toContain("region");
    expect(kinds(base(H(11), { region, tiles: ["tipps"] }))).not.toContain("region");
    expect(first(base(H(11), { tip: "Kräuter im Glas halten länger" }))).toMatchObject({ kind: "tipp", button: null });
  });

  it("Interesse verschiebt die Reihenfolge (begrenzt)", () => {
    const x = base(H(10), { pin: { id: "p", author: "Lisa", text: "Hallo", when: "9:58" }, upcoming: [termin("Arzt", "15:00", { note: "Karte" })] });
    expect(first(x).kind).toBe("pinnwand");
    expect(first({ ...x, weights: { vorbereiten: 6, pinnwand: -6 } }).kind).toBe("vorbereiten");
  });
});

describe("Wer hat Geburtstag?", () => {
  it("vorn oder hinten, mit Genitiv", () => {
    expect(birthdayName("Omas Geburtstag")).toBe("Oma");
    expect(birthdayName("Geburtstag von Klaus")).toBe("Klaus");
    expect(birthdayName("Klaus Geburtstag")).toBe("Klaus");
    expect(birthdayName("Feier")).toBeNull();
  });
});

describe("Jetzt-Karte per Satz an/aus", () => {
  it("versteht die Sätze, auch die alten zur Startseite", () => {
    expect(jetztCommand("Blende die Jetzt-Karte aus")).toBe(false);
    expect(jetztCommand("Zeig die Jetzt-Karte wieder")).toBe(true);
    expect(jetztCommand("Lass die Startseite immer gleich")).toBe(false);
    expect(jetztCommand("Was steht heute an?")).toBeNull();
  });
});
