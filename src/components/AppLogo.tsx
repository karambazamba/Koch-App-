"use client";

import Image from "next/image";
import { iconFor } from "@/lib/core/app";
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
