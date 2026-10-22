// Neue Person im Gespräch ("Oma Rosi wohnt jetzt bei uns"): Namen bestätigen,
// vorstellen, Rolle/Gruppe nachfragen, korrigieren, überspringen.
import { describe, expect, it } from "vitest";
import { aiKindFor, answer, chipsFor, finalizeProfile, placeholderFor, removeName, renameName, revisit, skip, startAddPerson, type OnboardingState } from "@/lib/einstellungen/onboarding/engine";
import { createEmptyProfile, createPerson, type HouseholdProfile } from "@/lib/einstellungen/profile";

function familie(): HouseholdProfile {
  const base = createEmptyProfile();
  const lisa = { ...createPerson("erwachsen"), name: "Lisa" };
  const felix = { ...createPerson("erwachsen"), name: "Felix" };
  return { ...base, persons: [lisa, felix], adults: 2, kids: 0, householdType: "paar" };
}

const last = (s: OnboardingState) => s.messages[s.messages.length - 1];
const newest = (s: OnboardingState) => s.draft.persons[s.draft.persons.length - 1];

describe("Neue Person – Start", () => {
  it("erkennt den Namen und fragt nach der Schreibweise", () => {
    const s = startAddPerson(familie(), "Oma Rosi wohnt jetzt bei uns");
    expect(s.step).toBe("confirmNames");
    expect(s.names).toEqual([{ name: "Rosi", role: "erwachsen" }]);
    expect(s.messages[0]).toMatchObject({ from: "user", text: "Oma Rosi wohnt jetzt bei uns" });
    expect(last(s).text).toBe("Hab ich alle richtig geschrieben?");
  });

  it("ohne neuen Namen fragt sie nach dem Namen – bekannte Personen und die Begleitung zählen nicht", () => {
    const profile = familie();
    const s = startAddPerson(profile, `Lisa und ${profile.helper.name} sind da`);
    expect(s.step).toBe("members");
    expect(last(s).text).toBe("Wie heißt die neue Person?");
    // leerer Text erzeugt keine Nutzer-Nachricht
    expect(startAddPerson(profile).messages.every((m) => m.from === "helper")).toBe(true);
  });

  it("ohne Namen der Begleitung nimmt sie den Standard-Namen", () => {
    const profile = { ...familie(), helper: { ...familie().helper, name: "" } };
    const s = startAddPerson(profile, "Mia zieht ein");
    expect(s.step).toBe("members");
  });
});

