// Freie Antworten erkennen: Regeln (recognize.ts), KI auf dem Server (ai.ts,
// mit Ersatz-Funktion statt echter Anfrage) und Schreibvarianten (names.ts).
import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { cleanSpeech, extractDietItems, extractNames, extractPersonInfo, isAddPersonRequest } from "@/lib/einstellungen/onboarding/recognize";
import { aiRecognize, parseRecognizeRequest, ruleRecognize, type RecognizeKind } from "@/lib/einstellungen/onboarding/ai";
import { nameVariants } from "@/lib/einstellungen/onboarding/names";

describe("Regeln – Füllwörter und Namen", () => {
  it("entfernt Füllwörter aus gesprochenen Antworten", () => {
    expect(cleanSpeech("Ähm, also wir sind   halt zu dritt")).toBe("wir sind zu dritt");
  });

  it("Namen mit Rollen und Alter", () => {
    expect(extractNames("Ich bin Lisa, mein Mann Felix und unsere Kinder Mattis (7) und Ella")).toEqual([
      { name: "Lisa", role: "erwachsen" },
      { name: "Felix", role: "erwachsen" },
      { name: "Mattis", role: "kind", age: 7 },
      { name: "Ella", role: "kind" },
    ]);
  });

  it("klein geschriebene Namen, keine Lebensmittel, keine Doppelten", () => {
    expect(extractNames("lisa und tom und lisa").map((n) => n.name)).toEqual(["Lisa", "Tom"]);
    expect(extractNames("Pizza mit Anna").map((n) => n.name)).toEqual(["Anna"]);
    // Erwachsene mit Alter bleiben ohne Kinder-Rolle
    expect(extractNames("Opa Kurt 70")).toEqual([{ name: "Kurt", role: "erwachsen", age: 70 }]);
  });
});

describe("Regeln – Angaben zu einer Person", () => {
  it("Kind mit Alter in Worten, Schule, Allergie", () => {
    const info = extractPersonInfo("Sie ist sieben Jahre alt, geht zur Grundschule und hat eine Gluten-Unverträglichkeit");
    expect(info).toMatchObject({ role: "kind", age: 7, ageGroup: "schulkind", allergies: ["Gluten"] });
  });

  it("Gruppen aus Stichwörtern und aus dem Alter", () => {
    expect(extractPersonInfo("Baby, geht zur Tagesmutter").ageGroup).toBe("kleinkind");
    expect(extractPersonInfo("ist in der Kita").ageGroup).toBe("kitakind");
    expect(extractPersonInfo("4 Jahre").ageGroup).toBe("kitakind");
    expect(extractPersonInfo("2 Jahre").ageGroup).toBe("kleinkind");
    expect(extractPersonInfo("ist 9").ageGroup).toBe("schulkind");
  });

  it("Erwachsene: Arbeit, Mittagessen, Abneigungen", () => {
    const info = extractPersonInfo("Arbeitet im Büro, mag Oliven gar nicht. Hasst Koriander");
    expect(info.role).toBe("erwachsen");
    expect(info.lunch).toBe("auswaerts");
    expect(info.dislikes).toEqual(["Oliven", "Koriander"]);
    expect(extractPersonInfo("Homeoffice").lunch).toBe("zuhause");
    expect(extractPersonInfo("isst manchmal mittags mit").lunch).toBe("manchmal");
  });

  it("Allergien vereinheitlicht, nicht doppelt als „mag nicht“", () => {
    const info = extractPersonInfo("allergisch gegen Erdnüsse, Haselnüsse und Garnelen; laktoseintolerant; mag keine Erdnüsse");
    expect(info.allergies).toEqual(["Erdnüsse", "Nüsse", "Meeresfrüchte", "Laktose"]);
    expect(info.dislikes).toEqual([]);
    expect(extractPersonInfo("verträgt keine Eier").allergies).toEqual(["Ei"]);
    expect(extractPersonInfo("allergisch auf Soja, Sellerie, Senf, Sesam und Fisch").allergies).toEqual(["Soja", "Sellerie", "Senf", "Sesam", "Fisch"]);
    expect(extractPersonInfo("allergisch gegen Kiwi").allergies).toEqual(["Kiwi"]);
  });
});

