import { Suspense } from "react";
import { OAuthCallback } from "@/components/konten/OAuthCallback";

export const metadata = { title: "Anmelden" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<main className="fixed inset-0 bg-background" />}>
      <OAuthCallback />
    </Suspense>
  );
}
