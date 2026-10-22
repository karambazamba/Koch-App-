import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { DayView } from "@/components/kalender/DayView";

export const metadata = { title: "Tag" };

export default function Page() {
  return (
    // useSearchParams (?datum=) braucht eine Suspense-Grenze
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <DayView />
    </Suspense>
  );
}
