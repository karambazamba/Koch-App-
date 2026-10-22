import { describe, expect, it } from "vitest";
import { birthdayName, jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
import { jetztCommand } from "@/lib/heute/jetztCommand";

const H = (h: number, m = 0) => h * 60 + m;

function input(over: Partial<JetztInput> = {}): JetztInput {
  return {
    minutes: H(12),
    today: "2026-10-21",
    calm: false,
    upcoming: [],
    tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] },
    urgent: [],
    dueToday: [],
    allDone: false,
    pin: null,
    weatherTip: null,
    weatherNow: null,
    dish: null,
    dinnerFree: false,
    birthdays: [],
    sport: null,
    shop: null,
    timer: null,
    cookingStep: null,
    reminder: null,
    pause: null,
    leisure: null,
    tip: null,
    region: null,
    demo: false,
    firstTiles: [],
    weights: {},
    hidden: [],
    ...over,
  };
}

const kinds = (x: JetztInput) => jetztTopics(x).map((t) => t.kind);
const top = (x: JetztInput) => jetztTopics(x)[0];

describe("Jetzt-Karte: nie leer, höchstens drei", () => {
  it("ohne alles: ruhig – tagsüber Sonne, abends Mond, mit Wetter", () => {
    expect(top(input())).toMatchObject({ kind: "ruhig", title: "Heute ist es ruhig ☀️", detail: "Ich sag Bescheid, wenn was ansteht", target: null });
    expect(top(input({ minutes: H(20, 30) })).title).toBe("Heute ist es ruhig 🌙");
    expect(top(input({ weatherNow: { temp: 12, text: "wolkig" } })).kind).toBe("ruhig");
    expect(top(input({ minutes: H(13), weatherNow: { temp: 12, text: "wolkig" } })).detail).toBe("Jetzt 12° · wolkig");
  });

  it("viele Themen: die drei wichtigsten, Erinnerung zuerst", () => {
    const x = input({
      reminder: { key: "r1", text: "In 30 Minuten: Jonne abholen." },
      timer: { name: "Nudeln", left: "4:12" },
      pause: "bis Sonntag",
      cookingStep: "Wasser aufsetzen",
      tip: "Nudelwasser salzen",
    });
    expect(kinds(x)).toEqual(["erinnerung", "timer", "pause"]);
    expect(top(x).target).toEqual({ href: "/tag?datum=2026-10-21" });
  });

  it("ausgeblendete Themen kommen heute nicht wieder", () => {
    const x = input({ reminder: { key: "r1", text: "Erinnerung" }, hidden: ["erinnerung:r1"] });
    expect(kinds(x)).toEqual(["ruhig"]);
  });
});

describe("Jetzt-Karte: Termine", () => {
  const zahnarzt = { key: "z@2026-10-21", title: "Zahnarzt", time: "16:15", date: "2026-10-21" };

  it("bald: 'In 40 Min' mit Ort; gleich: 'Jetzt'", () => {
    const t = top(input({ minutes: H(15, 35), upcoming: [{ ...zahnarzt, place: "Praxis Dr. Meier" }] }));
    expect(t).toMatchObject({ kind: "termin", title: "In 40 Min: Zahnarzt", detail: "16:15 · Praxis Dr. Meier" });
    expect(top(input({ minutes: H(16, 15), upcoming: [zahnarzt] }))).toMatchObject({ title: "Jetzt: Zahnarzt", detail: "um 16:15" });
  });

  it("Regen zur Termin-Zeit: Schirm mitnehmen", () => {
    const x = input({ minutes: H(15, 30), upcoming: [zahnarzt], weatherTip: "☂️ Ab 16 Uhr Regen – Schirm für Zahnarzt" });
    const termin = jetztTopics(x).find((t) => t.kind === "termin")!;
    expect(termin.detail).toBe("Regen – Schirm mit ☂️");
    const wetter = jetztTopics(x).find((t) => t.kind === "wetter")!;
    expect(wetter.title).toBe("Ab 16 Uhr Regen – Schirm für Zahnarzt ☂️");
    expect(wetter.detail).toBe("Wetter ansehen");
  });

  it("später heute: 'Als Nächstes' (nicht morgens); steht oben schon die Termine-Kachel, zählt es weniger", () => {
    const x = input({ minutes: H(12), upcoming: [{ ...zahnarzt, time: "09:05" }, zahnarzt] });
    expect(top(x)).toMatchObject({ kind: "termin", title: "16:15 Zahnarzt", detail: "Als Nächstes heute", score: 28 });
    expect(top({ ...x, firstTiles: ["termine"] }).score).toBe(14);
    expect(kinds(input({ minutes: H(9), upcoming: [zahnarzt] }))).not.toContain("termin");
  });

  it("Feierabend: Arbeit-Termine fallen weg", () => {
    const x = input({ minutes: H(15, 50), calm: true, upcoming: [{ ...zahnarzt, work: true }] });
    expect(kinds(x)).toEqual(["ruhig"]);
  });
});

