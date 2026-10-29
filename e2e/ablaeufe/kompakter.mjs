// Startseite kompakter (A-048, Tafel 135): Familie-Beispiel auf iPhone SE,
// 15 Pro und Pixel 7 – Termine und Aufgaben so hoch wie ihr Inhalt (unter der
// letzten Zeile höchstens 20 px), Einkauf M mit Edeka · Rewe · Lidl
// nebeneinander (Tafel 140), zwei Kacheln in einer Reihe gleich hoch, das
// Wasserzeichen in XS sichtbar und nie über Text. „Nur für mich“: Sport als
// Kreis oben (A-050), keine XS-Kachel.
// `listenHoehen`: Termine, Aufgaben, Notizen und Einkauf S mit 0, 1, 2, 3, 5 Einträgen.
// `einkaufChips`: Einkauf M mit 3 bzw. 5 Läden und langen Namen.
import { BASE, losGehts, newPage } from "../lib.mjs";

/** Misst die Startseite (läuft im Browser) */
function messen() {
  const panel = document.querySelector("[role=tabpanel]:not([inert])") ?? document;
  const box = (el) => el.getBoundingClientRect();
  const unit = (key) => panel.querySelector(`[data-raster] > [data-unit="${key}"]`);
  /** Leerraum unter der letzten Zeile einer Liste bis zum Kachelrand */
  const luft = (key, label) => {
    const sec = unit(key)?.querySelector(`section[aria-label^="${label}"]`);
    const zeilen = sec ? [...sec.querySelectorAll("ul > li")] : [];
    const letzte = zeilen[zeilen.length - 1] ?? sec?.lastElementChild;
    return sec && letzte ? { zeilen: zeilen.length, luft: Math.round(box(sec).bottom - box(letzte).bottom), hoehe: Math.round(box(sec).height) } : null;
  };
  // Tafel 140: Einkauf breit (eigene Einheit), Essen neben der Wundertüte
  const einkauf = panel.querySelector('[data-unit="einkauf"] [data-einkauf-kachel]');
  const essen = panel.querySelector('[data-unit="essen"]');
  const wundertuete = panel.querySelector('[data-unit="wundertuete"]');
  // Reihen: Kacheln mit gleicher Oberkante nebeneinander → gleich hoch (XS-Paar übereinander: unten bündig mit dem Nachbarn)
  const units = [...panel.querySelectorAll("[data-raster] > [data-unit]")].map((el) => ({ key: el.dataset.unit, hoehe: el.dataset.hoehe, r: box(el) }));
  const ungleich = [];
  for (const a of units)
    for (const b of units) {
      if (a.key >= b.key || Math.abs(a.r.top - b.r.top) > 1.5 || Math.abs(a.r.left - b.r.left) < 2) continue;
      // Nachbar oben bündig: entweder gleich hoch oder (XS-Paar) der untere Partner schließt unten bündig ab
      const unten = units.find((c) => c !== a && c !== b && Math.abs(c.r.left - (a.r.height < b.r.height ? a.r.left : b.r.left)) < 2 && c.r.top > Math.min(a.r.bottom, b.r.bottom) - 1 && c.r.top < Math.max(a.r.bottom, b.r.bottom));
      const ok = Math.abs(a.r.height - b.r.height) <= 1.5 || (unten && Math.abs(unten.r.bottom - Math.max(a.r.bottom, b.r.bottom)) <= 1.5);
      if (!ok) ungleich.push(`${a.key} ${Math.round(a.r.height)} / ${b.key} ${Math.round(b.r.height)}`);
    }
  // Wasserzeichen in XS: sichtbar und nicht über Text (Text darüber nur mit eigener Fläche: Kärtchen, Schild, Freistellung)
  const xs = [...panel.querySelectorAll(".kachel-wasserzeichen[data-groesse=XS]")].map((m) => {
    const sec = m.closest("section");
    const s = box(sec);
    const w = box(m);
    const sicht = { left: Math.max(s.left, w.left), right: Math.min(s.right, w.right), top: Math.max(s.top, w.top), bottom: Math.min(s.bottom, w.bottom) };
    const st = getComputedStyle(m);
    const flaeche = Math.max(0, sicht.right - sicht.left) * Math.max(0, sicht.bottom - sicht.top);
    const ueber = [];
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      const el = n.parentElement;
      if (!text || el.closest(".sr-only, [aria-hidden=true]")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.right <= sicht.left + 1 || r.left >= sicht.right - 1 || r.bottom <= sicht.top + 1 || r.top >= sicht.bottom - 1) continue;
        let frei = false;
        for (let a = el; a && a !== sec; a = a.parentElement) if (getComputedStyle(a).backgroundColor.replace(/\s/g, "") !== "rgba(0,0,0,0)") frei = true;
        if (!frei) ueber.push(text);
      }
    }
    return { kachel: m.dataset.kachel, sichtbar: st.display !== "none" && Number(st.opacity) >= 0.1 && Number(st.opacity) <= 0.12 && flaeche > 600, breite: Math.round(sicht.right - sicht.left), ueber };
  });
  const sport = panel.querySelector('[data-unit="sport"] [data-sport-xs]');
  return {
    termine: luft("termine", "Termine"),
    aufgaben: luft("aufgaben", "Aufgaben"),
    laeden: einkauf ? [...einkauf.querySelectorAll("[data-laden-chip]")].map((c) => c.dataset.ladenChip) : [],
    chipsReihe: einkauf ? new Set([...einkauf.querySelectorAll("[data-laden-chip]")].map((c) => Math.round(c.getBoundingClientRect().top))).size : 0,
    chipsGanz: einkauf ? [...einkauf.querySelectorAll("[data-laden-chip] span")].every((s) => s.scrollWidth <= s.clientWidth + 1) : false,
    paar: wundertuete && essen ? [Math.round(box(wundertuete).height), Math.round(box(essen).height)] : null,
    kreise: [...panel.querySelectorAll("nav[data-kreise] [data-kreis]")].map((k) => k.dataset.kreis),
    inhalt: units.filter((u) => u.hoehe === "inhalt").map((u) => u.key),
    ungleich,
    xs,
    sport: sport ? { stempel: sport.querySelectorAll("[data-sport-felder] > *").length, text: sport.innerText.replace(/\s+/g, " ").trim(), zeichen: Boolean(panel.querySelector('[data-unit="sport"] .kachel-wasserzeichen')) } : null,
  };
}

