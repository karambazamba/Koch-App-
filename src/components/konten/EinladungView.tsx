"use client";

// Einladungs-Link /e/<token> (Tafel 22, Rewrite auf /einladung): „<Name> lädt dich ein.“ – anmelden
// per E-Mail-Code (Launch 1.0: nur E-Mail, Apple/Google kommen später) und
// sofort Mitglied, dann die Startseite; der Zugangscode kommt erst beim
// ersten KI-Versuch (A-027). Abgelaufen oder zurückgezogen: eine freundliche
// Seite statt eines Fehlers.

import { useEffect, useState } from "react";
import Link from "next/link";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { buttonClass } from "@/components/ui/styles";
import { avatarHex } from "@/lib/einstellungen/profile";
import { inviteInfo } from "@/lib/konten/account";
import { tokenFromLink, type InviteInfo } from "@/lib/konten/model";
import { WelcomeLogin } from "@/components/konten/WelcomeLogin";
import { personName } from "@/lib/konten/namen";

export function EinladungView() {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [token, setToken] = useState("");
  useEffect(() => {
    let live = true;
    // /e/<token> (Rewrite auf diese Seite) – der Token steht nur in der Adresse
    const t = tokenFromLink(window.location.pathname) ?? "";
    void (t ? inviteInfo(t) : Promise.resolve(null)).then((r) => {
      if (!live) return;
      setToken(t);
      setInfo(r?.ok ? r.value : { status: "unbekannt", inviter: "", family: "" });
    });
    return () => {
      live = false;
    };
  }, []);

  if (!info) return <main className="fixed inset-0 bg-background" aria-busy="true" />;
  if (info.status === "gueltig") return <WelcomeLogin einladung={token} inviter={info.inviter} />;
  return (
    <main className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center" aria-label="Einladung">
      <BegleitungAvatar size={76} color={avatarHex("orange")} zustand="ruhig" groesse="gross" stabil />
      <h1 className="text-[26px] font-extrabold leading-tight">{info.status === "abgelaufen" ? "Diese Einladung ist abgelaufen." : "Diese Einladung gibt es nicht mehr."}</h1>
      <p className="max-w-xs text-[15.5px] text-muted">{personName(info.inviter) ? `Frag ${personName(info.inviter)} einfach nach einem neuen Link.` : "Frag einfach nach einem neuen Link."}</p>
      <Link href="/" className={`${buttonClass("secondary", "lg")} mt-2`}>
        Zur App
      </Link>
    </main>
  );
}
