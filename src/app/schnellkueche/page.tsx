import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Schnellküche" };

export default function SchnellkuechePage() {
  return (
    <ComingSoon
      title="Schnellküche"
      emoji="⚡"
      text="Wenig Zeit? Hier findest du bald schnelle Gerichte, die allen schmecken."
    />
  );
}
