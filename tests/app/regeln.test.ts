// Einheitliche Regeln, durch Tests abgesichert (Aufräumen Etappe 4): Speicher
// nur über das Speicher-Verzeichnis, Zeit nur über now(), Fenster nur über
// Sheet/ConfirmDialog, typografischer Apostroph, „Ohne Druck“-Wortliste und
// kein fest eingebauter Name der Begleitung in sichtbaren Texten.
import { describe, expect, it } from "vitest";
import { SOURCES, stripComments, texts } from "../textQuellen";

const hits = (test: (code: string, file: string) => string[]) => SOURCES.flatMap(({ file, code }) => test(code, file).map((h) => `${file}: ${h}`));

/** Texte, die an die KI gehen oder Regeln beschreiben – keine sichtbaren Texte */
const NOT_VISIBLE = /^lib\/begleitung\/(prompt|engine|mock\w*|\w*Tools|tools|toolset|registry|ops|protocol|guard)\.ts$|^app\/api\//;

describe("Regeln für den Code", () => {
  it("Speicher nur über localStore.ts (createLocalStore, readRaw/writeRaw)", () => {
    const allowed = new Set(["lib/core/localStore.ts", "lib/core/theme.ts"]);
    expect(hits((code, file) => (allowed.has(file) ? [] : [...stripComments(code).matchAll(/\b(localStorage|sessionStorage)\.\w+/g)].map((m) => m[0])))).toEqual([]);
  });

  it("Zeit nur über now() – kein new Date() außerhalb now.ts", () => {
    expect(hits((code, file) => (file === "lib/core/now.ts" ? [] : [...stripComments(code).matchAll(/new Date\(\)/g)].map((m) => m[0])))).toEqual([]);
  });

  // AddTileTip: Einmal-Tipp über dem echten Knopf (kein Fenster, sondern Hinweis-Karte)
  it("Fenster nur über Sheet oder ConfirmDialog", () => {
    const allowed = new Set(["components/ui/Sheet.tsx", "components/ui/ConfirmDialog.tsx", "components/heute/AddTileTip.tsx"]);
    expect(hits((code, file) => (allowed.has(file) ? [] : [...stripComments(code).matchAll(/(?<!\[)role=["{]["']?(dialog|alertdialog)/g)].map((m) => m[0])))).toEqual([]);
  });

  it("geheimer Supabase-Schlüssel nur auf dem Server (serverEnv.ts, API-Routen)", () => {
    const server = (file: string) => file === "lib/konten/serverEnv.ts" || file.startsWith("app/api/");
    expect(hits((code, file) => (server(file) ? [] : [...stripComments(code).matchAll(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|supabaseSecret/g)].map((m) => m[0])))).toEqual([]);
    expect(hits((code, file) => (file.startsWith("app/api/") && /supabaseSecret/.test(code) && /^["']use client["']/.test(code) ? ["use client"] : []))).toEqual([]);
  });
});

describe("Regeln für sichtbare Texte", () => {
  it("typografischer Apostroph (gibt’s, geht’s – nie gibt's)", () => {
    expect(hits((code, file) => (NOT_VISIBLE.test(file) ? [] : texts(code).filter((t) => /[a-zäöüß]'[a-zäöüß]/i.test(t))))).toEqual([]);
  });

  it("Ohne Druck: keine Druck-Wörter", () => {
    const words = /\b(fehlt|fehlen|offen|offene[nrs]?|überfällig\w*|verpasst\w*|noch zu erledigen|du musst|du solltest|vergiss nicht|alles da)\b|noch: /i;
    expect(hits((code, file) => (NOT_VISIBLE.test(file) ? [] : texts(code).filter((t) => words.test(t))))).toEqual([]);
  });

  it("Name der Begleitung nie fest eingebaut (nur Auswahl und Standard)", () => {
    const allowed = /^lib\/einstellungen\/(profileHelper|profileModel|profileStore|welcome)\.ts$|^components\/begleitung\/(BegleitungPicker|HelloScreen)\.tsx$|^lib\/begleitung\/(speech|settingsChat|helperTools)\.ts$|^lib\/einstellungen\/onboarding\/names\.ts$/;
    expect(hits((code, file) => (allowed.test(file) || NOT_VISIBLE.test(file) ? [] : texts(code).filter((t) => /\b(Lotte|Mia|Theo)\b/.test(t))))).toEqual([]);
  });
});
