// App heißt Mia (Tafel 55): einmal „Ab jetzt heiße ich überall Mia.“ nach der
// Migration (Theo → Mia), Einstellungsseite ohne „Name & Art“ (Stimme oben,
// Vorlesen darunter), „Ich nenn dich …“ → „Ich bleib lieber Mia 😊“ und der
// einmalige iPhone-Hinweis „neu hinzufügen“ (nur als Web-App).
import { BASE, hello, miaTippen } from "../lib.mjs";

const setProfile = (page, patch) =>
  page.evaluate((patch) => {
    const p = JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil"));
    localStorage.setItem("familienkueche.haushaltsprofil", JSON.stringify({ ...p, ...patch }));
  }, patch);

export const miaName = async (page, check) => {
  await hello(page);
  // Altes Profil (v21) mit Theo → beim Laden Mia, einmal Bescheid
  await setProfile(page, { version: 21, helper: { name: "Theo", art: "assistent", voice: "maennlich", farbe: "nachtblau" }, miaNotice: undefined });
  await page.reload();
  const notice = page.getByText("Ab jetzt heiße ich überall Mia.");
  check(await notice.waitFor({ timeout: 5000 }).then(() => true, () => false), "einmal „Ab jetzt heiße ich überall Mia.“");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil")));
  check(saved.helper.name === "Mia" && saved.miaNotice === false && saved.version === 22, "Profil v22: Mia, Hinweis gemerkt");
  await page.waitForTimeout(4500);
  await page.reload();
  await page.waitForTimeout(1200);
  check(!(await notice.isVisible()), "beim nächsten Öffnen nicht mehr");

  // Einstellungsseite „Mia“
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.getByRole("heading", { name: "Stimme" }).waitFor({ timeout: 5000 });
  check(!(await page.getByText("Name & Art").count()) && !(await page.getByText(/eigenen Namen/).count()), "kein „Name & Art“, kein eigener Name");
  check(await page.getByText("Deine Assistentin").isVisible(), "oben „Deine Assistentin“");
  const order = await page.evaluate(() => [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()));
  check(order.indexOf("Stimme") >= 0 && order.indexOf("Stimme") < order.indexOf("Vorlesen"), `Stimme vor Vorlesen (${order.join(" · ")})`);

  // „Ich nenn dich …“ → Mia bleibt
  await page.goto(BASE);
  await page.waitForTimeout(900);
  const box = await miaTippen(page);
  await box.fill("Ich nenn dich ab jetzt Frieda");
  await box.press("Enter");
  check(await page.getByText(/Ich bleib lieber Mia/).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "„Ich bleib lieber Mia 😊“");
};

export const miaNeuHinzufuegen = async (page, check, device) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { get: () => true }));
  await hello(page);
  await setProfile(page, { miaHomeHint: true });
  await page.reload();
  const hint = page.getByText(/^Ich heiße jetzt Mia\. Damit der neue Name unter dem Icon steht/);
  const ios = device.startsWith("iPhone");
  check((await hint.waitFor({ timeout: 4000 }).then(() => true, () => false)) === ios, ios ? "iPhone als Web-App: Hinweis da" : "Android: kein Hinweis");
  if (!ios) return;
  await page.getByRole("button", { name: "Zeig mir wie" }).click();
  const guide = page.getByRole("dialog").last();
  check(await guide.getByText("Schritt 1 von 5").isVisible(), "Zeig mir wie: 5 Schritte, zuerst sichern");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Alles klar" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1200);
  check(!(await hint.isVisible()), "nach „Alles klar“ nie wieder");
};
