"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  Refrigerator,
  ChefHat,
  Lightbulb,
  CalendarRange,
  Heart,
  Home,
  Plus,
  RefreshCw,
  School,
  ShoppingCart,
  UtensilsCrossed,
  type LucideIcon,
  Sparkles,
  Ban,
  Palmtree,
  Salad,
  Sun,
  ShoppingBasket,
  Sprout,
  Wheat,
  Gauge,
  Palette,
  LayoutList,
  Download,
  Upload,
  Info,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconBadge } from "@/components/ui/IconBadge";
import { Segmented } from "@/components/ui/Segmented";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { usePersonRemoval } from "@/components/profile/PersonRemoval";
import { APP_VERSION } from "@/lib/app";
import { backupFileName, createBackup, parseBackup, restoreBackup, type Backup } from "@/lib/backup";
import { showToast } from "@/lib/toast";
import { sortedLikes } from "@/lib/likes";
import { sortedBases } from "@/lib/bases";
import { PERSON_ICONS } from "@/components/form/NameField";
import { PageHeader } from "@/components/PageHeader";
import { ListRow } from "@/components/ui/ListRow";
import { CARD_LIST, PAGE_MAIN, SECTION_TITLE, SUBTLE } from "@/components/ui/styles";
import { lunchSummary } from "@/components/profile/editors";
import {
  LIMITS,
  HOUSEHOLD_TYPES,
  wishDayActive,
  clearProfile,
  MEAL_TIME_LABELS,
  personLabel,
  personRoleLabel,
  planningWeekLabel,
  weekdayLunchHeadcount,
  type HouseholdProfile,
  type Person,
  helperName,
  HEALTH_TIP_LEVELS,
  TIP_LEVELS,
  WEEKEND_STYLES,
  APP_THEMES,
  HELPER_MODES,
  DISPLAY_MODES,
  saveProfile,
  PLAN_STYLES,
} from "@/lib/profile";
import { usePlanStyle } from "@/lib/usePlanStyle";

const LUNCH_ICONS: Record<"zuhause" | "auswaerts" | "manchmal", LucideIcon> = {
  zuhause: Home,
  auswaerts: Briefcase,
  manchmal: RefreshCw,
};

/** "Unsere Familie" bzw. "Mein Haushalt" / "Unser Haushalt" */
function householdTitle(profile: HouseholdProfile): string {
  if (profile.householdType === "familie") return "Unsere Familie";
  return profile.householdType === "single" ? "Mein Haushalt" : "Unser Haushalt";
}

const THEME_LABEL = Object.fromEntries(APP_THEMES.map((t) => [t.value, t.label]));

