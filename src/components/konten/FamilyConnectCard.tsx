"use client";

// Einstellungen ganz oben: „Familie verbinden“ (je Haushaltsart „Mit
// jemandem teilen“ / „Zu zweit verbinden“; nur wenn Konten eingerichtet
// sind) bzw. „Verbunden · <Haushalt>“. Lädt Supabase nicht – nur die Frage,
// ob Konten da sind, und der zuletzt bekannte Stand.

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { useCloudMode } from "@/lib/konten/backend";
import { useCachedAccount } from "@/lib/konten/cache";
import { useSyncStatus } from "@/lib/konten/sync/status";
import { haushaltAnzeige, standardHaushaltsname } from "@/lib/konten/namen";
import { useHaushalt, useVerbindenTitel } from "@/lib/einstellungen/useHaushalt";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function FamilyConnectCard() {
  const mode = useCloudMode();
  const { household } = useCachedAccount();
  const takeover = useSyncStatus().phase === "uebernahme";
  const titel = useVerbindenTitel();
  const haushalt = useHaushalt();
  const profile = useProfile();
  if (mode !== "supabase" && mode !== "test") return null;
  const name = household ? haushaltAnzeige(household.name, standardHaushaltsname(haushalt, profile)) : titel;
  return (
    <Link href="/konto" className={`${CARD} flex items-center gap-3 px-4 py-3.5 active:scale-[0.99]`} aria-label={household ? `Verbunden, ${name}` : titel}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong" aria-hidden>
        <Users className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-extrabold">{name}</span>
        <span className="truncate text-sm text-muted">{!household ? "Alle sehen dasselbe" : takeover ? "Eigene Daten mitnehmen?" : "Verbunden"}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2} aria-hidden />
    </Link>
  );
}
