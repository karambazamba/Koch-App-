import { redirect } from "next/navigation";

// Früher "Was ist noch da?" – Ideen gibt es jetzt auf der Essen-Seite
export default function Page() {
  redirect("/?seite=essen");
}
