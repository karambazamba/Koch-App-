import { PageHeader } from "@/components/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { HomeCustomizerList } from "@/components/alltag/HomeCustomizer";

export const metadata = { title: "Startseite anpassen" };

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Startseite anpassen" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className="text-base text-muted">Ziehen zum Sortieren, Größe wählen, aus- und einblenden. Ausblenden löscht nichts – auch Lotte kann das für dich („Mach die Einkaufsliste klein“).</p>
        <HomeCustomizerList />
        <p className="text-sm text-muted">Tipp: Lange auf eine Kachel drücken öffnet das auch direkt auf der Startseite.</p>
      </main>
    </div>
  );
}
