// Notizen-Kachel: Vorschau (A-060, Tafel 144 rechts „Nachher“) auf iPhone SE,
// 15 Pro und Pixel 7, in XS und S, hell, dunkel und im Look „Schlicht“:
// - leer: „Schnell notieren …“ in Grau
// - kurze Notiz: eine Zeile, ganz
// - sehr lange Notiz: höchstens 2 Zeilen, die zweite läuft weich aus (Maske),
//   kein „…“, Umbruch nur an Wortgrenzen
// Dazu die Prüfung „nichts abgeschnitten“ selbst: Sie erlaubt die weich
// ausgeblendete Zeile (`data-ausblenden` mit Maske), meldet aber weiter
// `data-ausblenden` ohne Verlauf und seitliches Abschneiden (Gegenproben).
import { hello, newPage, seedFamily, setDark } from "../lib.mjs";
import { abgeschnitteneTexte } from "../regeln.mjs";

const stamp = "2026-10-21T07:00:00.000Z";
const notiz = (title, text = "") => ({ version: 1, notes: [{ id: "nv1", typ: "notiz", raum: "familie", besitzer: "lokal", erstellt: stamp, geaendert: stamp, data: { title, kind: "text", text, pinned: false } }] });
const LANG = "Okay, kann ich jetzt schon mal den Maler anrufen wegen dem Flur und dem Kinderzimmer, und bitte auch gleich nach einem Termin im November fragen";
const FAELLE = [
  ["leer", { version: 1, notes: [] }],
  ["kurz", notiz("Paket für Oma")],
  ["lang", notiz(LANG.slice(0, 78).replace(/\s+\S*$/, "") + " …", LANG)],
];

const layout = (size) => ({ version: 9, tipSeen: true, tiles: [{ id: "notizen", visible: true, size }, { id: "wetter", visible: true, size: "XS" }, { id: "termine", visible: true, size: "S" }] });
const kachel = (page) => page.locator("[role=tabpanel]:not([inert]) [data-tile~=notizen]").first();

