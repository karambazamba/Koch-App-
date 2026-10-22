import { PageHeader } from "@/components/ui/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { WeatherPlaceForm } from "@/components/einstellungen/WeatherPlaceForm";

export const metadata = { title: "Wetter-Ort" };

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wetter-Ort" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <WeatherPlaceForm />
      </main>
    </div>
  );
}
