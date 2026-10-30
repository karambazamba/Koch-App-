// A-069: Erinnerungen bei geschlossener App – Planung (30 Min vorher, auch
// abends nach 20 Uhr, nie in der Pause, „Ich“ nur an mich), ehrlicher Status
// (ohne Abo „nein“), Test-Erinnerung, Protokoll nur mit Art und Status.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planPushes, type PushAbo, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { artVon, laeuftVersand, schicktGeschlossen, statusZeilen, testNachricht, type ServerStatus } from "@/lib/heute/mitteilungen/pushStatus";

const HH = "hh-1";
const T = "2026-10-21";
const row = (id: string, data: Record<string, unknown>, raum = "familie", besitzer = "felix"): PushEntryRow => ({
  household_id: HH,
  id,
  typ: "termin",
  raum,
  besitzer,
  erstellt: `${T}T06:00:00.000Z`,
  geaendert: `${T}T06:00:00.000Z`,
  data: { id, typ: "termin", raum, besitzer, data },
});
const abo = (id: string, user: string, settings: PushAbo["settings"] = {}): PushAbo => ({ id, user_id: user, household_id: HH, settings });
const plan = (abos: PushAbo[], rows: PushEntryRow[], clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return planPushes({ abos, rows, today: T, minute: h * 60 + m, nowMs: Date.parse(`${T}T${clock}:00+02:00`), sent: new Set(), proactiveToday: new Set() });
};

describe("Planung", () => {
  const zahnarzt = row("t1", { title: "Zahnarzt", date: T, start: "16:00", reminder: "30", place: "Praxis Dr. Krüger" });

  it("Termin 30 Min vorher: „In 30 Min: Zahnarzt · 16:00 · Praxis Dr. Krüger“, öffnet den Termin, gleicher tag wie auf dem Gerät", () => {
    const [m] = plan([abo("A", "felix")], [zahnarzt], "15:30");
    expect(m.payload).toMatchObject({ title: "Mia", body: "In 30 Min: Zahnarzt · 16:00 · Praxis Dr. Krüger", href: `/tag?datum=${T}&eintrag=t1`, tag: `erinnerung:t1@${T}` });
    expect(m.key).toBe(`erinnerung:t1@${T}#${T}`);
  });

  it("abends um 21 Uhr kommt die selbst gestellte Erinnerung trotzdem", () => {
    const abend = row("t2", { title: "Kino", date: T, start: "21:30", reminder: "30" });
    expect(plan([abo("A", "felix")], [abend], "21:00").map((x) => x.payload.body)).toEqual(["In 30 Min: Kino · 21:30"]);
  });

  it("verspätet (Lauf ausgefallen): bis 5 Min danach kommt sie noch, später nicht mehr", () => {
    expect(plan([abo("A", "felix")], [zahnarzt], "15:34")).toHaveLength(1);
    expect(plan([abo("A", "felix")], [zahnarzt], "15:40")).toHaveLength(0);
  });

  it("in der Pause kommt nichts", () => {
    expect(plan([abo("A", "felix", { pause: { from: T, until: null } })], [zahnarzt], "15:30")).toEqual([]);
  });

  it("Familie an alle Geräte, „Ich“ nur an mich (auf allen meinen Geräten)", () => {
    const ich = row("t3", { title: "Physio", date: T, start: "16:00", reminder: "30" }, "ich");
    const out = plan([abo("A", "felix"), abo("A2", "felix"), abo("B", "lisa")], [zahnarzt, ich], "15:30");
    const by = (id: string) => out.filter((m) => m.aboId === id).map((m) => m.payload.body.split(":")[1].trim().split(" ·")[0]).sort();
    expect(by("A")).toEqual(["Physio", "Zahnarzt"]);
    expect(by("A2")).toEqual(["Physio", "Zahnarzt"]);
    expect(by("B")).toEqual(["Zahnarzt"]);
  });
});

