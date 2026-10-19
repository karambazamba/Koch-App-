"use client";

import { BookOpen, ChefHat, Database, LayoutList, MessageCircle, Mic, Palette, Volume2, Refrigerator, Salad, Sun, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { APP_VERSION } from "@/lib/core/app";
import { useRecipes } from "@/lib/essen/cookbook";
import { sortedLikes } from "@/lib/essen/likes";
import { usePantry } from "@/lib/essen/pantry";
import {
  APP_THEMES,
  DISPLAY_MODES,
  HELPER_MODES,
  HOUSEHOLD_TYPES,
  PLAN_STYLES,
  WEEKEND_STYLES,
  helperName,
  type HouseholdProfile,
} from "@/lib/einstellungen/profile";
import { usePlanStyle } from "@/lib/essen/usePlanStyle";
import { setLegacyFeatures, useLegacyFeatures } from "@/lib/core/features";
import { READ_MODES, useSpeechSettings } from "@/lib/lotte/speech";
import { Group, Row } from "./settings/SettingsParts";
import { householdTitle } from "./settings/Hubs";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Einstellungen – nach Häufigkeit sortiert: Häufiges oben (Kochen, Küche,
 * Lotte, Aussehen), Einmaliges unten (Familie, Daten & App, grau). Jede Zeile
 * zeigt rechts den aktuellen Wert; die Unterseiten wirken sofort.
 */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const recipes = useRecipes();
  const pantry = usePantry();
  // "Ich koche spontan": keine Planungs-Einstellungen (Daten bleiben gespeichert)
  const planning = usePlanStyle()?.planning ?? true;
  const likes = sortedLikes(profile.likes).slice(0, 3).map((l) => l.name);
  const dislikes = [...new Set(profile.persons.flatMap((p) => p.dislikes))].slice(0, 3);
  const type = HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType);
  const name = helperName(profile);
  const recipeCount = recipes ? Object.keys(recipes).length : null;
  const legacy = useLegacyFeatures();
  const speech = useSpeechSettings();

  // Neustart: schlank – nur Lotte, Ansicht, Familie, Daten & App
  if (!legacy) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Einstellungen" />
        <main className={`${PAGE_MAIN} gap-6`}>
          <Group title={name}>
            <Row href="/profil/kuechenhelfer" icon={Mic} title="Name & Stimme" value={name}>
              Wie {name} heißt und klingt
            </Row>
            <Row href="/profil/vorlesen" icon={Volume2} title="Vorlesen" value={READ_MODES.find((m) => m.value === speech.mode)?.short}>
              Antworten laut vorlesen
            </Row>
          </Group>
          <Group title="Aussehen">
            <Row href="/profil/ansicht" icon={Palette} title="Ansicht" value={APP_THEMES.find((t) => t.value === profile.theme)?.label}>
              Farben der App
            </Row>
          </Group>
          <Group title="Einmal eingerichtet" quiet>
            <Row href="/profil/familie" icon={Users} title={householdTitle(profile)} tone="neutral">
              {count(profile.persons.length, "Person", "Personen")} · {type?.label}
            </Row>
            <Row href="/profil/daten" icon={Database} title="Daten & App" tone="neutral" value={APP_VERSION}>
              Sichern, einspielen, neu anfangen
            </Row>
          </Group>
          {legacy !== undefined && <LegacySwitch on={false} />}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einstellungen" />

      <main className={`${PAGE_MAIN} gap-6`}>
        <Group title="Kochen">
          <Row href="/profil/kochstil" icon={ChefHat} title="Kochstil" value={PLAN_STYLES.find((p) => p.value === profile.planStyle)?.label}>
            Mit Plan oder spontan – und wie ihr kocht
          </Row>
          <Row href="/profil/essen" icon={Salad} title="Essen & Vorlieben" value={planning ? `${profile.weekRules.vegetarianDays}× Veggie` : undefined}>
            {likes.length ? `Mögt ihr: ${likes.join(", ")}` : dislikes.length ? `Mag nicht: ${dislikes.join(", ")}` : "Veggie-Tage, mag und mag nicht"}
          </Row>
          {planning && (
            <Row href="/profil/wochenende" icon={Sun} title="Wochenende" value={WEEKEND_STYLES.find((w) => w.value === profile.weekendStyle)?.label}>
              Wie viel ich am Wochenende plane
            </Row>
          )}
        </Group>

        <Group title="Unsere Küche">
          <Row href="/kochbuch" icon={BookOpen} title="Unsere Rezepte" value={recipeCount === null ? undefined : String(recipeCount)}>
            Alle Rezepte, neue anlegen
          </Row>
          <Row href="/vorrat" icon={Refrigerator} title="Vorrat" value={pantry ? String(pantry.length) : undefined}>
            Kühlschrank, Tiefkühler, Vorratsschrank
          </Row>
        </Group>

        <Group title={name}>
          <Row href="/profil/lotte" icon={MessageCircle} title={`Wie oft meldet sich ${name}?`} value={HELPER_MODES.find((m) => m.value === profile.helperMode)?.label}>
            Modus, Tipps, Vorlesen, Name
          </Row>
        </Group>

        <Group title="Aussehen">
          <Row href="/profil/ansicht" icon={Palette} title="Ansicht" value={APP_THEMES.find((t) => t.value === profile.theme)?.label}>
            Farben der App
          </Row>
          <Row href="/profil/darstellung" icon={LayoutList} title="Darstellung" value={DISPLAY_MODES.find((d) => d.value === profile.display)?.label}>
            Wie viel die App zeigt
          </Row>
        </Group>

        <Group title="Einmal eingerichtet" quiet>
          <Row href="/profil/familie" icon={Users} title={householdTitle(profile)} tone="neutral">
            {count(profile.persons.length, "Person", "Personen")} · {type?.label}
          </Row>
          <Row href="/profil/daten" icon={Database} title="Daten & App" tone="neutral" value={APP_VERSION}>
            Sichern, einspielen, neu anfangen
          </Row>
        </Group>
        <LegacySwitch on />
      </main>
    </div>
  );
}

/** Ganz unten, unauffällig: alles Alte wieder einblenden (Daten bleiben immer erhalten) */
function LegacySwitch({ on }: { on: boolean }) {
  return (
    // Schalter links – rechts unten liegt Lottes Knopf
    <label className="mt-2 flex items-center gap-3 self-start px-1 text-sm text-muted">
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => setLegacyFeatures(e.target.checked)}
        className="h-5 w-5 accent-accent"
      />
      <span>Alte Funktionen anzeigen (Test)</span>
    </label>
  );
}
