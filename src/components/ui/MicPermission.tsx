"use client";

// Mikrofon-Freigabe für alle Mikro-Stellen (Tafel 27): `useMicBlocked` für
// den grauen, durchgestrichenen Knopf, `MicStrip` (gelber Streifen „Mikro aus
// – tippen geht immer.“ + „Anmachen ›“, kurz „✓ Mikro ist an“), `MicSheetHost`
// im Layout: prüft die Freigabe beim Start und beim Zurückkommen in die App und
// lädt die Fenster (Vorab-Frage, Mikro-Check, „Zeig’s mir“) erst bei Bedarf,
// dazu der Stimmen-Vorschlag nach der Rückkehr (Tafel 86).

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Check, MicOff } from "lucide-react";
import { clearMicJustOn, micState, micSubscribe, openMicHelp, setMicPermission } from "@/lib/core/mic";

const MicSheets = dynamic(() => import("@/components/ui/MicSheets").then((m) => m.MicSheets), { ssr: false });
const StimmenVorschlag = dynamic(() => import("@/components/begleitung/StimmenVorschlag").then((m) => m.StimmenVorschlag), { ssr: false });

/** Mikro gesperrt (oder Diktieren aus)? */
export function useMicBlocked(): boolean {
  return useSyncExternalStore(micSubscribe, () => micState().block !== null, () => false);
}

/** Klassen für einen gesperrten Mikro-Knopf (grau, nie der Stopp-Knopf) */
export const MIC_BLOCKED = "bg-fill-strong text-muted shadow-none";

/** Gelber Streifen über der Eingabe, solange das Mikro aus ist */
export function MicStrip() {
  const blocked = useMicBlocked();
  const justOn = useSyncExternalStore(micSubscribe, () => micState().justOn, () => false);
  useEffect(() => {
    if (!justOn) return;
    const t = setTimeout(clearMicJustOn, 2500);
    return () => clearTimeout(t);
  }, [justOn]);
  if (justOn)
    return (
      <p className="flex min-h-9 items-center gap-1.5 rounded-field bg-good-soft px-3 text-sm font-semibold text-good-ink" role="status">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Mikro ist an
      </p>
    );
  if (!blocked) return null;
  return (
    <p className="flex min-h-11 items-center gap-2 rounded-field bg-warn-soft px-3 text-sm font-semibold text-warn-ink" role="status">
      <MicOff className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="flex-1">Mikro aus – tippen geht immer.</span>
      <button type="button" onClick={openMicHelp} className="hit -mr-1 min-h-11 px-1 font-extrabold underline-offset-2">
        Anmachen ›
      </button>
    </p>
  );
}

/** Im Layout: Freigabe prüfen (Start, Zurückkommen) und die Fenster zeigen */
export function MicSheetHost() {
  const open = useSyncExternalStore(micSubscribe, () => micState().sheet !== null, () => false);
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      navigator.permissions
        ?.query({ name: "microphone" as PermissionName })
        .then((s) => {
          setMicPermission(s.state);
          if (!status) {
            status = s;
            s.onchange = () => setMicPermission(s.state);
          }
        })
        .catch(() => {
          // nicht abfragbar (ältere Browser) – dann zählt der Fehler beim Zuhören
        });
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      if (status) status.onchange = null;
    };
  }, []);
  return (
    <>
      {open && <MicSheets />}
      <StimmenVorschlag />
    </>
  );
}
