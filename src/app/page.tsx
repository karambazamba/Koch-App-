import Link from "next/link";
import { HouseholdCard } from "@/components/HouseholdCard";

const AREAS = [
  {
    href: "/wochenplan",
    title: "Wochenplan",
    text: "Die ganze Woche entspannt planen",
    emoji: "📅",
    color: "bg-emerald-100 text-emerald-900",
  },
  {
    href: "/schnellkueche",
    title: "Schnellküche",
    text: "Schnelle Ideen für heute",
    emoji: "⚡",
    color: "bg-amber-100 text-amber-900",
  },
  {
    href: "/einkaufsliste",
    title: "Einkaufsliste",
    text: "Alles für den Einkauf auf einen Blick",
    emoji: "🛒",
    color: "bg-sky-100 text-sky-900",
  },
];

export default function Home() {
  return (
    <main className="safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header>
        <p className="text-lg font-semibold text-orange-600">Familienküche</p>
        <h1 className="text-3xl font-extrabold leading-tight">
          Was kochen wir heute? 🍲
        </h1>
      </header>

      <HouseholdCard />

      <nav aria-label="Bereiche" className="flex flex-col gap-4">
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className={`flex min-h-28 items-center gap-4 rounded-3xl p-5 shadow-sm transition active:scale-[0.98] ${area.color}`}
          >
            <span className="text-5xl" aria-hidden>
              {area.emoji}
            </span>
            <span className="flex flex-col">
              <span className="text-2xl font-extrabold">{area.title}</span>
              <span className="text-base opacity-80">{area.text}</span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
