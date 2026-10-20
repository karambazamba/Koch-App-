"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Registriert den Service Worker (public/sw.js) für die Offline-Nutzung.
 * Nur im Produktions-Build – im Dev-Modus würde der Cache das Hot-Reload stören.
 *
 * Neue Version: Beim Öffnen/Zurückkehren schaut die App nach einem Update.
 * Liegt eins bereit, erscheint unaufdringlich "Neue Version da – Antippen zum
 * Aktualisieren"; erst das Antippen lädt neu (nie mitten im Tippen).
 */
export function ServiceWorkerRegistration() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | null = null;
    const offer = (worker: ServiceWorker | null) => {
      // Nur ein Update (es gibt schon eine aktive Version), nicht das allererste Mal
      if (worker && navigator.serviceWorker.controller) setWaiting(worker);
    };
    const watch = (reg: ServiceWorkerRegistration) => {
      registration = reg;
      offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed") offer(next);
        });
      });
    };
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(watch)
      .catch((error) => console.error("Service Worker nicht registriert:", error));
    const check = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", check);
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      document.removeEventListener("visibilitychange", check);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <button
        type="button"
        onClick={() => waiting.postMessage("SKIP_WAITING")}
        className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-card"
      >
        <RefreshCw size={16} strokeWidth={2} className="text-accent" aria-hidden />
        Neue Version da – Antippen zum Aktualisieren
      </button>
    </div>
  );
}