describe("Neue Person – ganzer Ablauf", () => {
  it("Erwachsene mit Allergie: bestätigen, vorstellen, fertig", () => {
    let s = startAddPerson(familie(), "Oma Rosi wohnt jetzt bei uns");
    s = answer(s, { chip: "ok" });
    expect(s.step).toBe("personIntro");
    expect(s.messages.some((m) => m.text === "Prima! 👍" && m.target?.kind === "names")).toBe(true);
    expect(last(s).text).toBe("Erzähl mir kurz was über Rosi.");
    s = answer(s, { text: "Sie isst mittags zu Hause und ist allergisch gegen Nüsse" });
    expect(s.step).toBe("done");
    const rosi = newest(s);
    expect(rosi).toMatchObject({ name: "Rosi", role: "erwachsen", weekdayLunch: "zuhause", allergies: ["Nüsse"] });
    const notiert = s.messages.find((m) => m.text.startsWith("Notiert ✓"));
    expect(notiert?.text).toBe("Notiert ✓ Rosi, erwachsen, isst mittags zu Hause, Allergie: Nüsse");
    expect(last(s).text).toBe("Alles notiert ✓ Willkommen in der Runde!");
    // fertig: nichts ändert sich mehr
    expect(answer(s, { text: "noch was" })).toBe(s);
    expect(skip(s)).toBe(s);
    expect(revisit(s, { kind: "names" })).toBe(s);
  });

  it("Kind ohne Angaben: Rolle und Gruppe werden nachgefragt", () => {
    let s = startAddPerson(familie(), "");
    expect(s.step).toBe("members");
    s = answer(s, { text: "Sie heißt Ella" });
    expect(s.step).toBe("confirmNames");
    s = answer(s, { chip: "ok" });
    s = answer(s, { chip: "weiter" });
    expect(s.step).toBe("personRole");
    expect(chipsFor(s).map((c) => c.value)).toEqual(["erwachsen", "kind"]);
    s = answer(s, { text: "weiß nicht" });
    expect(s.step).toBe("personRole");
    expect(last(s).text).toBe("Sorry, nochmal: Ist Ella erwachsen oder ein Kind?");
    s = answer(s, { text: "noch klein" });
    expect(s.step).toBe("personGroup");
    expect(chipsFor(s)).toHaveLength(3);
    s = answer(s, { text: "hm" });
    expect(last(s).text).toMatch(/^Sorry, nochmal: Ist Ella noch zu Hause/);
    s = answer(s, { text: "Sie geht in den Kindergarten" });
    expect(s.step).toBe("done");
    expect(newest(s)).toMatchObject({ role: "kind", ageGroup: "kitakind", weekdayLunch: "auswaerts" });
    expect(s.messages.some((m) => m.text === "Notiert ✓ Ella, Kitakind, isst mittags in der Kita")).toBe(true);
  });

  it("mehrere Namen, Alter aus der Antwort, Rolle per Chip", () => {
    let s = startAddPerson(familie(), "Unsere Enkel Paul 7 und Mara 2 essen jetzt mit");
    expect(s.names).toEqual([
      { name: "Paul", role: "kind", age: 7 },
      { name: "Mara", role: "kind", age: 2 },
    ]);
    s = answer(s, { chip: "ok" });
    // Paul: Alter → Schulkind, Gruppe bekannt → nur kurz vorstellen
    expect(last(s).text).toBe("Erzähl mir kurz was über Paul.");
    s = answer(s, { text: "mag keine Pilze" });
    expect(last(s).text).toBe("Erzähl mir kurz was über Mara.");
    s = answer(s, { chip: "kind" });
    expect(s.step).toBe("done");
    const [paul, mara] = s.draft.persons.slice(-2);
    expect(paul).toMatchObject({ age: 7, ageGroup: "schulkind", dislikes: ["Pilze"] });
    expect(mara).toMatchObject({ age: 2, ageGroup: "kleinkind", weekdayLunch: "zuhause" });
    expect(s.messages.some((m) => m.text.includes("Paul, 7, Schulkind, isst mittags in der Schule, mag nicht: Pilze"))).toBe(true);
  });

  it("Erwachsener mit Alter wird ohne Alter gespeichert, Rollenwechsel behält Name und Vorlieben", () => {
    let s = startAddPerson(familie(), "Tom 30 wohnt jetzt bei uns");
    s = answer(s, { chip: "ok" });
    const tom = newest(s);
    expect(tom.age ?? null).toBeNull();
    s = answer(s, { text: "Er mag keine Oliven" });
    // 30 Jahre ohne Rollenwort: Rolle wird nachgefragt
    if (s.step === "personRole") s = answer(s, { text: "ein Kind", chip: undefined });
    if (s.step === "personGroup") s = answer(s, { chip: "schulkind" });
    expect(s.step).toBe("done");
    expect(newest(s)).toMatchObject({ name: "Tom", dislikes: ["Oliven"] });
  });

  it("manchmal und auswärts beim Mittagessen", () => {
    let s = startAddPerson(familie(), "Oma Rosi zieht ein");
    s = answer(s, { chip: "ok" });
    s = answer(s, { text: "isst mittags manchmal mit" });
    expect(s.messages.some((m) => m.text.includes("isst mittags manchmal zu Hause"))).toBe(true);
    let t = startAddPerson(familie(), "Opa Kurt zieht ein");
    t = answer(t, { chip: "ok" });
    t = answer(t, { text: "isst in der Kantine" });
    expect(t.messages.some((m) => m.text.includes("isst mittags auswärts"))).toBe(true);
  });

  it("KI-Erkennung ersetzt die Regeln", () => {
    let s = startAddPerson(familie(), "");
    s = answer(s, { text: "egal", recognized: { names: [{ name: "Juna", role: "kind", age: 4 }] } });
    expect(s.names[0].name).toBe("Juna");
    s = answer(s, { chip: "ok" });
    s = answer(s, { text: "egal", recognized: { person: { role: "kind", age: 5, ageGroup: "kitakind", lunch: "auswaerts", allergies: ["Ei"], dislikes: [] } } });
    expect(s.step).toBe("done");
    expect(newest(s)).toMatchObject({ name: "Juna", age: 5, ageGroup: "kitakind", allergies: ["Ei"] });
  });
});

describe("Neue Person – Namen bestätigen", () => {
  it("kein Name gehört → freundliche Nachfrage", () => {
    const s = answer(startAddPerson(familie(), ""), { text: "Ja" });
    expect(s.step).toBe("members");
    expect(last(s).text).toBe("Hm, da hab ich keinen Namen rausgehört. Sag mir einfach den Vornamen.");
  });

  it("weitere Namen ergänzen, umbenennen, entfernen", () => {
    let s = startAddPerson(familie(), "Oma Rosi zieht ein");
    s = answer(s, { text: "und Opa Kurt und Hans" });
    expect(last(s).text).toBe("Ergänzt ✓ Kurt und Hans. Jetzt alle richtig?");
    s = answer(s, { text: "Rosi" });
    expect(last(s).text).toMatch(/^Tipp einen Namen an/);
    s = renameName(s, 0, "  rosemarie   anna ");
    expect(s.names[0].name).toBe("Rosemarie anna");
    s = renameName(s, 2, "   ");
    expect(s.names.map((n) => n.name)).toEqual(["Rosemarie anna", "Kurt"]);
    s = removeName(s, 1);
    expect(s.names).toHaveLength(1);
    s = removeName(s, 0);
    // alle entfernt + Passt → zurück zur Namensfrage
    s = answer(s, { chip: "ok" });
    expect(s.step).toBe("members");
  });

  it("Chips, Platzhalter und KI-Art je Schritt", () => {
    const s = startAddPerson(familie(), "");
    expect(placeholderFor(s)).toBe("z. B. Oma Rosi");
    expect(chipsFor(s)).toEqual([]);
    const c = answer(s, { text: "Rosi" });
    expect(placeholderFor(c)).toMatch(/Noch jemand/);
    expect(chipsFor(c)[0]).toMatchObject({ value: "ok", primary: true });
    const p = answer(c, { chip: "ok" });
    expect(placeholderFor(p)).toMatch(/Schulkind/);
    expect(chipsFor(p).map((x) => x.value)).toEqual(["erwachsen", "kind", "weiter"]);
    expect(placeholderFor({ ...p, step: "personRole" })).toBe("Antworten oder Chip antippen …");
    expect(chipsFor({ ...p, step: "done" })[0].value).toBe("fertig");
    expect(aiKindFor("members")).toBe("names");
    expect(aiKindFor("confirmNames")).toBe("names");
    expect(aiKindFor("personIntro")).toBe("person");
    expect(aiKindFor("personRole")).toBeNull();
  });
});

