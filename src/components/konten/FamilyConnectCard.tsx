"use client";

// Einstellungen ganz oben: „Familie verbinden“ (nur wenn Konten eingerichtet
// sind) bzw. „Verbunden · <Haushalt>“. Lädt Supabase nicht – nur die Frage,
// ob Konten da sind, und der zuletzt bekannte Stand.

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { useCloudMode } from "@/lib/konten/backend";
import { useCachedAccount } from "@/lib/konten/cache";

export function FamilyConnectCard() {
  const mode = useCloudMode();
  const { household } = useCachedAccount();
  if (mode !== "supabase" && mode !== "test") return null;
  return (
    <Link href="/konto" className={`${CARD} flex items-center gap-3 px-4 py-3.5 active:scale-[0.99]`} aria-label={household ? `Verbunden – ${household.name}` : "Familie verbinden"}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong" aria-hidden>
        <Users className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-extrabold">{household ? household.name || "Unser Haushalt" : "Familie verbinden"}</span>
        <span className="truncate text-sm text-muted">{household ? "Verbunden" : "Alle sehen dasselbe"}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2} aria-hidden />
    </Link>
  );
}
