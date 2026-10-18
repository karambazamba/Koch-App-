"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expectReplace } from "@/lib/navigation";
import { Ban, CalendarRange, Heart, Home, Palmtree, ShoppingBasket, ShoppingCart, Sparkles, Sprout, ThumbsDown, UtensilsCrossed, Wheat, Salad } from "lucide-react";
import { usePersonRemoval } from "@/components/profile/PersonRemoval";
import { sortedBases } from "@/lib/bases";
import { sortedLikes } from "@/lib/likes";
import {
  DISPLAY_MODES,
  HEALTH_TIP_LEVELS,
  HELPER_MODES,
  HOUSEHOLD_TYPES,
  LIMITS,
  MEAL_TIME_LABELS,
  TIP_LEVELS,
  helperName,
  personLabel,
  weekdayLunchHeadcount,
} from "@/lib/profile";
import { usePlanStyle } from "@/lib/usePlanStyle";
import { useProfile } from "@/lib/useProfile";
import { AddRow, ChoiceCards, DataSection, Group, PersonRow, Row, SettingsPage, SwitchRow } from "./SettingsParts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { clearProfile } from "@/lib/profile";
import { Sun, Volume2 } from "lucide-react";
import { READ_MODES, useSpeechSettings } from "@/lib/speech";

/** "Unsere Familie" bzw. "Mein Haushalt" / "Unser Haushalt" */
export function householdTitle(profile: { householdType: string } | null | undefined): string {
  if (!profile || profile.householdType === "familie") return "Unsere Familie";
  return profile.householdType === "single" ? "Mein Haushalt" : "Unser Haushalt";
}

/** /profil/lotte: Wie oft meldet sich Lotte? Modus, Tipps, Wochenend-Ideen, Name, Pause */
export function LotteHubView() {
  const title = helperName(useProfile());
  const reading = useSpeechSettings();
  return (
    <SettingsPage title={title}>
      {(profile, set) => {
        const name = helperName(profile);
        return (
          <>
            <p className="px-1 text-lg font-bold">Wie oft meldet sich {name}?</p>
            <ChoiceCards label="Modus" value={profile.helperMode} onChange={(helperMode) => set({ helperMode })} options={HELPER_MODES} />
            <p className="mt-2 px-1 text-lg font-bold">Küchen-Tipps auf der Startseite?</p>
            <ChoiceCards label="Tipps" value={profile.tips} onChange={(tips) => set({ tips })} options={TIP_LEVELS} />
            <Group title="Mehr">
              <Row href="/profil/vorlesen" icon={Volume2} title="Vorlesen" value={READ_MODES.find((m) => m.value === reading.mode)?.short}>
                Stimme und Tempo
              </Row>
              <SwitchRow
                icon={Sun}
                title="Wochenend-Ideen"
                hint="Freitags bis sonntags ab und zu eine Idee fürs Wochenende."
                checked={profile.weekendIdeas}
                onChange={(weekendIdeas) => set({ weekendIdeas })}
              />
              <Row href="/profil/kuechenhelfer" icon={Sparkles} title="Name & Stimme" value={name}>
                {profile.helper.voice === "maennlich" ? "Männliche Stimme" : "Weibliche Stimme"}
              </Row>
              <Row href="/profil/pause" icon={Palmtree} title="Pause" value={profile.pause ? "An" : "Aus"}>
                Im Urlaub halte ich mich raus
              </Row>
            </Group>
          </>
        );
      }}
    </SettingsPage>
  );
}

/** /profil/darstellung: Einfach oder alles zeigen */
export function DisplayView() {
  return (
    <SettingsPage title="Darstellung" question="Wie viel soll die App zeigen?">
      {(profile, set) => <ChoiceCards label="Darstellung" value={profile.display} onChange={(display) => set({ display })} options={DISPLAY_MODES} />}
    </SettingsPage>
  );
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
                {likes.length ? likes.join(", ") : "Lerne ich beim Kochen – oder sag's mir"}
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
              {profile.persons.map((person) => (
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
  return (
    <SettingsPage title="Daten & App" note={false}>
      {() => (
        <>
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
                expectReplace();
                router.replace("/profil");
              }}
            />
          )}
        </>
      )}
    </SettingsPage>
  );
}
