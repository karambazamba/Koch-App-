"use client";

// Startet den Abgleich mit dem Haushalt (nur angemeldet und mit Haushalt –
// der Abgleich selbst wird erst dann geladen) und zeigt den leisen Hinweis
// „Offline – wird gleich abgeglichen“, wenn seit über einer Minute etwas
// wartet. Ohne Konto: nichts.

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { useNowMs } from "@/lib/core/useNowMs";
import { useCachedAccount } from "@/lib/konten/cache";
import { showOfflineHint, useSyncStatus } from "@/lib/konten/sync/status";

export function SyncRunner() {
  const householdId = useCachedAccount().household?.id ?? null;
  const status = useSyncStatus();
  const nowMs = useNowMs(status.offlineSince !== null, 5000);

  useEffect(() => {
    if (!householdId) return;
    let stop: (() => void) | null = null;
    let on = true;
    void import("@/lib/konten/sync/runner").then((m) => {
      if (!on) return;
      void m.startSync(householdId);
      stop = m.stopSync;
    });
    return () => {
      on = false;
      stop?.();
    };
  }, [householdId]);

  if (!showOfflineHint(status, nowMs)) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex justify-center px-4" role="status">
      <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-muted shadow-card">
        <CloudOff className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Offline – wird gleich abgeglichen
      </span>
    </div>
  );
}