describe("Jetzt-Karte: Morgens, Wetter, Pinnwand", () => {
  it("morgens: Temperatur und erster Termin, Spanne des Tages", () => {
    const x = input({ minutes: H(7, 10), weatherNow: { temp: 8, text: "klar", range: "6 bis 12°" }, upcoming: [{ key: "k", title: "Kaffeepause", time: "08:15", date: "2026-10-21" }] });
    const start = jetztTopics(x).find((t) => t.kind === "start")!;
    expect(start).toMatchObject({ title: "8° · 8:15 Kaffeepause", detail: "Heute 6 bis 12°", target: { href: "/tag?datum=2026-10-21" } });
    const noTermin = jetztTopics(input({ minutes: H(7), weatherNow: { temp: 8, text: "klar" } })).find((t) => t.kind === "start")!;
    expect(noTermin).toMatchObject({ title: "8° · klar", detail: "Guten Start in den Tag", target: { href: "/wetter" } });
  });

  it("Wetter-Tipp: Regen wichtiger als Sonnencreme, morgens etwas mehr", () => {
    const rain = jetztTopics(input({ minutes: H(13), weatherTip: "Regen ab 15 Uhr", weatherNow: { temp: 10, text: "bedeckt" } }))[0];
    expect(rain).toMatchObject({ kind: "wetter", score: 55, detail: "Jetzt 10° · bedeckt" });
    expect(top(input({ minutes: H(13), weatherTip: "Sonnencreme einpacken ☀️" })).score).toBe(38);
    expect(top(input({ minutes: H(9), weatherTip: "Sonnencreme einpacken ☀️" })).score).toBe(46);
  });

  it("ungelesene Pinnwand-Nachricht, gekürzt", () => {
    const t = top(input({ pin: { id: "p1", author: "Lisa", text: "Denkt an die Turnbeutel für morgen früh, bitte!", when: "7:48" } }));
    expect(t.kind).toBe("pinnwand");
    expect(t.title.length).toBeLessThanOrEqual(44);
    expect(t.title.endsWith("…")).toBe(true);
    expect(t.detail).toBe("Neu auf der Pinnwand · 7:48");
  });
});

describe("Jetzt-Karte: Essen und Einkauf", () => {
  const dish = { name: "Pasta mit Tomaten", clock: "18:30", minutes: 25, ready: true, missing: [] };

  it("ab 15 Uhr: Startzeit = Essenszeit − Kochdauer", () => {
    expect(top(input({ minutes: H(16), dish }))).toMatchObject({ kind: "essen", title: "Pasta mit Tomaten – alles im Haus", detail: "Start 18:05 · Essen 18:30", score: 52 });
    expect(top(input({ minutes: H(18, 10), dish }))).toMatchObject({ detail: "Jetzt anfangen · Essen 18:30", score: 80 });
    // nach dem Essen (30 Min danach) nicht mehr
    expect(kinds(input({ minutes: H(19, 5), dish }))).not.toContain("essen");
    // vor 15 Uhr nicht
    expect(kinds(input({ minutes: H(14), dish }))).not.toContain("essen");
  });

  it("ohne Uhrzeit: Rezept ansehen; fehlt etwas: auf die Liste", () => {
    const t = top(input({ minutes: H(16), dish: { name: "Ofengemüse", clock: null, minutes: null, ready: false, missing: ["Feta", "Paprika", "Zwiebel"] } }));
    expect(t).toMatchObject({ title: "Ofengemüse – auf die Liste: Feta, Paprika", detail: "Rezept ansehen" });
    // ohne Kochdauer: 30 Minuten
    expect(top(input({ minutes: H(16), dish: { ...dish, minutes: null } })).detail).toBe("Start 18:00 · Essen 18:30");
  });

  it("kein Gericht zwischen 15 und 20 Uhr: drei Ideen", () => {
    expect(top(input({ minutes: H(17), dinnerFree: true }))).toMatchObject({ kind: "ideen", target: { action: "ideen" } });
    expect(kinds(input({ minutes: H(20, 30), dinnerFree: true }))).not.toContain("ideen");
  });

  it("auf dem Heimweg: ab 2 Sachen, 15:00–19:30; im Beispiel-Tag die Einkaufsliste", () => {
    const shop = { shop: "REWE & Co", names: ["Milch", "Brot", "Butter"] };
    const t = jetztTopics(input({ minutes: H(16), shop })).find((x) => x.kind === "einkauf")!;
    expect(t).toMatchObject({ title: "Auf dem Heimweg? 3 Sachen bei REWE & Co", detail: "Milch, Brot, Butter", target: { href: "/einkaufsliste/laden?name=REWE%20%26%20Co" } });
    expect(jetztTopics(input({ minutes: H(16), shop, demo: true })).find((x) => x.kind === "einkauf")!.target).toEqual({ href: "/einkaufsliste" });
    expect(kinds(input({ minutes: H(16), shop: { shop: "Lidl", names: ["Milch"] } }))).not.toContain("einkauf");
    expect(kinds(input({ minutes: H(19, 45), shop }))).not.toContain("einkauf");
  });
});

