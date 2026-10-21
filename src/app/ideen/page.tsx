import { redirect } from "next/navigation";

// Früher eigene Ideen-Seite – „Was koche ich?“ ist jetzt das eine Tausch-Fenster auf der Essen-Seite
export default function Page() {
  redirect("/?seite=essen");
}
