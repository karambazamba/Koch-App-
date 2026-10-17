import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { PersonEditView } from "@/components/profile/PersonEditView";

export const metadata = { title: "Person bearbeiten" };

export default function PersonPage() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <PersonEditView />
    </Suspense>
  );
}
