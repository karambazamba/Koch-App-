"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { CARD, buttonClass } from "@/components/ui/styles";
import { useProfile } from "@/lib/einstellungen/useProfile";

/** Nur ohne Profil: Einladung, das Haushaltsprofil anzulegen. */
export function WelcomeCard() {
  const profile = useProfile();
  if (profile !== null) return null;
  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Users} />
        <h2 className="text-xl font-extrabold tracking-tight">Willkommen!</h2>
      </div>
      <p className="mt-3 text-base text-muted">
        Erzähl uns kurz von deinem Haushalt – dann passen alle Vorschläge zu euch.
      </p>
      <Link href="/profil" className={`${buttonClass("primary", "lg")} mt-4 w-full`}>
        Haushaltsprofil anlegen
      </Link>
    </section>
  );
}
