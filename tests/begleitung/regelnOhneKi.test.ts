// Regeln ohne KI im Gespräch: Vorlesen, Bausteine, Startseite/Rückgängig,
// Einstellungen per Satz, Chat-Vorschläge, Allergien, Rate-Limit.
import { describe, expect, it } from "vitest";
import { readingChange } from "@/lib/begleitung/speechChat";
import type { SpeechSettings } from "@/lib/begleitung/speech";
import { parseBausteinCommand } from "@/lib/begleitung/bausteinChat";
import { parseHomeCommand } from "@/lib/begleitung/homeChat";
import { settingsChange } from "@/lib/begleitung/settingsChat";
import { chatSuggestions } from "@/lib/begleitung/chatSuggestions";
import { dietConflicts } from "@/lib/begleitung/diet";
import { allowDaily, allowRequest, codeAttemptsLeft, noteWrongCode } from "@/lib/begleitung/rateLimit";
import { LIMITS } from "@/lib/begleitung/protocol";
import { createEmptyProfile, createPerson, type HouseholdProfile, type Person } from "@/lib/einstellungen/profile";
import type { PantryItem } from "@/lib/vorrat/pantry";

const speech: SpeechSettings = { version: 1, mode: "auto", quelle: "mia", voice: "", rate: "normal" };

function person(name: string, role: Person["role"] = "erwachsen", extra: Partial<Person> = {}): Person {
  return { ...createPerson(role), name, ...extra };
}

function family(): HouseholdProfile {
  return { ...createEmptyProfile(), persons: [person("Felix"), person("Lisa"), person("Jonne", "kind")] };
}

describe("Vorlesen per Satz", () => {
  it("schaltet aus, an, langsamer und schneller", () => {
    expect(readingChange("Nicht mehr vorlesen bitte", speech)?.changes).toEqual({ mode: "aus" });
    expect(readingChange("Sei still", speech)?.changes).toEqual({ mode: "aus" });
    expect(readingChange("Lies mir bitte vor", speech)?.changes).toEqual({ mode: "an" });
    expect(readingChange("Vorlesen einschalten", speech)?.reply).toMatch(/lese ich meine Antworten vor/);
    expect(readingChange("Sprich etwas langsamer", speech)?.changes).toEqual({ rate: "langsam" });
    expect(readingChange("Rede schneller", speech)?.changes).toEqual({ rate: "schnell" });
  });

  it("bleibt am Rand stehen und ignoriert Fremdes", () => {
    expect(readingChange("Sprich langsamer", { ...speech, rate: "langsam" })?.changes).toEqual({ rate: "langsam" });
    expect(readingChange("Sprich schneller", { ...speech, rate: "schnell" })?.changes).toEqual({ rate: "schnell" });
    expect(readingChange("Sprich langsamer", { ...speech, rate: "schnell" })?.changes).toEqual({ rate: "normal" });
    expect(readingChange("Was gibt’s heute?", speech)).toBeNull();
  });
});

describe("Bausteine per Satz", () => {
  it("erkennt die Übersicht", () => {
    expect(parseBausteinCommand("Was kannst du noch?")).toEqual({ kind: "list" });
    expect(parseBausteinCommand("Welche Bausteine gibt es")).toEqual({ kind: "list" });
  });

  it("schaltet ein und aus", () => {
    expect(parseBausteinCommand("Zeig mir den Vorrat")).toEqual({ kind: "set", feature: "vorrat", on: true });
    expect(parseBausteinCommand("Ich brauche die Tipps nicht.")).toEqual({ kind: "set", feature: "tipps", on: false });
    expect(parseBausteinCommand("Wochenend-Ideen ausblenden")).toEqual({ kind: "set", feature: "wochenendIdeen", on: false });
    expect(parseBausteinCommand("Schalt das Backen an")).toEqual({ kind: "set", feature: "backen", on: true });
    expect(parseBausteinCommand("Wochenplan einschalten")).toEqual({ kind: "set", feature: "wochenplan", on: true });
  });

  it("ohne Baustein-Wort oder ohne Absicht nichts", () => {
    expect(parseBausteinCommand("Milch auf die Liste")).toBeNull();
    expect(parseBausteinCommand("Der Vorrat")).toBeNull();
  });
});

