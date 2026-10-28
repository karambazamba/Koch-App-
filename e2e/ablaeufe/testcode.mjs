// Zugangscode gleich am Anfang (SOFORT-Auftrag, A-027: „Zugangscode“ statt
// „Testcode“, Knopf „Fertig“, nachsichtig). Der Server wird hier nur
// nachgestellt (`serverMitCode`): „braucht Code“ und ein ausgedachter
// Prüfcode – nie der echte, der liegt nur in Vercel. Abläufe: neuer Nutzer
// (falsch → richtig, Groß/klein und Leerzeichen egal), Bestandsnutzer ohne
// Code, „Später“ und dann ein KI-Versuch, Neustart behält den Zugang,
// „Zugangscode ändern“ in den Einstellungen.
import { BASE, PRUEF_CODE, hello, miaTippen, serverMitCode } from "../lib.mjs";

const screen = (page) => page.locator("[data-code-screen]");
const sichtbar = (page) => screen(page).waitFor({ timeout: 6000 }).then(() => true, () => false);
const weg = (page) => screen(page).waitFor({ state: "detached", timeout: 6000 }).then(() => true, () => false);
const fertig = (page) => page.getByRole("button", { name: "Fertig" });

export const testcodeNeu = async (page, check) => {
  const seen = await serverMitCode(page);
  await hello(page);
  check(await sichtbar(page), "neuer Nutzer: nach Hallo und „Für wen“ „Fast geschafft.“ (3. Bildschirm)");
  check(await page.getByRole("heading", { name: "Fast geschafft." }).isVisible(), "Überschrift „Fast geschafft.“");
  check(await page.getByText("Gib deinen Zugangscode ein, dann kann ich zuhören und mitdenken.").isVisible(), "Satz mit „Zugangscode“");
  check(await page.getByText("Groß/klein und Leerzeichen sind egal.").isVisible(), "Hinweis unter dem Feld");
  check(!(await screen(page).getByText(/Testcode/).count()) && !(await screen(page).getByRole("button", { name: "Los geht’s" }).count()), "kein „Testcode“, kein zweites „Los geht’s“");
  const feld = page.getByLabel("Zugangscode");
  check((await feld.getAttribute("type")) === "password" && (await feld.getAttribute("autocomplete")) === "off", "Passwortfeld ohne Autofill");
  check(await page.getByText("Ohne Code geht’s auch: Schreiben mit ＋ funktioniert immer.").isVisible(), "leiser Satz mit ＋");
  await feld.fill("falsch-geraten");
  await fertig(page).click();
  check(await page.getByText("Der Code passt nicht. Nochmal?").waitFor({ timeout: 5000 }).then(() => true, () => false), "falscher Code: „Der Code passt nicht. Nochmal?“");
  // nachsichtig: Groß/klein und Leerzeichen sind egal
  await feld.fill(` ${PRUEF_CODE.toUpperCase().replace("-IM-", "-im -")} `);
  await fertig(page).click();
  check(await weg(page), "richtiger Code (anders geschrieben): Bildschirm geht");
  check(seen.urls.every((u) => !u.toLowerCase().includes(PRUEF_CODE) && !u.includes("falsch-geraten")), "Code nie in der Adresse");
  await page.reload();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  await page.waitForTimeout(1200);
  check(!(await screen(page).count()), "Neustart: Zugang bleibt, keine Abfrage");
};

export const testcodeBestand = async (page, check) => {
  await hello(page);
  check(!(await screen(page).count()), "ohne Code-Pflicht keine Abfrage (nur 2 Bildschirme)");
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
  await page.getByLabel("Zugangscode").fill(PRUEF_CODE);
  await fertig(page).click();
  check(await weg(page), "Code drin, weiter geht’s");
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.getByRole("button", { name: /Zugangscode ändern/ }).click();
  check(await page.getByRole("heading", { name: "Zugangscode ändern" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Einstellungen → Mia: „Zugangscode ändern“");
  await page.getByRole("button", { name: "Abbrechen" }).click();
  check(await weg(page), "Abbrechen schließt");
};
