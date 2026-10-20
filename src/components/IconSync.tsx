"use client";

// App-Icon in der Lieblingsfarbe der Begleitung: merkt die Farbe als Cookie
// (für das Manifest – Android übernimmt das Icon dann selbst) und setzt
// apple-touch-icon und Favicon sofort auf die gewählte Farbe. Das iPhone liest
// das Icon beim "Zum Home-Bildschirm" aus der Seite.

import { useEffect } from "react";
import { FARBE_COOKIE, iconFor } from "@/lib/core/app";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function IconSync() {
  const farbe = useProfile()?.helper.farbe;
  useEffect(() => {
    if (!farbe) return;
    document.cookie = `${FARBE_COOKIE}=${farbe}; path=/; max-age=31536000; samesite=lax`;
    const set = (selector: string, href: string) => document.querySelectorAll<HTMLLinkElement>(selector).forEach((l) => l.getAttribute("href") !== href && l.setAttribute("href", href));
    set('link[rel="apple-touch-icon"]', iconFor(farbe, "apple-touch-icon.png"));
    set('link[rel="icon"][type="image/svg+xml"]', iconFor(farbe, "icon.svg"));
    set('link[rel="icon"][sizes="32x32"]', iconFor(farbe, "favicon-32.png"));
    set('link[rel="icon"][sizes="48x48"]', iconFor(farbe, "favicon-32.png"));
    // favicon.ico (immer orange) nicht vor die farbige Variante stellen
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"][href*="favicon.ico"]').forEach((l) => farbe !== "orange" && l.remove());
  }, [farbe]);
  return null;
}