/** Startseite Familie-Beispiel: Höhe = Inhalt, 3 Läden, Paare gleich hoch, XS mit Wasserzeichen – SE, 15 Pro/Pixel 7 */
export const startseiteKompakt = async (page, check, device) => {
  const browser = page.context().browser();
  for (const geraet of ["iPhone SE", device]) {
    for (const wahl of ["Für die Familie", "Nur für mich"]) {
      const p = await newPage(browser, geraet);
      try {
        await p.goto(BASE);
        await losGehts(p, wahl);
        await p.locator("[data-raster]").waitFor();
        await p.waitForTimeout(1200);
        const m = await p.evaluate(messen);
        const wo = `${geraet} · ${wahl}`;
        if (wahl === "Für die Familie") {
          for (const [name, t] of [["Termine", m.termine], ["Aufgaben", m.aufgaben]]) check(Boolean(t) && t.zeilen >= 1 && t.zeilen <= 3 && t.luft <= 20, `${wo}: ${name} so hoch wie der Inhalt (${t ? `${t.zeilen} Zeilen, darunter ${t.luft} px, ${t.hoehe} px hoch` : "fehlt"})`);
          check(m.laeden.join() === "Edeka,Rewe,Lidl" && m.chipsReihe === 1 && m.chipsGanz, `${wo}: Einkauf M: Edeka · Rewe · Lidl nebeneinander in EINER Reihe, Namen ganz (${m.laeden.join(", ")})`);
          check(Boolean(m.paar) && Math.abs(m.paar[0] - m.paar[1]) <= 1.5, `${wo}: Essen und Wundertüte gleich hoch (${m.paar?.join(" / ") ?? "fehlt"})`);
          check(["termine", "aufgaben", "einkauf"].every((k) => m.inhalt.includes(k)) && !m.inhalt.includes("pinnwand"), `${wo}: Höhe = Inhalt nur bei den Listen (${m.inhalt.join(", ")})`);
        } else {
          check(!m.sport && m.kreise.includes("sport"), `${wo}: Sport als Kreis oben, keine XS-Kachel (${m.kreise.join(", ")})`);
        }
        check(!m.ungleich.length, `${wo}: Kacheln in einer Reihe gleich hoch${m.ungleich.length ? ` (${m.ungleich.join(", ")})` : ""}`);
        const erwartet = ["notizen"];
        const da = m.xs.map((x) => x.kachel);
        check(erwartet.every((k) => da.includes(k)) && m.xs.every((x) => x.sichtbar), `${wo}: Wasserzeichen in XS sichtbar (${m.xs.map((x) => `${x.kachel} ${x.breite} px`).join(", ") || "keins"})`);
        const ueber = m.xs.flatMap((x) => x.ueber.map((t) => `${x.kachel}: „${t}“`));
        check(!ueber.length, `${wo}: Wasserzeichen in XS nie über Text${ueber.length ? ` (${ueber.join(", ")})` : ""}`);
      } finally {
        await p.context().close();
      }
    }
  }
};

