"use client";

// Seite „Spendentopf“: Region oben rechts (▾ → „Region wählen“). Mit Topf:
// Gold-Karte (Topf, „2026 BISHER“, Betrag, „100 % für Projekte in deiner
// Region“), Pate und Stiftung, „Wohin geht der Topf?“ mit Balken und Stimmen
// (eigene Wahl orange umrandet), Zeitplan, euer Beitrag. Ohne Topf: blasser
// Topf, „Bescheid geben“, „Ostholstein unterstützen“, „Pate werden“.

import { useState } from "react";
import { Bell, BookOpen, Check, ChevronDown, Flame, Heart, HeartHandshake, Mail, TreePine, Trophy, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, CARD_LIST, PAGE_MAIN, SECTION_TITLE, TILE } from "@/components/ui/styles";
import { SwitchRow, Row } from "@/components/einstellungen/settings/SettingsParts";
import { todayIso } from "@/lib/core/now";
import { useToday } from "@/lib/essen/weekPlan";
import { POT_TEXTS, activePot, euro, fallbackRegion, potPhase, potTotal, projectVotes, projectsFor, voteDaysLeft } from "@/lib/spendentopf/model";
import { PATE_MAIL, type PotProject } from "@/lib/spendentopf/regions";
import { changePot, useFamilyRegion, usePotState } from "@/lib/spendentopf/store";
import { buzz } from "@/components/heute/actions";
import { PotGraphic } from "@/components/spendentopf/PotGraphic";
import { RegionSheet } from "@/components/spendentopf/RegionSheet";
import { PledgeChoice } from "@/components/spendentopf/PledgeChoice";

const ICONS: Record<PotProject["icon"], LucideIcon> = { ball: Trophy, book: BookOpen, flame: Flame, heart: Heart, tree: TreePine };

const DAY = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "Europe/Berlin" });

