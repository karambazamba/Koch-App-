// Grundregel im Assistenten: Ist der Inhalt eines Schritts länger als der
// Bildschirm und wurde noch nicht bis unten gescrollt, scrollt "Weiter" erst
// zum nächsten offenen Abschnitt, statt den Schritt zu verlassen.

/** Toleranz in Pixeln für "unten angekommen" */
const BOTTOM_TOLERANCE = 8;

function stickyBottomOf(selector: string): number {
  const el = document.querySelector<HTMLElement>(selector);
  return el ? el.getBoundingClientRect().bottom : 0;
}

/** Oberkante der fixierten Button-Leiste (bzw. Bildschirmunterkante) */
function visibleBottom(): number {
  const vv = window.visualViewport;
  const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const bar = document.querySelector<HTMLElement>("[data-sticky-actions]");
  const barTop = bar && bar.offsetParent !== null ? bar.getBoundingClientRect().top : viewportBottom;
  return Math.min(viewportBottom, barTop);
}

export function isScrolledToBottom(): boolean {
  const doc = document.documentElement;
  return window.scrollY + window.innerHeight >= doc.scrollHeight - BOTTOM_TOLERANCE;
}

/**
 * Scrollt innerhalb von `container` zum nächsten Abschnitt, der noch nicht
 * ganz zu sehen ist. Gibt `true` zurück, wenn gescrollt wurde – dann soll
 * "Weiter" den Schritt noch nicht verlassen.
 */
export function scrollToNextOpenSection(container: HTMLElement | null): boolean {
  if (!container || isScrolledToBottom()) return false;

  const top = stickyBottomOf("[data-sticky-header]") + 8;
  const bottom = visibleBottom();

  // Abschnitte: direkte Kinder des Inhalts und die Teile darin enthaltener Karten
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(":scope > *, :scope section > *, :scope fieldset"),
  )
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => a.rect.top - b.rect.top);

  // Erster Abschnitt, der unterhalb des oberen Rands beginnt und unten
  // abgeschnitten (oder ganz verdeckt) ist.
  const next = candidates.find(
    ({ rect }) => rect.top > top + 24 && rect.bottom > bottom + 4,
  );

  const delta = next
    ? next.rect.top - top
    : // Ein langer Abschnitt ragt über den ganzen Bildschirm → ein Stück weiter.
      (bottom - top) * 0.8;

  window.scrollBy({ top: delta, behavior: "smooth" });
  return true;
}
