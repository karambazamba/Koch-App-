"use client";

// Einladungs-Link /beitreten?code=4K7-P2Q: ohne Konto direkt „Anmelden“,
// danach ist der Code beim Beitreten schon eingetragen.

import { useSearchParams } from "next/navigation";
import { WelcomeLogin } from "@/components/konten/WelcomeLogin";
import { formatInviteCode, normalizeInviteCode } from "@/lib/konten/model";

export function JoinLink() {
  const code = normalizeInviteCode(useSearchParams().get("code") ?? "");
  return <WelcomeLogin code={code ? formatInviteCode(code) : ""} />;
}
