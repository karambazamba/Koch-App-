import Link from "next/link";
import { FamilyGreeting, HouseholdRow, WelcomeCard } from "@/components/HouseholdCard";
import { CookbookSubtitle, ShoppingSubtitle } from "@/components/home/TileSubtitles";
import { TodayLine } from "@/components/plan/TodayLine";
import { NextWeekCard } from "@/components/week/NextWeekCard";
import { APP_NAME } from "@/lib/app";

// Untertitel sind teils dynamisch (Client-Komponenten), daher als Element.
const AREAS = [
  {
    href: "/wochenplan",
    title: "Wochenplan",
    subtitle: <TodayLine />,
    emoji: "📅",
    color: "bg-emerald-100 text-emerald-900",
  },
  {
    href: "/schnellkueche",
    title: "Was ist noch da?",
    subtitle: "Sag, was übrig ist – wir zaubern was draus",
    emoji: "🥕",
    color: "bg-amber-100 text-amber-900",
  },
  {
    href: "/einkaufsliste",
    title: "Einkaufsliste",
    subtitle: <ShoppingSubtitle />,
    emoji: "🛒",
    color: "bg-sky-100 text-sky-900",
  },
  {
    href: "/kochbuch",
    title: "Unser Kochbuch",
    subtitle: <CookbookSubtitle />,
    emoji: "📖",
    color: "bg-rose-100 text-rose-900",
  },
];

export default function Home() {
  return (
    <main className="safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header>
        {/* App-Name als Logo-Schriftzug */}
        <h1 className="text-5xl font-black tracking-tight text-orange-500">{APP_NAME}</h1>
        <FamilyGreeting />
      </header>

      {/* Ohne Profil zuerst die Einladung zum Anlegen */}
      <WelcomeCard />

      <NextWeekCard />

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
              <span className="text-base opacity-80">{area.subtitle}</span>
            </span>
          </Link>
        ))}
      </nav>

      <HouseholdRow />
    </main>
  );
}
