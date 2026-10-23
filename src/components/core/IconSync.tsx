"use client";

// App-Icon immer in Mia-Orange (seit v0.64): setzt ein früher gewähltes
// andersfarbiges Icon zurück – Cookie fürs Manifest, apple-touch-icon und
// Favicon sofort (das iPhone liest das Icon beim "Zum Home-Bildschirm").

import { useEffect } from "react";
import { setIconColor } from "@/lib/core/iconColor";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function IconSync() {
  const ready = Boolean(useProfile());
  useEffect(() => {
    if (ready) setIconColor("orange");
  }, [ready]);
  return null;
}
