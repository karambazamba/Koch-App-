"use client";

// Erster Start (nur ganz am Anfang oder nach "Neu anfangen"): ein ruhiger
// Hallo-Bildschirm – lebendiger Avatar (begrüßen → ruhig), "Hallo, ich bin
// Mia.", ein Satz, der Hinweis aufs Sprechen (kein Knopf), unten "Los geht's"
// in der Farbe der Begleitung und leise "Ich habe eine Sicherung". Danach
// direkt die Startseite mit dem Beispiel-Tag – keine weiteren Fragen.
// Passt ohne Scrollen vom iPhone SE bis Pro Max.

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { DEFAULT_HELPER, avatarHex } from "@/lib/einstellungen/profile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { expectReplace } from "@/lib/core/navigation";

export function HelloScreen() {
  const router = useRouter();
  const path = usePathname();
  // Erst begrüßen, dann ruhig
  const [zustand, setZustand] = useState<"begruessen" | "ruhig">("begruessen");
  useEffect(() => {
    const t = window.setTimeout(() => setZustand("ruhig"), 2600);
    return () => window.clearTimeout(t);
  }, []);
  const color = avatarHex(DEFAULT_HELPER.farbe);
  const start = () => {
    startFresh();
    if (path !== "/") {
      expectReplace();
      router.replace("/");
    }
  };
  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background" aria-label="Willkommen">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-[8vh]">
          <LotteAvatar size={150} color={color} zustand={zustand} groesse="gross" />
          <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">Hallo, ich bin {DEFAULT_HELPER.name}.</h1>
          <p className="-mt-2 text-base font-medium text-muted">Ich behalte euren Alltag im Blick.</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-quick px-4 py-2 text-sm font-semibold text-quick-ink" role="note">
            <Mic className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Du kannst auch einfach mit mir sprechen
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          <button type="button" onClick={start} className="h-14 w-full rounded-[18px] text-[17px] font-bold text-white active:scale-[0.98]" style={{ backgroundColor: color }}>
            Los geht’s
          </button>
          <Link href="/profil/daten" className="hit inline-flex h-11 items-center text-sm font-semibold text-muted">
            Ich habe eine Sicherung
          </Link>
        </div>
      </div>
    </main>
  );
}