describe("Fehler: Erdnuss-Allergie wurde zu „Nüsse“ bzw. „Sse“", () => {
  it("„Erdnüsse“ und „Erdnüsse-Allergie“ (mit ü) bleiben Erdnüsse – eigenes Allergen", () => {
    expect(extractPersonInfo("allergisch gegen Erdnüsse").allergies).toEqual(["Erdnüsse"]);
    expect(extractPersonInfo("Erdnüsse-Allergie").allergies).toEqual(["Erdnüsse"]);
    expect(extractPersonInfo("allergisch gegen Erdnuss").allergies).toEqual(["Erdnüsse"]);
  });
});

describe("Regeln – Allergien mehreren Personen zuordnen", () => {
  it("je Person ein Abschnitt", () => {
    expect(extractDietItems("Ella mag keine Pilze, Felix ist allergisch gegen Nüsse", ["Ella", "Felix"])).toEqual([
      { person: "Ella", kind: "mag nicht", term: "Pilze" },
      { person: "Felix", kind: "Allergie", term: "Nüsse" },
    ]);
  });

  it("ohne Namen für alle; Kurzantworten werden „mag nicht“", () => {
    expect(extractDietItems("Wir mögen keine Rosinen", ["Ella"])).toEqual([{ person: null, kind: "mag nicht", term: "Rosinen" }]);
    expect(extractDietItems("keine Pilze, kein Koriander und keine Allergien", [])).toEqual([
      { person: null, kind: "mag nicht", term: "Pilze" },
      { person: null, kind: "mag nicht", term: "Koriander" },
    ]);
  });
});

describe("Regeln – neue Person?", () => {
  it.each([
    ["Oma Rosi wohnt jetzt bei uns", true],
    ["Wir haben Zuwachs", true],
    ["Neue Person hinzufügen", true],
    ["Paul isst ab jetzt auch mit", true],
    ["Neue Person auf die Einkaufsliste", false],
    ["Was gibt's heute?", false],
  ])("%s → %s", (text, expected) => {
    expect(isAddPersonRequest(text)).toBe(expected);
  });
});

describe("Schreibvarianten von Vornamen", () => {
  it("bietet andere Schreibweisen an", () => {
    expect(nameVariants(" mathis ")).toEqual(["Mattis", "Matthis", "Mathys"]);
    expect(nameVariants("Unbekannt")).toEqual([]);
  });
});

// --- KI (Server) -----------------------------------------------------------------

