"use client";

// Erste Verbindung mit dem Haushalt: zeigt, was von diesem Handy mitkommt
// („3 Termine und 5 Aufgaben werden mitgenommen“). Bis „Mitnehmen“ bleibt
// alles nur auf dem Gerät; „Später“ fragt beim nächsten Mal wieder.

import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { CARD, NOTE, buttonClass } from "@/components/ui/styles";
import { useSyncStatus } from "@/lib/konten/sync/status";

export function TakeoverCard() {
  const status = useSyncStatus();
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (status.phase !== "uebernahme" || later) return null;
  const take = async () => {
    setBusy(true);
    setError("");
    const r = await (await import("@/lib/konten/sync/runner")).confirmTakeover();
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Daten mitnehmen">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong" aria-hidden>
          <CloudUpload className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <p className="text-[17px] font-extrabold leading-snug">Was schon auf diesem Handy ist</p>
      </div>
      <p className="text-[15px]" data-testid="uebernahme-vorschau">
        {status.summary}
      </p>
      <p className="text-sm text-muted">„Ich“ und „Arbeit“ bleiben nur für dich sichtbar. Auf dem Handy bleibt alles, wie es ist.</p>
      {error && <p className={NOTE}>{error}</p>}
      <button type="button" onClick={() => void take()} disabled={busy} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
        {busy ? "Einen Moment …" : "Mitnehmen"}
      </button>
      <button type="button" onClick={() => setLater(true)} className="hit h-11 self-center text-sm font-semibold text-muted">
        Später
      </button>
    </section>
  );
}
