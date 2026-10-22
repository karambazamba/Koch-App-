"use client";

// Bausteine der Einstellungen: Gruppen (kleine Großbuchstaben + weiße Karte),
// Zeilen mit aktuellem Wert rechts, Schalter, Personen, Daten & App.

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Briefcase, Download, Home, Info, Plus, RefreshCw, School, Trash2, Upload, type LucideIcon } from "lucide-react";
import { PERSON_ICONS } from "@/components/ui/NameField";
import { PageHeader } from "@/components/ui/PageHeader";
import { lunchSummary } from "@/components/einstellungen/Editors";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconBadge } from "@/components/ui/IconBadge";
import { ListRow } from "@/components/ui/ListRow";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { CARD, CARD_LIST, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { versionLabel } from "@/lib/core/app";
import { backupFileName, backupSummary, createBackup, parseBackup, restoreBackup, type Backup } from "@/lib/core/backup";
import { personLabel, personRoleLabel, type HouseholdProfile, type Person } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { showToast } from "@/lib/core/toast";
import { resetHints } from "@/lib/core/hints";
import { useAbos } from "@/lib/kalender/abo/store";
import { useAssistantStatus } from "@/lib/begleitung/client";
import { useProfile } from "@/lib/einstellungen/useProfile";

const LUNCH_ICONS: Record<"zuhause" | "auswaerts" | "manchmal", LucideIcon> = {
  zuhause: Home,
  auswaerts: Briefcase,
  manchmal: RefreshCw,
};

/** Gruppe: Überschrift klein in Großbuchstaben, darunter eine weiße Karte mit Zeilen */
export function Group({ title, quiet = false, children }: { title: string; quiet?: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title || undefined}>
      {title && <h2 className={`px-1 text-[15px] font-extrabold ${quiet ? "text-muted" : "text-ink"}`}>{title}</h2>}
      <ul className={CARD_LIST}>{children}</ul>
    </section>
  );
}

/** Zeile: Icon links, Titel + kurzer Untertitel, rechts der aktuelle Wert, dann › */
export function Row({
  href,
  onClick,
  icon,
  title,
  value,
  tone,
  children,
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  value?: ReactNode;
  tone?: "accent" | "neutral";
  children?: ReactNode;
}) {
  return (
    <li>
      <ListRow href={href} onClick={onClick} icon={icon} title={title} subtitle={children} value={value} tone={tone} />
    </li>
  );
}

