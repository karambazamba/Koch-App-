"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { tileClass } from "@/components/ui/styles";
import { unlockPlanning, type UnlockChoice } from "@/lib/essen/planUnlock";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";
import { showToast } from "@/lib/core/toast";

/** Planung freischalten: "Nur diese Woche oder ab jetzt immer?" */
export function PlanUnlockSheet({ profile, today, onClose }: { profile: HouseholdProfile; today: Date; onClose: () => void }) {
  const router = useRouter();
  const [always, setAlways] = useState(false);
  const pick = (choice: UnlockChoice) => {
    const result = unlockPlanning(profile, today, choice);
    onClose();
    showToast({ text: result.text, undo: result.undo });
    router.push("/wochenplan");
  };
  return (
    <Sheet title={always ? "Wie denn?" : "Nur diese Woche oder ab jetzt immer?"} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        {always ? (
          <>
            <button type="button" onClick={() => pick({ kind: "immer", style: "mix" })} className={tileClass(false)}>
              <span className="flex flex-col self-stretch px-2 text-left">
                <span className="text-base font-bold">Mal so, mal so</span>
                <span className="text-sm text-muted">Plan, wenn ihr Lust habt – freie Tage sind normal.</span>
              </span>
            </button>
            <button type="button" onClick={() => pick({ kind: "immer", style: "plan" })} className={tileClass(false)}>
              <span className="flex flex-col self-stretch px-2 text-left">
                <span className="text-base font-bold">Ich plane gern</span>
                <span className="text-sm text-muted">Wochenplan, Einkaufstag und Liste für die Woche.</span>
              </span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => pick({ kind: "woche" })} className={tileClass(false)}>
              <span className="flex flex-col self-stretch px-2 text-left">
                <span className="text-base font-bold">Nur diese Woche</span>
                <span className="text-sm text-muted">Danach geht&apos;s wieder spontan weiter.</span>
              </span>
            </button>
            <button type="button" onClick={() => setAlways(true)} className={tileClass(false)}>
              <span className="flex flex-col self-stretch px-2 text-left">
                <span className="text-base font-bold">Ab jetzt immer</span>
                <span className="text-sm text-muted">Dann frag ich kurz, wie genau.</span>
              </span>
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
