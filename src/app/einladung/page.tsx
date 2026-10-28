import { APP_NAME } from "@/lib/core/app";
import { EinladungView } from "@/components/konten/EinladungView";

const TITLE = `Einladung zu ${APP_NAME}`;
const SUB = "Termine, Einkauf und Pinnwand gemeinsam.";

// Erreichbar als /e/<token> (Rewrite in next.config.ts); die Seite liest den Token selbst
export const metadata = { title: TITLE, description: SUB, robots: { index: false, follow: false }, openGraph: { title: TITLE, description: SUB, images: ["/brand/mia-aufkleber@2x.png"] } };

export default function Page() {
  return <EinladungView />;
}