// --- Klarstellung Tafel 135: Höhe wächst und schrumpft mit 0, 1, 2, 3 und 5 Einträgen ---------------

const TAG = "2026-10-21";
const WOCHE = "2026-10-19";
const LAEDEN = ["Edeka", "Rewe", "Lidl", "Aldi", "Penny"];
const STEMPEL = "2026-10-20T08:00:00.000Z";
const eintrag = (id, typ, data) => ({ id, typ, raum: "familie", besitzer: "lokal", erstellt: STEMPEL, geaendert: STEMPEL, data });

/** n Termine (ab 12 Uhr), n Aufgaben, n Notizen, n Läden mit Sachen (ohne „Meine Läden“: nur Läden mit Sachen stehen da) */
const daten = (n) => ({
  "wasgibts.eintraege": {
    version: 2,
    migratedTermine: true,
    seenReminders: [],
    entries: [
      ...Array.from({ length: n }, (_, i) => eintrag(`t${i}`, "termin", { title: `Termin ${i + 1}`, date: TAG, start: `${12 + i}:00`, end: `${12 + i}:30`, reminder: "aus", doneDates: [], skipDates: [] })),
      ...Array.from({ length: n }, (_, i) => eintrag(`a${i}`, "aufgabe", { title: `Aufgabe ${i + 1}`, date: TAG, reminder: "aus", doneOn: null })),
    ],
  },
  "wasgibts.notizen": { version: 1, notes: Array.from({ length: n }, (_, i) => eintrag(`n${i}`, "notiz", { title: `Notiz ${i + 1}`, kind: "text", text: "", pinned: false })) },
  "wasgibts.einkaufsliste": {
    version: 8, products: {}, shops: [], staples: [], myShops: [], shopsAsked: true, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "",
    itemShops: Object.fromEntries(LAEDEN.slice(0, n).map((l) => [`sache ${l.toLowerCase()}`, l])),
    weeks: { [WOCHE]: { manual: LAEDEN.slice(0, n).map((l, i) => ({ id: `e${i}`, name: `Sache ${l}`, amount: "", section: "sonstiges", done: false })), checked: [], have: [] } },
  },
  "wasgibts.startseite": { version: 9, tipSeen: true, tiles: [["termine", "M"], ["aufgaben", "M"], ["notizen", "M"], ["essen", "S"], ["einkauf", "S"]].map(([id, size]) => ({ id, visible: true, size })) },
  "wasgibts.beispiel": { version: 1, since: TAG, cleared: ["termine", "aufgaben", "pinnwand", "einkauf", "essen", "notizen", "sport", "vorrat"], done: [], gone: [], asked: true },
});

