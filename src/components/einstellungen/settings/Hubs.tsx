"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expectReplace } from "@/lib/core/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { Ban, CalendarRange, Heart, Home, ShoppingBasket, ShoppingCart, Sprout, ThumbsDown, UtensilsCrossed, Wheat, Salad } from "lucide-react";
import { usePersonRemoval } from "@/components/einstellungen/PersonRemoval";
import { sortedBases } from "@/lib/essen/bases";
import { sortedLikes } from "@/lib/essen/likes";
import { HEALTH_TIP_LEVELS, HOUSEHOLD_TYPES, LIMITS, MEAL_TIME_LABELS, personLabel, weekdayLunchHeadcount } from "@/lib/einstellungen/profile";
import { usePlanStyle } from "@/lib/essen/usePlanStyle";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { AddRow, DataSection, Group, PersonRow, Row, SettingsPage } from "@/components/einstellungen/settings/SettingsParts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { clearProfile } from "@/lib/einstellungen/profileStore";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { clearWelcome } from "@/lib/einstellungen/welcomeStore";

/** "Unsere Familie" bzw. "Mein Haushalt" / "Unser Haushalt" */
export function householdTitle(profile: { householdType: string } | null | undefined): string {
  if (!profile || profile.householdType === "familie") return "Unsere Familie";
  return profile.householdType === "single" ? "Mein Haushalt" : "Unser Haushalt";
}

/** /profil/essen: Veggie-Tage, mag / mag nicht und was sonst zum Essen gehört */
export function FoodHubView() {
  const planning = usePlanStyle()?.planning ?? true;
  const [more, setMore] = useState(false);
  return (
    <SettingsPage title="Essen & Vorlieben" question="Was esst ihr gern – und was nicht?">
      {(profile) => {
        const likes = sortedLikes(profile.likes).slice(0, 5).map((l) => l.name);
        const dislikers = profile.persons.filter((p) => p.dislikes.length || p.allergies.length);
        const r = profile.weekRules;
        const showAll = profile.display === "alles" || more;
        return (
          <>
            <Group title="Essen">
              {planning && (
                <Row href="/profil/standardwoche" icon={CalendarRange} title="Veggie-Tage & Woche" value={`${r.vegetarianDays}× Veggie`}>
                  {r.meatDays}× Fleisch · {r.fishDays}× Fisch{r.cheatDay ? " · Cheat Day" : ""}
                </Row>
              )}
              <Row href="/profil/das-moegt-ihr" icon={Salad} title="Das mögt ihr" value={profile.likes.length ? String(profile.likes.length) : undefined}>
                {likes.length ? likes.join(", ") : "Lerne ich beim Kochen – oder sag’s mir"}
              </Row>
              <Row href="/profil/familie" icon={ThumbsDown} title="Mag nicht & Allergien">
                {dislikers.length
                  ? dislikers.map((p) => `${personLabel(p, profile.persons)}: ${[...p.allergies, ...p.dislikes].slice(0, 2).join(", ")}`).join(" · ")
                  : "Steht bei jeder Person"}
              </Row>
              <Row href="/profil/lieblingsgerichte" icon={Heart} title="Lieblingsgerichte" value={profile.favoriteDishes.length ? String(profile.favoriteDishes.length) : undefined}>
                {profile.favoriteDishes.length ? profile.favoriteDishes.slice(0, 3).join(", ") : "Noch keine eingetragen"}
              </Row>
              {showAll && (
                <>
                  <Row href="/profil/basen" icon={Wheat} title="Lieblings-Basen">
                    {sortedBases(profile.bases).filter((b) => profile.bases[b.id] > 0).slice(0, 3).map((b) => b.label).join(", ") || "Lerne ich beim Kochen"}
                  </Row>
                  <Row href="/profil/nie-wieder" icon={Ban} title="Nie wieder" value={profile.neverAgain.length ? String(profile.neverAgain.length) : undefined}>
                    {profile.neverAgain.length ? profile.neverAgain.map((e) => e.title).slice(0, 3).join(", ") : "Bisher hat alles geschmeckt"}
                  </Row>
                  <Row href="/profil/gesundheit" icon={Sprout} title="Gesundheits-Tipps" value={HEALTH_TIP_LEVELS.find((l) => l.value === profile.healthTips)?.label}>
                    Ab und zu ein leckerer Tausch
                  </Row>
                </>
              )}
            </Group>
            {!showAll && (
              <button type="button" onClick={() => setMore(true)} className="self-start px-1 text-sm font-semibold text-accent-strong">
                Mehr anzeigen: Basen, Nie wieder, Gesundheit
              </button>
            )}
          </>
        );
      }}
    </SettingsPage>
  );
}

