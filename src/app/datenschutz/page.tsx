import { RechtstextView } from "@/components/datenschutz/RechtstextView";
import { DATENSCHUTZ } from "@/lib/datenschutz/rechtstexte";

export const metadata = { title: "Datenschutz" };

export default function Page() {
  return <RechtstextView title="Datenschutz" abschnitte={DATENSCHUTZ} kurz />;
}
