"use client";

import { useMailStyle } from "@/lib/lotte/mailSettings";
import { Blocks, BookOpen, Clock, CloudSun, Dumbbell, CalendarDays, ChefHat, Database, LayoutGrid, Mail, MessageCircle, Refrigerator, Salad, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PAGE_MAIN } from "@/components/ui/styles";
import { APP_VERSION, versionLabel } from "@/lib/core/app";
import { useRecipes } from "@/lib/essen/cookbook";
import { sortedLikes } from "@/lib/essen/likes";
import { usePantry } from "@/lib/essen/pantry";
import {
  HELPER_MODES,
  HOUSEHOLD_TYPES,
  PLAN_STYLES,
  helperName,
  type HouseholdProfile,
} from "@/lib/einstellungen/profile";
import { BAUSTEINE, useBausteine, useFeature } from "@/lib/core/features";
import { usePlace } from "@/lib/wetter/client";
import { useHomeTiles } from "@/lib/core/homeLayout";
import { HOME_MODES, useRoutine } from "@/lib/tagesablauf/settings";
import { useSport } from "@/lib/sport";
import { Group, Row } from "./settings/SettingsParts";
import { householdTitle } from "./settings/Hubs";
import { BegleitungGroup, DarstellungGroup } from "./settings/BegleitungSettings";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Einstellungen – ganz oben die Begleitung (Name, Art, Stimme, Farbe,
 * Vorlesen) und die Darstellung (Automatisch · Hell · Dunkel), dann nach
 * Häufigkeit sortiert, Einmaliges unten (Familie, Daten & App, grau). Jede Zeile
 * zeigt rechts den aktuellen Wert; die Unterseiten wirken sofort.
 */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const recipes = useRecipes();
  const pantry = usePantry();
  const likes = sortedLikes(profile.likes).slice(0, 3).map((l) => l.name);
  const type = HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType);
  const name = helperName(profile);
  const recipeCount = recipes ? Object.keys(recipes).length : null;
  const mailStyle = useMailStyle();
  const home = useHomeTiles();
  const place = usePlace();
  const bausteine = useBausteine();
  const unlockedRecipes = useFeature("rezepte");
  const unlockedPantry = useFeature("vorrat");
  const planOn = useFeature("wochenplan");
  const kochstilOn = useFeature("kochstil");
  const modiOn = useFeature("modi");
  const routine = useRoutine();
  const sport = useSport();

  // Schlank – Begleitung, Darstellung, Tagesablauf, Startseite & Bausteine, Mails, Familie, Daten & App
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einstellungen" />
      <main className={`${PAGE_MAIN} gap-6`}>
        <BegleitungGroup profile={profile} />
        <DarstellungGroup profile={profile} />
        <Group title="Tagesablauf">
          <Row href="/profil/tagesablauf" icon={Clock} title="Startseite & Tageszeiten" value={routine ? HOME_MODES.find((m) => m.value === routine.mode)?.label : undefined}>
            Mitdenkend oder immer gleich, Feierabend, Arbeitstage
          </Row>
        </Group>
        <Group title="Startseite & Bausteine">
          <Row href="/profil/startseite" icon={LayoutGrid} title="Startseite bearbeiten" value={home ? `${home.filter((t) => t.visible && t.id !== "post").length} Kacheln` : undefined}>
            Kacheln hinzufügen, entfernen, sortieren, Größe
          </Row>
          {home?.find((t) => t.id === "wetter")?.visible && (
            <Row href="/profil/wetter" icon={CloudSun} title="Wetter-Ort" value={place}>
              Für die Wetter-Kachel
            </Row>
          )}
          {home?.find((t) => t.id === "sport")?.visible && (
            <Row href="/sport" icon={Dumbbell} title="Sport" value={sport ? `${sport.goal}× pro Woche` : undefined}>
              Wochenziel, Trainings, Packliste
            </Row>
          )}
          <Row href="/profil/bausteine" icon={Blocks} title="Bausteine" value={bausteine ? `${BAUSTEINE.filter((b) => bausteine.includes(b.feature)).length} an` : undefined}>
            Was {name} noch kann
          </Row>
          {planOn && (
            <Row href="/profil/standardwoche" icon={CalendarDays} title="Standardwoche">
              Vorlage für den Wochenplan
            </Row>
          )}
          {kochstilOn && (
            <Row href="/profil/kochstil" icon={ChefHat} title="Kochstil" value={PLAN_STYLES.find((p) => p.value === profile.planStyle)?.label}>
              Plan oder spontan, nach Gefühl oder Rezept
            </Row>
          )}
          {kochstilOn && (
            <Row href="/profil/essen" icon={Salad} title="Essen & Vorlieben">
              {likes.length ? `Mögt ihr: ${likes.join(", ")}` : "Das mögt ihr, Nie wieder, Lieblingsgerichte"}
            </Row>
          )}
          {modiOn && (
            <Row href="/profil/lotte" icon={MessageCircle} title={`Wie oft meldet sich ${name}?`} value={HELPER_MODES.find((m) => m.value === profile.helperMode)?.label}>
              Von ganz locker bis dranbleiben
            </Row>
          )}
          {unlockedRecipes && (
            <Row href="/kochbuch" icon={BookOpen} title="Unsere Rezepte" value={recipeCount === null ? undefined : String(recipeCount)}>
              Was ihr gern kocht
            </Row>
          )}
          {unlockedPantry && (
            <Row href="/vorrat" icon={Refrigerator} title="Vorrat" value={pantry ? String(pantry.length) : undefined}>
              Kühlschrank, Tiefkühler, Vorratsschrank
            </Row>
          )}
        </Group>
        <Group title="Mails">
          <Row href="/profil/mails" icon={Mail} title="Mails" value={mailStyle?.greeting}>
            Gruß und Signatur für deine Mails
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
        <p className="text-center text-sm text-muted" data-testid="version-stand">
          {versionLabel()}
        </p>
      </main>
    </div>
  );
}
