import { Suspense } from "react";
import { PersonEditView } from "@/components/profile/PersonEditView";

export const metadata = { title: "Person bearbeiten · Familienküche" };

export default function PersonPage() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />}>
      <PersonEditView />
    </Suspense>
  );
}