type Create = (p: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

function reply(json: unknown, stop: string = "end_turn"): Create {
  const text = typeof json === "string" ? json : JSON.stringify(json);
  return vi.fn(async () => ({ stop_reason: stop, content: [{ type: "text", text }] }) as unknown as Anthropic.Message);
}

const req = (kind: RecognizeKind, text: string, names: string[] = [], person?: string) => ({ kind, text, names, person });

describe("KI – Anfrage prüfen", () => {
  it("lehnt Ungültiges ab", () => {
    expect(parseRecognizeRequest(null)).toBeNull();
    expect(parseRecognizeRequest("x")).toBeNull();
    expect(parseRecognizeRequest({ kind: "foo", text: "a" })).toBeNull();
    expect(parseRecognizeRequest({ kind: "names", text: "   " })).toBeNull();
    expect(parseRecognizeRequest({ kind: "names", text: 3 })).toBeNull();
  });

  it("kürzt Text, Namen und Person", () => {
    const parsed = parseRecognizeRequest({ kind: "person", text: "a".repeat(700), names: ["x".repeat(50), 3, ...Array(30).fill("N")], person: "p".repeat(50) });
    expect(parsed!.text).toHaveLength(600);
    expect(parsed!.names).toHaveLength(20);
    expect(parsed!.names[0]).toHaveLength(40);
    expect(parsed!.person).toHaveLength(40);
    expect(parseRecognizeRequest({ kind: "diet", text: "a", names: "kein Array" })).toEqual({ kind: "diet", text: "a", names: [], person: undefined });
  });
});

describe("KI – Erkennen mit Ersatz-Funktion", () => {
  it("Namen: säubert, entfernt Doppelte, prüft Rolle und Alter", async () => {
    const create = reply({ names: [{ name: "lisa!", role: "erwachsen", age: 40 }, { name: "Lisa", role: null, age: null }, { name: "Ben", role: "hund", age: 200 }, { name: "" }] });
    const r = await aiRecognize(req("names", "Lisa und Ben", ["Felix"]), create, "test-modell");
    expect(r).toEqual({ names: [{ name: "Lisa", role: "erwachsen", age: 40 }, { name: "Ben", role: undefined, age: undefined }] });
    const params = (create as ReturnType<typeof vi.fn>).mock.calls[0][0] as Anthropic.MessageCreateParamsNonStreaming;
    expect(params.model).toBe("test-modell");
    expect(JSON.stringify(params.messages)).toContain("Bekannte Personen: Felix.");
  });

  it("Person: nur erlaubte Werte; Gruppe ohne Rolle heißt Kind", async () => {
    const r = await aiRecognize(
      req("person", "geht in die Kita", [], "Ella"),
      reply({ role: "alien", age: 4.5, ageGroup: "kitakind", lunch: "mensa", allergies: [" Nüsse ", 3, ""], dislikes: "Pilze" }),
      "m",
    );
    expect(r).toEqual({ person: { role: "kind", age: undefined, ageGroup: "kitakind", lunch: undefined, allergies: ["Nüsse"], dislikes: [] } });
    const ohneName = reply({ role: "erwachsen", age: 30, ageGroup: null, lunch: "zuhause", allergies: [], dislikes: [] });
    await aiRecognize(req("person", "x"), ohneName, "m");
    expect(JSON.stringify((ohneName as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain("die Person");
  });

  it("Allergien: Personen nur aus der Liste, sonst für alle", async () => {
    const r = await aiRecognize(
      req("diet", "...", ["Ella", "Felix"]),
      reply({ items: [{ person: "ella", kind: "Allergie", term: "Nüsse" }, { person: "Oma", kind: "mag nicht", term: "Pilze" }, { person: null, kind: "liebt", term: "Käse" }, { person: null, kind: "mag nicht", term: " " }] }),
      "m",
    );
    expect(r).toEqual({ diet: [{ person: "Ella", kind: "Allergie", term: "Nüsse" }, { person: null, kind: "mag nicht", term: "Pilze" }] });
  });

  it("Ablehnung, abgeschnittene oder kaputte Antwort → Regeln", async () => {
    const r1 = await aiRecognize(req("names", "Ich bin Lisa"), reply({}, "refusal"), "m");
    expect(r1).toEqual(ruleRecognize(req("names", "Ich bin Lisa")));
    const r2 = await aiRecognize(req("person", "7 Jahre"), reply({}, "max_tokens"), "m");
    expect(r2.person?.age).toBe(7);
    const r3 = await aiRecognize(req("diet", "Ella mag keine Pilze", ["Ella"]), reply("kein json"), "m");
    expect(r3).toEqual({ diet: [{ person: "Ella", kind: "mag nicht", term: "Pilze" }] });
  });

  it("leere oder seltsame Strukturen ergeben leere Ergebnisse", async () => {
    expect(await aiRecognize(req("names", "x"), reply("null"), "m")).toEqual({ names: [] });
    expect(await aiRecognize(req("diet", "x"), reply({ items: "nein" }), "m")).toEqual({ diet: [] });
  });
});