function zeilenMessen() {
  const panel = document.querySelector("[role=tabpanel]:not([inert])") ?? document;
  const box = (el) => el.getBoundingClientRect();
  const kachel = (sel, zeile) => {
    const sec = panel.querySelector(sel);
    if (!sec) return null;
    const z = [...sec.querySelectorAll(zeile)].filter((el) => box(el).height > 0);
    // Letztes sichtbares Kind mit Inhalt (Liste bzw. Satz) – nicht das Wasserzeichen
    const inhalt = [...sec.children].filter((el) => !el.classList.contains("kachel-wasserzeichen") && box(el).height > 0);
    const letzte = inhalt[inhalt.length - 1];
    return { zeilen: z.length, hoehe: Math.round(box(sec).height), luft: letzte ? Math.round(box(sec).bottom - box(letzte).bottom) : -1, weitere: sec.querySelector("[data-weitere]")?.textContent ?? null };
  };
  const ein = panel.querySelector('[data-unit="essen+einkauf"] [data-einkauf-kachel]');
  const essen = panel.querySelector('[data-unit="essen+einkauf"] [data-essen-kachel]');
  return {
    termine: kachel('[data-raster] section[aria-label="Termine"]', "ul > li"),
    aufgaben: kachel('[data-raster] section[aria-label="Aufgaben"]', "ul > li"),
    notizen: kachel('[data-raster] section[aria-label="Notizen"]', "[data-notiz-zeile]"),
    einkauf: kachel("[data-raster] [data-einkauf-kachel] section", "[data-laden-zeile]"),
    paar: ein && essen ? Math.abs(box(ein).height - box(essen).height) : 99,
    // Leere Kacheln: der Satz steht in EINER Zeile (Fehler im Bild heute-iPhoneSE: „Sag, was ihr / braucht.“)
    leer: [...panel.querySelectorAll("[data-raster] [data-einkauf-leer], [data-raster] [data-platzhalter-text], [data-raster] button[aria-label$='eintragen']")].map((el) => Math.round(box(el).height)),
  };
}

/** Termine, Aufgaben, Notizen und Einkauf S mit 0, 1, 2, 3 und 5 Einträgen: Zeilen = min(n, 3), darunter 14 px, Höhe wächst bis 3 und bleibt dann – SE, 15 Pro/Pixel 7 */
export const listenHoehen = async (page, check, device) => {
  const browser = page.context().browser();
  for (const geraet of ["iPhone SE", device]) {
    const p = await newPage(browser, geraet);
    try {
      await p.goto(BASE);
      await losGehts(p, "Für die Familie");
      await p.locator("[data-raster]").waitFor();
      await p.waitForTimeout(600);
      const hoehen = {};
      for (const n of [0, 1, 2, 3, 5]) {
        await p.evaluate((d) => {
          for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
        }, daten(n));
        await p.reload();
        await p.locator('[data-raster] section[aria-label="Termine"]').waitFor();
        await p.waitForTimeout(900);
        const m = await p.evaluate(zeilenMessen);
        const wo = `${geraet} · ${n} Einträge`;
        for (const k of ["termine", "aufgaben", "notizen", "einkauf"]) {
          const t = m[k];
          const plus = n > 3 ? Boolean(t?.weitere) : !t?.weitere;
          // Einkauf steht neben Essen: beide bekommen die Höhe der größeren – dort darf unter der letzten Zeile mehr Platz sein
          check(Boolean(t) && t.zeilen === Math.min(n, 3) && t.luft >= 10 && (k === "einkauf" || t.luft <= 20) && plus, `${wo}: ${k} ${t ? `${t.zeilen} Zeilen, darunter ${t.luft} px, ${t.hoehe} px hoch${t.weitere ? `, „${t.weitere}“` : ""}` : "fehlt"}`);
          (hoehen[k] ??= []).push(t?.hoehe ?? 0);
        }
        check(m.paar <= 1.5, `${wo}: Essen und Einkauf gleich hoch`);
        if (n === 0) check(m.leer.length === 4 && m.leer.every((h) => h <= 34), `${wo}: leer je EIN Satz in einer Zeile (${m.leer.join(" / ")} px)`);
      }
      // Termine, Aufgaben, Notizen: wächst von 1 bis 3, bei 5 wie bei 3 (Einkauf: Essen daneben gibt die Mindesthöhe vor)
      for (const k of ["termine", "aufgaben", "notizen"]) {
        const [, h1, h2, h3, h5] = hoehen[k];
        // leer (Kopf + ein Satz in einer Zeile) so hoch wie mit einem Eintrag
        check(Math.abs(hoehen[k][0] - h1) <= 2 && h1 < h2 && h2 < h3 && Math.abs(h5 - h3) <= 1, `${geraet}: ${k} wächst und schrumpft mit dem Inhalt (${hoehen[k].join(" / ")} px)`);
      }
    } finally {
      await p.context().close();
    }
  }
};

