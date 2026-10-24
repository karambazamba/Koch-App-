"use client";

// Zurück von Apple/Google (/auth/callback?code=…): Sitzung übernehmen und
// weiter dorthin, wo man herkam (z. B. die Einladung).

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buttonClass } from "@/components/ui/styles";
import { finishOAuth } from "@/lib/konten/account";

export function OAuthCallback() {
  const router = useRouter();
  const code = useSearchParams().get("code") ?? "";
  const [failed, setError] = useState("");
  const error = code ? failed : "Hm, die Anmeldung kam nicht ganz an – nochmal versuchen?";
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!code) return;
    void finishOAuth(code).then((r) => (r.ok ? router.replace(r.value) : setError(r.error)));
  }, [code, router]);
  return (
    <main className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center" aria-label="Anmelden">
      <p className="text-[17px] font-bold" role="status">
        {error || "Einen Moment …"}
      </p>
      {error && (
        <Link href="/anmelden" className={buttonClass("primary", "lg")}>
          Nochmal anmelden
        </Link>
      )}
    </main>
  );
}
