import Image from "next/image";
import { APP_NAME } from "@/lib/core/app";

/** App-Icon (Lotte als Sprechblase auf orangem Verlauf) aus public/icons/icon.svg – Quelle: scripts/generate-icons.mjs */
export function AppIcon({ size }: { size: number }) {
  return (
    <Image
      src="/icons/icon.svg"
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