// --- Nachtrag 2 (A-050, Tafel 140 unten): Einkauf M – Läden nebeneinander --------------------------

/** Einkaufsliste mit diesen Läden (je i+1 Sachen, der erste die meisten) und Einkauf M als einzige Kachel */
const einkaufM = (laeden) => ({
  "wasgibts.einkaufsliste": {
    version: 8, products: {}, shops: [], staples: [], myShops: [], shopsAsked: true, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "",
    itemShops: Object.fromEntries(laeden.flatMap((l, i) => Array.from({ length: laeden.length - i }, (_, k) => [`sache ${l.toLowerCase()} ${k}`, l]))),
    weeks: { [WOCHE]: { manual: laeden.flatMap((l, i) => Array.from({ length: laeden.length - i }, (_, k) => ({ id: `e${i}-${k}`, name: `Sache ${l} ${k}`, amount: "", section: "sonstiges", done: false }))), checked: [], have: [] } },
  },
  "wasgibts.startseite": { version: 10, tipSeen: true, tiles: [["termine", "M"], ["einkauf", "M"]].map(([id, size]) => ({ id, visible: true, size })), kreise: [] },
  "wasgibts.beispiel": { version: 1, since: TAG, cleared: ["termine", "aufgaben", "pinnwand", "einkauf", "essen", "notizen", "sport", "vorrat"], done: [], gone: [], asked: true },
});

/** Einkauf M auf SE, 15 Pro/Pixel 7: Edeka/Rewe/Rossmann ganz in EINER Reihe, gleich breit; 5 Läden → 2 + „+3 weitere“; nie abgekürzt */
export const einkaufChips = async (page, check, device) => {
  const browser = page.context().browser();
  for (const geraet of ["iPhone SE", device]) {
    const p = await newPage(browser, geraet);
    try {
      await p.goto(BASE);
      await losGehts(p, "Für die Familie");
      await p.locator("[data-raster]").waitFor();
      for (const laeden of [["Rossmann", "Edeka", "Rewe"], ["Edeka", "Rewe", "Lidl", "Aldi", "Penny"], ["Kaufland", "Rossmann", "Wochenmarkt"]]) {
        await p.evaluate((d) => {
          for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
        }, einkaufM(laeden));
        await p.reload();
        await p.locator("[data-laden-chips]").waitFor();
        await p.waitForTimeout(500);
        const m = await p.evaluate(() => {
          const chips = [...document.querySelectorAll("[role=tabpanel]:not([inert]) [data-laden-chip]")];
          const b = chips.map((c) => c.getBoundingClientRect());
          return {
            labels: chips.map((c) => c.dataset.ladenChip),
            reihen: new Set(b.map((r) => Math.round(r.top))).size,
            gleich: b.every((r) => Math.abs(r.width - b[0].width) <= 1),
            ganz: chips.every((c) => [...c.querySelectorAll("span")].every((s) => s.scrollWidth <= s.clientWidth + 1) && !/…|\.$/.test(c.innerText.trim())),
          };
        });
        const wo = `${geraet} · ${laeden.join("/")}`;
        check(m.reihen === 1 && m.gleich && m.ganz, `${wo}: eine Reihe, gleich breit, Namen ganz (${m.labels.join(", ")})`);
        // Ganz schmal (iPhone SE 1, 320 px) passt nicht jeder Name dreimal nebeneinander: dann lieber weniger Chips + „+n weitere“ – nie abgekürzt
        const schmal = p.viewportSize().width < 360;
        if (laeden.length === 5) check(m.labels.at(-1) === "weitere" && m.labels.length === (schmal ? m.labels.length : 3), `${wo}: Läden + „+n weitere“ (${m.labels.join(", ")})`);
        if (laeden[0] === "Rossmann") check(m.labels[0] === "Rossmann" && (m.labels.join() === "Rossmann,Edeka,Rewe" || (schmal && m.labels.at(-1) === "weitere")), `${wo}: meiste zuerst, alle drei${schmal ? " bzw. „+n weitere“" : ""} (${m.labels.join(", ")})`);
      }
    } finally {
      await p.context().close();
    }
  }
};
