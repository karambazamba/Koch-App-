// Mia denkt mit (Tafel 90): höchstens ein Hinweis am Tag, Nachtruhe, Muster
// nach 3×, Nein = nie wieder, Regler-Stufen, Vorstellen („Alles klar“ = nie
// wieder; alte „Später“-Daten zählen weiter), erster Besuch, Spruch (30 Tage,
// nur ohne Karte), Ton.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { darf, nachtruhe, type Lage } from "@/lib/mia/denktmit/regeln";
import { heutigeKarte, spruchHeute, type DenktKarte, type Umfeld } from "@/lib/mia/denktmit/auswahl";
import { findeEssenMuster, findeMuster, ritualTag, serieAus, titelKern } from "@/lib/mia/denktmit/muster";
import { mitdenkTipps, type MitdenkLage } from "@/lib/mia/denktmit/mitdenken";
import { ersterBesuch, naechsteVorstellung } from "@/lib/mia/denktmit/vorstellen";
import { alleSprueche, anlaesse, pickSpruch } from "@/lib/mia/denktmit/sprueche";
import { EMPTY_DENKT, migrateDenkt, type DenktState } from "@/lib/mia/denktmit/store";
import { merkListe } from "@/lib/mia/denktmit/merken";
import { VORSTELLEN } from "@/lib/mia/denktmit/seiten";
import { jetztTopics, spruchZeilen, TITLE_MAX } from "@/lib/heute/jetztTopics";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { STORAGE } from "@/lib/core/storage";
import { at, fakeWindow, termin } from "../helpers";

const lage = (o: Partial<Lage> = {}): Lage => ({ hour: 10, pause: false, ruhe: false, level: "normal", heute: 0, demo: false, ...o });
const umfeld = (o: Partial<Umfeld> = {}): Umfeld => ({ today: "2026-10-23", hour: 10, pause: false, ruhe: false, demo: false, ...o });
const state = (o: Partial<DenktState> = {}): DenktState => ({ ...EMPTY_DENKT, ...o });
const karte = (key: string, art: DenktKarte["art"] = "mitdenken") => ({ art, key, satz: key }) as DenktKarte;

beforeEach(() => {
  at("2026-10-23T10:00");
  vi.resetModules();
});

describe("Regeln", () => {
  it("Nachtruhe 22–7 Uhr, Pause und Ruhe: nichts", () => {
    expect([nachtruhe(21), nachtruhe(22), nachtruhe(6), nachtruhe(7)]).toEqual([false, true, true, false]);
    for (const art of ["vorstellen", "muster", "mitdenken", "spruch"] as const) {
      expect(darf(art, lage({ hour: 23 }))).toBe(false);
      expect(darf(art, lage({ pause: true }))).toBe(false);
      expect(darf(art, lage({ ruhe: true }))).toBe(false);
    }
  });

  it("Regler: Ruhig nur Muster, Normal 1, Gesprächig 2 am Tag", () => {
    expect(darf("muster", lage({ level: "ruhig" }))).toBe(true);
    expect(darf("vorstellen", lage({ level: "ruhig" }))).toBe(false);
    expect(darf("spruch", lage({ level: "ruhig" }))).toBe(false);
    expect(darf("mitdenken", lage({ heute: 1 }))).toBe(false);
    expect(darf("mitdenken", lage({ level: "gespraechig", heute: 1 }))).toBe(true);
    expect(darf("mitdenken", lage({ level: "gespraechig", heute: 2 }))).toBe(false);
  });

  it("Beispiel-Tag: nur der Spruch", () => {
    expect(darf("vorstellen", lage({ demo: true }))).toBe(false);
    expect(darf("muster", lage({ demo: true }))).toBe(false);
    expect(darf("spruch", lage({ demo: true }))).toBe(true);
  });

  it("höchstens EINE Karte am Tag; was schon steht, bleibt bis zur Antwort", () => {
    const k = [karte("a"), karte("b")];
    expect(heutigeKarte(k, state(), umfeld())?.key).toBe("a");
    // a stand und ist beantwortet → heute keine zweite
    expect(heutigeKarte([karte("b")], state({ tage: { "2026-10-23": ["a"] } }), umfeld())).toBeNull();
    // a steht noch (nicht beantwortet) → bleibt
    expect(heutigeKarte(k, state({ tage: { "2026-10-23": ["a"] } }), umfeld())?.key).toBe("a");
    // Gesprächig: zweite erlaubt
    expect(heutigeKarte([karte("b")], state({ level: "gespraechig", tage: { "2026-10-23": ["a"] } }), umfeld())?.key).toBe("b");
    // Ruhig: Essen-Ritual zählt als Muster
    expect(heutigeKarte([karte("v", "vorstellen"), karte("e", "essen")], state({ level: "ruhig" }), umfeld())?.key).toBe("e");
  });
});

