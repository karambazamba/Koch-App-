"use client";

// „Dein Tag“ (Tafel 67/68, Reihenfolge angepasst): öffnet sich, wenn man die
// Jetzt-Karte antippt (oder Mia fragt „Was steht heute an?“). Ein Fenster
// über `Sheet` (Runterwischen, ✕, Zurück): Kopf Datum klein + „Dein Tag“
// (30/800), dann TERMINE nach Uhrzeit mit „Jetzt · 14:40“-Linie (Vorbei grau
// mit ✓, nichts „verpasst“), ESSEN (Abendessen mit „Kochen“, Einkaufen mit
// „Liste“), neue PINNWAND-Nachrichten von heute, ganz unten AUFGABEN zum
// Abhaken („von gestern“ leise). Das Thema der Karte ist zart orange
// hervorgehoben, trägt ihren Hinweis und steht in Sicht. Nach 22 Uhr: „Morgen
// · Sa“ zum Umschalten; ein Abend-Thema über morgen (Tafel 98) öffnet gleich
// dort. Leerer Tag: „Heute ist nichts geplant. Genieß es.“

import { helperName } from "@/lib/einstellungen/profile";
import { miaDoneUndo, useMiaDone } from "@/lib/begleitung/miaDone";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Pin, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass, chipClass, ICON_BUTTON, SECTION_TITLE } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { ItemMenu } from "@/components/kalender/Items";
import { act, readOnlyDone } from "@/components/heute/actions";
import { useLeaving } from "@/components/heute/MiniCards";
import { clockLabel } from "@/lib/kalender/answers";
import { addDays } from "@/lib/core/now";
import { stockLine } from "@/lib/essen/dishIdeas";
import { setDone, tomorrowLabel, type DayItem } from "@/lib/kalender/model";
import { terminRows, topicSpot, zeigtMorgen, type DaySection } from "@/lib/heute/deinTag";
import { GanztagMarke, zeitSpalte } from "@/components/kalender/GanztagMarke";
import type { JetztTopic } from "@/lib/heute/jetztTopics";
import type { MiaFrage } from "@/components/heute/useMiaRoutinen";
import type { PinMessage } from "@/lib/pinnwand";
import dynamic from "next/dynamic";

const EntryForm = dynamic(() => import("@/components/kalender/EntryForm").then((m) => m.EntryForm), { ssr: false });

type DayDish = { name: string; clock: string | null; minutes: number | null; ready: boolean; missing: string[]; unsure?: string[]; cookHref: string | null };

type Props = {
  today: string;
  /** Datum oben klein („Mi, 21. Okt“) */
  dateLabel: string;
  minutes: number;
  termine: DayItem[];
  tomorrow: DayItem[];
  tasks: DayItem[];
  /** Aufgaben für morgen – abends still mit dem Mitgewanderten (kalender/mitwandern.ts) */
  tomorrowTasks?: DayItem[];
  dish: DayDish | null;
  shop: { shop: string; names: string[] } | null;
  pins: PinMessage[];
  topic: JetztTopic | null;
  /** Mias Fragen (Überschneidung, Packliste) – je genau 2 Knöpfe */
  fragen?: MiaFrage[];
  /** „Erledigt“ am hervorgehobenen Thema (nur wo die Karte früher „Erledigt“ hatte) */
  onTopicDone: (t: JetztTopic) => void;
  onClose: () => void;
};

const clock = (t: string) => clockLabel(t);
const HL = "rounded-field bg-accent-soft/70 ring-1 ring-accent/30";

/** Eine Frage von Mia mit genau zwei Knöpfen – ruhig, kein Rot */
function FrageCard({ frage }: { frage: MiaFrage }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const pick = (run: () => void) => () => (run(), setGone(true));
  return (
    <section className={`${HL} flex flex-col gap-2 px-3 py-3`} aria-label={frage.title} data-frage={frage.key}>
      <p className="text-[15px] font-bold leading-snug">{frage.title}</p>
      <p className="text-sm leading-snug text-muted">{frage.detail}</p>
      <div className="flex gap-2">
        <button type="button" onClick={pick(frage.yes.run)} className={buttonClass("primary", "sm")}>
          {frage.yes.label}
        </button>
        <button type="button" onClick={pick(frage.no.run)} className={buttonClass("secondary", "sm")}>
          {frage.no.label}
        </button>
      </div>
    </section>
  );
}

