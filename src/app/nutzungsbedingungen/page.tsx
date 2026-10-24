import { RechtstextView } from "@/components/datenschutz/RechtstextView";
import { NUTZUNGSBEDINGUNGEN } from "@/lib/datenschutz/rechtstexte";

export const metadata = { title: "Nutzungsbedingungen" };

export default function Page() {
  return <RechtstextView title="Nutzungsbedingungen" abschnitte={NUTZUNGSBEDINGUNGEN} />;
}
