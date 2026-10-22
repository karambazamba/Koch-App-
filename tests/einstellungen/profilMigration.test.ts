// Gespeicherte Profile älterer Versionen: nichts geht verloren (Personen,
// Allergien, „mag nicht“, Begleitung), fehlende Felder bekommen Standards.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearProfile, loadProfile, migrateHelper, migrateProfile, saveProfile, subscribeProfile } from "@/lib/einstellungen/profileStore";
import { DEFAULT_HELPER, createEmptyProfile } from "@/lib/einstellungen/profile";
import { at } from "../helpers";
import { fakeWindow } from "./fenster";

const KEY = "familienkueche.haushaltsprofil";

const v1 = {
  version: 1,
  householdName: "Müller",
  adults: 2,
  kids: 2,
  kidsLunchAway: "teilweise",
  warmMeal: "mittags",
  persons: [
    { id: "a1", role: "erwachsen", name: "Lisa", allergies: ["Nüsse"], dislikes: ["Pilze"] },
    { id: "a2", role: "erwachsen", name: "Felix", allergies: [], dislikes: [] },
    { id: "k1", role: "kind", name: "Mattis", age: 7, ageGroup: "schulkind", allergies: ["Laktose"], dislikes: ["Oliven"] },
    { id: "k2", role: "kind", name: "Ella", ageGroup: "unbekannt" },
  ],
  favoriteDishes: ["Lasagne"],
};

describe("Migration – alte Versionen", () => {
  it("v1: Personen mit Allergien und „mag nicht“ bleiben, Begleitung heißt Lotte", () => {
    const p = migrateProfile(v1)!;
    expect(p.version).toBe(20);
    expect(p.householdName).toBe("Müller");
    expect(p.persons.map((x) => x.name)).toEqual(["Lisa", "Felix", "Mattis", "Ella"]);
    expect(p.persons[0]).toMatchObject({ allergies: ["Nüsse"], dislikes: ["Pilze"], weekdayLunch: "zuhause", employed: null });
    expect(p.persons[2]).toMatchObject({ age: 7, ageGroup: "schulkind", allergies: ["Laktose"], dislikes: ["Oliven"], weekdayLunch: "manchmal" });
    expect(p.persons[3]).toMatchObject({ ageGroup: "kitakind", age: null, allergies: [], dislikes: [] });
    expect(p.warmMeal).toEqual({ weekday: "mittags", weekend: "mittags" });
    expect(p.favoriteDishes).toEqual(["Lasagne"]);
    expect(p.helper).toEqual({ name: "Lotte", art: "assistentin", voice: "weiblich", farbe: "orange" });
    expect(p.householdType).toBe("familie");
    expect(p.theme).toBe("warm");
    expect(p.themeSet).toBe(false);
  });

  it("v1 ohne Personen: Anzahl aus adults/kids, Haushaltstyp daraus", () => {
    const p = migrateProfile({ version: 1, adults: 1, kids: 0, kidsLunchAway: "nein" })!;
    expect(p.persons).toHaveLength(1);
    expect(p.householdType).toBe("single");
    const q = migrateProfile({ version: 2 })!;
    expect(q.adults).toBe(2);
    expect(q.kids).toBe(1);
    expect(q.householdType).toBe("familie");
  });

  it("v3–v5: Essenszeiten als Liste; beides oder flexibel → Standard", () => {
    const p = migrateProfile({ version: 4, warmMeal: { weekday: ["abends"], weekend: ["mittags", "abends"] } })!;
    expect(p.warmMeal).toEqual({ weekday: "abends", weekend: "mittags" });
    const q = migrateProfile({ version: 5, warmMeal: { weekday: ["flexibel"], weekend: ["abends"] } })!;
    expect(q.warmMeal).toEqual({ weekday: "abends", weekend: "abends" });
  });

  it("v7+: ohne Namen der Begleitung → Standard-Name, eigener Name bleibt", () => {
    expect(migrateProfile({ version: 7 })!.helper.name).toBe(DEFAULT_HELPER.name);
    expect(migrateProfile({ version: 18, helper: { name: "Frieda", voice: "weiblich" } })!.helper).toEqual({ name: "Frieda", art: "assistentin", voice: "weiblich", farbe: "orange" });
  });

  it("v17: offene Pause ohne Ende wird entfernt, ab v18 bleibt sie", () => {
    expect(migrateProfile({ version: 17, pause: { from: "2026-10-01", until: null } })!.pause).toBeNull();
    expect(migrateProfile({ version: 17, pause: { from: "2026-10-01", until: "2026-10-10" } })!.pause).toEqual({ from: "2026-10-01", until: "2026-10-10" });
    expect(migrateProfile({ version: 18, pause: { from: "2026-10-01" } })!.pause).toEqual({ from: "2026-10-01", until: null });
    expect(migrateProfile({ version: 18, pause: { from: "gestern" } })!.pause).toBeNull();
  });

  it("Ansicht: bis v19 bleibt nur Dunkel als eigene Wahl, „Frisch“ wird Automatisch (ohne Wahl Hell)", () => {
    expect(migrateProfile({ version: 19, theme: "nacht" })).toMatchObject({ theme: "nacht", themeSet: true });
    expect(migrateProfile({ version: 19, theme: "auto" })).toMatchObject({ theme: "warm", themeSet: false });
    expect(migrateProfile({ version: 15, theme: "frisch" })).toMatchObject({ theme: "warm", themeSet: false });
    expect(migrateProfile({ version: 20, theme: "frisch", themeSet: true })).toMatchObject({ theme: "auto", themeSet: true });
    expect(migrateProfile({ version: 20, theme: "bunt" })).toMatchObject({ theme: "warm", themeSet: false });
  });

  it("unbekannte Versionen und Unsinn → kein Profil", () => {
    expect(migrateProfile(null)).toBeNull();
    expect(migrateProfile("profil")).toBeNull();
    expect(migrateProfile({ version: 21 })).toBeNull();
    expect(migrateProfile({})).toBeNull();
  });
});