/** /profil/familie: Personen, Haushaltstyp, warm essen, Einkaufstag, Produkte */
export function FamilyHubView() {
  const planning = usePlanStyle()?.planning ?? true;
  const removal = usePersonRemoval();
  const profile = useProfile();
  return (
    <SettingsPage title={householdTitle(profile)} question="Wer isst mit?">
      {(profile) => {
        const lunch = weekdayLunchHeadcount(profile);
        const type = HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType);
        return (
          <>
            <Group title="Personen">
              {sortBy(profile.persons, ...PERSONS).map((person) => (
                <PersonRow key={person.id} person={person} persons={profile.persons} onRemove={() => removal.ask(person, profile.persons)} />
              ))}
              {profile.adults < LIMITS.adults.max && <AddRow href="/profil/person?neu=erwachsen" label="Erwachsene:r hinzufügen" />}
              {profile.kids < LIMITS.kids.max && <AddRow href="/profil/person?neu=kind" label="Kind hinzufügen" />}
            </Group>
            {profile.persons.length > 1 && <p className="-mt-2 px-1 text-sm text-muted">Nach links wischen zum Entfernen.</p>}
            <Group title="Haushalt">
              <Row href="/profil/haushalt" icon={Home} title="Für wen kochst du?" value={type?.label}>
                {profile.householdName.trim() || "Name des Haushalts (optional)"}
              </Row>
              <Row href="/profil/warme-mahlzeit" icon={UtensilsCrossed} title="Zusammen warm essen" value={MEAL_TIME_LABELS[profile.warmMeal.weekday]}>
                Mittags zu Hause: {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`} {lunch.max === 1 ? "Person" : "Personen"}
              </Row>
              {planning && (
                <Row href="/profil/einkaufstag" icon={ShoppingCart} title="Einkaufstag" value={profile.shoppingDay}>
                  Ab da plane ich immer eine Woche
                </Row>
              )}
              <Row href="/profil/produkte" icon={ShoppingBasket} title="Eure Produkte & Läden">
                Was bei euch auf der Einkaufsliste steht
              </Row>
            </Group>
            {removal.dialog}
          </>
        );
      }}
    </SettingsPage>
  );
}

/** /profil/daten: sichern, einspielen, Version, neu anfangen */
export function DataView() {
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();
  // Auch ohne Profil erreichbar: nach dem Neu-Hinzufügen zum Home-Bildschirm die Sicherung einspielen
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Daten & App" backHref="/profil" />
      <main className={`${PAGE_MAIN} gap-4`}>
        <DataSection onReset={() => setConfirmReset(true)} />
        {confirmReset && (
          <ConfirmDialog
            title="Alles löschen und neu beginnen?"
            text="Profil, Pläne und Listen auf diesem Handy sind dann weg. Vorher sichern geht oben."
            confirmLabel="Löschen"
            danger
            onCancel={() => setConfirmReset(false)}
            onConfirm={() => {
              setConfirmReset(false);
              clearProfile();
              clearWelcome();
              expectReplace();
              router.replace("/profil");
            }}
          />
        )}
      </main>
    </div>
  );
}
