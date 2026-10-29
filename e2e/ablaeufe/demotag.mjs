// Demo-Startseite (Tafel 150): zur echten Uhrzeit gebaut – Di 10:15 (Kita,
// Schwimmen …) und Sa 16:05 (Familie, nie Kita). Streifen „Beispiel · tipp
// überall rein · Hinweise aus“, unter Jetzt-Karte, Kreisen und Kacheln je ein
// grauer Satz; nie ein vergangener Termin, nie „…“; „Hinweise aus“ blendet die
// Sätze aus (die Beispiele bleiben).
import { losGehts, newPage, BASE } from "../lib.mjs";

const ZEITEN = [
  ["Di 10:15", "2026-11-03T10:15:00+01:00", 10 * 60 + 15, false],
  ["Sa 16:05", "2026-11-07T16:05:00+01:00", 16 * 60 + 5, true],
];

export const demoTag = async (page, check, device) => {
  const browser = page.context().browser();
  for (const [wo, time, minuten, wochenende] of ZEITEN) {
    const p = await newPage(browser, device, { time });
    try {
      await p.goto(BASE);
      await losGehts(p, "Für die Familie");
      await p.locator("[data-raster]").waitFor();
      await p.waitForTimeout(1200);
      check(await p.getByText("Beispiel · tipp überall rein").isVisible(), `${wo}: Streifen „Beispiel · tipp überall rein“`);
      const saetze = await p.locator("[role=tabpanel]:not([inert]) [data-demo-hinweis]").allInnerTexts();
      check(saetze.some((s) => /gerade wichtig/.test(s)) && saetze.some((s) => /durchatmen/.test(s)) && saetze.some((s) => /Was heute noch kommt/.test(s)), `${wo}: graue Sätze unter Jetzt-Karte, Kreisen und Kacheln (${saetze.length})`);
      const termine = await p.locator('[role=tabpanel]:not([inert]) section[aria-label="Termine"] li').allInnerTexts();
      const vorbei = termine.filter((t) => {
        const m = t.match(/(\d{1,2}):(\d\d)/);
        return m && Number(m[1]) * 60 + Number(m[2]) + 30 <= minuten;
      });
      check(termine.length > 0 && !vorbei.length, `${wo}: nie ein vergangener Termin (${termine.map((t) => t.replace(/\n/g, " ")).join(", ")})`);
      const alles = await p.locator("[role=tabpanel]:not([inert])").innerText();
      check(!/…/.test(alles), `${wo}: nie „…“`);
      if (wochenende) check(!/(?<![a-zäöüß])(Kita|Elternabend)(?![a-zäöüß])/.test(termine.join(" ")), `${wo}: keine Kita, kein Elternabend am Wochenende`);
      await p.getByRole("button", { name: "Hinweise aus" }).click();
      await p.waitForTimeout(400);
      check(!(await p.locator("[data-demo-hinweis]").count()) && (await p.getByRole("button", { name: "Eigenen starten" }).isVisible()), `${wo}: „Hinweise aus“ – Sätze weg, Beispiele bleiben, „Eigenen starten“`);
    } finally {
      await p.context().close();
    }
  }
};