function Section({ id, title, children, highlight }: { id: DaySection; title: string; children: ReactNode; highlight?: boolean }) {
  return (
    <section className={`flex flex-col gap-1.5 ${highlight ? `${HL} -mx-2 px-2 py-2` : ""}`} aria-label={title} data-abschnitt={id}>
      <h3 className={`${SECTION_TITLE} uppercase tracking-wide text-muted`}>{title}</h3>
      {children}
    </section>
  );
}

export function DeinTag({ today, dateLabel, minutes, termine, tomorrow, tasks, tomorrowTasks = [], dish, shop, pins, topic, fragen = [], onTopicDone, onClose }: Props) {
  const night = minutes >= 22 * 60;
  // Abend-Thema über morgen (Tafel 98): gleich „Morgen · Mi“ zeigen, mit Umschalter
  const [showTomorrow, setShowTomorrow] = useState(() => zeigtMorgen(topic, addDays(today, 1)));
  const [tomorrowChip] = useState(showTomorrow);
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  const spot = topic ? topicSpot(topic) : null;
  // Abhaken wie überall: durchgestrichen, 1,5 s, weg, „Erledigt · Rückgängig“
  const { leaving, start } = useLeaving((t) => act((all, stamp) => setDone(all, t, true, stamp), t.title, { done: true }));
  const openTasks = (showTomorrow ? tomorrowTasks : tasks).filter((t) => !t.done || leaving === t.key);
  // Der Hinweis der Karte: meist Zeile 1 („Versichertenkarte einpacken?“), bei „gleich“ der Zusatz
  const hint = (topic?.kind === "gleich" ? topic.detail : topic?.title) || topic?.detail || "";
  const list = showTomorrow ? tomorrow : termine;
  const { rows, nowAt } = terminRows(list, showTomorrow ? -1 : minutes);
  // „Ganztägig“ ohne Umbruch: Spalte breiter, sobald ein ganztägiger Termin dabei ist
  const wide = rows.some((r) => !r.item.time);
  const spalte = zeitSpalte(wide, "gross");
  const body = useRef<HTMLDivElement>(null);
  // Das Thema der Karte in Sicht bringen
  useEffect(() => {
    if (!spot) return;
    const el = body.current?.querySelector(spot.key ? `[data-key="${CSS.escape(spot.key)}"]` : `[data-abschnitt="${spot.section}"]`) ?? body.current?.querySelector(`[data-abschnitt="${spot.section}"]`);
    el?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);
  const empty = !termine.length && !dish && !shop && !openTasks.length && !pins.length;
  const marked = (key: string) => Boolean(spot && spot.key && key === spot.key);
  const doneButton = topic && ["vorbereiten", "packliste", "geburtstag", "erinnerung", "jahrestag", "morgenwetter", "frueh", "vorlauf"].includes(topic.kind);
  const topicHint =
    hint ? (
      <span className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[13px] font-semibold text-accent-strong">{hint}</span>
        {doneButton && (
          <button type="button" onClick={() => (onTopicDone(topic!), onClose())} className={`${buttonClass("soft", "sm")} shrink-0`}>
            Erledigt
          </button>
        )}
      </span>
    ) : null;

  return (
    <Sheet
      title="Dein Tag"
      onClose={onClose}
      tall
      header={
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-muted">{dateLabel}</p>
            <h2 className="text-[30px] font-extrabold leading-tight tracking-tight">Dein Tag</h2>
          </div>
          <div className="flex items-center gap-2">
            {(night || tomorrowChip) && (
              <button type="button" onClick={() => setShowTomorrow((v) => !v)} aria-pressed={showTomorrow} className={chipClass(showTomorrow)}>
                {tomorrowLabel(addDays(today, 1))}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      }
    >
      <div ref={body} className="flex flex-col gap-5 pb-6">
        {!showTomorrow && <MiaDoneRow today={today} onClose={onClose} />}
        {!showTomorrow && fragen.map((f) => <FrageCard key={f.key} frage={f} />)}
        {empty && !showTomorrow ? (
          <p className="py-10 text-center text-[17px] font-semibold text-muted">Heute ist nichts geplant. Genieß es.</p>
        ) : (
          <>
            <Section id="termine" title="Termine" highlight={spot?.section === "termine" && !rows.some((r) => marked(r.item.key))}>
              {!rows.length && <p className="text-[15px] text-muted">{showTomorrow ? "Morgen ist frei." : "Heute keine Termine."}</p>}
              <ol className="flex flex-col">
                {rows.map((r, n) => (
                  <li key={r.item.key} data-key={r.item.key}>
                    {n === nowAt && !showTomorrow && <NowLine minutes={minutes} />}
                    <div className={marked(r.item.key) ? `${HL} pb-2` : ""}>
                    <button type="button" onClick={() => setMenu(r.item)} className="flex min-h-12 w-full flex-col justify-center px-1 text-left">
                      <span className={`flex items-center gap-3 ${r.past ? "text-muted" : ""}`}>
                        <span className={`${spalte} shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums ${r.past ? "" : r.item.room === "arbeit" ? "text-work" : "text-accent-strong"}`}>{r.item.time ? clock(r.item.time) : <GanztagMarke title={r.item.title} label={r.item.label} />}</span>
                        <span className={`min-w-0 flex-1 truncate text-base font-semibold ${r.past ? "line-through decoration-1" : ""}`}>{r.item.title}</span>
                        {r.past && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-label="vorbei" />}
                        {r.item.room === "arbeit" && !r.past && <span className="shrink-0 text-[12px] font-semibold text-work">Nur für dich</span>}
                      </span>
                      {r.item.entry.typ === "termin" && r.item.entry.data.place && <span className={`${wide ? "pl-[112px]" : "pl-[60px]"} text-[13px] text-muted`}>{r.item.entry.data.place}</span>}
                    </button>
                    {marked(r.item.key) && <div className={`${wide ? "pl-[116px]" : "pl-[64px]"} pr-1`}>{topicHint}</div>}
                    </div>
                  </li>
                ))}
                {nowAt === rows.length && rows.length > 0 && !showTomorrow && <NowLine minutes={minutes} />}
              </ol>
              {spot?.section === "termine" && !rows.some((r) => marked(r.item.key)) && topicHint}
            </Section>

            {!showTomorrow && (
              <>
                {(dish || shop) && (
                  <Section id="essen" title="Essen" highlight={spot?.section === "essen"}>
                    {dish && (
                      <div className="flex min-h-12 items-center gap-3 px-1">
                        <span className="w-12 shrink-0 text-[15px] font-bold tabular-nums text-accent-strong">{dish.clock ? clock(dish.clock) : ""}</span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-base font-semibold">{dish.name}</span>
                          <span className={`text-[13px] font-semibold ${dish.ready && !dish.unsure?.length ? "text-good" : "text-muted"}`}>{dish.ready ? `${stockLine({ needs: [], unsure: dish.unsure }).text}${dish.minutes ? ` · ${dish.minutes} Min` : ""}` : `auf die Liste: ${dish.missing.slice(0, 3).join(", ")}`}</span>
                        </span>
                        {dish.cookHref && (
                          <Link href={dish.cookHref} onClick={onClose} className={`${buttonClass("soft", "sm")} shrink-0`}>
                            Kochen
                          </Link>
                        )}
                      </div>
                    )}
                    {shop && (
                      <div className="flex min-h-12 items-center gap-3 px-1">
                        <span className="min-w-0 flex-1 truncate text-[15px]">
                          <span className="font-semibold">Einkaufen · {shop.shop}</span> – {shop.names.slice(0, 3).join(", ")}
                        </span>
                        <Link href="/einkaufsliste" onClick={onClose} className={`${buttonClass("soft", "sm")} shrink-0`}>
                          Liste
                        </Link>
                      </div>
                    )}
                    {spot?.section === "essen" && topicHint}
                  </Section>
                )}

                {pins.length > 0 && (
                  <Section id="pinnwand" title="Pinnwand" highlight={spot?.section === "pinnwand"}>
                    {pins.slice(0, 3).map((p) => (
                      <Link key={p.id} href={`/pinnwand?n=${p.id}`} onClick={onClose} data-key={p.id} className="flex min-h-11 items-center gap-2.5 px-1">
                        <PersonAvatar name={p.data.author} size={24} />
                        <span className="min-w-0 flex-1 truncate text-[15px]">{p.data.text}</span>
                        {p.data.pinned && <Pin className="h-[13px] w-[13px] shrink-0 text-accent" strokeWidth={2.25} aria-label="angeheftet" />}
                      </Link>
                    ))}
                  </Section>
                )}
              </>
            )}
            {openTasks.length > 0 && (
              <Section id="aufgaben" title="Aufgaben" highlight={spot?.section === "aufgaben" && !openTasks.some((t) => marked(t.entry.id) || marked(t.key))}>
                <ul className="flex flex-col">
                  {openTasks.map((t) => {
                    const checked = leaving === t.key;
                    return (
                    <li key={t.key} data-key={t.key} className={`flex min-h-12 items-center gap-3 px-1 ${marked(t.key) || marked(t.entry.id) ? HL : ""}`}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`${t.title} erledigt`}
                        onClick={() => readOnlyDone(t) || start(t)}
                        className="-ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${checked ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>{checked && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}</span>
                      </button>
                      <button type="button" onClick={() => setMenu(t)} className="flex min-w-0 flex-1 flex-col text-left">
                        <span className={`line-clamp-2 break-words text-base font-semibold ${checked ? "text-muted line-through" : ""}`}>{t.title}</span>
                        {t.time && <span className="text-[13px] text-muted">{clock(t.time)}</span>}
                      </button>
                    </li>
                    );
                  })}
                </ul>
                {spot?.section === "aufgaben" && topicHint}
              </Section>
            )}
          </>
        )}
      </div>
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
    </Sheet>
  );
}

function NowLine({ minutes }: { minutes: number }) {
  const t = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <span className="my-1 flex items-center gap-2" role="separator" aria-label={`Jetzt ${t}`}>
      <span className="text-[12px] font-extrabold text-accent-strong">Jetzt · {t}</span>
      <span className="h-px flex-1 bg-accent" />
    </span>
  );
}

/** „Mia hat schon …“: was Mia heute still erledigt hat – antippbar, mit „Rückgängig“; mehr als 2 → „Ansehen“ */
function MiaDoneRow({ today, onClose }: { today: string; onClose: () => void }) {
  const items = useMiaDone(today);
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(-2);
  return (
    <section className="flex flex-col gap-1 rounded-field bg-accent-soft/50 px-3 py-2" aria-label={`${helperName(null)} hat schon`}>
      <span className="text-[13px] font-bold text-accent-strong">{helperName(null)} hat schon …</span>
      <ul className="flex flex-col">
        {shown.map((i) => {
          const undo = miaDoneUndo(i.id);
          return (
            <li key={i.id} className="flex min-h-11 items-center gap-2">
              {i.href ? (
                <Link href={i.href} onClick={onClose} className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {i.text}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{i.text}</span>
              )}
              {undo && (
                <button type="button" onClick={undo} className="hit shrink-0 text-[13px] font-bold text-accent-strong">
                  Rückgängig
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > 2 && !all && (
        <button type="button" onClick={() => setAll(true)} className="hit self-start text-[13px] font-bold text-accent-strong">
          Ansehen
        </button>
      )}
    </section>
  );
}
