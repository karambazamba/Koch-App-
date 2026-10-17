import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Was ist noch da?" };

export default function SchnellkuechePage() {
  return (
    <ComingSoon
      title="Was ist noch da?"
      emoji="🥕"
      text="Sag, was übrig ist – wir zaubern was draus. Kommt bald!"
    />
  );
}
