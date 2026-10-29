// Prüfregeln, die `pruefen` und der Durchklick gemeinsam nutzen (laufen im Browser).

/**
 * „Knopf über Text“ für den schwebenden Mia-Knopf: Liegt Text oder ein
 * Bedienelement der Seite (auch ganz unten) unter dem Knopf? Gezählt wird nur,
 * was den Knopf wirklich überlappt; Fenster und fest stehende Leisten nicht.
 */
export function miaKnopfUeberText() {
  const knopf = document.querySelector("[data-begleitung-leiste] .mia-knopf");
  if (!knopf) return [];
  const leiste = knopf.closest("[data-begleitung-leiste]");
  // Ruheposition aus dem festen Rahmen (der Knopf selbst gleitet beim Scrollen weg und zurück)
  const box = leiste.getBoundingClientRect();
  const st = getComputedStyle(leiste);
  const size = knopf.offsetWidth;
  const bottom = box.bottom - parseFloat(st.paddingBottom);
  const links = leiste.hasAttribute("data-links");
  const left = links ? box.left + parseFloat(st.paddingLeft) : box.right - parseFloat(st.paddingRight) - size;
  const k = { left, right: left + size, top: bottom - size, bottom };
  const out = [];
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  for (const el of document.querySelectorAll("main *")) {
    if (!(hasText(el) || el.matches("button, a[href], input, img"))) continue;
    if (el.closest("[data-begleitung-leiste], [role=dialog], .sr-only, [aria-hidden=true]")) continue;
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.opacity === "0") continue;
    let fixed = false;
    for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === "fixed") fixed = true;
    if (fixed) continue;
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, k.right) - Math.max(r.left, k.left);
    const h = Math.min(r.bottom, k.bottom) - Math.max(r.top, k.top);
    if (w > 2 && h > 2) out.push(`Knopf über Text: Mia-Knopf verdeckt „${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30)}“`);
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * „Nichts abgeschnitten“ (A-045, Tafel 133): jeder sichtbare Text in einer
 * Kachel der Startseite steht ganz da – er endet nicht auf „…“ und reicht
 * nicht über einen Rahmen hinaus, der ihn wegschneidet (overflow hidden/clip,
 * text-overflow: ellipsis, line-clamp). Ausnahme: frei eingegebener Text
 * (Notiz, Aufgabe, Termin, Zettel, Timer-Name), markiert mit `data-freitext`.
 * Weich ausgeblendete Vorschau (`data-ausblenden`, A-060) darf unten in ihren
 * Verlauf laufen, aber nur mit Maske und nie seitlich. Liefert je Fund „Kachel: Text (Grund)“.
 */
export function abgeschnitteneTexte(sel = "[data-unit]") {
  const out = [];
  const panel = document.querySelector("[role=tabpanel]:not([inert])") ?? document;
  for (const tile of panel.querySelectorAll(sel)) {
    const name = tile.getAttribute("data-tile") ?? (tile.hasAttribute("data-jetzt") ? `Jetzt-Karte (${tile.getAttribute("data-jetzt")})` : "?");
    const walker = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      const el = node.parentElement;
      if (!text || !el || el.closest("[data-freitext], .sr-only, [aria-hidden=true], [data-platzhalter]")) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // A-048: Platzhalter, die absichtlich auf „ …“ enden („Schnell notieren …“), sind markiert – nur sie dürfen das; abgeschnitten werden dürfen auch sie nicht
      if (/(…|\.\.\.)$/.test(text) && !el.closest("[data-platzhalter-text]")) out.push(`${name}: „${text}“ (endet auf …)`);
      // A-060: Weich ausgeblendete Vorschau (`data-ausblenden`, Notizen-Kachel) darf unten in
      // ihren Verlauf laufen – nur wenn wirklich eine Maske dran ist, nie seitlich; ab dort
      // zählt nur der sichtbare Teil (darüberliegende Kacheln schneiden sonst „echt“ ab).
      const sicht = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      for (let a = el; a && a !== tile.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (a.hasAttribute("data-ausblenden")) {
          const maske = [s.maskImage, s.webkitMaskImage].some((m) => m && m !== "none");
          const b = a.getBoundingClientRect();
          if (!maske) out.push(`${name}: „${text}“ (ausblenden ohne Verlauf)`);
          else if (sicht.right > b.right + 1 || sicht.left < b.left - 1) out.push(`${name}: „${text}“ (seitlich abgeschnitten)`);
          else {
            sicht.bottom = Math.min(sicht.bottom, b.bottom);
            continue;
          }
          break;
        }
        const clamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
        const ellipsis = s.textOverflow === "ellipsis";
        const cutX = ellipsis || ["hidden", "clip"].includes(s.overflowX);
        const cutY = clamp || ["hidden", "clip"].includes(s.overflowY);
        if (!cutX && !cutY) continue;
        const b = a.getBoundingClientRect();
        const left = parseFloat(s.borderLeftWidth) || 0;
        const right = parseFloat(s.borderRightWidth) || 0;
        if (cutX && (sicht.right > b.right - right + 1 || sicht.left < b.left + left - 1)) {
          out.push(`${name}: „${text}“ (seitlich abgeschnitten)`);
          break;
        }
        if (cutY && (sicht.bottom > b.bottom + 1 || sicht.top < b.top - 1)) {
          out.push(`${name}: „${text}“ (unten abgeschnitten)`);
          break;
        }
      }
    }
  }
  return out;
}
