"use client";

import Image from "next/image";
import { APP_NAME, iconFor } from "@/lib/core/app";
import { useProfile } from "@/lib/einstellungen/useProfile";

/** App-Icon in der Lieblingsfarbe der Begleitung (public/icons/<farbe>/icon.svg – Quelle: scripts/generate-icons.mjs) */
export function AppIcon({ size }: { size: number }) {
  const farbe = useProfile()?.helper.farbe;
  return (
    <Image
      src={iconFor(farbe, "icon.svg")}
      alt=""
      width={size}
      height={size}
      priority
      className="shrink-0 rounded-[22%] shadow-sm"
    />
  );
}

/** Logo der Startseite: Icon links neben dem Schriftzug "Was gibt's?" */
export function AppLogo() {
  return (
    <span className="flex items-center gap-3">
      <AppIcon size={44} />
      <span className="text-4xl font-black leading-none tracking-tight text-accent">{APP_NAME}</span>
    </span>
  );
}
