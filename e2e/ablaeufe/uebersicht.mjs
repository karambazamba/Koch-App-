// Mehreres auf einmal = kurze Übersicht (Testmodus): „Wir brauchen Milch, Brot
// und Eier“ → Mia sagt nur „Erledigt.“, darunter die Karte mit
// „Einkaufsliste · Milch · Brot · Eier“; „Alles rückgängig“ nimmt alles zurück.
import { BASE, hello, miaTippen, seedFamily, store } from "../lib.mjs";

const open = async (page) => {
  const list = await store(page, "wasgibts.einkaufsliste");
  return Object.values(list?.weeks ?? {}).flatMap((w) => (w.manual ?? []).map((i) => i.name));
};

export const miaUebersicht = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  const box = await miaTippen(page);
  await box.fill("Wir brauchen Milch, Brot und Eier");
  await box.press("Enter");
  const card = page.locator("[data-mia-uebersicht]");
  check(await card.waitFor({ timeout: 8000 }).then(() => true, () => false), "Übersicht unter der Antwort");
  const gruppe = card.locator('[data-gruppe="einkauf"]');
  check(/Einkaufsliste/.test(await gruppe.innerText()) && /Milch · Brot · Eier/.test(await gruppe.innerText()), `Gruppe Einkaufsliste mit „Milch · Brot · Eier“ (${(await gruppe.innerText()).replace(/\s+/g, " ")})`);
  check(await page.getByText("Erledigt.", { exact: true }).last().isVisible(), "Mia sagt nur „Erledigt.“");
  check(!(await card.getByText(/^\d+$/).count()), "keine Zahlen in der Übersicht");
  const names = await open(page);
  check(["Milch", "Brot", "Eier"].every((n) => names.includes(n)), `alles auf der Liste (${names.join(", ")})`);
  await card.getByRole("button", { name: "Alles rückgängig" }).click();
  await page.waitForTimeout(500);
  const after = await open(page);
  check(!["Milch", "Brot", "Eier"].some((n) => after.includes(n)), `„Alles rückgängig“ nimmt alles zurück (${after.join(", ") || "leer"})`);
};
