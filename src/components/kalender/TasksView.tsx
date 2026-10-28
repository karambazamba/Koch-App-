"use client";

// Seite "Aufgaben" (/aufgaben), Tafel 103/104: alles ist heute, EINE weiße
// Liste – keine Abschnitte nach Raum oder Datum. Kopf „Aufgaben“, darunter
// leise „Heute · Mi 28. Okt“ (nach Feierabend „Heute Abend · Feierabend“).
// Reihenfolge dringend → neu → Erstellungszeit; Schilder nur „neu“ und
// „Arbeit“, abgegebene „von Lisa“. Chips „Alle · Familie · Arbeit“ nur, wenn
// es Arbeitsaufgaben gibt (gemerkt); nach Feierabend ruht die Arbeit
// („Arbeit · 5 für morgen ›“ blendet sie kurz ein). Unten leise „Geplant · 1 ›“
// (ab einem genannten Tag), eingeklappte Listen, „Abgegeben“ und „Erledigte
// anzeigen“. Logik in kalender/aufgaben.ts. Aufgaben sind persönlich (Tafel
// 52 B): nur meine und die mir gegebenen.

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { setDone, taskOverview, type DayItem } from "@/lib/kalender/model";
import { aufgabenAnsicht, aufgabenKopf, arbeitMorgenText, ausgeblendetText, geplantText, type AufgabenFilter } from "@/lib/kalender/aufgaben";
import { setAufgabenFilter, useAufgabenFilter } from "@/lib/kalender/aufgabenFilter";
import { useArbeitRuht } from "@/components/kalender/useArbeitRuht";
import { useEntries } from "@/lib/kalender/store";
import { useAboEntries } from "@/lib/kalender/abo/store";
import { useCachedAccount } from "@/lib/konten/cache";
import { isMyTask, memberName, taskRole } from "@/lib/kalender/abgeben/model";
import { toIsoDate, useToday } from "@/lib/core/now";
import { act, buzz, readOnlyDone } from "@/components/heute/actions";
import { ItemMenu } from "@/components/kalender/Items";
import { EntryForm } from "@/components/kalender/EntryForm";
import { TaskLine, useLeaving } from "@/components/heute/MiniCards";
import { openQuick } from "@/lib/core/schnelleingabe";
import { listenAnsicht } from "@/lib/kalender/liste/ordnung";
import { fuerHeute, useVorschlagState, vorschlagRuhe, wochenVorschlag } from "@/lib/kalender/liste/vorschlag";
import { changeEntries } from "@/lib/kalender/store";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { openListe } from "@/lib/kalender/liste/einfuegen";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

const LEISE = "flex h-11 items-center gap-1 self-start px-1 text-[15px] font-semibold text-muted";

function TaskRow({ item, today, onOpen }: { item: DayItem; today: string; onOpen: (item: DayItem) => void }) {
  // Abhaken: ca. 2 s durchgestrichen (nochmal tippen = doch nicht); Erledigtes unter „Erledigte anzeigen“ zurückholen
  const { leaving, start } = useLeaving((it) => act((list, stamp) => setDone(list, it, true, stamp), it.title, { done: true }));
  const toggle = (it: DayItem) => {
    if (readOnlyDone(it)) return;
    if (it.done) {
      buzz();
      return act((list, stamp) => setDone(list, it, false, stamp));
    }
    start(it);
  };
  return <TaskLine item={item} today={today} onOpen={onOpen} onDone={toggle} leaving={leaving === item.key} />;
}

function Liste({ items, today, onOpen }: { items: DayItem[]; today: string; onOpen: (item: DayItem) => void }) {
  return (
    <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
      {items.map((item) => (
        <TaskRow key={item.key} item={item} today={today} onOpen={onOpen} />
      ))}
    </ul>
  );
}