describe("Jetzt-Karte: zuerst einkaufen, dann kochen", () => {
  const shop = { shop: "REWE", names: ["Milch", "Brot", "Butter"] };
  const dish = { name: "Pasta mit Tomaten", clock: "18:35", minutes: 30, ready: true, missing: [] as string[] };
  const order = (x: JetztInput) => kinds(x).filter((k) => k === "einkauf" || k === "essen");

  it("17:30, Start 18:05, 3 Sachen → einkauf vor essen", () => {
    expect(order(input({ minutes: H(17, 30), shop, dish }))).toEqual(["einkauf", "essen"]);
  });

  it("17:40, Start 18:05 (≤ 30 Min) → essen zuerst", () => {
    expect(order(input({ minutes: H(17, 40), shop, dish }))).toEqual(["essen", "einkauf"]);
  });

  it("fehlende Zutat fürs Gericht kommt in den Einkauf-Hinweis", () => {
    const t = jetztTopics(input({ minutes: H(17), shop, dish: { ...dish, ready: false, missing: ["Paprika", "Milch"] } })).find((x) => x.kind === "einkauf")!;
    expect(t).toMatchObject({ title: "Auf dem Heimweg? 4 Sachen bei REWE", detail: "Milch, Brot, Butter + Paprika fürs Essen" });
  });

  it("ohne Gericht unverändert (Score 40)", () => {
    const t = jetztTopics(input({ minutes: H(17, 30), shop })).find((x) => x.kind === "einkauf")!;
    expect(t).toMatchObject({ score: 40, detail: "Milch, Brot, Butter" });
  });
});