describe("Status in Klartext", () => {
  const NOW = Date.parse("2026-10-21T15:30:00+02:00");
  const server = (x: Partial<ServerStatus> = {}): ServerStatus => ({ zeitplan: true, ziel: true, letzterLauf: new Date(NOW - 60_000).toISOString(), abo: true, ...x });
  const alles = { homescreen: true, erlaubt: true, konto: true, server: server(), nowMs: NOW };
  const zu = (e: typeof alles) => statusZeilen(e, "Mia").find((z) => z.id === "zu")!;

  it("alles da: vier Mal „ja“, kein Hilfesatz", () => {
    const z = statusZeilen(alles, "Mia");
    expect(z.map((x) => `${x.label}: ${x.ja ? "ja" : "nein"}`)).toEqual(["Auf dem Homescreen: ja", "Mitteilungen erlaubt: ja", "Mit Konto verbunden: ja", "Mia schickt auch bei geschlossener App: ja"]);
    expect(z.every((x) => x.hilfe === null)).toBe(true);
  });

  it("ohne Abo: „nein“ mit Satz, was zu tun ist", () => {
    const z = zu({ ...alles, server: server({ abo: false }) });
    expect(z.ja).toBe(false);
    expect(z.hilfe).toMatch(/Test/);
  });

  it("Zeitplan aus oder letzter Lauf älter als 5 Min: „nein“", () => {
    expect(zu({ ...alles, server: server({ zeitplan: false }) }).hilfe).toMatch(/Zeitplan/);
    expect(zu({ ...alles, server: server({ letzterLauf: new Date(NOW - 6 * 60_000).toISOString() }) }).ja).toBe(false);
    expect(laeuftVersand(null, NOW)).toBe(false);
    expect(schicktGeschlossen(null, NOW)).toBe(false);
  });

  it("jedes „nein“ hat einen Satz (Homescreen-Anleitung, Erlaubnis, Konto)", () => {
    const z = statusZeilen({ homescreen: false, erlaubt: false, konto: false, server: null, nowMs: NOW }, "Mia");
    expect(z.every((x) => !x.ja && x.hilfe)).toBe(true);
    expect(z[0].hilfe).toContain("Zum Home-Bildschirm");
  });
});

describe("Test und Protokoll", () => {
  it("Test-Erinnerung führt zu den Mitteilungs-Einstellungen, eigener tag", () => {
    expect(testNachricht("A", "x1", "Mia")).toMatchObject({ aboId: "A", key: "test:x1", payload: { title: "Mia", href: "/profil/mitteilungen", tag: "test:x1" } });
  });

  it("Protokoll nur mit Art (nie Inhalt)", () => {
    expect([`erinnerung:t1@${T}#${T}`, "test:x", `proaktiv:${T}:pin:p1`, `proaktiv:${T}:abgeben:a:1`, "einkauf:e1", "unterwegs:u:start"].map(artVon)).toEqual(["erinnerung", "test", "pinnwand", "abgeben", "einkauf", "einkauf"]);
    const route = readFileSync("src/app/api/push/senden/route.ts", "utf8");
    expect(route).toMatch(/protokoll\.push\(\{ household_id: abo\.household_id, art, status: "gesendet" \}\)/);
    expect(route).toMatch(/rest\("push_laeufe", \{ method: "POST"/);
  });

  it("der Zeitplan ruft immer die echte App auf (keine geschützte Vorschau)", () => {
    expect(readFileSync("src/app/api/push/schluessel/route.ts", "utf8")).toMatch(/process\.env\.VERCEL_ENV === "production" && row\.base_url !== origin/);
    const sql = readFileSync("supabase/migrations/20261112120000_push_zuverlaessig.sql", "utf8");
    expect(sql).toMatch(/create extension if not exists pg_net with schema extensions/);
    expect(sql).toMatch(/cron\.schedule\('mia-push-senden', '\* \* \* \* \*'/);
    for (const t of ["push_laeufe", "push_protokoll", "push_tests"]) expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security;\\nrevoke all on public\\.${t} from anon, authenticated;`));
  });
});
