// Erster Start: Standardwerte (Mia, Termine/Essen/Einkauf, mal so mal so),
// Profil daraus, Start-Kacheln und „Los geht’s“ / „Neu anfangen“.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { homeTilesFor, profileFrom, startState } from "@/lib/einstellungen/welcome";
import { DEFAULT_HELPER } from "@/lib/einstellungen/profile";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";
import { at, fakeWindow } from "../helpers";

describe("Standardwerte beim ersten Start", () => {
  it("Mia, Termine/Essen/Einkauf, mal so mal so, eine Person", () => {
    const s = startState();
    expect(s.helper).toEqual(DEFAULT_HELPER);
    expect(s.helper).not.toBe(DEFAULT_HELPER);
    expect(s.help).toEqual(["termine", "essen", "einkauf"]);
    expect(s.planStyle).toBe("mix");
    expect(s.members).toEqual([{ name: "", kid: false }]);
  });

  it("Profil: man selbst ist erwachsen, leere Namen fallen weg (außer man selbst)", () => {
    const p = profileFrom({ ...startState(), members: [{ name: " Lisa ", kid: true }, { name: "Ella", kid: true }, { name: "  ", kid: false }, { name: "Felix", kid: false }] });
    expect(p.persons.map((x) => [x.name, x.role])).toEqual([["Lisa", "erwachsen"], ["Ella", "kind"], ["Felix", "erwachsen"]]);
    expect(p.adults).toBe(2);
    expect(p.kids).toBe(1);
    expect(p.householdType).toBe("familie");
    expect(p.planStyle).toBe("mix");
  });

  it("Haushaltstyp: Familie nur mit mehreren Personen, sonst abgeleitet", () => {
    expect(profileFrom({ ...startState(), members: [] }).householdType).toBe("single");
    expect(profileFrom({ ...startState(), help: ["familie"], members: [{ name: "Lisa", kid: false }] }).householdType).toBe("single");
    expect(profileFrom({ ...startState(), help: ["familie"], members: [{ name: "Lisa", kid: false }, { name: "Tom", kid: false }] }).householdType).toBe("familie");
    expect(profileFrom({ ...startState(), planStyle: null, members: [{ name: "Lisa", kid: false }, { name: "Tom", kid: false }] })).toMatchObject({ householdType: "paar", planStyle: "mix" });
  });

  it("Start-Kacheln: Aufgaben immer, der Rest nach Hilfe-Wahl", () => {
    const tiles = homeTilesFor(["sport"]);
    const visible = (id: string) => tiles.find((t) => t.id === id)?.visible;
    expect(tiles.map((t) => t.id)).toEqual(DEFAULT_HOME.map((t) => t.id));
    expect(visible("aufgaben")).toBe(true);
    expect(visible("termine")).toBe(false);
    expect(visible("essen")).toBe(false);
    expect(homeTilesFor(["termine", "essen", "einkauf"]).find((t) => t.id === "essen")?.visible).toBe(true);
  });
});

describe("„Los geht’s“ und „Neu anfangen“", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    at("2026-10-22T09:00");
  });

  async function load() {
    const win = fakeWindow();
    vi.resetModules();
    const now = await import("@/lib/core/now");
    now.setNowForTests(new Date("2026-10-22T09:00:00+02:00"));
    return { ...win, welcome: await import("@/lib/einstellungen/welcomeStore"), profile: await import("@/lib/einstellungen/profileStore") };
  }

  it("speichert Profil, Startseite, Beispiel-Tag und die Hilfe-Wahl", async () => {
    const { localStorage, welcome, profile } = await load();
    welcome.startFresh();
    const p = profile.loadProfile()!;
    expect(p.helper.name).toBe(DEFAULT_HELPER.name);
    expect(p.persons).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("wasgibts.willkommen")!)).toEqual({ version: 1, state: null, help: ["termine", "essen", "einkauf"] });
    expect(localStorage.getItem("wasgibts.startseite")).not.toBeNull();
    expect(JSON.parse(localStorage.getItem("wasgibts.beispiel")!).since).toBe("2026-10-22");
    welcome.clearWelcome();
    expect(localStorage.getItem("wasgibts.willkommen")).toBeNull();
    expect(localStorage.getItem("wasgibts.beispiel")).toBeNull();
  });

  it("Anmelden ohne Profil: der Name aus der Namensfrage landet im neuen Profil (A-042, nie zweimal fragen)", async () => {
    const { welcome, profile } = await load();
    welcome.startFresh("farbig", "familie", "  Felix ");
    expect(profile.loadProfile()!.persons[0].name).toBe("Felix");
    welcome.clearWelcome();
  });
});
