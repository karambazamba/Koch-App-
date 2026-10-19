import { PageHeader } from "@/components/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { HomeEditorList } from "@/components/alltag/HomeCustomizer";

export const metadata = { title: "Startseite bearbeiten" };

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Startseite bearbeiten" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className="text-sm text-muted">Ziehen zum Sortieren · – zum Entfernen. Entfernen löscht nichts – auch Lotte kann das für dich („Nimm die Kladde auf die Startseite“).</p>
        <HomeEditorList />
        <p className="text-sm text-muted">Tipp: Halte die Startseite gedrückt – dann geht das auch direkt dort.</p>
      </main>
    </div>
  );
}