describe("Neue Person – korrigieren und überspringen", () => {
  it("Namen antippen: alle Personen nochmal bestätigen, danach zurück", () => {
    let s = startAddPerson(familie(), "Oma Rosi zieht ein");
    s = answer(s, { chip: "ok" });
    expect(s.step).toBe("personIntro");
    s = revisit(s, { kind: "names" });
    expect(s.step).toBe("confirmNames");
    expect(s.returnTo).toBe("personIntro");
    expect(last(s).text).toBe("Klar: Hab ich alle richtig geschrieben?");
    s = renameName(s, 0, "Elisabeth");
    s = answer(s, { chip: "ok" });
    expect(s.draft.persons[0].name).toBe("Elisabeth");
    expect(s.step).toBe("personIntro");
    expect(last(s).text).toBe("Weiter geht’s: Erzähl mir kurz was über Rosi.");
  });

  it("Person antippen mitten in der Runde: danach geht es mit der aktuellen weiter", () => {
    let s = startAddPerson(familie(), "Kinder Paul 7 und Mara 4 essen jetzt mit");
    s = answer(s, { chip: "ok" });
    const paulId = s.personId!;
    s = answer(s, { chip: "weiter" });
    const maraId = s.personId!;
    expect(maraId).not.toBe(paulId);
    s = revisit(s, { kind: "person", id: paulId });
    expect(s.personId).toBe(paulId);
    expect(s.queue).toEqual([maraId]);
    expect(last(s).text).toBe("Okay, nochmal: Erzähl mir kurz was über Paul.");
    s = answer(s, { text: "verträgt keine Laktose" });
    expect(s.personId).toBe(maraId);
    s = skip(s);
    expect(s.step).toBe("done");
    expect(s.draft.persons.find((p) => p.id === paulId)?.allergies).toEqual(["Laktose"]);
  });

  it("überspringen füllt sinnvolle Standards", () => {
    let s = startAddPerson(familie(), "");
    const weg = skip(s);
    expect(weg.step).toBe("done");
    expect(last(weg).text).toBe("Okay, dann ein andermal.");
    s = answer(s, { text: "Ella" });
    s = skip(s); // confirmNames → ok
    expect(s.step).toBe("personIntro");
    s = skip(s); // weiter → Rolle fragen
    expect(s.step).toBe("personRole");
    const erwachsen = skip(s);
    expect(erwachsen.step).toBe("done");
    expect(newest(erwachsen).role).toBe("erwachsen");
    s = answer(s, { chip: "kind" });
    expect(s.step).toBe("personGroup");
    s = skip(s);
    expect(newest(s)).toMatchObject({ role: "kind", ageGroup: "kitakind" });
  });

  it("ohne aktuelle Person schließen die Personen-Schritte die Runde ab", () => {
    const s = startAddPerson(familie(), "");
    for (const step of ["personIntro", "personRole", "personGroup"] as const) {
      const r = answer({ ...s, step, personId: null }, { text: "kind" });
      expect(r.step).toBe("done");
    }
    // Person verschwunden → Runde endet ebenfalls
    const r = answer({ ...s, step: "personIntro", personId: "weg" }, { chip: "weiter" });
    expect(r.step).toBe("done");
  });
});

describe("Neue Person – fertiges Profil", () => {
  it("zählt Erwachsene und Kinder neu, Haushaltstyp passt sich an", () => {
    let s = startAddPerson(familie(), "Unser Sohn Ben 5 wohnt jetzt bei uns");
    s = answer(s, { chip: "ok" });
    s = skip(s);
    const profile = finalizeProfile(s);
    expect(profile.adults).toBe(2);
    expect(profile.kids).toBe(1);
    expect(profile.householdType).toBe("familie");
    expect(profile.persons.map((p) => p.name)).toEqual(["Lisa", "Felix", "Ben"]);
  });

  it("ohne Personen bleibt eine erwachsene Person", () => {
    const s = startAddPerson({ ...familie(), persons: [] }, "");
    const profile = finalizeProfile(s);
    expect(profile.adults).toBe(1);
    expect(profile.persons).toHaveLength(1);
  });
});