describe("Muster", () => {
  const freitag = (date: string, start = "18:00", title = "Sport") => termin({ title, date, start });

  it("3× gleicher Wochentag ± 1 Std → einmal fragen; Ja = wöchentliche Serie", () => {
    const entries = [freitag("2026-10-02"), freitag("2026-10-09", "18:30"), freitag("2026-10-16", "17:30", "sport!")];
    const m = findeMuster(entries, "2026-10-23", {});
    expect(m?.satz).toBe("Freitags ist bei dir immer sport! um 18 Uhr. Soll ich das jede Woche eintragen?".replace("sport!", m!.title));
    expect(m?.weekday).toBe(4);
    const serie = serieAus(m!, "2026-10-23");
    expect(serie.data).toMatchObject({ date: "2026-10-30", start: "18:00", repeat: { kind: "woechentlich" } });
  });

  it("nur 2×, zu weit auseinander oder schon Serie → keine Frage; Nein = nie wieder", () => {
    expect(findeMuster([freitag("2026-10-09"), freitag("2026-10-16")], "2026-10-23", {})).toBeNull();
    expect(findeMuster([freitag("2026-10-02", "08:00"), freitag("2026-10-09", "12:00"), freitag("2026-10-16", "18:00")], "2026-10-23", {})).toBeNull();
    const three = [freitag("2026-10-02"), freitag("2026-10-09"), freitag("2026-10-16")];
    expect(findeMuster([...three, termin({ title: "Sport", date: "2026-09-04", start: "18:00", repeat: { kind: "woechentlich" } })], "2026-10-23", {})).toBeNull();
    const key = findeMuster(three, "2026-10-23", {})!.key;
    expect(findeMuster(three, "2026-10-23", { [key]: { antwort: "nein" } })).toBeNull();
  });

  it("ähnlicher Titel: Groß/klein, Satzzeichen, Ziffern egal", () => {
    expect(titelKern("Sport!")).toBe(titelKern("sport 2"));
  });

  it("Essens-Ritual: 3× Pizza am Freitag → fest einplanen; nie doppelt", () => {
    const cooked = { "2026-10-02": { title: "Pizza" }, "2026-10-09": { title: "Pizza" }, "2026-10-16": { title: "pizza" } };
    const e = findeEssenMuster(cooked, "2026-10-23", {}, []);
    expect(e?.satz).toBe("Freitags gibt’s bei euch Pizza. Soll ich das fest einplanen?");
    expect(findeEssenMuster(cooked, "2026-10-23", {}, [], true)?.satz).toContain("bei dir");
    expect(findeEssenMuster(cooked, "2026-10-23", {}, [{ weekday: 4 }])).toBeNull();
    expect(ritualTag({ weekday: 4 }, "2026-10-23", [], () => false)).toBe("2026-10-23");
    expect(ritualTag({ weekday: 4 }, "2026-10-23", ["2026-10-23"], () => false)).toBe(null);
  });
});

