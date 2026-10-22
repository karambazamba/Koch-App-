"use client";

// Ein Fenster für alles Neue: "Was möchtest du eintragen?" – Termin, Aufgabe,
// Notiz, Einkauf oder einfach Mia sagen (Mikrofon). Danach geht es im
// passenden Schnell-Eintrag weiter. Mit Baustein „Kalender übernehmen“ unten
// leise „Aus Apple/Google übernehmen“.

import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { CalendarClock, CircleCheck, Mic, ShoppingCart, StickyNote } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD } from "@/components/ui/styles";
import { TerminQuickAdd } from "@/components/kalender/TerminQuickAdd";
import { TaskQuickAdd } from "@/components/kalender/TaskQuickAdd";
import { ShoppingQuickAdd } from "@/components/einkauf/QuickAdd";
import { openHelper } from "@/lib/begleitung/open";
import { wakeAvatar } from "@/lib/core/avatarState";
import { useFeature } from "@/lib/core/features";

type Kind = "termin" | "aufgabe" | "einkauf";

const CHOICES: { kind: Kind | "notiz"; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { kind: "termin", label: "Termin", icon: CalendarClock },
  { kind: "aufgabe", label: "Aufgabe", icon: CircleCheck },
  { kind: "notiz", label: "Notiz", icon: StickyNote },
  { kind: "einkauf", label: "Einkauf", icon: ShoppingCart },
];

export function AddSheet({ date, name, onClose }: { date?: string; name: string; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const importOn = useFeature("kalender");
  if (kind === "termin") return <TerminQuickAdd defaultDate={date} onClose={onClose} />;
  if (kind === "aufgabe") return <TaskQuickAdd defaultWhen={date ? { date } : "heute"} onClose={onClose} />;
  if (kind === "einkauf") return <ShoppingQuickAdd onClose={onClose} />;
  return (
    <Sheet title="Was möchtest du eintragen?" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {CHOICES.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => (k === "notiz" ? (onClose(), router.push("/notizen/bearbeiten?neu=text")) : setKind(k))}
            className={`${CARD} flex h-24 flex-col items-start justify-between p-3.5 text-left text-[16px] font-bold active:scale-[0.98]`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onClose();
          wakeAvatar();
          openHelper("voice");
        }}
        className="mb-3 flex h-14 items-center justify-center gap-2 rounded-field bg-accent text-[16px] font-bold text-on-accent active:scale-[0.98]"
      >
        <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        Oder einfach {name} sagen
      </button>
      {importOn && (
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/profil/kalender");
          }}
          className="hit -mt-1 mb-2 self-center text-sm font-semibold text-muted underline"
        >
          Aus Apple/Google übernehmen
        </button>
      )}
    </Sheet>
  );
}
