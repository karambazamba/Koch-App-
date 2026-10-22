"use client";

import { useRouter } from "next/navigation";
import { canGoBack, expectReplace } from "@/lib/core/navigation";

/**
 * Eine Ebene zurück – wie Wischen nach rechts. Ohne Verlauf in der App (z. B.
 * direkt per Link geöffnet) geht es zur sinnvollen übergeordneten Seite.
 */
export function useGoBack(): (fallback?: string) => void {
  const router = useRouter();
  return (fallback = "/") => {
    if (canGoBack()) router.back();
    else {
      expectReplace();
      router.replace(fallback);
    }
  };
}
