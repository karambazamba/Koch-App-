import { BookOpen, CalendarDays, ShoppingCart } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { FamilyGreeting, HouseholdRow, WelcomeCard } from "@/components/HouseholdCard";
import { LeftoversRow } from "@/components/home/LeftoversRow";
import { RatingCard } from "@/components/home/RatingCard";
import { TodayCard, WeekSubtitle } from "@/components/home/TodayCard";
import { CookbookSubtitle, ShoppingSubtitle } from "@/components/home/TileSubtitles";
import { ListRow } from "@/components/ui/ListRow";
import { CARD_LIST, FAB_CLEARANCE } from "@/components/ui/styles";
import { NextWeekCard } from "@/components/week/NextWeekCard";

// Untertitel sind teils dynamisch (Client-Komponenten), daher als Element.
const AREAS = [
  { href: "/wochenplan", title: "Wochenplan", subtitle: <WeekSubtitle />, icon: CalendarDays },
  { href: "/einkaufsliste", title: "Einkaufsliste", subtitle: <ShoppingSubtitle />, icon: ShoppingCart },
  { href: "/kochbuch", title: "Unser Kochbuch", subtitle: <CookbookSubtitle />, icon: BookOpen },
];

export default function Home() {
  return (
    <main className={`mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 ${FAB_CLEARANCE} pt-[calc(env(safe-area-inset-top)+1.5rem)]`}>
      <header className="mb-2 flex flex-col gap-1.5">
        {/* Icon + Schriftzug als gemeinsames Logo */}
        <h1>
          <AppLogo />
        </h1>
        <FamilyGreeting />
      </header>

      {/* Ohne Profil zuerst die Einladung zum Anlegen */}
      <WelcomeCard />

      {/* Nach dem Kochen: "Wie war …?" */}
      <RatingCard />

      <TodayCard />

      <NextWeekCard />

      <nav aria-label="Bereiche" className={CARD_LIST}>
        {AREAS.slice(0, 1).map((area) => (
          <ListRow key={area.href} href={area.href} title={area.title} subtitle={area.subtitle} icon={area.icon} />
        ))}
        {/* Öffnet den Küchenhelfer im Reste-Modus */}
        <LeftoversRow />
        {AREAS.slice(1).map((area) => (
          <ListRow key={area.href} href={area.href} title={area.title} subtitle={area.subtitle} icon={area.icon} />
        ))}
      </nav>

      <HouseholdRow />
    </main>
  );
}
