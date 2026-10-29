"use client";

import { RechtLinks } from "@/components/datenschutz/RechtstextView";
import { plural } from "@/lib/core/text";
import Link from "next/link";
import { useMailStyle } from "@/lib/begleitung/mailSettings";
import { Bell, Blocks, HandCoins, MapPin, BookOpen, CalendarDays, CalendarPlus, ChefHat, ChevronRight, Clock, CloudSun, Database, Dumbbell, Forward, LayoutGrid, Mail, Refrigerator, Salad, ShieldCheck, Wind } from "lucide-react";
import { ARTEN, useDurchatmen } from "@/lib/durchatmen/store";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION, versionLabel } from "@/lib/core/app";
import { sortedLikes } from "@/lib/essen/likes";
import { HOUSEHOLD_TYPES, PLAN_STYLES, helperName, helperTitle, personLabel, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { useFeature } from "@/lib/core/features";
import { FamilyConnectCard } from "@/components/konten/FamilyConnectCard";
import { usePlace } from "@/lib/wetter/client";
import { useHomeTiles } from "@/lib/core/homeLayout";
import { useJetzt } from "@/lib/heute/jetztStore";
import { useSport } from "@/lib/sport";
import { Group, Row } from "@/components/einstellungen/settings/SettingsParts";
import { notifyStatusLabel } from "@/lib/heute/mitteilungen/einstellungen";
import { useNotifyPermission } from "@/lib/heute/mitteilungen/geraet";
import { householdTitle } from "@/lib/einstellungen/profileHousehold";
import { DarstellungGroup } from "@/components/einstellungen/settings/BegleitungSettings";
import { useFamilyRegion } from "@/lib/spendentopf/store";
import { POT_TEXTS } from "@/lib/spendentopf/model";
import { PERSONS, sortBy } from "@/lib/core/sort";
import { useTipPlace, useTipSettings, useTipsOn } from "@/lib/tipps/client";

const count = plural;

/** Große Karte oben (Familie, Begleitung): Bild links, Name + Untertitel, › */
function HeadCard({ href, label, picture, title, subtitle }: { href: string; label: string; picture: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} aria-label={label} className={`${CARD} flex items-center gap-3 px-4 py-3.5 active:scale-[0.99]`}>
      {picture}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-extrabold">{title}</span>
        <span className="truncate text-sm text-muted">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2} aria-hidden />
    </Link>
  );
}

