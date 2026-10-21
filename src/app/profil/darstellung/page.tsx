import { redirect } from "next/navigation";

// Früher eigene Seite – Hell/Dunkel/Automatisch steht direkt in den Einstellungen
export default function Page() {
  redirect("/profil");
}
