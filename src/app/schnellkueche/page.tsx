import { SpontanRedirect } from "@/components/pantry/SpontanRedirect";

export const metadata = { title: "Spontan kochen" };

// Früher "Was ist noch da?" – geht jetzt im Spontan-Modus auf
export default function SchnellkuechePage() {
  return <SpontanRedirect />;
}
