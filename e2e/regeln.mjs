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
 * Liefert je Fund „Kachel: Text (Grund)“.
 */
export function abgeschnitteneTexte() {
  const out = [];
  const panel = document.querySelector("[role=tabpanel]:not([inert])") ?? document;
  for (const tile of panel.querySelectorAll("[data-unit]")) {
    const name = tile.getAttribute("data-tile") ?? "?";
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
      if (/(…|\.\.\.)$/.test(text)) out.push(`${name}: „${text}“ (endet auf …)`);
      for (let a = el; a && a !== tile.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        const clamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
        const ellipsis = s.textOverflow === "ellipsis";
        const cutX = ellipsis || ["hidden", "clip"].includes(s.overflowX);
        const cutY = clamp || ["hidden", "clip"].includes(s.overflowY);
        if (!cutX && !cutY) continue;
        const b = a.getBoundingClientRect();
        const left = parseFloat(s.borderLeftWidth) || 0;
        const right = parseFloat(s.borderRightWidth) || 0;
        if (cutX && (r.right > b.right - right + 1 || r.left < b.left + left - 1)) {
          out.push(`${name}: „${text}“ (seitlich abgeschnitten)`);
          break;
        }
        if (cutY && (r.bottom > b.bottom + 1 || r.top < b.top - 1)) {
          out.push(`${name}: „${text}“ (unten abgeschnitten)`);
          break;
        }
      }
    }
  }
  return out;
}
