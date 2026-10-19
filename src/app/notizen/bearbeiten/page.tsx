import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { NoteEditor } from "@/components/notizen/NoteEditor";

export const metadata = { title: "Notiz" };

export default function Page() {
  return (
    // useSearchParams (?id=, ?neu=) braucht eine Suspense-Grenze
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <NoteEditor />
    </Suspense>
  );
}
