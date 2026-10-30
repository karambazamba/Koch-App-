"use client";

// Einstellungen → Mitteilungen (A-069): ehrlicher Status in Klartext – „Auf
// dem Homescreen“, „Mitteilungen erlaubt“, „Mit Konto verbunden“, „Mia
// schickt auch bei geschlossener App“ (Zeitplan im Server + Abo + letzter
// Lauf vor weniger als 5 Min), bei jedem „nein“ ein Satz, was zu tun ist.
// Darunter „Test: in 1 Minute erinnern“ über den Server.

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { statusZeilen, type StatusEingang } from "@/lib/heute/mitteilungen/pushStatus";
import { pushStatusLaden, testErinnern, testText } from "@/lib/heute/mitteilungen/pushPruefen";
import { helperName } from "@/lib/einstellungen/profile";

export function PushStatus({ permission }: { permission: string }) {
  const [stand, setStand] = useState<StatusEingang | null>(null);
  const [test, setTest] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  useEffect(() => {
    let an = true;
    void pushStatusLaden().then((s) => an && setStand(s));
    return () => {
      an = false;
    };
  }, [permission]);
  const name = helperName();
  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Status" data-push-status>
      {!stand ? (
        <div className="h-32 animate-pulse rounded-field bg-fill" />
      ) : (
        <ul className="flex flex-col gap-3">
          {statusZeilen(stand, name).map((z) => (
            <li key={z.id} className="flex flex-col gap-0.5" data-status={z.id} data-ja={z.ja ? "ja" : "nein"}>
              <span className="flex items-start justify-between gap-3 text-[15px] font-semibold">
                <span>{z.label}</span>
                <span className={`flex shrink-0 items-center gap-1 font-bold ${z.ja ? "text-good" : "text-muted"}`}>
                  {z.ja ? <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden /> : <X className="h-4 w-4" strokeWidth={2.75} aria-hidden />}
                  {z.ja ? "ja" : "nein"}
                </span>
              </span>
              {z.hilfe && <span className="text-sm text-muted">{z.hilfe}</span>}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={laeuft}
        onClick={async () => {
          setLaeuft(true);
          setTest(testText(await testErinnern()));
          setLaeuft(false);
          void pushStatusLaden().then(setStand);
        }}
        className={`${buttonClass("secondary", "md")} w-full`}
        data-push-test
      >
        Test: in 1 Minute erinnern
      </button>
      {test && (
        <p className="text-sm text-muted" role="status" data-push-test-antwort>
          {test}
        </p>
      )}
    </section>
  );
}