describe("Migration – Felder prüfen und begrenzen", () => {
  it("v20 mit allen Feldern bleibt gleich", () => {
    const full = {
      ...createEmptyProfile(),
      householdName: "Kern",
      wishDay: { enabled: true, weekday: "Mittwoch", minAge: 99, order: ["k", 3] },
      shoppingDay: "Donnerstag",
      likes: [{ name: " Käse ", weight: 5000, manual: true }, { name: "Paprika", weight: -1 }, { name: " " }, null],
      likesBlocked: ["Rosinen", 4],
      neverAgain: [{ title: " Leber ", ingredients: ["Leber", 2], reason: "zu bitter", addedAt: "2026-01-01", recipe: { id: "r" } }, { title: "" }, { id: "n2", title: "Kutteln" }],
      healthTips: "oefter",
      mealClock: { mittags: "13:15", abends: "25:00" },
      weekendStyle: "frei",
      weather: { consent: true, postcode: "D-23701 Eutin" },
      cookingStyle: "rezept",
      newPerWeek: 2,
      tips: "taeglich",
      householdType: "wg",
      kitchenMachine: "thermomix",
      helperMode: "dranbleiben",
      display: "alles",
      weekendIdeas: false,
      planStyle: "spontan",
      mixSuggest: "woche",
      planWeek: "2026-10-19",
      theme: "auto",
      themeSet: true,
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    const p = migrateProfile(full)!;
    expect(p.wishDay).toEqual({ enabled: true, weekday: "Mittwoch", minAge: 17, order: ["k"] });
    expect(p.shoppingDay).toBe("Donnerstag");
    expect(p.likes).toEqual([{ name: "Käse", weight: 999, manual: true }, { name: "Paprika", weight: 1 }]);
    expect(p.likesBlocked).toEqual(["Rosinen"]);
    expect(p.neverAgain).toHaveLength(2);
    expect(p.neverAgain[0]).toMatchObject({ title: "Leber", ingredients: ["Leber"], reason: "zu bitter", recipe: { id: "r" } });
    expect(p.neverAgain[1]).toMatchObject({ id: "n2", reason: "", addedAt: "" });
    expect(p.mealClock).toEqual({ mittags: "13:15", abends: "18:30" });
    expect(p.weather).toEqual({ consent: true, postcode: "23701" });
    expect(p).toMatchObject({
      healthTips: "oefter", weekendStyle: "frei", cookingStyle: "rezept", newPerWeek: 2, tips: "taeglich", householdType: "wg",
      kitchenMachine: "thermomix", helperMode: "dranbleiben", display: "alles", weekendIdeas: false, planStyle: "spontan",
      mixSuggest: "woche", planWeek: "2026-10-19", theme: "auto", themeSet: true, updatedAt: "2026-10-01T10:00:00.000Z",
    });
  });

  it("Unsinn in Feldern → Standardwerte", () => {
    const p = migrateProfile({ version: 20, wishDay: "ja", likes: "viel", neverAgain: {}, mealClock: null, weather: 5, planWeek: "bald", shoppingDay: "Funtag", persons: [{ role: "hund", name: 3, allergies: "Nüsse" }], adults: 1, kids: 0 })!;
    expect(p.wishDay).toEqual(createEmptyProfile().wishDay);
    expect(p.likes).toEqual([]);
    expect(p.neverAgain).toEqual([]);
    expect(p.mealClock).toEqual({ mittags: "12:30", abends: "18:30" });
    expect(p.weather).toEqual({ consent: false, postcode: "" });
    expect(p.planWeek).toBeNull();
    expect(p.shoppingDay).toBe("Montag");
    expect(p.persons[0]).toMatchObject({ role: "erwachsen", name: "", allergies: [] });
    expect(typeof p.persons[0].id).toBe("string");
    const w = migrateProfile({ version: 20, wishDay: { enabled: "ja", minAge: "vier" } })!;
    expect(w.wishDay).toMatchObject({ enabled: false, minAge: 4, order: [] });
  });
});

describe("Migration – Begleitung", () => {
  it("Art und Farbe aus dem Namen bzw. der Stimme", () => {
    expect(migrateHelper({ name: "Theo" })).toEqual({ name: "Theo", art: "assistent", voice: "maennlich", farbe: "nachtblau" });
    expect(migrateHelper({ name: "Mia" }).art).toBe("assistentin");
    expect(migrateHelper({ name: "Frieda", voice: "weiblich" }).art).toBe("assistentin");
    expect(migrateHelper({ name: "Kalle", voice: "maennlich" }).art).toBe("assistent");
    expect(migrateHelper({ name: "Kalle", art: "assistentin", farbe: "lila" })).toEqual({ name: "Kalle", art: "assistentin", voice: "weiblich", farbe: "lila" });
    expect(migrateHelper({ name: "Kalle", farbe: "neon" }).farbe).toBe("orange");
  });

  it("Name wird gekürzt; ohne Namen der Ersatz", () => {
    expect(migrateHelper({ name: "  Ein sehr sehr langer Name  " }).name).toBe("Ein sehr sehr langer");
    expect(migrateHelper(null).name).toBe(DEFAULT_HELPER.name);
    expect(migrateHelper({ name: "   " }, "Lotte").name).toBe("Lotte");
  });
});

describe("Migration – Planstil aus dem gespeicherten Wochenplan (bis v15)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("mit Gerichten im Plan → „Ich plane gern“", () => {
    fakeWindow({ "wasgibts.wochenplan": JSON.stringify({ weeks: { "2026-10-19": { Montag: { kind: "recipe" } } } }) });
    expect(migrateProfile({ version: 15 })!.planStyle).toBe("plan");
  });

  it("leerer oder kaputter Plan → „Mal so, mal so“", () => {
    fakeWindow({ "wasgibts.wochenplan": JSON.stringify({ weeks: { "2026-10-19": { Montag: { kind: "cleared" } } } }) });
    expect(migrateProfile({ version: 15 })!.planStyle).toBe("mix");
    fakeWindow({ "wasgibts.wochenplan": "{kaputt" });
    expect(migrateProfile({ version: 15 })!.planStyle).toBe("mix");
    // ohne Browser-Speicher
    vi.unstubAllGlobals();
    expect(migrateProfile({ version: 15 })!.planStyle).toBe("mix");
  });
});

