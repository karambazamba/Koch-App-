import { BookOpen, CalendarDays, Carrot, ShoppingCart } from "lucide-react";
import { FamilyGreeting, HouseholdRow, WelcomeCard } from "@/components/HouseholdCard";
import { TodayCard, WeekSubtitle } from "@/components/home/TodayCard";
import { CookbookSubtitle, ShoppingSubtitle } from "@/components/home/TileSubtitles";
import { ListRow } from "@/components/ui/ListRow";
import { CARD_LIST } from "@/components/ui/styles";
import { NextWeekCard } from "@/components/week/NextWeekCard";
import { APP_NAME } from "@/lib/app";

// Untertitel sind teils dynamisch (Client-Komponenten), daher als Element.
const AREAS = [
  { href: "/wochenplan", title: "Wochenplan", subtitle: <WeekSubtitle />, icon: CalendarDays },
  { href: "/schnellkueche", title: "Was ist noch da?", subtitle: "Sag, was übrig ist – wir zaubern was draus", icon: Carrot },
  { href: "/einkaufsliste", title: "Einkaufsliste", subtitle: <ShoppingSubtitle />, icon: ShoppingCart },
  { href: "/kochbuch", title: "Unser Kochbuch", subtitle: <CookbookSubtitle />, icon: BookOpen },
];

export default function Home() {
  return (
    <main className="safe-bottom mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <header className="mb-2">
        {/* App-Name als Logo-Schriftzug */}
        <h1 className="text-4xl font-black tracking-tight text-accent">{APP_NAME}</h1>
        <FamilyGreeting />
      </header>

      {/* Ohne Profil zuerst die Einladung zum Anlegen */}
      <WelcomeCard />

      <TodayCard />

      <NextWeekCard />

      <nav aria-label="Bereiche" className={CARD_LIST}>
        {AREAS.map((area) => (
          <ListRow key={area.href} href={area.href} title={area.title} subtitle={area.subtitle} icon={area.icon} />
        ))}
      </nav>

      <HouseholdRow />
    </main>
  );
}
