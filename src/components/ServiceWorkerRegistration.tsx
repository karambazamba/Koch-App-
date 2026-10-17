"use client";

import { useEffect } from "react";

/**
 * Registriert den Service Worker (public/sw.js) für die Offline-Nutzung.
 * Nur im Produktions-Build – im Dev-Modus würde der Cache das Hot-Reload stören.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Service Worker nicht registriert:", error));
  }, []);

  return null;
}
