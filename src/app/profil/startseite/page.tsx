import { OpenHomeEditor } from "@/components/alltag/OpenHomeEditor";

export const metadata = { title: "Startseite bearbeiten" };

/** Einstellungen → "Startseite bearbeiten": öffnet den Bearbeiten-Modus direkt auf der Startseite */
export default function Page() {
  return <OpenHomeEditor />;
}