export function SpendentopfView() {
  const state = usePotState();
  const { region } = useFamilyRegion();
  const today = useToday();
  const [choosing, setChoosing] = useState(false);
  if (!state || !today) return <div className="mx-auto w-full max-w-lg flex-1" />;
  const iso = todayIso();
  const year = Number(iso.slice(0, 4));
  const pot = activePot(region, state.support);
  const supporting = Boolean(pot && region && pot.id !== region.id);
  const chip = (
    <button type="button" onClick={() => setChoosing(true)} className="flex min-h-11 items-center gap-1 rounded-full bg-fill px-3.5 text-sm font-bold active:scale-95" aria-label={`Region: ${region?.name ?? "wählen"} – ändern`}>
      {region?.name ?? "Region wählen"}
      <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Spendentopf" backHref="/" action={chip} />
      <main className={`${PAGE_MAIN} gap-5`}>
        {region && !pot ? <NoPot regionName={region.name} regionId={region.id} interest={state.interest.includes(region.id)} /> : null}
        {!region && <p className="px-1 text-base text-muted">Wähl oben eure Region – dann siehst du euren Topf.</p>}
        {pot && (
          <>
            {supporting && <p className="px-1 text-sm text-muted">Ihr unterstützt {pot.name}, bis es in {region!.name} einen Topf gibt.</p>}
            <PotCard name={pot.name} year={year} total={potTotal(pot, state.pledge?.betrag ?? null)} example={Boolean(pot.beispiel)} />
            <ul className={CARD_LIST}>
              <li className="flex items-start gap-3 px-4 py-3">
                <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-karamba" strokeWidth={2} aria-hidden />
                <span className="flex flex-col">
                  <span className="text-base font-bold">
                    Pate: <span className={pot.pate_name === "KARAMBA" ? "text-karamba" : ""}>{pot.pate_name}</span>
                  </span>
                  <span className="text-sm text-muted">{pot.pate_text}</span>
                </span>
              </li>
              <li className="flex items-start gap-3 px-4 py-3">
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                <span className="flex flex-col">
                  <span className="text-base font-bold">Verwaltet von {pot.stiftung_name ?? "einer Stiftung vor Ort"}</span>
                  <span className="text-sm text-muted">Spendenquittung kommt von der Stiftung</span>
                </span>
              </li>
            </ul>
            <Projects potId={pot.id} year={year} today={iso} vote={state.votes[String(year)] ?? null} />
            <Schedule year={year} today={iso} />
            <section className="flex flex-col gap-2" aria-label="Euer Beitrag">
              <h2 className={`px-1 ${SECTION_TITLE}`}>{POT_TEXTS.askTitle}</h2>
              <PledgeChoice />
            </section>
          </>
        )}
        <p className="px-1 text-center text-sm text-muted">{POT_TEXTS.free}</p>
      </main>
      {choosing && (
        <RegionSheet
          current={region?.id ?? null}
          onPick={(r) => {
            changePot((s) => ({ ...s, region: r.id }));
            setChoosing(false);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}

/** Gold-Karte: Topf, „2026 BISHER“, Betrag, „100 % für Projekte in deiner Region“ */
function PotCard({ name, year, total, example }: { name: string; year: number; total: number; example: boolean }) {
  return (
    <section data-tone="spendentopf" className={`${TILE} flex items-center gap-4 p-5`} aria-label={`Spendentopf ${name}`}>
      <PotGraphic size={76} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-tile-accent">
          {year} bisher{example ? " · Beispiel" : ""}
        </span>
        <span className="text-[34px] font-extrabold leading-tight tabular-nums">{euro(total)}</span>
        <span className="text-sm font-semibold text-tile-accent">{POT_TEXTS.share}</span>
      </span>
    </section>
  );
}

function Projects({ potId, year, today, vote }: { potId: string; year: number; today: string; vote: string | null }) {
  const projects = projectsFor(potId, year);
  if (!projects.length) return null;
  const left = voteDaysLeft(today);
  const open = potPhase(today) === "abstimmen";
  return (
    <section className="flex flex-col gap-2" aria-label="Wohin geht der Topf?">
      <div className="flex items-baseline justify-between px-1">
        <h2 className={SECTION_TITLE}>Wohin geht der Topf?</h2>
        {left !== null && <span className="text-sm font-bold text-accent-strong">noch {left} {left === 1 ? "Tag" : "Tage"}</span>}
      </div>
      <ul className="flex flex-col gap-2">
        {projectVotes(projects, vote).map(({ project, votes, share, mine }) => {
          const Icon = ICONS[project.icon];
          return (
            <li key={project.id}>
              <button
                type="button"
                disabled={!open}
                aria-pressed={mine}
                onClick={() => {
                  if (!open) return;
                  buzz();
                  changePot((s) => ({ ...s, votes: { ...s.votes, [String(year)]: project.id } }));
                }}
                className={`${CARD} flex w-full flex-col gap-2 p-4 text-left disabled:opacity-100 ${mine ? "border-2 border-accent" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-bold leading-snug">{project.titel}</span>
                    <span className="text-sm text-muted">{project.kurztext}</span>
                  </span>
                  {mine && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent-strong">
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Gewählt
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs font-semibold text-muted">{votes} Stimmen</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!open && <p className="px-1 text-sm text-muted">Abgestimmt wird vom 15. bis 30. November – eine Stimme pro Familie.</p>}
    </section>
  );
}

function Schedule({ year, today }: { year: number; today: string }) {
  const phase = potPhase(today);
  const rows: { key: string; label: string; when: string }[] = [
    { key: "vorschlagen", label: "Projekte vorschlagen", when: "1.–14. November" },
    { key: "abstimmen", label: "Abstimmen", when: "15.–30. November" },
    { key: "uebergabe", label: "Übergabe", when: DAY.format(new Date(`${year}-12-12T12:00:00`)) },
  ];
  return (
    <section className="flex flex-col gap-2" aria-label="Zeitplan">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Zeitplan {year}</h2>
      <ul className={CARD_LIST}>
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 px-4 py-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${phase === r.key ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
            <span className={`flex-1 text-base ${phase === r.key ? "font-bold" : ""}`}>{r.label}</span>
            <span className="text-sm text-muted">{r.when}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Region ohne Topf: blasser Topf, drei Möglichkeiten, „trotzdem kostenlos“ */
function NoPot({ regionName, regionId, interest }: { regionName: string; regionId: string; interest: boolean }) {
  const fb = fallbackRegion();
  const subject = encodeURIComponent(`Pate werden – Spendentopf ${regionName}`);
  return (
    <section className="flex flex-col items-center gap-4" aria-label="Noch kein Spendentopf">
      <span className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-line-strong">
        <PotGraphic size={84} empty />
      </span>
      <p className="text-center text-lg font-extrabold leading-snug">In deiner Region gibt es noch keinen Spendentopf.</p>
      <p className="-mt-2 text-center text-sm text-muted">Ein Topf startet, sobald es vor Ort einen Paten und eine Stiftung gibt.</p>
      <ul className={`${CARD_LIST} w-full`}>
        <SwitchRow icon={Bell} title="Bescheid geben, wenn es einen gibt" hint={`Für ${regionName}`} checked={interest} onChange={(on) => changePot((s) => ({ ...s, interest: on ? [...new Set([...s.interest, regionId])] : s.interest.filter((x) => x !== regionId) }))} />
        <Row onClick={() => (buzz(), changePot((s) => ({ ...s, support: fb.id })))} icon={Heart} title={`${fb.name} unterstützen`}>
          Bis dahin gehen Beiträge dorthin, abstimmen dort erlaubt
        </Row>
        <Row href={`mailto:${PATE_MAIL}?subject=${subject}`} icon={Mail} title="Pate werden">
          Schreib uns – wir melden uns
        </Row>
      </ul>
      <p className="text-center text-sm text-muted">{POT_TEXTS.stillFree}</p>
    </section>
  );
}
