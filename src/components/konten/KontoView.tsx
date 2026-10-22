"use client";

// /konto: Familie verbinden. Nicht angemeldet → Anmelden per Code; ohne
// Haushalt → anlegen oder mit Code beitreten; verbunden → Haushalt,
// Mitglieder, Einladen, Abmelden. `?einladen=1` öffnet gleich das Einladen,
// `?von=hallo` startet danach die App (erster Start ohne Profil).

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { householdTitle } from "@/lib/einstellungen/profileHousehold";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { expectReplace } from "@/lib/core/navigation";
import { useAccount } from "@/lib/konten/account";
import { LoginSteps } from "@/components/konten/LoginSteps";
import { HouseholdChoice } from "@/components/konten/HouseholdChoice";
import { HouseholdCard, InviteSheet } from "@/components/konten/HouseholdCard";

export function KontoView() {
  const account = useAccount();
  const profile = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const fromHello = params.get("von") === "hallo";
  const [invite, setInvite] = useState(params.get("einladen") === "1");
  const me = profile?.persons[0];
  const displayName = me?.name.trim() || account.user?.email.split("@")[0] || "";
  const suggested = profile?.householdName ? `Familie ${profile.householdName}` : profile ? householdTitle(profile).replace(/^Unser(e)? /, "") : "";

  const finished = () => {
    if (!fromHello) return;
    if (profile === null) startFresh();
    expectReplace();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Familie verbinden" backHref={fromHello ? "/" : "/profil"} />
      <main className={`${PAGE_MAIN} gap-4`}>
        {account.mode === "laedt" && !account.user && <div className={`${CARD} h-40 animate-pulse`} />}
        {account.mode === "aus" && <p className="text-[15px] text-muted">Konten sind hier noch nicht eingerichtet – die App läuft wie gewohnt auf diesem Gerät.</p>}
        {(account.mode === "supabase" || account.mode === "test") && !account.user && (
          <section className="flex flex-col gap-3" aria-label="Anmelden">
            <h2 className={SECTION_TITLE}>Gemeinsam statt jeder für sich</h2>
            <p className="text-[15px] text-muted">Mit einem Konto seht ihr Termine, Einkauf und Pinnwand gemeinsam. Ohne Konto geht alles wie bisher – nur auf diesem Handy.</p>
            <LoginSteps />
          </section>
        )}
        {account.user && !account.household && account.mode !== "laedt" && (
          <HouseholdChoice suggestedName={suggested} displayName={displayName} personId={me?.id ?? null} onDone={finished} />
        )}
        {account.user && account.household && (
          <>
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