describe("Profil speichern und laden", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("altes Profil wird beim Laden migriert und einmal zurückgeschrieben", () => {
    const { localStorage } = fakeWindow({ [KEY]: JSON.stringify(v1) });
    const p = loadProfile()!;
    expect(p.persons.map((x) => x.name)).toEqual(["Lisa", "Felix", "Mattis", "Ella"]);
    expect(JSON.parse(localStorage.getItem(KEY)!).version).toBe(20);
    expect(loadProfile()).toBe(p);
  });

  it("speichern gleicht Personen und Wunschtag-Reihenfolge ab, setzt den Zeitpunkt", () => {
    at("2026-10-22T09:00");
    const { localStorage } = fakeWindow();
    const base = migrateProfile(v1)!;
    const calls: number[] = [];
    const off = subscribeProfile(() => calls.push(1));
    const saved = saveProfile({ ...base, adults: 1, kids: 1, wishDay: { ...base.wishDay, order: ["k2", "weg", "k1"] } });
    expect(saved.persons.map((x) => x.name)).toEqual(["Lisa", "Mattis"]);
    expect(saved.wishDay.order).toEqual(["k1"]);
    expect(saved.updatedAt).toBe("2026-10-22T07:00:00.000Z");
    expect(loadProfile()?.persons[0].allergies).toEqual(["Nüsse"]);
    clearProfile();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(calls).toHaveLength(2);
    off();
  });
});
