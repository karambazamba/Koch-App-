"use client";

// AUSSEHEN in den Einstellungen (Tafel 51): oben die zwei Looks der
// Startseite als Mini-Vorschauen, darunter Hell · Dunkel · Automatisch und
// „Meine Farbe im Kalender“. Wirkt sofort. Die Begleitung und das App-Icon
// sind immer orange (seit v0.64 keine Farbwahl mehr für sie).

import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { CalendarColorChoice, LookChoice, ThemeChoice } from "@/components/einstellungen/aussehen/LookChoice";
import { helperName, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";

export function DarstellungGroup({ profile }: { profile: HouseholdProfile }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Aussehen">
      <h2 className="px-1 text-[15px] font-extrabold text-ink">Aussehen</h2>
      <LookChoice value={profile.look} onChange={(look) => saveProfile({ ...profile, look })} />
      <div className={`${CARD} flex flex-col gap-4 p-4`}>
        <ThemeChoice value={profile.theme} onChange={(theme) => saveProfile({ ...profile, theme, themeSet: true })} />
        <div className="flex flex-col gap-3">
          <h3 className={SECTION_TITLE}>Meine Farbe im Kalender</h3>
          <CalendarColorChoice name={helperName(profile)} value={profile.calendarColor} onChange={(calendarColor) => saveProfile({ ...profile, calendarColor })} />
        </div>
      </div>
    </section>
  );
}