describe("Jetzt-Karte: Aufgaben, Geburtstage, Sport, Abend", () => {
  it("wichtig vor fällig, je nur eine; nicht im Feierabend", () => {
    const x = input({ urgent: [{ key: "a", title: "Steuer" }], dueToday: [{ key: "a", title: "Steuer" }, { key: "b", title: "Kita-Formular" }] });
    expect(jetztTopics(x).map((t) => t.title)).toEqual(["Heute wichtig: Steuer", "Heute dran: Kita-Formular"]);
    expect(kinds({ ...x, calm: true })).toEqual(["ruhig"]);
  });

  it("Geburtstag heute/morgen – auch nachts", () => {
    expect(top(input({ birthdays: [{ title: "Omas Geburtstag", date: "2026-10-21", when: "heute" }] }))).toMatchObject({ title: "Heute hat Oma Geburtstag 🎂", detail: "Vielleicht kurz anrufen?", score: 82 });
    expect(top(input({ minutes: H(23), birthdays: [{ title: "Feier", date: "2026-10-22", when: "morgen" }] }))).toMatchObject({ title: "Morgen: Feier 🎂", detail: "Noch Zeit für eine Kleinigkeit" });
  });

  it("Sport heute (nicht nachts)", () => {
    expect(top(input({ sport: { today: "18:00 Laufen" } }))).toMatchObject({ kind: "sport", target: { href: "/sport" } });
    expect(kinds(input({ minutes: H(23), sport: { today: "18:00 Laufen" } }))).toEqual(["ruhig"]);
  });

  it("ab 19 Uhr: morgen; nachts nur Morgen", () => {
    const tomorrow = { label: "Morgen · Do", date: "2026-10-22", items: [{ title: "Kita bringen", time: "08:00" }, { title: "Brötchen holen" }, { title: "Drittes" }] };
    expect(top(input({ minutes: H(19, 30), tomorrow }))).toMatchObject({ kind: "morgen", title: "Morgen · Do: 8:00 Kita bringen · Brötchen holen", detail: "Den Tag ansehen", score: 46 });
    const night = jetztTopics(input({ minutes: H(23), tomorrow: { ...tomorrow, items: [], weather: "Regnerisch, 9 bis 12°" }, allDone: true, tip: "Tipp", pin: { id: "p", author: "Lisa", text: "Hi", when: "jetzt" } }));
    expect(night.map((t) => t.kind)).toEqual(["morgen"]);
    expect(night[0]).toMatchObject({ title: "Morgen · Do: frei", detail: "Regnerisch, 9 bis 12°", score: 60 });
  });

  it("alles geschafft, Freizeit-Idee im Feierabend, Tipp aus der Region, Beispiel-Tag", () => {
    const x = input({
      minutes: H(17, 30),
      calm: true,
      allDone: true,
      leisure: { text: "Brettspiel-Abend", href: "/notizen" },
      region: { id: "t 1", title: "Kürbismarkt in Eutin", detail: "Sa 10 Uhr · 3 km" },
      tip: "Reste einfrieren",
      demo: true,
    });
    const list = jetztTopics(x);
    expect(list.map((t) => t.kind)).toEqual(["region", "freizeit", "geschafft"]);
    expect(list[0].target).toEqual({ href: "/tipps?tipp=t%201" });
    expect(list[2].detail).toBe("Schönen Feierabend");
    expect(top(input({ allDone: true })).detail).toBe("Gönn dir was Schönes");
    expect(top(input({ demo: true }))).toMatchObject({ id: "beispiel", title: "Das ist ein Beispiel-Tag" });
    expect(top(input({ tip: "Reste einfrieren" }))).toMatchObject({ kind: "tipp", detail: "Kleiner Tipp" });
  });

  it("Interesse verschiebt die Reihenfolge (begrenzt)", () => {
    const x = input({ pin: { id: "p", author: "Lisa", text: "Hi", when: "jetzt" }, urgent: [{ key: "a", title: "Steuer" }] });
    expect(kinds(x).slice(0, 2)).toEqual(["pinnwand", "dringend"]);
    const learned = { ...x, weights: { dringend: 99, pinnwand: -99 } };
    expect(kinds(learned).slice(0, 2)).toEqual(["dringend", "pinnwand"]);
    expect(jetztTopics(learned)[0].score).toBe(83.2);
  });
});

describe("Wer hat Geburtstag?", () => {
  it("vorn oder hinten, mit Genitiv", () => {
    expect(birthdayName("Omas Geburtstag")).toBe("Oma");
    expect(birthdayName("Oma's Geburtstag 🎂")).toBe("Oma");
    expect(birthdayName("Klaus Geburtstag")).toBe("Klaus");
    expect(birthdayName("Geburtstag von Lisa")).toBe("Lisa");
    expect(birthdayName("Geburtstag: Jonne")).toBe("Jonne");
    expect(birthdayName("Kindergeburtstag")).toBeNull();
    expect(birthdayName("Zahnarzt")).toBeNull();
  });
});

describe("Jetzt-Karte per Satz an/aus", () => {
  it("versteht die Sätze, auch die alten zur Startseite", () => {
    expect(jetztCommand("Blende die Jetzt-Karte aus")).toBe(false);
    expect(jetztCommand("Die Jetztkarte brauch ich nicht")).toBe(false);
    expect(jetztCommand("Zeig die Jetzt-Karte wieder")).toBe(true);
    expect(jetztCommand("Lass die Startseite immer gleich")).toBe(false);
    expect(jetztCommand("Die Startseite soll nicht mehr mitdenken")).toBe(false);
    expect(jetztCommand("Startseite soll mitdenken")).toBe(true);
    expect(jetztCommand("Was gibt's heute?")).toBeNull();
  });
});
