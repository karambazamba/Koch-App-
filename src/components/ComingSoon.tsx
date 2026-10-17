import Link from "next/link";
import { PageHeader } from "./PageHeader";

type Props = {
  title: string;
  emoji: string;
  text: string;
};

/** Platzhalter für Bereiche, die in einer späteren Etappe gebaut werden. */
export function ComingSoon({ title, emoji, text }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
        <span className="text-7xl" aria-hidden>
          {emoji}
        </span>
        <p className="text-xl font-bold">Kommt bald!</p>
        <p className="text-lg text-stone-600">{text}</p>
        <Link
          href="/"
          className="mt-4 rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95"
        >
          Zur Startseite
        </Link>
      </main>
    </div>
  );
}
