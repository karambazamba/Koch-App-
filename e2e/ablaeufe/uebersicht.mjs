// Mehreres auf einmal (Testmodus, seit A-037 als Ergebnis-Karten): „Wir
// brauchen Milch, Brot und Eier“ → Mia sagt nur „Steht drin.“, darunter je
// Sache eine Karte „… · Einkauf · für alle · Steht drauf“; EIN „Rückgängig“
// nimmt alles zurück.
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
  const karten = page.locator("[data-ergebnis-karten]").last();
  check(await karten.waitFor({ timeout: 8000 }).then(() => true, () => false), "Ergebnis-Karten unter der Antwort");
  const texte = (await karten.locator("[data-ergebnis-text]").allInnerTexts()).map((t) => t.trim());
  check(texte.join(" · ") === "Milch · Brot · Eier", `je Sache eine Karte (${texte.join(" · ")})`);
  check((await karten.getByText("Einkauf · für alle").count()) === 3, "darunter „Einkauf · für alle“");
  check(await page.getByText("Steht drin.", { exact: true }).last().isVisible(), "Mia sagt nur „Steht drin.“");
  check(!(await karten.getByText(/^\d+$/).count()), "keine Zahlen in den Karten");
  const names = await open(page);
  check(["Milch", "Brot", "Eier"].every((n) => names.includes(n)), `alles auf der Liste (${names.join(", ")})`);
  await karten.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(500);
  const after = await open(page);
  check(!["Milch", "Brot", "Eier"].some((n) => after.includes(n)), `„Rückgängig“ nimmt alles zurück (${after.join(", ") || "leer"})`);
};
