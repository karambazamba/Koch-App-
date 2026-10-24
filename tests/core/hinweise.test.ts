// Hinweis-Warteschlange der Startseite (Launch 1.0): höchstens einer, jeder
// nur einmal (ab dem nächsten Tag weg), in den ersten 3 Tagen keiner.
import { beforeEach, describe, expect, it } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { abgelaufen, hinweisGezeigt, hinweiseZuruecksetzen, naechsterHinweis, RUHE_TAGE } from "@/lib/core/hinweise";

const since = "2026-10-01";
const alle = { "mia-name-neu": true, einladen: true, spendentopf: true, "startseite-halten": true, "lieber-schlicht": true, "abends-dunkel": true };

describe("naechsterHinweis", () => {
  it("in den ersten 3 Tagen und beim Beispiel-Tag: keiner", () => {
    for (let d = 0; d < RUHE_TAGE; d++) expect(naechsterHinweis(alle, { today: `2026-10-0${1 + d}`, since, demo: false, gezeigt: {} })).toBeNull();
    expect(naechsterHinweis(alle, { today: "2026-10-04", since, demo: true, gezeigt: {} })).toBeNull();
    expect(naechsterHinweis(alle, { today: "2026-10-04", since: null, demo: false, gezeigt: {} })).toBeNull();
  });

  it("ab Tag 4 genau einer, in fester Reihenfolge", () => {
    expect(naechsterHinweis(alle, { today: "2026-10-04", since, demo: false, gezeigt: {} })).toBe("mia-name-neu");
    expect(naechsterHinweis({ "abends-dunkel": true, einladen: true }, { today: "2026-10-04", since, demo: false, gezeigt: {} })).toBe("einladen");
    expect(naechsterHinweis({}, { today: "2026-10-04", since, demo: false, gezeigt: {} })).toBeNull();
  });

  it("jeder nur einmal: am selben Tag bleibt er, ab dem nächsten Tag kommt der nächste", () => {
    const gezeigt = { "mia-name-neu": "2026-10-04" };
    expect(naechsterHinweis(alle, { today: "2026-10-04", since, demo: false, gezeigt })).toBe("mia-name-neu");
    expect(naechsterHinweis(alle, { today: "2026-10-05", since, demo: false, gezeigt })).toBe("einladen");
    expect(abgelaufen(gezeigt, "mia-name-neu", "2026-10-05")).toBe(true);
  });
});

describe("Speicher", () => {
  beforeEach(() => {
    noBrowser();
    fakeWindow();
  });

  it("merkt den ersten Tag, überschreibt ihn nicht, „Tipps nochmal zeigen“ setzt zurück", () => {
    hinweisGezeigt("einladen", "2026-10-04");
    hinweisGezeigt("einladen", "2026-10-05");
    expect(JSON.parse(window.localStorage.getItem("wasgibts.hinweise")!).gezeigt).toEqual({ einladen: "2026-10-04" });
    hinweiseZuruecksetzen();
    expect(JSON.parse(window.localStorage.getItem("wasgibts.hinweise")!).gezeigt).toEqual({});
  });
});