/**
 * Einstellungen: oben Familie und Begleitung als große Karten, dann die
 * Gruppen „Startseite“ und „Essen“, unten ohne Überschrift Darstellung,
 * Mails und Daten & App. Zeilen heißen wie ihre Seiten, keine Zähler.
 */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const likes = sortedLikes(profile.likes).slice(0, 3).map((l) => l.name);
  const type = HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType);
  const name = helperName(profile);
  const mailStyle = useMailStyle();
  const home = useHomeTiles();
  const place = usePlace();
  const unlockedRecipes = useFeature("rezepte");
  const unlockedPantry = useFeature("vorrat");
  const planOn = useFeature("wochenplan");
  const kochstilOn = useFeature("kochstil");
  const kalenderOn = useFeature("kalender");
  const mailsOn = useFeature("mails");
  const sportOn = useFeature("sport");
  const potOn = useFeature("spendentopf");
  const atemOn = useFeature("durchatmen");
  const atem = useDurchatmen();
  const jetzt = useJetzt();
  const notify = notifyStatusLabel(useNotifyPermission());
  const sport = useSport();
  const potRegion = useFamilyRegion().region;
  const tipsOn = useTipsOn();
  const tipPlace = useTipPlace();
  const tipSettings = useTipSettings();
  const essen = planOn || kochstilOn || unlockedRecipes || unlockedPantry;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einstellungen" />
      <main className={`${PAGE_MAIN} gap-6`}>
        <div className="flex flex-col gap-3">
          <FamilyConnectCard />
          <HeadCard
            href="/profil/familie"
            label={householdTitle(profile)}
            title={householdTitle(profile)}
            subtitle={`${count(profile.persons.length, "Person", "Personen")} · ${type?.label ?? ""}`}
            picture={
              <span className="flex -space-x-2" aria-hidden>
                {sortBy(profile.persons, ...PERSONS).slice(0, 3).map((p, i) => (
                  <span key={p.id ?? i} className="rounded-full ring-2 ring-surface">
                    <PersonAvatar name={personLabel(p, profile.persons)} size={36} />
                  </span>
                ))}
              </span>
            }
          />
          <HeadCard href="/profil/kuechenhelfer" label={`${name} – Begleitung`} title={name} subtitle={helperTitle(profile).replace(/^./, (c) => c.toUpperCase())} picture={<BegleitungAvatar size={44} />} />
        </div>

        <Group title="Startseite">
          <Row href="/profil/startseite" icon={LayoutGrid} title="Startseite bearbeiten">
            Kacheln hinzufügen, entfernen, sortieren, Größe
          </Row>
          <Row href="/profil/tagesablauf" icon={Clock} title="Tagesablauf" value={jetzt.on ? "Jetzt-Karte an" : "Jetzt-Karte aus"}>
            Jetzt-Karte, Feierabend, Arbeitstage
          </Row>
          <Row href="/profil/mitteilungen" icon={Bell} title="Mitteilungen" value={notify}>
            Erinnerungen, Pinnwand, Ruhezeit
          </Row>
          {home?.find((t) => t.id === "wetter")?.visible && (
            <Row href="/profil/wetter" icon={CloudSun} title="Wetter-Ort" value={place}>
              Für die Wetter-Kachel
            </Row>
          )}
          {sportOn && home?.find((t) => t.id === "sport")?.visible && (
            <Row href="/sport" icon={Dumbbell} title="Sport" value={sport ? (sport.goal === null ? "Ohne Ziel" : `${sport.goal}× pro Woche`) : undefined}>
              Wochenziel, Trainings, Packliste
            </Row>
          )}
          {atemOn && (
            <Row href="/profil/durchatmen" icon={Wind} title="Durchatmen" value={ARTEN.find((a) => a.value === (atem?.art ?? "stimme"))?.label}>
              Übungen, Anleitung, leises Angebot
            </Row>
          )}
          {tipsOn && (
            <Row href="/profil/regiontipps" icon={MapPin} title="Tipps aus der Region" value={`${tipPlace} + ${tipSettings.km} km`}>
              Ort, Umkreis, im Kalender zeigen
            </Row>
          )}
          {kalenderOn && (
            <Row href="/profil/kalender" icon={CalendarPlus} title="Kalender übernehmen">
              Termine aus Apple oder Google holen
            </Row>
          )}
          {mailsOn && (
            <Row href="/profil/mails-an-mia" icon={Forward} title={`Mails an ${name}`}>
              Weiterleiten, ich mache Vorschläge
            </Row>
          )}
          <Row href="/profil/bausteine" icon={Blocks} title="Mehr Funktionen">
            Was {name} noch kann
          </Row>
        </Group>

        {essen && (
          <Group title="Essen">
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
            {planOn && (
              <Row href="/profil/standardwoche" icon={CalendarDays} title="Feste Tage">
                Vorlage für den Wochenplan
              </Row>
            )}
            {unlockedRecipes && (
              <Row href="/kochbuch" icon={BookOpen} title="Unsere Rezepte">
                Was ihr gern kocht
              </Row>
            )}
            {unlockedPantry && (
              <Row href="/vorrat" icon={Refrigerator} title="Im Haus">
                Füllt sich von selbst beim Einkaufen
              </Row>
            )}
          </Group>
        )}

        <DarstellungGroup profile={profile} />
        <Group title="">
          {potOn && (
            <Row href="/spendentopf" icon={HandCoins} title="Spendentopf" value={potRegion?.name}>
              {POT_TEXTS.everyEuro}
            </Row>
          )}
          <Row href="/profil/mails" icon={Mail} title="Mails" value={mailStyle?.greeting}>
            Gruß und Signatur für deine Mails
          </Row>
          <Row href="/profil/deine-daten" icon={ShieldCheck} title="Deine Daten">
            Was gespeichert ist, wer es sieht, Einwilligungen
          </Row>
          <Row href="/profil/daten" icon={Database} title="Daten & App" value={APP_VERSION}>
            Sichern, einspielen, neu anfangen
          </Row>
        </Group>
        <section className="flex flex-col gap-1 px-1" aria-label="Über die App">
          <h2 className="text-[15px] font-extrabold text-ink">Über {APP_NAME}</h2>
          <p className="text-sm text-muted">{APP_DESCRIPTION}</p>
          <p className="text-sm text-muted">{POT_TEXTS.free}</p>
        </section>
        <p className="text-center text-sm text-muted" data-testid="version-stand">
          {versionLabel()}
        </p>
        <RechtLinks className="-mt-3" />
      </main>
    </div>
  );
}