describe("Startseite, Wochenplan, Einkaufsliste per Satz", () => {
  it("Rückgängig nur als ganzer Satz", () => {
    expect(parseHomeCommand("Mach das rückgängig")).toEqual({ kind: "undo" });
    expect(parseHomeCommand("rückgängig bitte")).toEqual({ kind: "undo" });
    expect(parseHomeCommand("Mach das rückgängig, und dann Milch")).toBeNull();
    expect(parseHomeCommand("   ")).toBeNull();
  });

  it("Bearbeiten und Standard-Anordnung", () => {
    expect(parseHomeCommand("Startseite bearbeiten")).toEqual({ kind: "show", target: "startseite" });
    expect(parseHomeCommand("Setz die Startseite zurück auf Standard")).toEqual({ kind: "home", change: { tile: "termine", action: "standard" } });
  });

  it("Wochenplan und Liste leeren", () => {
    expect(parseHomeCommand("Lösch den Wochenplan wieder")).toEqual({ kind: "clear_week" });
    expect(parseHomeCommand("Leer die Einkaufsliste")).toEqual({ kind: "clear_shopping" });
  });

  it("Kachel + Aktion", () => {
    expect(parseHomeCommand("Mach die Einkaufsliste wieder klein")).toEqual({ kind: "home", change: { tile: "einkauf", action: "klein" } });
    expect(parseHomeCommand("Nimm die Einkaufsliste von der Startseite")).toEqual({ kind: "home", change: { tile: "einkauf", action: "ausblenden" } });
    expect(parseHomeCommand("Zeig das Wetter wieder auf der Startseite")).toEqual({ kind: "home", change: { tile: "wetter", action: "zeigen" } });
    expect(parseHomeCommand("Aufgaben ganz nach oben")).toEqual({ kind: "home", change: { tile: "aufgaben", action: "nach_oben" } });
    expect(parseHomeCommand("Pinnwand groß")).toEqual({ kind: "home", change: { tile: "pinnwand", action: "gross" } });
    expect(parseHomeCommand("Notizen mittel")).toEqual({ kind: "home", change: { tile: "notizen", action: "mittel" } });
    expect(parseHomeCommand("Vorrat ganz nach unten")).toEqual({ kind: "home", change: { tile: "vorrat", action: "nach_unten" } });
    expect(parseHomeCommand("Mach den Kalender groß")).toEqual({ kind: "home", change: { tile: "termine", action: "gross" } });
    expect(parseHomeCommand("Vorschau klein")).toEqual({ kind: "home", change: { tile: "morgen", action: "klein" } });
    expect(parseHomeCommand("Essen klein")).toEqual({ kind: "home", change: { tile: "essen", action: "klein" } });
  });

  it("Seiten zeigen und Artikel entfernen", () => {
    expect(parseHomeCommand("Zeig mir den Wochenplan")).toEqual({ kind: "show", target: "wochenplan" });
    expect(parseHomeCommand("Wo finde ich die Einkaufsliste?")).toEqual({ kind: "show", target: "einkaufsliste" });
    // Fehler bis jetzt: \b vor „Ö“ greift in JavaScript nicht – „Öffne …“ wurde nicht erkannt
    expect(parseHomeCommand("Öffne den Wochenplan")).toEqual({ kind: "show", target: "wochenplan" });
    expect(parseHomeCommand("Öffne bitte die Einkaufsliste")).toEqual({ kind: "show", target: "einkaufsliste" });
    expect(parseHomeCommand("Nimm die Milch und Brot von der Liste")).toEqual({ kind: "remove_shopping", names: ["milch", "brot"] });
    expect(parseHomeCommand("Streich Eier wieder aus der Einkaufsliste")).toEqual({ kind: "remove_shopping", names: ["eier"] });
    expect(parseHomeCommand("Wie spät ist es?")).toBeNull();
  });
});

