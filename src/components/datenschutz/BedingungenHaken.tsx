"use client";

// Pflicht-Häkchen vor dem ersten Speichern auf dem Server (Anmelden, Beitreten):
// „Ich akzeptiere die Nutzungsbedingungen und habe die Datenschutzerklärung
// gelesen.“ Gilt je Person und Gerät; Konto-Knöpfe sind bis dahin aus.

import Link from "next/link";
import { Check } from "lucide-react";
import { setEinwilligung, useEinwilligungen } from "@/lib/datenschutz/einwilligung";

export function useBedingungenOk(): boolean {
  return useEinwilligungen().erteilt("bedingungen");
}

export function BedingungenHaken() {
  const ok = useBedingungenOk();
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-left text-sm text-muted">
      <input type="checkbox" checked={ok} onChange={(e) => setEinwilligung("bedingungen", e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${ok ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}>
        {ok && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span>
        Ich akzeptiere die{" "}
        <Link href="/nutzungsbedingungen" className="font-semibold text-accent-strong underline">
          Nutzungsbedingungen
        </Link>{" "}
        und habe die{" "}
        <Link href="/datenschutz" className="font-semibold text-accent-strong underline">
          Datenschutzerklärung
        </Link>{" "}
        gelesen.
      </span>
    </label>
  );
}
