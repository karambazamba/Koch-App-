"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { installNavigationMemory, onRouteChange } from "@/lib/navigation";

/** Merkt sich den Verlauf und die Scrollhöhe je Ebene (siehe lib/navigation.ts) */
export function NavigationMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    installNavigationMemory();
  }, []);
  useEffect(() => {
    installNavigationMemory();
    onRouteChange(`${pathname}${search ? `?${search}` : ""}`);
  }, [pathname, search]);
  return null;
}
