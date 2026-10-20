// App-Icon in der Lieblingsfarbe auf dem Gerät: Cookie "farbe" (für das
// Manifest) und apple-touch-icon/Favicon im <head>. Next.js setzt die Links aus
// den Metadaten bei Seitenwechseln neu – ein Beobachter stellt die Farbe dann
// sofort wieder her. Genutzt von IconSync (Profil) und dem Kennenlernen (noch
// ohne Profil).

import { FARBE_COOKIE, iconFor } from "./app";

let current: string | null = null;
let observer: MutationObserver | null = null;

function apply() {
  if (!current || typeof document === "undefined") return;
  const farbe = current;
  const set = (selector: string, href: string) => document.querySelectorAll<HTMLLinkElement>(selector).forEach((l) => l.getAttribute("href") !== href && l.setAttribute("href", href));
  set('link[rel="apple-touch-icon"]', iconFor(farbe, "apple-touch-icon.png"));
  set('link[rel="icon"][type="image/svg+xml"]', iconFor(farbe, "icon.svg"));
  set('link[rel="icon"][type="image/png"]', iconFor(farbe, "favicon-32.png"));
  // favicon.ico gibt es nur in Orange – bei anderen Farben die farbigen Links nutzen
  if (farbe !== "orange") document.querySelectorAll<HTMLLinkElement>('link[rel="icon"][href*="favicon.ico"]').forEach((l) => l.setAttribute("href", iconFor(farbe, "favicon-32.png")));
}

/** Lieblingsfarbe für App-Icon und Manifest auf diesem Gerät setzen */
export function setIconColor(farbe: string) {
  if (typeof document === "undefined") return;
  current = farbe;
  document.cookie = `${FARBE_COOKIE}=${farbe}; path=/; max-age=31536000; samesite=lax`;
  apply();
  if (!observer) {
    observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  }
}
