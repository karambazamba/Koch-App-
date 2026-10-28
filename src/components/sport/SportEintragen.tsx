"use client";

// „Training eintragen“ (Kachel-Plus und großer Knopf auf der Sport-Seite):
// das Fenster (Sportart, Dauer, heute/gestern), still speichern – der neue
// Stempel setzt auf. Beim allerersten Training kommt EINMAL die Ziel-Frage
// mit drei Knöpfen (Tafel 132): „2×“, „3×“, „Ohne Ziel“. Wegwischen zählt
// als beantwortet (nie zweimal fragen); ändern geht im Sport-Menü.

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { addTraining, markZielGefragt, setSportGoal } from "@/lib/sport/actions";
import { loadSport } from "@/lib/sport/store";
import { ZIEL_FRAGE, zielFrageFaellig } from "@/lib/sport/stempel";
import { buzz } from "@/components/heute/actions";
import { SportAddSheet } from "@/components/sport/SportAddSheet";

export function SportEintragen({ today, recent, onClose }: { today: string; recent: string[]; onClose: () => void }) {
  const [frage, setFrage] = useState(false);
  if (frage) return <SportZielFrage onClose={onClose} />;
  return (
    <SportAddSheet
      today={today}
      recent={recent}
      onClose={onClose}
      onSave={(data) => {
        addTraining(data);
        buzz();
        if (zielFrageFaellig(loadSport())) setFrage(true);
        else onClose();
      }}
    />
  );
}

/** Die Ziel-Frage (einmalig): Wochenziel 2× oder 3× – oder ohne Ziel */
export function SportZielFrage({ onClose }: { onClose: () => void }) {
  const close = () => {
    markZielGefragt();
    onClose();
  };
  const choose = (goal: number | null) => {
    setSportGoal(goal);
    buzz();
    onClose();
  };
  return (
    <Sheet title="Wochenziel" onClose={close}>
      <div className="flex flex-col gap-4 pb-3">
        <p className="text-[17px] font-semibold leading-snug">{ZIEL_FRAGE}</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Wie oft pro Woche?">
          <button type="button" onClick={() => choose(2)} className={buttonClass("primary", "lg")}>
            2×
          </button>
          <button type="button" onClick={() => choose(3)} className={buttonClass("primary", "lg")}>
            3×
          </button>
          <button type="button" onClick={() => choose(null)} className={buttonClass("secondary", "lg")}>
            Ohne Ziel
          </button>
        </div>
      </div>
    </Sheet>
  );
}
