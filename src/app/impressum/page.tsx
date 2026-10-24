import { RechtstextView } from "@/components/datenschutz/RechtstextView";
import { IMPRESSUM } from "@/lib/datenschutz/rechtstexte";

export const metadata = { title: "Impressum" };

export default function Page() {
  return <RechtstextView title="Impressum" abschnitte={IMPRESSUM} />;
}
