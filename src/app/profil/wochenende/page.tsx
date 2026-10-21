import { redirect } from "next/navigation";

// Früher Wochenend-Stil – gehört jetzt zum Kochstil
export default function Page() {
  redirect("/profil/kochstil");
}
