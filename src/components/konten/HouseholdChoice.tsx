"use client";

// Nach der Anmeldung ohne Haushalt: „Neuen Haushalt anlegen“ (Name aus dem
// Profil vorgeschlagen) oder „Mit Code beitreten“ (z. B. 4K7-P2Q).

import { useState } from "react";
import { Home, KeyRound } from "lucide-react";
import { CARD, INPUT, LABEL, NOTE, buttonClass } from "@/components/ui/styles";
import { createHousehold, joinHousehold } from "@/lib/konten/account";

export function HouseholdChoice({ suggestedName, displayName, personId, onDone }: { suggestedName: string; displayName: string; personId: string | null; onDone: () => void }) {
  const [mode, setMode] = useState<"wahl" | "neu" | "code">("wahl");
  const [name, setName] = useState(suggestedName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError("");
    const r = await action();
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "");
    onDone();
  };

  if (mode === "wahl")
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px]">Schön, dass du da bist! Wie geht’s weiter?</p>
        <button type="button" onClick={() => setMode("neu")} className={`${CARD} flex min-h-16 items-center gap-3 p-4 text-left active:scale-[0.99]`}>
          <Home className="h-6 w-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="flex flex-col">
            <span className="text-base font-bold">Neuen Haushalt anlegen</span>
            <span className="text-sm text-muted">Danach lädst du die anderen ein.</span>
          </span>
        </button>
        <button type="button" onClick={() => setMode("code")} className={`${CARD} flex min-h-16 items-center gap-3 p-4 text-left active:scale-[0.99]`}>
          <KeyRound className="h-6 w-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="flex flex-col">
            <span className="text-base font-bold">Mit Code beitreten</span>
            <span className="text-sm text-muted">Jemand aus der Familie hat dir einen Code geschickt.</span>
          </span>
        </button>
      </div>
    );

  if (mode === "neu")
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => createHousehold(name, displayName, personId));
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Name des Haushalts</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="z. B. Familie Müller" className={INPUT} />
        </label>
        {error && <p className={NOTE}>{error}</p>}
        <button type="submit" disabled={busy} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
          {busy ? "Lege an …" : "Haushalt anlegen"}
        </button>
        <button type="button" onClick={() => setMode("wahl")} className="hit h-11 self-start text-sm font-semibold text-muted underline">
          Zurück
        </button>
      </form>
    );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => joinHousehold(code, displayName, personId));
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Code (z. B. 4K7-P2Q)</span>
        <input value={code} maxLength={9} autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="4K7-P2Q" aria-label="Einladungs-Code" className={`${INPUT} text-center text-[22px] font-bold tracking-[0.2em]`} />
      </label>
      {error && <p className={NOTE}>{error}</p>}
      <button type="submit" disabled={busy || code.replace(/[^0-9A-Za-z]/g, "").length !== 6} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
        {busy ? "Trete bei …" : "Beitreten"}
      </button>
      <button type="button" onClick={() => setMode("wahl")} className="hit h-11 self-start text-sm font-semibold text-muted underline">
        Zurück
      </button>
    </form>
  );
}
