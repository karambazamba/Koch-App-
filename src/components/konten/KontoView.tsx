"use client";

// /konto: Familie verbinden (Überschrift je Haushaltsart: „Mit jemandem
// teilen“, „Zu zweit verbinden“, „Familie verbinden“). Nicht angemeldet →
// Anmelden per Code; ohne Familie → ohne Profilnamen einmal „Wie sollen dich
// die anderen sehen?“, dann still „Familie <Nachname>“ bzw. „Wir zwei“ /
// „Privat“ anlegen; verbunden → Familie,
// Mitglieder, Einladen per Link, Abmelden. `?einladen=1` öffnet gleich das Einladen,
// `?von=hallo` startet danach die App (erster Start ohne Profil).

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { expectReplace } from "@/lib/core/navigation";
import { useAccount } from "@/lib/konten/account";
import { brauchtNamensfrage, profilName, standardHaushaltsname } from "@/lib/konten/namen";
import { useHaushalt, useVerbindenTitel } from "@/lib/einstellungen/useHaushalt";
import { NameFrage } from "@/components/konten/NameFrage";
import { LoginSteps } from "@/components/konten/LoginSteps";
import { AutoFamily } from "@/components/konten/AutoFamily";
import { HouseholdCard, InviteSheet } from "@/components/konten/HouseholdCard";
import { TakeoverCard } from "@/components/konten/TakeoverCard";

export function KontoView() {
  const account = useAccount();
  const profile = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const fromHello = params.get("von") === "hallo";
  const [invite, setInvite] = useState(params.get("einladen") === "1");
  const titel = useVerbindenTitel();
  const haushalt = useHaushalt();
  const me = profile?.persons[0];
  const [asked, setAsked] = useState("");
  const displayName = profilName(me?.name) || asked;
  const suggested = standardHaushaltsname(haushalt, profile);

  const finished = () => {
    if (!fromHello) return;
    if (profile === null) startFresh();
    expectReplace();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={titel} backHref={fromHello ? "/" : "/profil"} />
      <main className={`${PAGE_MAIN} gap-4`}>
        {account.mode === "laedt" && !account.user && <div className={`${CARD} h-40 animate-pulse`} />}
        {account.mode === "aus" && <p className="text-[15px] text-muted">Konten sind hier noch nicht eingerichtet. Die App läuft wie gewohnt auf diesem Gerät.</p>}
        {(account.mode === "supabase" || account.mode === "test") && !account.user && (
          <section className="flex flex-col gap-3" aria-label="Anmelden">
            <div className="flex flex-col gap-1">
              <p className="text-[17px] font-semibold leading-snug">Teil Termine, Einkauf und Pinnwand mit deinen Leuten.</p>
              <p className="text-sm text-muted">Ohne Konto bleibt alles auf diesem Handy.</p>
            </div>
            <LoginSteps />
          </section>
        )}
        {account.user && !account.household && account.mode !== "laedt" && brauchtNamensfrage(displayName) && (
          <section className={`${CARD} p-4`}>
            <NameFrage email={account.user.email} onDone={setAsked} />
          </section>
        )}
        {account.user && !account.household && account.mode !== "laedt" && !brauchtNamensfrage(displayName) && (
          <AutoFamily name={suggested} displayName={displayName} personId={me?.id ?? null} onDone={finished} />
        )}
        {account.user && account.household && (
          <>
            <TakeoverCard />
            <HouseholdCard household={account.household} email={account.user.email} onSignedOut={() => router.replace(fromHello ? "/" : "/profil")} />
            {fromHello && (
              <button type="button" onClick={finished} className="hit h-11 self-center text-base font-semibold text-accent-strong">
                Weiter zur App
              </button>
            )}
          </>
        )}
        {invite && account.household?.me.role === "erwachsener" && <InviteSheet onClose={() => setInvite(false)} />}
      </main>
    </div>
  );
}