describe("Mitdenken", () => {
  const base: MitdenkLage = { today: "2026-10-23", minutes: 7 * 60, weekday: 4, feiertag: false, regenAb: null, aufgaben: [], termine: [], kinder: [], partner: null, gericht: true, schnell: null };

  it("früher Termin an einem Kita-Tag → „Wer bringt Ole?“ mit Namen aus dem Profil", () => {
    const t = mitdenkTipps({ ...base, termine: [{ title: "Zahnarzt", time: "08:00" }], kinder: ["Ole"], partner: "Lisa" }, {});
    expect(t[0].satz).toBe("Du hast um 8 Uhr Zahnarzt. Wer bringt Ole?");
    expect(t[0].knoepfe.map((k) => k.label)).toEqual(["Lisa", "Ich", "Passt"]);
    expect(mitdenkTipps({ ...base, weekday: 5, termine: [{ title: "Zahnarzt", time: "08:00" }], kinder: ["Ole"] }, {})).toEqual([]);
  });

  it("Regen × Wäsche, voller Tag × schnelles Gericht; beantwortet = weg", () => {
    expect(mitdenkTipps({ ...base, regenAb: "15:00", aufgaben: ["Wäsche aufhängen"] }, {})[0].satz).toBe("Ab 15 Uhr Regen. Wäsche lieber vorher raus?");
    const voll = { ...base, termine: [1, 2, 3].map((i) => ({ title: `T${i}`, time: `1${i}:00` })), gericht: false, schnell: { title: "Rührei" } };
    const t = mitdenkTipps(voll, {});
    expect(t[0].knoepfe.map((k) => k.label)).toEqual(["Nehmen", "Was anderes"]);
    expect(mitdenkTipps(voll, { [t[0].key]: { antwort: "ja" } })).toEqual([]);
  });
});

describe("Vorstellen und erster Besuch", () => {
  const visible = VORSTELLEN.map((v) => v.tile);

  it("ab Tag 2, Reihenfolge Termine zuerst, nur sichtbare", () => {
    expect(naechsteVorstellung(state(), visible, { today: "2026-10-23", since: "2026-10-23" })).toBeNull();
    expect(naechsteVorstellung(state(), visible, { today: "2026-10-24", since: "2026-10-23" })?.tile).toBe("termine");
    expect(naechsteVorstellung(state(), ["einkauf", "wetter"], { today: "2026-10-24", since: "2026-10-23" })?.text).toBe("Das ist eure Einkaufsliste. Sag mir einfach „Milch“, ich trag’s ein.");
  });

  it("alte Daten: Später 2× oder benutzt = nie wieder; heute Später = heute nichts mehr", () => {
    const o = { today: "2026-10-25", since: "2026-10-23" };
    expect(naechsteVorstellung(state({ vorgestellt: { termine: { spaeter: 1, fertig: false, zuletzt: "2026-10-25" } } }), visible, o)).toBeNull();
    expect(naechsteVorstellung(state({ vorgestellt: { termine: { spaeter: 1, fertig: false, zuletzt: "2026-10-24" } } }), visible, o)?.tile).toBe("termine");
    expect(naechsteVorstellung(state({ vorgestellt: { termine: { spaeter: 2, fertig: false } } }), visible, o)?.tile).toBe("aufgaben");
    expect(naechsteVorstellung(state({ besucht: ["seite:kalender"] }), visible, o)?.tile).toBe("aufgaben");
  });

  it("erster Besuch: Einkauf-Text einmal, danach nie wieder (A-040/A-041: neuer Schlüssel, drei Zeilen)", () => {
    const text = "Ich merk mir, wo du was kaufst.\nSag einfach ‚Tomaten auf die Liste‘, den Laden such ich aus.\nAbgehakt ist weg. Fürs Rezept leg ich dir Zutaten oben hin.";
    expect(ersterBesuch(state(), "seite:einkaufsliste")).toBe(text);
    // wer die alte Liste schon kannte, sieht die neue Vorstellung trotzdem einmal
    expect(ersterBesuch(state({ besucht: ["/einkaufsliste"] }), "seite:einkaufsliste")).toBe(text);
    expect(ersterBesuch(state({ besucht: ["seite:einkaufsliste"] }), "seite:einkaufsliste")).toBeNull();
    expect(ersterBesuch(state(), "/profil")).toBeNull();
  });
});