/**
 * Einstellungen in sechs Gruppen: Familie, Lotte, Ansicht & Darstellung,
 * Essgewohnheiten & Küchenstil, Küche, Daten & App. Jede Zeile öffnet die
 * passende Bearbeiten-Ansicht; Schalter wirken sofort. "Einfach" blendet
 * seltene Einstellungen hinter "Mehr anzeigen" aus.
 */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const { persons, weekRules } = profile;
  const lunch = weekdayLunchHeadcount(profile);
  const simple = profile.display === "einfach";
  const [more, setMore] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const removal = usePersonRemoval();
  const set = (changes: Partial<HouseholdProfile>) => saveProfile({ ...profile, ...changes });
  const type = HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType);
  const showAll = !simple || more;
  // "Ich koche spontan": keine Planungs-Einstellungen (Daten bleiben gespeichert)
  const planning = usePlanStyle()?.planning ?? true;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einstellungen" />

      <main className={`${PAGE_MAIN} gap-8`}>
        <Section title={householdTitle(profile)} hint="Wer mitisst – danach richte ich Mengen und Ideen.">
          <List>
            {persons.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                persons={persons}
                onRemove={() => removal.ask(person, persons)}
              />
            ))}
            {profile.adults < LIMITS.adults.max && (
              <AddRow href="/profil/person?neu=erwachsen" label="Erwachsene:r hinzufügen" />
            )}
            {profile.kids < LIMITS.kids.max && (
              <AddRow href="/profil/person?neu=kind" label="Kind hinzufügen" />
            )}
            <Row href="/profil/haushalt" icon={Home} title="Für wen kochst du?">
              <span>
                {type?.emoji} {type?.label}
                {profile.householdName.trim() ? ` · ${profile.householdName.trim()}` : ""}
              </span>
            </Row>
          </List>
          <p className={`flex items-center gap-1.5 px-1 ${SUBTLE}`} role="status">
            <Home className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span>
              Mittagessen Mo–Fr zu Hause:{" "}
              <span className="whitespace-nowrap font-semibold text-ink">
              {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`}{" "}
              {lunch.min === 1 && lunch.max === 1 ? "Person" : "Personen"}
              </span>
            </span>
          </p>
          {persons.length > 1 && <p className={`px-1 ${SUBTLE}`}>Nach links wischen zum Entfernen.</p>}
        </Section>

        <Section title={helperName(profile)} hint={`Wie ${helperName(profile)} heißt und wie oft ${profile.helper.voice === "maennlich" ? "er" : "sie"} sich meldet.`}>
          <List>
            <Row href="/profil/kuechenhelfer" icon={Sparkles} title="Name & Stimme">
              <span>
                <Nowrap>{helperName(profile)}</Nowrap>
                {" · "}
                <Nowrap>{profile.helper.voice === "maennlich" ? "männliche" : "weibliche"} Stimme</Nowrap>
              </span>
            </Row>
            <Row href="/profil/modus" icon={Gauge} title="Modus">
              <span>{HELPER_MODES.find((m) => m.value === profile.helperMode)?.label}</span>
            </Row>
            <Row href="/profil/tipps" icon={Lightbulb} title="Tipps">
              <span>{TIP_LEVELS.find((l) => l.value === profile.tips)?.label}</span>
            </Row>
            <SwitchRow
              icon={Sun}
              title="Wochenend-Ideen"
              hint="Freitags bis sonntags ab und zu eine Idee fürs Wochenende."
              checked={profile.weekendIdeas}
              onChange={(weekendIdeas) => set({ weekendIdeas })}
            />
            <Row href="/profil/pause" icon={Palmtree} title="Pause">
              <span>
                {profile.pause
                  ? profile.pause.until
                    ? `Pause bis ${new Date(`${profile.pause.until}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}`
                    : "Pause an"
                  : "Aus – im Urlaub halte ich mich raus"}
              </span>
            </Row>
            {showAll && (
              <Row href="/profil/gesundheit" icon={Sprout} title="Gesundheits-Tipps">
                <span>{HEALTH_TIP_LEVELS.find((l) => l.value === profile.healthTips)?.label}</span>
              </Row>
            )}
          </List>
        </Section>

        <Section title="Ansicht & Darstellung" hint="Wie die App aussieht und wie viel sie zeigt.">
          <List>
            <Row href="/profil/ansicht" icon={Palette} title="Ansicht">
              <span>{THEME_LABEL[profile.theme]}</span>
            </Row>
            <li className="flex flex-col gap-2 px-4 py-3">
              <span className="flex items-center gap-3">
                <IconBadge icon={LayoutList} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-bold leading-snug">Darstellung</span>
                  <span className="text-sm leading-snug text-muted">{DISPLAY_MODES.find((d) => d.value === profile.display)?.hint}</span>
                </span>
              </span>
              <Segmented
                label="Darstellung"
                value={profile.display}
                onChange={(display) => set({ display })}
                options={DISPLAY_MODES.map((d) => ({ value: d.value, label: d.label }))}
              />
            </li>
          </List>
        </Section>

        <Section title="Essgewohnheiten & Küchenstil" hint="Was ihr mögt und wie ihr kocht – danach plane ich.">
          <List>
            <Row href="/profil/kochstil" icon={ChefHat} title="Kochstil">
              <span>
                <Nowrap>{PLAN_STYLES.find((p) => p.value === profile.planStyle)?.label}</Nowrap>
                {" · "}
                <Nowrap>{profile.cookingStyle === "rezept" ? "Gern nach Rezept" : "Meist nach Gefühl"}</Nowrap>
                {" · "}
                <Nowrap>{profile.newPerWeek === 2 ? "2 neue pro Woche" : "1 neues pro Woche"}</Nowrap>
                {profile.kitchenMachine === "thermomix" && (
                  <>
                    {" · "}
                    <Nowrap>mit Thermomix</Nowrap>
                  </>
                )}
              </span>
            </Row>
            {planning && (
            <Row href="/profil/wochenende" icon={Sun} title="Wochenend-Stil">
              <span>
                {WEEKEND_STYLES.find((w) => w.value === profile.weekendStyle)?.emoji}{" "}
                {WEEKEND_STYLES.find((w) => w.value === profile.weekendStyle)?.label}
              </span>
            </Row>
            )}
            <Row href="/profil/das-moegt-ihr" icon={Salad} title="Das mögt ihr">
              <span className="line-clamp-2">
                {profile.likes.length > 0
                  ? sortedLikes(profile.likes)
                      .slice(0, 5)
                      .map((l) => l.name)
                      .join(", ")
                  : "Lerne ich beim Kochen – oder sag's mir"}
              </span>
            </Row>
            <Row href="/profil/lieblingsgerichte" icon={Heart} title="Lieblingsgerichte">
              <span className="line-clamp-2">
                {profile.favoriteDishes.length > 0
                  ? profile.favoriteDishes.join(", ")
                  : "Noch keine eingetragen"}
              </span>
            </Row>
            <Row href="/profil/warme-mahlzeit" icon={UtensilsCrossed} title="Zusammen warm essen">
              <span>
                <Nowrap>Mo–Fr {MEAL_TIME_LABELS[profile.warmMeal.weekday]}</Nowrap>
                {" · "}
                <Nowrap>Sa–So {MEAL_TIME_LABELS[profile.warmMeal.weekend]}</Nowrap>
              </span>
            </Row>
            {planning && (
              <>
            <Row href="/profil/einkaufstag" icon={ShoppingCart} title="Einkaufstag">
              <span>
                <Nowrap>{profile.shoppingDay}</Nowrap>
                {" · "}
                <Nowrap>Planungswoche {planningWeekLabel(profile.shoppingDay)}</Nowrap>
              </span>
            </Row>
            <Row href="/profil/standardwoche" icon={CalendarRange} title="Wochenvorlage">
              <span>
                <Nowrap>{weekRules.meatDays}× Fleisch</Nowrap>
                {" · "}
                <Nowrap>{weekRules.vegetarianDays}× vegetarisch</Nowrap>
                {" · "}
                <Nowrap>{weekRules.fishDays}× Fisch</Nowrap>
                {weekRules.cheatDay && (
                  <>
                    {" · "}
                    <Nowrap>Cheat Day {weekRules.cheatDayWeekday}</Nowrap>
                  </>
                )}
                {wishDayActive(profile) && (
                  <>
                    {" · "}
                    <Nowrap>🎉 Wunschtag: {profile.wishDay.weekday}</Nowrap>
                  </>
                )}
              </span>
            </Row>
              </>
            )}
            {showAll && (
              <>
                <Row href="/profil/basen" icon={Wheat} title="Eure Lieblings-Basen">
                  <span className="line-clamp-2">
                    {sortedBases(profile.bases).some((b) => profile.bases[b.id] > 0)
                      ? sortedBases(profile.bases)
                          .filter((b) => profile.bases[b.id] > 0)
                          .slice(0, 3)
                          .map((b) => b.label)
                          .join(", ")
                      : "Lerne ich beim Kochen"}
                  </span>
                </Row>
                <Row href="/profil/nie-wieder" icon={Ban} title="Nie wieder">
                  <span className="line-clamp-2">
                    {profile.neverAgain.length > 0
                      ? profile.neverAgain.map((e) => e.title).join(", ")
                      : "Noch nichts – bisher hat alles geschmeckt"}
                  </span>
                </Row>
                <Row href="/profil/produkte" icon={ShoppingBasket} title="Eure Produkte & Läden">
                  <span>Was bei euch auf der Einkaufsliste steht</span>
                </Row>
              </>
            )}
          </List>
          {simple && (
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="self-start px-1 text-sm font-semibold text-accent-strong"
            >
              {more ? "Weniger anzeigen" : "Mehr anzeigen: Basen, Nie wieder, Produkte, Gesundheit"}
            </button>
          )}
        </Section>

        <Section title="Küche" hint="Was da ist und was ihr gern kocht.">
          <List>
            <Row href="/vorrat" icon={Refrigerator} title="Vorrat">
              <span>Kühlschrank, Tiefkühler, Vorratsschrank</span>
            </Row>
            <Row href="/kochbuch" icon={BookOpen} title="Unsere Rezepte">
              <span>Alle Rezepte, neue anlegen</span>
            </Row>
          </List>
        </Section>

        <Section title="Daten & App" hint="Sichern, umziehen, neu anfangen.">
          <DataSection onReset={() => setConfirmReset(true)} />
        </Section>
      </main>
      {removal.dialog}
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
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}

/** Sichern, Einspielen, Versionsnummer, neu beginnen */
function DataSection({ onReset }: { onReset: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const exportData = async () => {
    const backup = createBackup();
    const name = backupFileName();
    const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
    const asFile = new File([blob], name, { type: "application/json" });
    try {
      // Auf dem Handy: Teilen-Menü (Dateien, Mail, Cloud …)
      if (navigator.canShare?.({ files: [asFile] })) {
        await navigator.share({ files: [asFile], title: "Sicherung „Was gibt's?“" });
        return;
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast({ text: "Gesichert ✓ Die Datei liegt in deinen Downloads." });
  };
  return (
    <>
      <List>
        <Row onClick={() => void exportData()} icon={Download} title="Daten sichern">
          <span>Alles als Datei – z. B. für ein neues Handy</span>
        </Row>
        <Row onClick={() => file.current?.click()} icon={Upload} title="Sicherung einspielen">
          <span>Eine gesicherte Datei wieder laden</span>
        </Row>
        <li className="flex min-h-14 items-center gap-3 px-4 py-3">
          <IconBadge icon={Info} />
          <span className="flex-1 text-base font-bold">Version</span>
          <span className="text-sm text-muted" data-testid="app-version">
            {APP_VERSION}
          </span>
        </li>
      </List>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Sicherung auswählen"
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          e.target.value = "";
          if (!chosen) return;
          const backup = parseBackup(await chosen.text());
          if (!backup) showToast({ text: "Das ist keine Sicherung von „Was gibt's?“." });
          else setIncoming(backup);
        }}
      />
      <button type="button" onClick={onReset} className="self-center px-4 py-3 text-sm font-semibold text-muted underline">
        Alles löschen und neu beginnen
      </button>
      {incoming && (
        <ConfirmDialog
          title="Sicherung einspielen?"
          text={`Stand vom ${incoming.exportedAt ? new Date(incoming.exportedAt).toLocaleDateString("de-DE") : "–"}. Was jetzt auf diesem Handy gespeichert ist, wird ersetzt.`}
          confirmLabel="Einspielen"
          onCancel={() => setIncoming(null)}
          onConfirm={() => {
            restoreBackup(incoming);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

/** Schalter-Zeile: wirkt sofort */
function SwitchRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <li>
      <label className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3">
        <IconBadge icon={icon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-bold leading-snug">{title}</span>
          <span className="text-sm leading-snug text-muted">{hint}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={title}
          className="h-6 w-6 shrink-0 accent-accent"
        />
      </label>
    </li>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="px-1">
        <h2 className={SECTION_TITLE}>{title}</h2>
        {hint && <p className={SUBTLE}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Weiße Karte mit Trennlinien zwischen den Zeilen */
function List({ children }: { children: ReactNode }) {
  return (
    <ul className={CARD_LIST}>
      {children}
    </ul>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

function Row({
  href,
  onClick,
  icon,
  title,
  children,
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <li>
      <ListRow href={href} onClick={onClick} icon={icon} title={title} subtitle={children} />
    </li>
  );
}

function PersonRow({ person, persons, onRemove }: { person: Person; persons: Person[]; onRemove: () => void }) {
  const label = personLabel(person, persons);
  return (
    <SwipeRow label={label} actions={[{ label: "Entfernen", icon: Trash2, tone: "danger", onClick: onRemove }]}>
      <ListRow
        href={`/profil/person?id=${encodeURIComponent(person.id)}`}
        icon={PERSON_ICONS[person.role]}
        title={label}
        subtitle={<PersonDetails person={person} persons={persons} />}
      />
    </SwipeRow>
  );
}

function PersonDetails({ person, persons }: { person: Person; persons: Person[] }) {
  const lunch = person.weekdayLunch ?? (person.role === "kind" ? "auswaerts" : "zuhause");
  const LunchIcon = lunch === "auswaerts" && person.role === "kind" ? School : LUNCH_ICONS[lunch];
  const named = Boolean(person.name.trim());
  return (
    <>
      {named && <span className="block">{personRoleLabel(person, persons)}</span>}
      <span className="mt-1 flex flex-wrap gap-1">
        {person.allergies.map((item) => (
          <Chip key={`a-${item}`} className="bg-red-50 text-red-700">
            {item}
          </Chip>
        ))}
        {person.dislikes.map((item) => (
          <Chip key={`d-${item}`} className="bg-stone-100 text-stone-700">
            {item}
          </Chip>
        ))}
        <Chip className="bg-stone-100 text-stone-700">
          <LunchIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden /> mittags {lunchSummary(person)}
        </Chip>
      </span>
    </>
  );
}

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function AddRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2 font-bold text-accent-strong transition active:bg-stone-50"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-accent/50 text-accent"
          aria-hidden
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        {label}
      </Link>
    </li>
  );
}