/** Frage-Karten (eine Auswahl, wirkt sofort) */
export function ChoiceCards<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex min-h-14 flex-col justify-center rounded-field border px-4 py-3 text-left transition active:scale-[0.98] ${
            value === o.value ? "border-accent bg-accent-soft" : "border-line bg-surface"
          }`}
        >
          <span className={`text-base font-bold ${value === o.value ? "text-accent-strong" : "text-ink"}`}>{o.label}</span>
          {o.hint && <span className="text-sm text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** Unterseite der Einstellungen (wirkt sofort): Titel, klare Frage, Inhalt, Hinweis unten */
export function SettingsPage({
  title,
  question,
  note = true,
  children,
}: {
  title: string;
  /** Hinweis "Gilt sofort – nichts wird gelöscht." unten (nicht bei Daten & App) */
  note?: boolean;
  /** Klare Frage oben, z. B. "Wie kocht ihr meistens?" */
  question?: string;
  children: (profile: HouseholdProfile, set: (changes: Partial<HouseholdProfile>) => void) => ReactNode;
}) {
  const profile = useProfile();
  if (profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  if (profile === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title={title} backHref="/profil" />
        <main className={PAGE_MAIN}>
          <p className="text-base text-muted">Es gibt noch kein Haushaltsprofil.</p>
          <Link href="/profil" className={buttonClass("primary", "lg")}>
            Profil anlegen
          </Link>
        </main>
      </div>
    );
  }
  const set = (changes: Partial<HouseholdProfile>) => saveProfile({ ...profile, ...changes });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} backHref="/profil" />
      <main className={PAGE_MAIN}>
        {question && <p className="px-1 text-lg font-bold">{question}</p>}
        {children(profile, set)}
        {note && (
          <p className="px-1 text-sm text-muted" role="status">
            Gilt sofort – nichts wird gelöscht.
          </p>
        )}
      </main>
    </div>
  );
}

/** Sichern, Einspielen, Versionsnummer, neu beginnen */
export function DataSection({ onReset }: { onReset: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  // „Einmal-Hinweise zurücksetzen“ nur im Testmodus (Entwickler-Einstellungen gibt es nicht)
  const testMode = Boolean(useAssistantStatus(true)?.mock);
  // Geheime Kalender-Links nur auf ausdrücklichen Wunsch mitsichern
  const abos = useAbos();
  const [withLinks, setWithLinks] = useState(false);
  const exportData = async () => {
    const backup = createBackup(localStorage, withLinks && abos?.length ? ["wasgibts.kalenderabos"] : []);
    const name = backupFileName();
    const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
    const asFile = new File([blob], name, { type: "application/json" });
    try {
      // Auf dem Handy: Teilen-Menü (Dateien, Mail, Cloud …)
      if (navigator.canShare?.({ files: [asFile] })) {
        await navigator.share({ files: [asFile], title: "Sicherung „Was gibt’s?“" });
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
      <ul className={CARD_LIST}>
        <Row onClick={() => void exportData()} icon={Download} title="Daten sichern">
          <span>Alles als Datei – z. B. für ein neues Handy</span>
        </Row>
        {Boolean(abos?.length) && (
          <li>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-bold leading-snug">Kalender-Links mitsichern</span>
                <span className="text-sm leading-snug text-muted">Die Links sind geheim – nur mitnehmen, wenn die Datei sicher bleibt.</span>
              </span>
              <input type="checkbox" checked={withLinks} onChange={(e) => setWithLinks(e.target.checked)} className="h-6 w-6 shrink-0 accent-accent" />
            </label>
          </li>
        )}
        <Row onClick={() => file.current?.click()} icon={Upload} title="Daten wiederherstellen">
          <span>Eine gesicherte Datei wieder laden</span>
        </Row>
        <li className="flex min-h-14 items-center gap-3 px-4 py-3">
          <IconBadge icon={Info} />
          <span className="flex-1 text-base font-bold">Version</span>
          <span className="text-sm text-muted" data-testid="app-version">
            {versionLabel().replace(/^Version /, "")}
          </span>
        </li>
      </ul>
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
          if (!backup) showToast({ text: "Das ist keine Sicherung von „Was gibt’s?“." });
          else setIncoming(backup);
        }}
      />
      <button type="button" onClick={onReset} className="self-center px-4 py-3 text-sm font-semibold text-muted underline">
        Neu beginnen (Profil zurücksetzen)
      </button>
      {/* Zum Testen: Einmal-Tipps (z. B. „Neue Kacheln holen“) kommen beim nächsten Mal wieder */}
      {testMode && (
        <button
          type="button"
          onClick={() => {
            resetHints();
            showToast({ text: "Die Einmal-Hinweise kommen beim nächsten Mal wieder." });
          }}
          className="hit self-center px-4 py-2 text-sm font-semibold text-muted underline"
        >
          Einmal-Hinweise zurücksetzen
        </button>
      )}
      {incoming && (
        <ConfirmDialog
          title="Daten wiederherstellen?"
          text={`${backupSummary(incoming)} – Stand vom ${incoming.exportedAt ? new Date(incoming.exportedAt).toLocaleDateString("de-DE") : "–"}. Was jetzt auf diesem Handy gespeichert ist, wird ersetzt.`}
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
export function SwitchRow({
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

export function PersonRow({ person, persons, onRemove }: { person: Person; persons: Person[]; onRemove: () => void }) {
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
          <Chip key={`a-${item}`} className="bg-danger-soft text-danger">
            {item}
          </Chip>
        ))}
        {person.dislikes.map((item) => (
          <Chip key={`d-${item}`} className="bg-fill text-muted">
            {item}
          </Chip>
        ))}
        <Chip className="bg-fill text-muted">
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

export function AddRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2 font-bold text-accent-strong transition active:bg-background"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field border border-dashed border-accent/50 text-accent"
          aria-hidden
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        {label}
      </Link>
    </li>
  );
}