describe("Spruch des Tages", () => {
  it("rund 200 Sprüche, alle im Ton: tidyMiaText ändert nichts, keine Druck-Wörter, keine Gedankenstriche, auf 2 Zeilen", () => {
    const all = alleSprueche();
    expect(all.length).toBeGreaterThanOrEqual(190);
    expect(new Set(all).size).toBe(all.length);
    const druck = /(?<![a-zäöüß])(fehlt|offen|überfällig|verpasst|du musst|du solltest|vergiss nicht|alles da|geschafft hast)(?![a-zäöüß])/i;
    for (const s of all) {
      expect(tidyMiaText(s), s).toBe(s);
      expect(s, s).not.toMatch(druck);
      expect(s, s).not.toMatch(/ – | - /);
      const [a, b] = spruchZeilen(s);
      expect(a.length, s).toBeLessThanOrEqual(TITLE_MAX);
      expect(`${a} ${b}`.trim()).toBe(s);
    }
    // Ohne Texte über Druck, Körper, Gewicht
    for (const s of VORSTELLEN.flatMap((v) => [v.kachel, v.seite])) expect(tidyMiaText(s), s).toBe(s);
  });

  it("nicht derselbe innerhalb von 30 Tagen, stabil über den Tag", () => {
    const a = anlaesse({ weekday: 4, month: 10 });
    const first = pickSpruch(a, [], "2026-10-23")!;
    expect(pickSpruch(a, [], "2026-10-23")).toBe(first);
    expect(pickSpruch(a, [{ text: first, date: "2026-10-01" }], "2026-10-23")).not.toBe(first);
    // Nach 30 Tagen darf er wieder
    const later = pickSpruch(a, [{ text: first, date: "2026-09-01" }], "2026-10-23");
    expect(later).toBe(first);
  });

  it("nur ohne Karte heute, nachts und in der Ruhe keiner, im Beispiel-Tag ja", () => {
    const a = anlaesse({ weekday: 4, month: 10 });
    expect(spruchHeute(state(), umfeld(), a)).toBeTruthy();
    expect(spruchHeute(state({ tage: { "2026-10-23": ["x"] } }), umfeld(), a)).toBeNull();
    expect(spruchHeute(state(), umfeld({ hour: 22 }), a)).toBeNull();
    expect(spruchHeute(state(), umfeld({ ruhe: true }), a)).toBeNull();
    expect(spruchHeute(state({ level: "ruhig" }), umfeld(), a)).toBeNull();
    expect(spruchHeute(state(), umfeld({ demo: true }), a)).toBeTruthy();
  });

  it("Jetzt-Karte: Spruch nur statt „Alles ruhig“", () => {
    const base = { minutes: 600, today: "2026-10-23", calm: false, upcoming: [], tomorrow: { label: "Morgen · Sa", date: "2026-10-24", items: [] }, urgent: [], dueToday: [], pin: null, planWeather: null, dish: null, birthdays: [], sport: null, shop: null, timer: null, cookingStep: null, reminder: null, pause: null, dinnerFree: false, leisure: null, tip: null, region: null, kids: false, weekCheck: null, demo: false, tiles: [], weights: {}, hidden: [] };
    const [t] = jetztTopics({ ...base, spruch: "Freitag. Feierabend in Sicht." });
    expect(t.kind).toBe("spruch");
    expect(jetztTopics({ ...base, spruch: "Freitag.", reminder: { key: "r", text: "Zahnarzt" } })[0].kind).not.toBe("spruch");
  });
});

describe("Speicher und „Was Mia sich merkt“", () => {
  it("im Speicher-Verzeichnis mit Sicherung; Kaputtes fällt still weg", () => {
    expect(STORAGE.find((s) => s.key === "wasgibts.miadenkt")).toMatchObject({ version: 1, backup: true });
    expect(migrateDenkt({ version: 1, level: "laut", antworten: { a: { antwort: "vielleicht" } }, rituale: [{ weekday: "fr" }] })).toEqual(EMPTY_DENKT);
    expect(migrateDenkt(null)).toBeNull();
  });

  it("Vorstellung fertig, Antwort gemerkt, Hinweis je Tag nur einmal gezählt", async () => {
    fakeWindow();
    const st = await import("@/lib/mia/denktmit/store");
    st.vorstellungFertig("termine");
    st.hinweisGezaehlt("a", "2026-10-23");
    st.hinweisGezaehlt("a", "2026-10-23");
    st.antworten("muster:sport:4", "nein", "Freitags ist bei dir immer Sport um 18 Uhr. Soll ich?", "2026-10-23");
    const s = st.loadDenkt();
    expect(s.vorgestellt.termine).toMatchObject({ spaeter: 0, fertig: true });
    expect(s.tage["2026-10-23"]).toEqual(["a"]);
    expect(merkListe(s, { tomaten: "Rewe" }).map((e) => [e.titel, e.wert])).toEqual([
      ["Freitags ist bei dir immer Sport um 18 Uhr", "Frag ich nicht mehr"],
      ["Tomaten", "Rewe"],
    ]);
    st.vergessen("antwort", "muster:sport:4");
    expect(st.loadDenkt().antworten).toEqual({});
  });
});