describe("Einstellungen per Satz", () => {
  it("Ernährung einer Person", () => {
    const p = family();
    const veg = settingsChange("Mia, Jonne isst jetzt vegetarisch", p)!;
    expect(veg.reply).toMatch(/Jonne isst jetzt vegetarisch/);
    expect(veg.profile.persons[2].dislikes).toEqual(["Fleisch", "Fisch"]);
    // Andere Personen bleiben unverändert
    expect(veg.profile.persons[0].dislikes).toEqual([]);

    const vegan = settingsChange("Lisa isst vegan", p)!;
    expect(vegan.profile.persons[1].dislikes).toEqual(["Fleisch", "Fisch", "Eier", "Milch", "Käse"]);

    const again = settingsChange("Lisa isst wieder Fleisch", vegan.profile)!;
    expect(again.profile.persons[1].dislikes).toEqual([]);
    expect(again.reply).toBe("Notiert ✓ Lisa isst wieder Fleisch.");
  });

  it("Allergien und Abneigungen", () => {
    const p = family();
    const r = settingsChange("Lisa ist allergisch gegen Nüsse", p)!;
    expect(r.profile.persons[1].allergies.map((a) => a.toLowerCase())).toContain("nüsse");
    expect(r.reply).toMatch(/Allergie gegen/);
    const d = settingsChange("Felix mag keine Pilze", p)!;
    expect(d.profile.persons[0].dislikes.map((a) => a.toLowerCase())).toContain("pilze");
    const back = settingsChange("Felix mag wieder Pilze", d.profile)!;
    expect(back.profile.persons[0].dislikes).toEqual([]);
    expect(back.reply).toMatch(/mag wieder/);
  });

  it("Kochstil, Ansicht, Darstellung", () => {
    const p = family();
    expect(settingsChange("Ich koche jetzt spontan", p)!.profile.planStyle).toBe("spontan");
    expect(settingsChange("Kochen wir spontan?", p)).toBeNull();
    expect(settingsChange("Wir planen wieder gern", p)!.profile.planStyle).toBe("plan");
    expect(settingsChange("Mal so, mal so", p)!.profile.planStyle).toBe("mix");
    const dark = settingsChange("Mach die Ansicht dunkel", p)!;
    expect(dark.profile.theme).toBe("nacht");
    expect(dark.profile.themeSet).toBe(true);
    expect(settingsChange("Darstellung automatisch", p)!.profile.theme).toBe("auto");
    expect(settingsChange("App wieder hell", p)!.profile.theme).toBe("warm");
    expect(settingsChange("Zeig mir alles", p)!.profile.display).toBe("alles");
    expect(settingsChange("Lieber einfacher", p)!.profile.display).toBe("einfach");
  });

  it("Melden, Tipps, Wochenend-Ideen", () => {
    const p = family();
    expect(settingsChange("Melde dich seltener", p)!.profile.helperMode).toBe("locker");
    // Fehler bis jetzt: \b vor „ö“ – „Melde dich öfter“ wurde nicht erkannt
    expect(settingsChange("Melde dich öfter", p)!.profile.helperMode).toBe("dranbleiben");
    expect(settingsChange("Melde dich mehr", p)!.profile.helperMode).toBe("dranbleiben");
    expect(settingsChange("Keine Tipps mehr", p)!.profile.tips).toBe("aus");
    expect(settingsChange("Wieder Tipps bitte", p)!.profile.tips).toBe("ab_und_zu");
    expect(settingsChange("Keine Wochenend-Ideen", p)!.profile.weekendIdeas).toBe(false);
    expect(settingsChange("Wochenend-Ideen wieder an", p)!.profile.weekendIdeas).toBe(true);
  });

  it("Umbenennen: Mia bleibt Mia, Anrede am Anfang", () => {
    const p = family();
    const r = settingsChange("Ich nenn dich ab jetzt Frieda", p)!;
    expect(r.profile).toBe(p);
    expect(r.reply).toBe("Ich bleib lieber Mia 😊");
    expect(settingsChange("Nimm eine männliche Stimme", p)!.reply).toMatch(/^Ich bleib lieber Mia 😊 Eine andere Stimme/);
    // "Hey, …" wird abgeschnitten
    expect(settingsChange("Hey, melde dich seltener", p)!.profile.helperMode).toBe("locker");
    expect(settingsChange("Wie wird das Wetter?", p)).toBeNull();
  });

  it("Ernährungssätze ohne bekannte Person ändern nichts", () => {
    expect(settingsChange("Paul isst jetzt vegetarisch", family())).toBeNull();
  });
});

describe("Vorschläge im leeren Chat", () => {
  const pantry = (name: string): PantryItem => ({ id: name, name, addedAt: "2026-10-20", place: "kuehlschrank" });

  it("vor dem Essen 'heute', mit Name aus dem Profil, höchstens drei", () => {
    const out = chatSuggestions({ profile: family(), mealOver: false, pantry: [pantry("Paprika")], shopping: [], ai: true, rand: 0.1 });
    expect(out[0]).toBe("Was gibt’s heute?");
    expect(out).toHaveLength(3);
    expect(out.some((s) => /^Was mach ich mit Paprika\?$/.test(s))).toBe(true);
    expect(out.some((s) => /^(Felix|Lisa|Jonne) wünscht sich /.test(s))).toBe(true);
  });

  it("nach dem Essen: mit KI 'morgen', ohne KI 'Was ist noch da?'", () => {
    const base = { profile: family(), mealOver: true, pantry: [], shopping: [], rand: 0.7 };
    expect(chatSuggestions({ ...base, ai: true })[0]).toBe("Was machen wir morgen?");
    const noAi = chatSuggestions({ ...base, ai: false });
    expect(noAi[0]).toBe("Was ist noch da?");
    expect(noAi[1]).toMatch(/^Wir brauchen \S+ und \S+$/);
  });

  it("allein lebend: 'Ich wünsche mir …', Einkaufsbeispiel als Ersatz", () => {
    const solo = { ...createEmptyProfile(), householdType: "single" as const, persons: [person("Felix")] };
    const out = chatSuggestions({ profile: solo, mealOver: false, pantry: [], shopping: [], ai: true, rand: 0.2 });
    expect(out).toContain("Wir brauchen Milch und Eier");
    expect(out.some((s) => s.startsWith("Ich wünsche mir "))).toBe(true);
  });

  it("schlägt nichts vor, was schon auf der Liste steht", () => {
    const shopping = ["milch", "Eier", "Haferflocken", "Brot", "Bananen"];
    const out = chatSuggestions({ profile: family(), mealOver: false, pantry: [], shopping, ai: true, rand: 0.9 });
    // nur noch Joghurt übrig → kein Paar möglich → Standard-Beispiel
    expect(out).toContain("Wir brauchen Milch und Eier");
  });
});

