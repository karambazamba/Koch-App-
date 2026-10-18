"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { MachineStep } from "@/lib/cookbook";
import type { HouseholdProfile } from "@/lib/profile";

const KEY = "wasgibts.maschinenansicht";

export type MachineView = { available: boolean; on: boolean; setOn: (on: boolean) => void };

/**
 * Ansicht "Mit Thermomix" / "Klassisch": nur, wenn im Küchenstil eine
 * Küchenmaschine mit Kochfunktion gewählt ist. Die Wahl merkt sich das Gerät.
 */
export function useMachineView(profile: HouseholdProfile | null | undefined): MachineView {
  const available = profile?.kitchenMachine === "thermomix";
  const [choice, setChoice] = useState<boolean | null>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === null ? null : v === "1";
    } catch {
      return null;
    }
  });
  const on = available && (choice ?? true);
  return {
    available,
    on,
    setOn: (value) => {
      setChoice(value);
      try {
        localStorage.setItem(KEY, value ? "1" : "0");
      } catch {
        // ohne Speicher eben nur für jetzt
      }
    },
  };
}

/** Umschalter auf Rezeptseite und im Kochmodus (nur beschreibend, ohne Logos) */
export function MachineToggle({ view }: { view: MachineView }) {
  if (!view.available) return null;
  return (
    <Segmented
      label="Schritte"
      value={view.on ? "maschine" : "klassisch"}
      onChange={(v) => view.setOn(v === "maschine")}
      options={[
        { value: "maschine", label: "Mit Thermomix" },
        { value: "klassisch", label: "Klassisch" },
      ]}
    />
  );
}

/** Einstellungen eines Maschinenschritts als kleine Chips: "10 Sek · Stufe 5 · ↺ Linkslauf" */
export function MachineStepView({ step }: { step: MachineStep | undefined }) {
  if (!step) return null;
  const parts = [step.time, step.temp, step.speed, step.reverse ? "↺ Linkslauf" : ""].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="flex flex-wrap gap-1.5" aria-label="Einstellung">
      {parts.map((p) => (
        <span key={p} className="rounded-full bg-stone-100 px-2.5 py-1 text-sm font-bold text-ink">
          {p}
        </span>
      ))}
    </p>
  );
}
