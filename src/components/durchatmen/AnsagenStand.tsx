"use client";

// Durchatmen-Ansagen auf „Für Entwickler“ (A-051, A-061): nur ein Hinweis, wie
// viele von Mias Ansagen schon im Bucket liegen bzw. ob die Stimme auf dem
// Server nicht eingerichtet ist. Für Nutzer bleibt das still (sie hören dann
// nur Klang). Fehlende entstehen von selbst beim ersten Abspielen und nachts
// (Vercel Cron) – einen Knopf braucht es nicht.

import { useEffect, useState } from "react";
import { SECTION_TITLE } from "@/components/ui/styles";
import { helperName } from "@/lib/einstellungen/profile";

type Stand = { eingerichtet: boolean; da: number; gesamt: number };

export function ansagenHinweis(s: Stand, name: string): string {
  if (!s.eingerichtet) return `${name}s Stimme ist auf dem Server noch nicht eingerichtet (Stimme oder Speicher sind in Vercel nicht gesetzt). Bis dahin nur Klang.`;
  if (s.da >= s.gesamt) return `Alle ${s.gesamt} Ansagen mit ${name}s Stimme sind da.`;
  return `${s.da} von ${s.gesamt} Ansagen da. Die übrigen entstehen beim ersten Abspielen und nachts von selbst.`;
}

export function AnsagenStand() {
  const [stand, setStand] = useState<Stand | null>(null);
  useEffect(() => {
    void fetch("/api/durchatmen/ansagen-stand")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStand)
      .catch(() => setStand(null));
  }, []);
  if (!stand) return null;
  const gut = stand.eingerichtet && stand.da >= stand.gesamt;
  return (
    <section className="flex flex-col gap-2" aria-label="Durchatmen-Ansagen">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Durchatmen-Ansagen</h2>
      <p className={`px-1 text-sm font-semibold ${gut ? "text-good-ink" : "text-warn-ink"}`} role="status" data-ansagen-stand>
        {ansagenHinweis(stand, helperName(null))}
      </p>
    </section>
  );
}
