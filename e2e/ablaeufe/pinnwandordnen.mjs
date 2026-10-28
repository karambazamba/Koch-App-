// Pinnwand aufgeräumt, Größe, Ordnen, Ecke „Nur für mich“ (A-028, Tafel 123)
// mit echten Touch-Gesten: Wand so hoch wie der Inhalt, Polaroid quadratisch
// in halber Breite (antippen = groß im Fenster), Meta-Zeilen nie
// abgeschnitten, „OBEN“ am Zettel, der hängen bleibt. Lange drücken = Zettel
// hebt sich, Fenster (Titel „…“, Klein | Groß, Nach oben, Nur für mich,
// Erledigt, „Zum Verschieben: halten und ziehen“); Groß = volle Breite;
// halten und ziehen = neuer Platz (bleibt nach Neuladen); „Nach oben“ =
// ganz vorn. Ecke „Nur für mich“: Linie mit Schloss, antippen = zu (nur „Nur
// für mich“) bzw. auf, nach Neuladen gemerkt; ohne private Zettel keine
// Linie; die Kachel zeigt private Zettel nie.
import { BASE, TAFEL_123, halten, hello, seedFamily, store, ziehen } from "../lib.mjs";

const zettel = (page, text) => page.locator("[data-flip]", { has: page.getByRole("button", { name: new RegExp(`^(Zettel|Foto) von .*: ${text}`) }) }).first();
/** Reihenfolge, wie sie auf der Wand liegt (DOM: Abschnitt für Abschnitt, Spalte für Spalte) */
const reihenfolge = (page) => page.locator("[data-wand]").first().locator("[data-flip]").evaluateAll((els) => els.map((el) => el.dataset.flip));
const oben = async (page, text) => (await zettel(page, text).boundingBox()).y;

