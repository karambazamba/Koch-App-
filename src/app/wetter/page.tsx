import { Suspense } from "react";
import { WeatherView } from "@/components/wetter/WeatherView";

export const metadata = { title: "Wetter" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WeatherView />
    </Suspense>
  );
}
