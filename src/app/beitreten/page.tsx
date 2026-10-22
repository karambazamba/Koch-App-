import { Suspense } from "react";
import { JoinLink } from "@/components/konten/JoinLink";

export const metadata = { title: "Beitreten" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<main className="fixed inset-0 bg-background" />}>
      <JoinLink />
    </Suspense>
  );
}
