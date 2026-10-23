// „App heißt Mia“: der Name an EINER Stelle (APP_NAME), Manifest und Titel
// daraus, „Was gibt’s?“ nur noch für den Essen-Bereich.
import { describe, expect, it } from "vitest";
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME, APP_SHORT_NAME } from "@/lib/core/app";
import manifest from "@/app/manifest";
import { backupFileName, parseBackup } from "@/lib/core/backup";
import { readFileSync } from "node:fs";
import { SOURCES, texts } from "../textQuellen";

describe("Der App-Name", () => {
  it("steht an einer Stelle: Mia", () => {
    expect(APP_NAME).toBe("Mia");
    expect(APP_SHORT_NAME).toBe(APP_NAME);
    expect(APP_FULL_NAME).toBe("Mia – Familienplaner");
  });

  it("Manifest: Name, Kurzname unter dem Icon, Beschreibung", async () => {
    const m = await manifest();
    expect(m.name).toBe("Mia – Familienplaner");
    expect(m.short_name).toBe("Mia");
    expect(m.description).toBe(APP_DESCRIPTION);
    expect(m.icons?.every((i) => /-v4\.(png|svg)$/.test(i.src))).toBe(true);
  });

  it("kein „Was gibt’s?“ als App-Name in sichtbaren Texten (Essen-Bereich und Prompt-Erklärung erlaubt)", () => {
    const allowed = /^lib\/begleitung\/prompt\.ts$/;
    const found = SOURCES.flatMap(({ file, code }) => (allowed.test(file) ? [] : texts(code).filter((t) => /Was gibt[’']s\?/.test(t)).map((t) => `${file}: ${t}`)));
    expect(found).toEqual([]);
  });

  it("Sicherung heißt jetzt mia-sicherung-…; alte Dateien (was-gibts-…) lassen sich weiter einspielen", () => {
    expect(backupFileName(new Date("2026-10-23T08:00:00Z"))).toBe("mia-sicherung-2026-10-23.json");
    const old = readFileSync("tests/fixtures/sicherung-v0.47.json", "utf8");
    expect(parseBackup(old)).not.toBeNull();
  });
});
