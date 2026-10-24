"use client";

// Bestehende Nutzer (mit Profil) ohne gültige Zustimmung sehen „Bevor’s
// losgeht“ einmal beim nächsten Öffnen, auf jeder Seite außer den Rechtstexten
// (die bleiben lesbar) und Anmelden/Beitreten (dort gibt es das Häkchen schon).
// Neue Nutzer bekommen den Schritt im Hallo-Ablauf.

import { usePathname } from "next/navigation";
import { ZustimmungStep } from "@/components/datenschutz/ZustimmungStep";
import { useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { zustimmungNoetig } from "@/lib/datenschutz/zustimmung";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function ZustimmungGate() {
  const path = usePathname();
  const profile = useProfile();
  const { erteilt } = useEinwilligungen();
  if (!profile || !zustimmungNoetig(path, erteilt("bedingungen"))) return null;
  return <ZustimmungStep onDone={() => {}} />;
}
