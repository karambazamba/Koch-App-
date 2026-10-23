// Spendentopf: Region aus Wohnort/PLZ, Suche, Zeitplan, Stimmen, Betrag,
// Beitrags-Frage – und der Speicher `wasgibts.spendentopf` v1 (nur „zugesagt“,
// keine Zahlung). React-Hooks laufen ohne Renderer (ersetzt).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import {
  activePot,
  askDue,
  askLater,
  canVote,
  euro,
  fallbackRegion,
  potPhase,
  potTotal,
  POT_TEXTS,
  projectsFor,
  projectVotes,
  regionById,
  regionForPlace,
  searchRegions,
  voteDaysLeft,
} from "@/lib/spendentopf/model";
import { REGIONS } from "@/lib/spendentopf/regions";

vi.mock("react", () => ({
  useState: (init: unknown) => [init, () => {}],
  useEffect: () => {},
  useSyncExternalStore: (_s: unknown, get: () => unknown) => get(),
}));
let postcode: string | undefined;
vi.mock("@/lib/einstellungen/useProfile", () => ({ useProfile: () => (postcode === undefined ? null : { weather: { postcode } }) }));

let local: Storage;
beforeEach(() => {
  local = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, addEventListener() {}, removeEventListener() {} };
  postcode = undefined;
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

const OH = regionById("ostholstein")!;
const KIEL = regionById("kiel")!;
const PLOEN = regionById("ploen")!;

describe("Region aus Wohnort oder PLZ", () => {
  it("PLZ: längster passender Anfang gewinnt", () => {
    expect(regionForPlace("23701")?.id).toBe("ostholstein");
    expect(regionForPlace("22301 Hamburg")?.id).toBe("hamburg-nord");
    expect(regionForPlace("23552")?.id).toBe("luebeck");
    expect(regionForPlace("24103")?.id).toBe("kiel");
    expect(regionForPlace("24211")?.id).toBe("ploen");
  });

  it("Ort: genau, ohne Umlaute/ß, oder als Teil", () => {
    expect(regionForPlace("Eutin")?.id).toBe("ostholstein");
    expect(regionForPlace("Lübeck")?.id).toBe("luebeck");
    expect(regionForPlace("Plon")?.id).toBe("ploen");
    expect(regionForPlace("Ostholstein")?.id).toBe("ostholstein");
    expect(regionForPlace("Hamburg-Winterhude")?.id).toBe("hamburg-nord");
    expect(regionForPlace("99999 Eutin")?.id).toBe("ostholstein");
  });

  it("unbekannt, leer oder nur Ziffern → null", () => {
    expect(regionForPlace("München")).toBeNull();
    expect(regionForPlace("")).toBeNull();
    expect(regionForPlace(null)).toBeNull();
    expect(regionForPlace(undefined)).toBeNull();
    expect(regionForPlace("99999")).toBeNull();
    expect(regionById("nirgends")).toBeNull();
    expect(regionById(null)).toBeNull();
  });

  it("Suche „Ort oder Postleitzahl“: leer = alle, aktive zuerst", () => {
    const all = searchRegions("  ");
    expect(all).toHaveLength(REGIONS.length);
    expect(all[0].status).toBe("aktiv");
    expect(all.at(-1)?.status).toBe("sucht_paten");
    expect(searchRegions("Preetz").map((r) => r.id)).toEqual(["ploen"]);
    expect(searchRegions("24").map((r) => r.id).sort()).toEqual(["kiel", "ploen"]);
    expect(searchRegions("2370").map((r) => r.id)).toEqual(["ostholstein"]);
    expect(searchRegions("Bayern")).toEqual([]);
  });
});

describe("Zeitplan", () => {
  it("Vorschlagen 1.–14.11., Abstimmen 15.–30.11., Übergabe bis 12.12., sonst Ruhe", () => {
    expect(potPhase("2026-10-31")).toBe("ruhe");
    expect(potPhase("2026-11-01")).toBe("vorschlagen");
    expect(potPhase("2026-11-14")).toBe("vorschlagen");
    expect(potPhase("2026-11-15")).toBe("abstimmen");
    expect(potPhase("2026-11-30")).toBe("abstimmen");
    expect(potPhase("2026-12-01")).toBe("uebergabe");
    expect(potPhase("2026-12-12")).toBe("uebergabe");
    expect(potPhase("2026-12-13")).toBe("ruhe");
  });

  it("„noch X Tage“ nur während der Abstimmung (inklusive heute)", () => {
    expect(voteDaysLeft("2026-11-15")).toBe(16);
    expect(voteDaysLeft("2026-11-30")).toBe(1);
    expect(voteDaysLeft("2026-11-10")).toBeNull();
  });
});

describe("Topf, Stimmen, Betrag", () => {
  it("eigene Region mit Topf, sonst die unterstützte (nur wenn aktiv)", () => {
    expect(activePot(OH, null)).toBe(OH);
    expect(activePot(KIEL, "ostholstein")).toBe(OH);
    expect(activePot(KIEL, "ploen")).toBeNull();
    expect(activePot(null, null)).toBeNull();
    expect(fallbackRegion()).toBe(OH);
  });

  it("Projekte je Region und Jahr; Stimmen mit der eigenen, Anteil am Spitzenreiter", () => {
    const p = projectsFor("ostholstein", 2026);
    expect(p).toHaveLength(3);
    expect(projectsFor("ostholstein", 2025)).toEqual([]);
    const v = projectVotes(p, "oh-jugendfeuerwehr");
    expect(v.map((x) => x.votes)).toEqual([41, 33, 27]);
    expect(v[0].share).toBe(1);
    expect(v[2]).toMatchObject({ mine: true });
    expect(projectVotes([], null)).toEqual([]);
  });

  it("abstimmen nur in der Abstimmzeit, nur für Projekte dieses Jahres im aktiven Topf", () => {
    expect(canVote("2026-11-20", OH, "oh-bolzplatz")).toBe(true);
    expect(canVote("2026-11-10", OH, "oh-bolzplatz")).toBe(false);
    expect(canVote("2026-11-20", null, "oh-bolzplatz")).toBe(false);
    expect(canVote("2026-11-20", OH, "gibt-es-nicht")).toBe(false);
    expect(canVote("2027-11-20", OH, "oh-bolzplatz")).toBe(false);
    expect(canVote("2026-11-20", PLOEN, "oh-bolzplatz")).toBe(false);
  });

  it("Betrag: bisher + eigene Zusage; Euro deutsch formatiert", () => {
    expect(potTotal(OH, null)).toBe(2344);
    expect(potTotal(OH, 4)).toBe(2348);
    expect(euro(2348)).toBe("2.348 €");
  });

  it("feste Texte: nie „an KARAMBA“, Geld geht in die Region", () => {
    const all = Object.values(POT_TEXTS).join(" ");
    expect(all).not.toMatch(/an KARAMBA/i);
    expect(POT_TEXTS.share).toBe("100 % für Projekte in deiner Region");
  });
});

describe("Beitrags-Frage „Gemeinsam für …“", () => {
  const start = { since: "2026-10-01", asked: 0, next: null, done: false };

  it("nach 28 Tagen fällig; nie mit Zusage, erledigt oder ohne Start", () => {
    expect(askDue(start, "2026-10-28", false)).toBe(false);
    expect(askDue(start, "2026-10-29", false)).toBe(true);
    expect(askDue(start, "2026-10-29", true)).toBe(false);
    expect(askDue({ ...start, done: true }, "2026-12-01", false)).toBe(false);
    expect(askDue({ ...start, since: null }, "2026-12-01", false)).toBe(false);
    expect(askDue({ ...start, asked: 3 }, "2026-12-01", false)).toBe(false);
  });

  it("„Später“ = in 4 Wochen wieder, höchstens 3×", () => {
    let a = askLater(start, "2026-10-29");
    expect(a).toEqual({ since: "2026-10-01", asked: 1, next: "2026-11-26", done: false });
    expect(askDue(a, "2026-11-25", false)).toBe(false);
    expect(askDue(a, "2026-11-26", false)).toBe(true);
    a = askLater(askLater(a, "2026-11-26"), "2026-12-24");
    expect(a.done).toBe(true);
    expect(askDue(a, "2027-06-01", false)).toBe(false);
  });
});

describe("Speicher `wasgibts.spendentopf` v2 (liest v1)", () => {
  const store = () => import("@/lib/spendentopf/store");

  it("Prüfen: v1 und v2, Beitrag nur mit positivem Betrag, v1 immer „zugesagt“", async () => {
    const { migratePot } = await store();
    expect(migratePot(null)).toBeNull();
    expect(migratePot({ version: 3 })).toBeNull();
    expect(migratePot({ version: 1 })).toEqual({ version: 2, region: null, support: null, interest: [], votes: {}, pledge: null, ask: { since: null, asked: 0, next: null, done: false }, voteCardHidden: [], liveAsked: false });
    const s = migratePot({ version: 1, region: "kiel", support: "ostholstein", interest: ["kiel", 3], votes: { 2026: "oh-bolzplatz", 2025: 7 }, pledge: { betrag: 4, status: "bezahlt" }, ask: { since: "2026-10-01", asked: "2", next: "2026-11-01", done: true }, voteCardHidden: [2026, "2025"] })!;
    expect(s).toMatchObject({ region: "kiel", support: "ostholstein", interest: ["kiel"], votes: { 2026: "oh-bolzplatz" }, pledge: { betrag: 4, monat: "", status: "zugesagt" }, ask: { since: "2026-10-01", asked: 2, next: "2026-11-01", done: true }, voteCardHidden: [2026] });
    expect(migratePot({ version: 1, pledge: { betrag: 0 } })?.pledge).toBeNull();
    expect(migratePot({ version: 1, pledge: { betrag: 7, monat: "2026-10" } })?.pledge).toEqual({ betrag: 7, art: "monatlich", monat: "2026-10", status: "zugesagt" });
  });

  it("ändern und erstes Öffnen merken (nur einmal)", async () => {
    const { changePot, notePotStart, usePotState } = await store();
    expect(usePotState()?.region).toBeNull();
    notePotStart("2026-10-01");
    notePotStart("2026-10-20");
    expect(usePotState()?.ask.since).toBe("2026-10-01");
    changePot((s) => ({ ...s, pledge: { betrag: 4, art: "monatlich", monat: "2026-10", status: "zugesagt" } }));
    expect(JSON.parse(local.getItem("wasgibts.spendentopf")!).pledge.betrag).toBe(4);
    expect(usePotState()?.ask.since).toBe("2026-10-01");
  });

  it("Region der Familie: selbst gewählt, sonst PLZ aus dem Profil, sonst Wetter-Ort", async () => {
    const { changePot, useFamilyRegion } = await store();
    expect(useFamilyRegion()).toEqual({ region: OH, auto: true });
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 1, city: "Kiel" }));
    expect(useFamilyRegion().region?.id).toBe("kiel");
    postcode = "";
    expect(useFamilyRegion().region?.id).toBe("kiel");
    postcode = "24211";
    expect(useFamilyRegion()).toEqual({ region: PLOEN, auto: true });
    changePot((s) => ({ ...s, region: "luebeck" }));
    expect(useFamilyRegion()).toEqual({ region: regionById("luebeck"), auto: false });
  });
});