describe("Allergien und 'mag nicht' streng prüfen", () => {
  it("findet versteckte Allergene und kurze Wörter nur als Ganzes", () => {
    const lisa = person("Lisa", "erwachsen", { allergies: ["Gluten"] });
    const c = dietConflicts("Spaghetti Bolognese", ["400 g Spaghetti", "Hack"], [lisa]);
    expect(c).toEqual([{ person: "Lisa", kind: "Allergie", term: "Gluten", found: "Spaghetti Bolognese" }]);
    const ei = person("Jonne", "kind", { allergies: ["Ei"] });
    expect(dietConflicts("Gemüse-Reis", ["Reis", "Erbsen"], [ei])).toEqual([]);
    expect(dietConflicts("Pfannkuchen", ["2 Ei", "Mehl"], [ei])[0]).toMatchObject({ person: "Jonne", found: "2 Ei" });
  });

  it("mag nicht und namenlose Personen", () => {
    const kid = person("", "kind", { dislikes: ["Pilze"] });
    const adult = person(" ", "erwachsen", { dislikes: ["Oliven"] });
    const c = dietConflicts("Pizza", ["Pilze", "Oliven", "Käse"], [kid, adult]);
    expect(c.map((x) => x.person)).toEqual(["ein Kind", "ein:e Erwachsene:r"]);
    expect(c.every((x) => x.kind === "mag nicht")).toBe(true);
    expect(dietConflicts("Pizza", [], [person("Felix", "erwachsen", { dislikes: [""] })])).toEqual([]);
  });
});

describe("Rate-Limit pro Gerät", () => {
  it("höchstens 10 pro Minute, mit Faktor mehr", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(allowRequest("geraet-a", 1, t + i)).toBe(true);
    expect(allowRequest("geraet-a", 1, t + 20)).toBe(false);
    // eine Minute später wieder frei
    expect(allowRequest("geraet-a", 1, t + 61_000)).toBe(true);
    for (let i = 0; i < 20; i++) expect(allowRequest("ip-b", 2, t + i)).toBe(true);
    expect(allowRequest("ip-b", 2, t + 30)).toBe(false);
  });

  it("Tageslimit und falsche Codes", () => {
    const t = 5_000_000;
    for (let i = 0; i < LIMITS.dailyPerDevice; i++) allowDaily("tag-a", 1, t + i);
    expect(allowDaily("tag-a", 1, t + 500)).toBe(false);
    expect(allowDaily("tag-a", 1, t + 24 * 60 * 60_000 + 1000)).toBe(true);
    expect(codeAttemptsLeft("ip-c", t)).toBe(true);
    for (let i = 0; i < 10; i++) noteWrongCode("ip-c", t + i);
    expect(codeAttemptsLeft("ip-c", t + 100)).toBe(false);
    expect(codeAttemptsLeft("ip-c", t + 60 * 60_000 + 100)).toBe(true);
  });

  it("räumt alte Einträge auf, wenn es zu viele werden", () => {
    const t = 9_000_000;
    for (let i = 0; i < 5001; i++) allowRequest(`viele-${i}`, 1, t);
    for (let i = 0; i < 5001; i++) allowDaily(`viele-${i}`, 1, t);
    for (let i = 0; i < 5001; i++) noteWrongCode(`viele-${i}`, t);
    const later = t + 2 * 24 * 60 * 60_000;
    expect(allowRequest("neu", 1, later)).toBe(true);
    expect(allowDaily("neu", 1, later)).toBe(true);
    expect(codeAttemptsLeft("viele-1", later)).toBe(true);
  });
});
