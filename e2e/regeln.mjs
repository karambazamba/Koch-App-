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
