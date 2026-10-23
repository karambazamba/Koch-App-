"use client";

// Mias Frage nach Mitteilungen – im passenden Moment, nie beim ersten Start
// (Tafel 77). „Ja, gern“ holt erst dann die Systemabfrage (im Tipp, Pflicht
// bei iOS). Im Safari-Tab auf dem iPhone gibt es keine Mitteilungen: statt
// der Abfrage die kurze Anleitung „Mia auf den Homescreen legen“.

import { Bell } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { StepList } from "@/components/ui/StepGuide";
import { buttonClass } from "@/components/ui/styles";
import { APP_NAME } from "@/lib/core/app";
import { showToast } from "@/lib/core/toast";
import { askText, changeNotify, loadNotify, type AskMoment } from "@/lib/heute/mitteilungen/einstellungen";
import { requestNotifyPermission } from "@/lib/heute/mitteilungen/geraet";
import type { MicStep } from "@/lib/core/mic";

const HOMESCREEN: MicStep[] = [
  { text: "Unten auf „Teilen“ tippen", icon: "teilen", screen: { title: "", rows: [], target: 0 } },
  { text: "„Zum Home-Bildschirm“ wählen", icon: "apps", screen: { title: "", rows: [], target: 0 } },
  { text: `${APP_NAME} vom Home-Bildschirm öffnen – dann frag ich nochmal`, icon: "erlauben", screen: { title: "", rows: [], target: 0 } },
];

export function NotifyAsk({ moment, kind, onClose }: { moment: AskMoment; kind: "frage" | "homescreen"; onClose: () => void }) {
  if (kind === "homescreen") {
    return (
      <Sheet title="Erinnerungen aufs Handy" onClose={onClose}>
        <div className="flex flex-col gap-4 pb-3">
          <p className="text-base leading-snug">Damit ich dich erinnern kann, leg {APP_NAME} kurz auf den Home-Bildschirm. Im Browser-Tab darf das iPhone keine Mitteilungen zeigen.</p>
          <StepList steps={HOMESCREEN} />
          <button type="button" onClick={onClose} className={buttonClass("primary", "md")}>
            Okay
          </button>
        </div>
      </Sheet>
    );
  }
  const text = askText(moment, loadNotify().defaultReminder);
  const no = () => {
    changeNotify((s) => ({ ...s, answer: "nein" }));
    onClose();
  };
  const yes = async () => {
    changeNotify((s) => ({ ...s, answer: "ja" }));
    const p = await requestNotifyPermission();
    onClose();
    if (p === "granted") {
      // Abo beim Server (mit Konto) – der NotifyHost frischt es mit den Einstellungen auf
      changeNotify((s) => ({ ...s }));
      showToast({ text: "Mach ich." });
    }
  };
  return (
    <Sheet title={text.title} onClose={no}>
      <div className="flex flex-col items-center gap-4 pb-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Bell className="h-8 w-8" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base leading-snug">{text.text}</p>
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={() => void yes()} className={buttonClass("primary", "md")}>
            Ja, gern
          </button>
          <button type="button" onClick={no} className={buttonClass("ghost", "md")}>
            Lieber nicht
          </button>
        </div>
      </div>
    </Sheet>
  );
}
