// Spendentopf als Vorschau („bald verfügbar“): Band, Beispiel-Etiketten,
// „vormerken“ statt zusagen, kein Geld; Umschalten auf „live“ zeigt die echte
// Ansicht, Vormerkungen bleiben erhalten und werden einmal sanft eingeladen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jetztInput } from "../helpers";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { POT_TEXTS, liveInvite, pledgeLabel } from "@/lib/spendentopf/model";
import { POT_STATUS } from "@/lib/spendentopf/regions";
import { migratePot } from "@/lib/spendentopf/store";

const src = (f: string) => readFileSync(`src/components/spendentopf/${f}`, "utf8");

describe("Vorschau ist der Standard", () => {
  it("POT_STATUS = vorschau; Band, BEISPIEL, Beispiel-Projekt, „vormerken“, kein Geld", () => {
    expect(POT_STATUS).toBe("vorschau");
    const view = src("SpendentopfView.tsx");
    expect(view).toMatch(/preview && \(\s*<p role="note"[^>]*>\s*\{POT_TEXTS\.preview\}/);
    expect(view).toContain("Beispiel-Projekt");
    expect(view).toMatch(/potTotal\(pot, preview \? null/);
    const pledge = src("PledgeChoice.tsx");
    expect(pledge).toMatch(/const verb = preview \? "vormerken" : "zusagen"/);
    expect(pledge).toMatch(/status: POT_STATUS === "live" \? "zugesagt" : "vorgemerkt"/);
    expect(pledge).toContain("POT_TEXTS.noMoney");
    expect(src("SpendentopfTile.tsx")).toMatch(/Spendentopf · \{preview \? "bald"/);
    expect(POT_TEXTS.preview).toBe("Vorschau – der Spendentopf startet bald. Noch wird kein Geld gesammelt.");
  });

  it("kein Partner- oder Zahlungs-Link und kein „Keine Werbung“", () => {
    for (const f of ["SpendentopfView.tsx", "PledgeChoice.tsx", "SpendentopfTile.tsx", "PotHintCard.tsx"]) expect(src(f), f).not.toMatch(/paypal|stripe|betterplace|https?:\/\//i);
    expect(Object.values(POT_TEXTS).filter((t) => typeof t === "string").join(" ")).not.toMatch(/Keine Werbung/i);
  });

  it("Beträge: „6 € im Monat“ / „10 € einmalig“", () => {
    expect(pledgeLabel(6, "monatlich")).toBe("6 € im Monat");
    expect(pledgeLabel(10, "einmalig")).toBe("10 € einmalig");
  });
});

describe("Vormerkung bleibt, live lädt einmal ein", () => {
  it("v1-Zusage → v2 „zugesagt“ monatlich; v2-Vormerkung bleibt", () => {
    expect(migratePot({ version: 1, pledge: { betrag: 4, monat: "2026-10", status: "zugesagt" } })?.pledge).toEqual({ betrag: 4, art: "monatlich", monat: "2026-10", status: "zugesagt" });
    const v2 = migratePot({ version: 2, pledge: { betrag: 6, art: "einmalig", monat: "2026-10", status: "vorgemerkt" }, liveAsked: false });
    expect(v2?.pledge).toEqual({ betrag: 6, art: "einmalig", monat: "2026-10", status: "vorgemerkt" });
    expect(v2?.version).toBe(2);
  });

  it("Einladung nur live + vorgemerkt + noch nicht gefragt", () => {
    const p = { betrag: 6, art: "monatlich" as const, status: "vorgemerkt" };
    expect(liveInvite("vorschau", p, false)).toBeNull();
    expect(liveInvite("live", { ...p, status: "zugesagt" }, false)).toBeNull();
    expect(liveInvite("live", p, true)).toBeNull();
    expect(liveInvite("live", p, false)).toEqual({ title: "Der Spendentopf ist gestartet", detail: "Magst du deine 6 € im Monat jetzt einrichten?" });
  });

  it("Jetzt-Karte: nicht nachts, öffnet die Seite", () => {
    const invite = liveInvite("live", { betrag: 6, art: "monatlich", status: "vorgemerkt" }, false);
    const day = jetztTopics(jetztInput(11 * 60, { potInvite: invite }));
    expect(day.find((t) => t.kind === "spendentopf")).toMatchObject({ title: "Der Spendentopf ist gestartet", target: { href: "/spendentopf" } });
    expect(jetztTopics(jetztInput(23 * 60, { potInvite: invite })).some((t) => t.kind === "spendentopf")).toBe(false);
    expect(readFileSync("src/components/heute/TodayPage.tsx", "utf8")).toMatch(/t\.kind === "spendentopf" \|\| t\.kind === "region"/);
  });
});
