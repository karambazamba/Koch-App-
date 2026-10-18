"use client";

// Erstes Kennenlernen als Gespräch (Vollbild). Der Zwischenstand wird nach
// jeder Antwort gespeichert – man kann aufhören und später weitermachen.
// "Lieber Formular" öffnet den bisherigen Assistenten mit dem Stand von hier.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { familyCard, finalizeProfile, revisit, startOnboarding, type OnboardingState } from "@/lib/onboarding/engine";
import { clearOnboarding, loadOnboarding, saveOnboarding } from "@/lib/onboarding/progress";
import { saveProfile, type HouseholdProfile } from "@/lib/profile";
import { CARD } from "@/components/ui/styles";
import { GuidedChat } from "./GuidedChat";

type Props = {
  /** Zum Formular wechseln – mit dem bisher Erzählten als Startwert */
  onForm: (draft: HouseholdProfile | null) => void;
};

export function OnboardingChat({ onForm }: Props) {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(() => loadOnboarding() ?? startOnboarding());
  const [cardOpen, setCardOpen] = useState(false);

  const update = (next: OnboardingState) => {
    setState(next);
    saveOnboarding(next);
  };

  const finish = (choice: string) => {
    saveProfile(finalizeProfile(state));
    clearOnboarding();
    router.push(choice === "plan" ? "/woche/check" : "/");
  };

  const rows = familyCard(state);
  const helperChosen = rows.some((r) => r.target.kind === "helper");

  return (
    <div className="fixed inset-0 z-30 flex justify-center bg-background">
      <section className="flex h-dvh w-full max-w-lg flex-col pt-[env(safe-area-inset-top)]" aria-label="Kennenlernen">
        <header className="flex flex-col gap-3 border-b border-line px-4 pb-3 pt-3">
          <div className="flex items-center gap-3">
            <HelperAvatar size={44} variant="badge" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight">
                {helperChosen ? state.draft.helper.name : "Hallo!"}
              </h1>
              <p className="text-sm text-muted">Wir lernen uns kennen</p>
            </div>
            <button
              type="button"
              onClick={() => onForm(state.draft.persons.length ? finalizeProfile(state) : null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted active:bg-stone-100"
            >
              <ClipboardList className="h-4 w-4" strokeWidth={2} aria-hidden />
              Lieber Formular
            </button>
          </div>

          {rows.length > 0 && (
            <div className={`${CARD} overflow-hidden`}>
              <button
                type="button"
                onClick={() => setCardOpen((o) => !o)}
                aria-expanded={cardOpen}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
              >
                <span className="flex-1 text-sm font-bold text-ink">
                  {state.draft.householdType === "familie" ? "Familienkarte" : "Steckbrief"} <span className="font-semibold text-muted">· {rows.length} Einträge</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition ${cardOpen ? "rotate-180" : ""}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              {cardOpen && (
                <ul className="max-h-[40dvh] divide-y divide-line overflow-y-auto border-t border-line">
                  {rows.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          update(revisit(state, r.target));
                          setCardOpen(false);
                        }}
                        className="flex w-full flex-col px-4 py-2 text-left active:bg-stone-50"
                      >
                        <span className="text-xs font-semibold text-muted">{r.label}</span>
                        <span className="text-sm text-ink">{r.value}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </header>

        <GuidedChat state={state} onChange={update} onFinish={finish} />
      </section>
    </div>
  );
}