/** Leise Zeile zum Auf- und Zuklappen („Geplant · 1 ›“, „Erledigte anzeigen ›“) */
function Klapp({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={LEISE}>
      {label} <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

export function TasksView() {
  const raum = useRaumName();
  const all = useEntries();
  const household = useCachedAccount().household;
  const me = household?.me.userId ?? null;
  const entries = all && me ? all.filter((e) => isMyTask(e, me)) : all;
  const given = all && me ? all.filter((e) => taskRole(e, me) === "abgegeben") : [];
  const now = useToday();
  const today = now ? toIsoDate(now) : undefined;
  const stored = useAufgabenFilter();
  const { ruht, feierabend } = useArbeitRuht(all, today);
  const [arbeitZeigen, setArbeitZeigen] = useState(false);
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (id: string) => setOpen((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  // Aufgaben aus verbundenen Listen (Todoist, nur lesen) stehen mit dabei
  const aboTasks = useAboEntries().filter((e) => e.typ === "aufgabe");
  const groups = entries && today ? taskOverview(aboTasks.length ? [...entries, ...aboTasks] : entries, today) : null;
  const givenItems = today && given.length ? Object.values(taskOverview(given, today)).flat() : [];
  // Die eine Liste; was in eingefügten Listen geparkt ist, steht darunter eingeklappt
  const listen = groups ? listenAnsicht(groups.heute) : null;
  const ansicht = listen ? aufgabenAnsicht(listen.jetzt, { filter: stored, arbeitRuht: ruht, arbeitZeigen }) : null;
  const pick = (list: DayItem[]) => list.filter((i) => (ruht ? arbeitZeigen || i.room !== "arbeit" : !ansicht || ansicht.filter === "alle" || i.room === ansicht.filter));
  const lists = listen ? listen.listen.map((l) => ({ ...l, items: pick(l.items) })).filter((l) => l.items.length) : [];
  const geplant = groups ? pick(groups.geplant) : [];
  const done = groups ? pick(groups.erledigt) : [];
  // Höchstens einmal pro Woche: drei aus den Listen für heute vorschlagen
  const vorschlagState = useVorschlagState();
  const vorschlag = entries && today && vorschlagState && ansicht?.filter === "alle" ? wochenVorschlag(entries, today, vorschlagState) : null;
  const takeVorschlag = (items: DayItem[]) => {
    const undo = changeEntries((list, stamp) => fuerHeute(list, items.map((i) => i.entry.id), today!, stamp));
    vorschlagRuhe(today!);
    showToast({ text: "Für heute geholt", undo: pushUndo("Für heute", undo), undoneText: "Wieder raus", seconds: 4, small: true });
  };
  const leer = ansicht && ansicht.items.length === 0 && lists.length === 0;
  return (
    <>
      <PageHeader title="Aufgaben" backHref="/" subtitle={today ? aufgabenKopf(today, feierabend) : undefined} action={<PagePlus label="Neue Aufgabe" onClick={() => openQuick({ kind: "aufgabe", more: setAdding })} />} />
      <main className={PAGE_MAIN}>
        {ansicht?.chips && (
          <Segmented<AufgabenFilter>
            label="Filter"
            value={ansicht.filter}
            onChange={setAufgabenFilter}
            options={[
              { value: "alle", label: "Alle" },
              { value: "familie", label: raum },
              { value: "arbeit", label: "Arbeit" },
            ]}
          />
        )}
        {!groups || !ansicht ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <>
            {vorschlag && (
              <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Vorschlag für heute" data-vorschlag>
                <h2 className="text-[17px] font-bold">Drei für heute?</h2>
                <p className="text-[15px] text-muted">{vorschlag.map((i) => i.title).join(" · ")}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => takeVorschlag(vorschlag)} className={buttonClass("primary", "md")}>
                    Übernehmen
                  </button>
                  <button type="button" onClick={() => vorschlagRuhe(today!)} className={buttonClass("secondary", "md")}>
                    Nicht jetzt
                  </button>
                </div>
              </section>
            )}
            {leer && (
              <section className="flex flex-col items-center gap-3 px-4 py-8 text-center" aria-label="Gerade nichts">
                <BegleitungAvatar size={88} />
                <h2 className="text-[22px] font-extrabold">Gerade nichts.</h2>
                <p className="max-w-xs text-base text-muted">Fällt dir was ein? Mit ＋ eintragen oder mir einfach sagen.</p>
                <button type="button" onClick={() => openQuick({ kind: "aufgabe", more: setAdding })} className={`${buttonClass("primary", "md")} mt-1`}>
                  Neue Aufgabe
                </button>
                <button type="button" onClick={() => openListe()} className="hit text-[15px] font-semibold text-muted">
                  Liste einfügen
                </button>
              </section>
            )}
            {ansicht.items.length > 0 && (
              <section aria-label="Heute" data-aufgaben-liste>
                <Liste items={ansicht.items} today={today!} onOpen={setMenu} />
              </section>
            )}
            {ansicht.ausgeblendet > 0 && (
              <p className="px-1 text-[15px] font-semibold text-muted" data-ausgeblendet>
                {ausgeblendetText(ansicht.filter === "arbeit" ? "Arbeit" : raum, ansicht.ausgeblendet)}
              </p>
            )}
            {ansicht.arbeitMorgen > 0 && (
              <button type="button" onClick={() => setArbeitZeigen((v) => !v)} aria-pressed={arbeitZeigen} className={LEISE} data-arbeit-morgen>
                {arbeitZeigen ? "Arbeit wieder ausblenden" : arbeitMorgenText(ansicht.arbeitMorgen)} {!arbeitZeigen && <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
              </button>
            )}
            {geplant.length > 0 && (
              <section className="flex flex-col gap-1.5" aria-label="Geplant" data-geplant>
                <Klapp label={geplantText(geplant.length)} open={open.includes("geplant")} onClick={() => toggle("geplant")} />
                {open.includes("geplant") && <Liste items={geplant} today={today!} onOpen={setMenu} />}
              </section>
            )}
            {lists.map((l) => (
              <section key={l.name} className="flex flex-col gap-1.5" aria-label={`Liste ${l.name}`} data-liste={l.name}>
                <Klapp label={`${l.name} · ${l.items.length}`} open={open.includes(`liste:${l.name}`)} onClick={() => toggle(`liste:${l.name}`)} />
                {open.includes(`liste:${l.name}`) && <Liste items={l.items} today={today!} onOpen={setMenu} />}
              </section>
            ))}
            {givenItems.length > 0 && (
              <section className="flex flex-col gap-1.5" aria-label="Abgegeben">
                <Klapp label="Abgegeben" open={open.includes("abgegeben")} onClick={() => toggle("abgegeben")} />
                {open.includes("abgegeben") && (
                  <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                    {givenItems.map((item) => (
                      <li key={item.key} className="flex min-h-12 items-center gap-3 px-4 py-2">
                        <button type="button" onClick={() => setMenu(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${item.title} – Möglichkeiten`}>
                          <span className={`line-clamp-2 min-w-0 flex-1 break-words text-[15px] font-semibold ${item.done ? "text-muted line-through" : ""}`}>{item.title}</span>
                          <span className="shrink-0 text-sm text-muted">{item.done ? "erledigt ✓" : `bei ${memberName(household?.members ?? [], (item.entry.data as { fuer?: string }).fuer) ?? "jemandem"}`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {done.length > 0 && (
              <section className="flex flex-col gap-1.5" aria-label="Erledigt">
                <Klapp label={open.includes("erledigt") ? "Erledigte ausblenden" : "Erledigte anzeigen"} open={open.includes("erledigt")} onClick={() => toggle("erledigt")} />
                {open.includes("erledigt") && <Liste items={done} today={today!} onOpen={setMenu} />}
              </section>
            )}
          </>
        )}
      </main>
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
      {adding !== null && <EntryForm kind="aufgabe" initialText={adding} onClose={() => setAdding(null)} />}
    </>
  );
}
