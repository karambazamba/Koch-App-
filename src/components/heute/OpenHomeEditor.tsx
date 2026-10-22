"use client";

// Öffnet den Bearbeiten-Modus direkt auf der Startseite (Einstellungen,
// alte Links auf /profil/startseite).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestHomeEdit } from "@/lib/core/homeLayout";
import { expectReplace } from "@/lib/core/navigation";

export function OpenHomeEditor() {
  const router = useRouter();
  useEffect(() => {
    requestHomeEdit();
    expectReplace();
    router.replace("/");
  }, [router]);
  return <main className="flex flex-1 items-center justify-center p-8 text-muted">Startseite bearbeiten …</main>;
}