export const pinnwandOrdnen = async (page, check) => {
  await hello(page);
  await seedFamily(page, TAFEL_123);
  await page.goto(BASE + "/pinnwand");
  await page.waitForTimeout(1200);

  // Teil 1: aufgeräumt
  const door = page.getByRole("region", { name: "Kühlschranktür" });
  const d = await door.boundingBox();
  const last = await page.locator("[data-flip]").last().boundingBox();
  check(d.y + d.height - (last.y + last.height) < 48, `Wand endet unter dem Inhalt (${Math.round(d.y + d.height - (last.y + last.height))} px)`);
  const foto = zettel(page, "Fürs Wohnzimmer");
  const fb = await foto.locator("[data-papier=foto] > div > :is(img, span[aria-label])").first().boundingBox();
  check(fb && Math.abs(fb.width - fb.height) <= 2, `Polaroid quadratisch (${Math.round(fb?.width)}×${Math.round(fb?.height)})`);
  check(fb && fb.width < d.width * 0.5, "Polaroid in halber Breite");
  const metas = await page.locator("[data-meta-zeile]").evaluateAll((els) =>
    els.map((el) => {
      const [wann] = el.children;
      const box = el.getBoundingClientRect();
      const w = wann.getBoundingClientRect();
      return { sichtbar: w.top >= box.top - 1 && w.bottom <= box.bottom + 1 && w.right <= box.right + 1, text: el.textContent ?? "" };
    }),
  );
  check(metas.length > 0 && metas.every((m) => m.sichtbar), `Zeit in jeder Meta-Zeile ganz sichtbar (${metas.length})`);
  check(metas.every((m) => !m.text.includes("…")), "keine Meta-Zeile mit „…“");
  // Tafel 123: ab 390 px Breite passen Name und Zeit („Mathis · 12:08“, privat „Du · 11:02“ mit Schloss)
  if (page.viewportSize().width >= 390) {
    const nameDa = async (text) => zettel(page, text).locator("[data-meta-zeile]").evaluate((el) => el.children[1].getBoundingClientRect().top < el.getBoundingClientRect().bottom - 2);
    check((await nameDa("Hallo")) && (await nameDa("Geschenk Lisa")), "Name und Zeit passen in die Meta-Zeile (auch privat)");
  }
  check(await zettel(page, "Samstag Omas").locator("[data-oben]").isVisible(), "„OBEN“ am Zettel, der hängen bleibt");
  const gross = await zettel(page, "Samstag Omas").boundingBox();
  check(gross.width > d.width * 0.8, "großer Zettel über die volle Breite");

  // Foto antippen = groß im Fenster mit Text und Erledigt
  await foto.getByRole("button", { name: /^Foto von/ }).click();
  const fotoFenster = page.getByRole("dialog", { name: "Foto" });
  check(await fotoFenster.waitFor({ timeout: 3000 }).then(() => true, () => false), "Foto antippen → groß im Fenster");
  check(await fotoFenster.getByText("Fürs Wohnzimmer?").isVisible(), "Bildunterschrift im Fenster");
  check(await fotoFenster.getByRole("button", { name: "Erledigt" }).isVisible(), "„Erledigt“ im Fenster");
  await page.keyboard.press("Escape");
  await fotoFenster.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});

  // Teil 2: lange drücken → Fenster wie Tafel 123 C
  await halten(page, zettel(page, "Elternabend"));
  const fenster = page.getByRole("dialog", { name: "„Elternabend Do 19:30“" });
  check(await fenster.waitFor({ timeout: 3000 }).then(() => true, () => false), "lange drücken → Fenster „Elternabend Do 19:30“");
  for (const r of ["Klein", "Groß"]) check(await fenster.getByRole("radio", { name: r }).isVisible(), `Schalter „${r}“`);
  check((await fenster.getByRole("radio", { name: "Klein" }).getAttribute("aria-checked")) === "true", "Standard klein");
  for (const z of ["Nach oben", "Nur für mich", "Erledigt"]) check(await fenster.getByRole("button", { name: z }).isVisible(), `Zeile „${z}“`);
  check(await fenster.getByText("Zum Verschieben: halten und ziehen").isVisible(), "Hinweis zum Verschieben");
  check(!(await page.getByRole("dialog", { name: "Reagieren" }).count()), "kein Menü nach langem Drücken");
  await fenster.getByRole("radio", { name: "Groß" }).click();
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await fenster.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(900);
  const breit = await zettel(page, "Elternabend").boundingBox();
  check(breit.width > d.width * 0.8, "Groß = volle Breite");

  // halten und ziehen → neuer Platz, bleibt nach Neuladen
  const vorher = await oben(page, "Hallo");
  await ziehen(page, zettel(page, "Hallo"), zettel(page, "Ole"), { halten: 650 });
  await page.waitForTimeout(1100);
  const nachher = await reihenfolge(page);
  const jetzt = await oben(page, "Hallo");
  check(jetzt < vorher - 20, `Ziehen: „Hallo“ weiter oben (${Math.round(vorher)} → ${Math.round(jetzt)} px)`);
  check(!(await page.getByRole("dialog").count()), "Ziehen öffnet kein Fenster");
  const sort = (await store(page, "wasgibts.pinnwand")).messages.find((m) => m.id === "t123-hallo").data.sort;
  check(typeof sort === "number", "Platz gespeichert (sort)");
  await page.reload();
  await page.waitForTimeout(1200);
  check(JSON.stringify(await reihenfolge(page)) === JSON.stringify(nachher), "Reihenfolge nach Neuladen gleich");

  // „Nach oben“ = ganz vorn (hinter dem, was hängen bleibt)
  await halten(page, zettel(page, "Ole"));
  await page.getByRole("dialog").getByRole("button", { name: "Nach oben" }).click();
  await page.waitForTimeout(1100);
  const ole = await oben(page, "Ole");
  const andere = await Promise.all(["Elternabend", "Hallo", "Fürs Wohnzimmer"].map((t) => oben(page, t)));
  check(ole > (await oben(page, "Samstag Omas")) && andere.every((y) => y >= ole - 2), "„Nach oben“: Ole direkt hinter dem, was hängen bleibt");

  // Ecke „Nur für mich“
  const linie = page.locator("[data-privat-linie]");
  check(await linie.getByText("Nur für mich · sieht nur du").isVisible(), "Linie „Nur für mich · sieht nur du“");
  const geschenk = zettel(page, "Geschenk Lisa");
  check((await geschenk.boundingBox()).y > (await linie.boundingBox()).y, "private Zettel unter der Linie");
  check((await geschenk.locator("[data-privat]").count()) === 1, "privater Zettel grau-weiß markiert");
  const lb = await linie.boundingBox();
  check(lb.height >= 44, `Linie antippbar (${Math.round(lb.height)} px)`);
  await linie.click();
  await page.waitForTimeout(400);
  check((await linie.getAttribute("aria-expanded")) === "false", "zugeklappt");
  check((await linie.innerText()).trim() === "Nur für mich", "zu: nur „Nur für mich“ (ohne Anzahl)");
  check(!(await zettel(page, "Geschenk Lisa").count()), "zu: private Zettel weg");
  await page.reload();
  await page.waitForTimeout(1200);
  check((await page.locator("[data-privat-linie]").getAttribute("aria-expanded")) === "false", "nach Neuladen noch zu");
  await page.locator("[data-privat-linie]").click();
  await page.waitForTimeout(500);
  check(await zettel(page, "Geschenk Lisa").isVisible(), "auf: private Zettel wieder da");

  // Kachel auf der Startseite: nur Zettel für alle
  await page.goto(BASE + "/");
  await page.waitForTimeout(1000);
  const tile = page.getByRole("region", { name: "Pinnwand" });
  check(!(await tile.getByText(/Geschenk Lisa|Steuerbüro/).count()), "Kachel zeigt keine privaten Zettel");

  // Beide privaten „Für alle“ → keine Linie mehr
  await page.goto(BASE + "/pinnwand");
  await page.waitForTimeout(1000);
  for (const t of ["Geschenk Lisa", "Steuerbüro"]) {
    await halten(page, zettel(page, t));
    await page.getByRole("dialog").getByRole("button", { name: "Für alle" }).click();
    await page.waitForTimeout(700);
  }
  check(!(await page.locator("[data-privat-linie]").count()), "ohne private Zettel keine Linie");
};