async function fall(page, check, wo, name, data, size) {
  await page.evaluate(({ data, l }) => {
    localStorage.setItem("wasgibts.notizen", JSON.stringify(data));
    localStorage.setItem("wasgibts.startseite", JSON.stringify(l));
  }, { data, l: layout(size) });
  await page.reload();
  await kachel(page).waitFor({ timeout: 6000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const tile = kachel(page);
  const funde = (await page.evaluate(abgeschnitteneTexte)).filter((f) => f.startsWith("notizen"));
  check(!funde.length, `${wo} · ${name} · ${size}: nichts abgeschnitten${funde.length ? ` – ${funde.join(" | ")}` : ""}`);
  if (name === "leer") {
    const leer = tile.locator("[data-platzhalter-text]");
    const [farbe, muted] = await leer.evaluate((el) => {
      const probe = document.createElement("span");
      probe.className = "text-muted";
      el.parentElement.appendChild(probe);
      const out = [getComputedStyle(el).color, getComputedStyle(probe).color];
      probe.remove();
      return out;
    });
    check((await leer.innerText()).trim() === "Schnell notieren …" && farbe === muted, `${wo} · leer · ${size}: „Schnell notieren …“ in Grau`);
    return;
  }
  const v = tile.locator("[data-notiz-vorschau]").first();
  const info = await v.evaluate((el) => {
    const s = getComputedStyle(el);
    const zeile = parseFloat(s.lineHeight);
    return { hoehe: el.getBoundingClientRect().height, zeile, maske: [s.maskImage, s.webkitMaskImage].some((m) => m && m !== "none"), wort: s.wordBreak, hyph: s.hyphens, text: el.textContent };
  });
  const zeilen = Math.round(info.hoehe / info.zeile);
  check(info.maske && info.wort === "normal" && info.hyph !== "auto", `${wo} · ${name} · ${size}: weicher Verlauf, Umbruch nur an Wortgrenzen`);
  check(!/…|\.\.\.$/.test(info.text.trim()), `${wo} · ${name} · ${size}: kein „…“ (${info.text.trim().slice(-20)})`);
  if (name === "kurz") check(zeilen === 1 && info.text.includes("Paket für Oma"), `${wo} · kurz · ${size}: eine Zeile, ganz (${zeilen})`);
  if (name === "lang") {
    check(zeilen === 2, `${wo} · lang · ${size}: genau 2 Zeilen (${zeilen})`);
    check(info.text.startsWith("Okay, kann ich jetzt"), `${wo} · lang · ${size}: voller Anfang statt gekürztem Titel`);
    // Wortgrenzen: Zeilenanfänge liegen nur hinter Leerzeichen
    const brueche = await v.evaluate((el) => {
      const node = [...el.querySelectorAll("span")].map((s) => s.firstChild).find((n) => n?.nodeType === 3 && n.textContent.length > 40);
      if (!node) return [];
      const out = [];
      const r = document.createRange();
      let top = null;
      for (let i = 0; i < node.textContent.length; i++) {
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const t = r.getBoundingClientRect().top;
        if (top !== null && t > top + 4 && node.textContent[i] !== " ") out.push(node.textContent[i - 1]);
        if (node.textContent[i] !== " ") top = t;
      }
      return out;
    });
    check(brueche.every((c) => c === " "), `${wo} · lang · ${size}: Umbrüche nur an Leerzeichen (${brueche.join("")})`);
  }
}

/** Gegenproben: die Prüfung meldet `data-ausblenden` ohne Maske und seitliches Abschneiden weiter */
async function gegenproben(page, check, wo) {
  await page.evaluate(({ l }) => localStorage.setItem("wasgibts.startseite", JSON.stringify(l)), { l: layout("XS") });
  await page.reload();
  await kachel(page).waitFor({ timeout: 6000 });
  const funde = await kachel(page).evaluate((tile, abgeschnitten) => {
    const probe = (style, text) => {
      const el = document.createElement("span");
      el.setAttribute("data-ausblenden", "");
      el.setAttribute("style", `display:block;overflow:hidden;line-height:17px;max-height:34px;${style}`);
      el.textContent = text;
      tile.appendChild(el);
      return el;
    };
    const a = probe("", "Ohne Verlauf ".repeat(20));
    const b = probe("white-space:nowrap;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)", "Seitlich weg ".repeat(20));
    // eslint-disable-next-line no-new-func
    const out = new Function(`return (${abgeschnitten})()`)();
    a.remove();
    b.remove();
    return out;
  }, abgeschnitteneTexte.toString());
  check(funde.some((f) => f.includes("ausblenden ohne Verlauf")), `${wo}: Gegenprobe – ausblenden ohne Verlauf wird gemeldet`);
  check(funde.some((f) => /Seitlich weg.*seitlich abgeschnitten/.test(f)), `${wo}: Gegenprobe – seitlich abgeschnitten wird gemeldet`);
}

async function durchgehen(page, check, wo) {
  await hello(page);
  await seedFamily(page);
  for (const [name, data] of FAELLE) for (const size of ["XS", "S"]) await fall(page, check, wo, name, data, size);
  await gegenproben(page, check, wo);
  // Schlicht und dunkel: derselbe Verlauf (Maske = Kachelfarbe)
  await page.evaluate(() => {
    const key = "familienkueche.haushaltsprofil";
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key) || "{}"), look: "schlicht" }));
  });
  await fall(page, check, `${wo} · Schlicht`, "lang", FAELLE[2][1], "XS");
  await setDark(page);
  await fall(page, check, `${wo} · Schlicht dunkel`, "lang", FAELLE[2][1], "S");
}

export const notizVorschau = async (page, check, device) => {
  await durchgehen(page, check, device);
  if (device !== "iPhone 15 Pro") return;
  const se = await newPage(page.context().browser(), "iPhone SE");
  try {
    await durchgehen(se, check, "iPhone SE");
    check(!se.errors.length, `iPhone SE: keine Fehler ${se.errors.join(" | ")}`);
  } finally {
    await se.context().close();
  }
};
