"use client";

// App-Icon in der Lieblingsfarbe der Begleitung (aus dem Profil) – siehe
// setIconColor: Cookie fürs Manifest (Android übernimmt das Icon selbst),
// apple-touch-icon und Favicon sofort (das iPhone liest das Icon beim
// "Zum Home-Bildschirm").

import { useEffect } from "react";
import { setIconColor } from "@/lib/core/iconColor";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function IconSync() {
  const farbe = useProfile()?.helper.farbe;
  useEffect(() => {
    if (farbe) setIconColor(farbe);
  }, [farbe]);
  return null;
}
