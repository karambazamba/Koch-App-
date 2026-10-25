// Testcode gleich am Anfang (SOFORT-Auftrag). Der Server wird hier nur
// nachgestellt (`page.route`): „braucht Code“ und ein ausgedachter Prüfcode –
// nie der echte, der liegt nur in Vercel. Abläufe: neuer Nutzer, Bestandsnutzer
// ohne Code, „Später“ und dann ein KI-Versuch, falscher Code, Neustart behält
// den Zugang, „Testcode ändern“ in den Einstellungen.
import { BASE, hello, miaTippen } from "../lib.mjs";

const PRUEF = "nur-im-test";

/** /api/lotte: Status mit „braucht Code“, KI-Anfragen ohne passenden Code → „zugangscode“ */
async function serverMitCode(page, seen = { urls: [] }) {
  await page.route("**/api/lotte**", async (route) => {
    const req = route.request();
    seen.urls.push(req.url());
    const code = req.headers()["x-lotte-code"];
    if (req.method() === "GET") {
      const status = { configured: true, mock: false, needsCode: true, ...(code ? { access: code === PRUEF ? "ok" : "falsch" } : {}) };
      return route.fulfill({ json: status });
    }
    if (code !== PRUEF) return route.fulfill({ status: 401, json: { error: "zugangscode" } });
    return route.continue();
  });
  return seen;
}

const screen = (page) => page.locator("[data-code-screen]");
const sichtbar = (page) => screen(page).waitFor({ timeout: 6000 }).then(() => true, () => false);
const weg = (page) => screen(page).waitFor({ state: "detached", timeout: 6000 }).then(() => true, () => false);

export const testcodeNeu = async (page, check) => {
  const seen = await serverMitCode(page);
  await hello(page);
  check(await sichtbar(page), "neuer Nutzer: nach Hallo und Zustimmung „Fast geschafft.“");
  check(await page.getByRole("heading", { name: "Fast geschafft." }).isVisible(), "Überschrift „Fast geschafft.“");
  const feld = page.getByLabel("Testcode");
  check((await feld.getAttribute("type")) === "password" && (await feld.getAttribute("autocomplete")) === "off", "Passwortfeld ohne Autofill");
  check(await page.getByText("Ohne Code geht’s auch: Tippen mit ＋ funktioniert immer.").isVisible(), "leiser Satz mit ＋");
  await feld.fill("falsch-geraten");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  check(await page.getByText("Der Code passt nicht. Nochmal?").waitFor({ timeout: 5000 }).then(() => true, () => false), "falscher Code: „Der Code passt nicht. Nochmal?“");
  await feld.fill(PRUEF);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  check(await weg(page), "richtiger Code: Bildschirm geht");
  check(seen.urls.every((u) => !u.includes(PRUEF) && !u.includes("falsch-geraten")), "Code nie in der Adresse");
  await page.reload();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  await page.waitForTimeout(1200);
  check(!(await screen(page).count()), "Neustart: Zugang bleibt, keine Abfrage");
};

export const testcodeBestand = async (page, check) => {
  await hello(page);
  check(!(await screen(page).count()), "ohne Code-Pflicht keine Abfrage");
  await serverMitCode(page);
  await page.reload();
  check(await sichtbar(page), "Bestandsnutzer ohne Code: beim nächsten Öffnen");
};

export const testcodeSpaeter = async (page, check) => {
  await serverMitCode(page);
  await hello(page);
  await sichtbar(page);
  await page.getByRole("button", { name: "Später" }).click();
  check(await weg(page), "„Später“ schließt");
  await page.reload();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  await page.waitForTimeout(1200);
  check(!(await screen(page).count()), "„Später“ bleibt nach Neustart");
  const box = await miaTippen(page);
  await box.fill("Erzähl mir einen Witz");
  await box.press("Enter");
  check(await sichtbar(page), "erster KI-Versuch: derselbe Bildschirm");
  await page.getByLabel("Testcode").fill(PRUEF);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  check(await weg(page), "Code drin, weiter geht’s");
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.getByRole("button", { name: /Testcode ändern/ }).click();
  check(await page.getByRole("heading", { name: "Testcode ändern" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Einstellungen → Mia: „Testcode ändern“");
  await page.getByRole("button", { name: "Abbrechen" }).click();
  check(await weg(page), "Abbrechen schließt");
};
