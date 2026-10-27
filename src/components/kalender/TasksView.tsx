"use client";

// Seite "Aufgaben" (/aufgaben): zu erledigen, flexibel. Filter Alles ·
// Familie · Arbeit, Gruppen Heute dran · Diese Woche · Später · Irgendwann
// und eingeklappt "✓ N erledigt". Unerledigtes von gestern rutscht still in
// "Heute dran" ("von gestern" – nie "überfällig"). Aufgaben sind persönlich
// (Tafel 52 B): nur meine und die mir gegebenen; was ich abgegeben habe,
// steht leise eingeklappt unter „Abgegeben“.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { setDone, taskOverview, TASK_GROUPS, type DayItem } from "@/lib/kalender/model";
import { useEntries } from "@/lib/kalender/store";
import { useAboEntries } from "@/lib/kalender/abo/store";
import { useCachedAccount } from "@/lib/konten/cache";
import { isMyTask, memberName, taskRole } from "@/lib/kalender/abgeben/model";
import { toIsoDate, useToday } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { act, buzz, readOnlyDone } from "@/components/heute/actions";
import { ItemMenu } from "@/components/kalender/Items";
import { EntryForm } from "@/components/kalender/EntryForm";
import { TaskLine, useLeaving } from "@/components/heute/MiniCards";
import { openQuick } from "@/lib/core/schnelleingabe";
import { listenAnsicht } from "@/lib/kalender/liste/ordnung";
import { inDieseWoche, useVorschlagState, vorschlagRuhe, wochenVorschlag } from "@/lib/kalender/liste/vorschlag";
import { changeEntries } from "@/lib/kalender/store";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { openListe } from "@/lib/kalender/liste/einfuegen";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

type Filter = "alles" | "familie" | "arbeit";


function TaskRow({ item, today, onOpen }: { item: DayItem; today: string; onOpen: (item: DayItem) => void }) {
  // Abhaken: ca. 2 s durchgestrichen (nochmal tippen = doch nicht); Erledigtes unter "✓ erledigt" zurückholen
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

export function TasksView() {
  const raum = useRaumName();
  const all = useEntries();
  const household = useCachedAccount().household;
  const me = household?.me.userId ?? null;
  const entries = all && me ? all.filter((e) => isMyTask(e, me)) : all;
  const given = all && me ? all.filter((e) => taskRole(e, me) === "abgegeben") : [];
  const [showGiven, setShowGiven] = useState(false);
  const now = useToday();
  const work = useWorkRoom();
  const [filter, setFilter] = useState<Filter>("alles");
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const today = now ? toIsoDate(now) : undefined;
  // Aufgaben aus verbundenen Listen (Todoist, nur lesen) stehen mit dabei
  const aboTasks = useAboEntries().filter((e) => e.typ === "aufgabe");
  const groups = entries && today ? taskOverview(aboTasks.length ? [...entries, ...aboTasks] : entries, today) : null;
  const givenItems = today && given.length ? Object.values(taskOverview(given, today)).flat() : [];
  const pick = (list: DayItem[]) => list.filter((i) => filter === "alles" || i.room === filter);
  const hasWork = work || Boolean(entries?.some((e) => e.raum === "arbeit"));
  // Mit Listen (eingefügte To-do-Listen): oben „Jetzt dran“, darunter jede Liste eingeklappt
  const ansicht = groups ? listenAnsicht(groups) : null;
  const [openLists, setOpenLists] = useState<string[]>([]);
  const lists = ansicht ? ansicht.listen.map((l) => ({ ...l, items: pick(l.items) })).filter((l) => l.items.length) : [];
  const sections = ansicht
    ? [
        { id: "jetzt", label: "Jetzt dran", items: ansicht.jetzt },
        { id: "spaeter", label: "Später", items: ansicht.spaeter },
        { id: "irgendwann", label: "Irgendwann", items: ansicht.irgendwann },
      ]
    : groups
      ? TASK_GROUPS.filter((g) => g.id !== "erledigt").map((g) => ({ id: g.id as string, label: g.label, items: groups[g.id] }))
      : [];
  // Höchstens einmal pro Woche: drei Aufgaben ohne Datum für diese Woche vorschlagen
  const vorschlagState = useVorschlagState();
  const vorschlag = entries && today && vorschlagState && filter === "alles" ? wochenVorschlag(entries, today, vorschlagState) : null;
  const takeVorschlag = (items: DayItem[]) => {
    const undo = changeEntries((list, stamp) => inDieseWoche(list, items.map((i) => i.entry.id), today!, stamp));
    vorschlagRuhe(today!);
    showToast({ text: "Für diese Woche eingeplant", undo: pushUndo("Für diese Woche", undo), undoneText: "Wieder raus", seconds: 4, small: true });
  };
  const open = sections.map((g) => ({ ...g, items: pick(g.items) })).filter((g) => g.items.length);
  const done = groups ? pick(groups.erledigt) : [];
  return (
    <>
      <PageHeader
        title="Aufgaben"
        backHref="/"
        action={
          <PagePlus label="Neue Aufgabe" onClick={() => openQuick({ kind: "aufgabe", more: setAdding })} />
        }
      />
      <main className={PAGE_MAIN}>
        {hasWork && (
          <Segmented
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "alles", label: "Alle" },
              { value: "familie", label: raum },
              { value: "arbeit", label: "Arbeit" },
            ]}
          />
        )}
        {!groups ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <>
            {vorschlag && (
              <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Vorschlag für diese Woche" data-vorschlag>
                <h2 className="text-[17px] font-bold">Drei für diese Woche?</h2>
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
            {open.length === 0 && lists.length === 0 && (
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
            {open.map((g) => (
              <section key={g.id} className="flex flex-col gap-1.5" aria-label={g.label}>
                <h2 className="px-1 text-[15px] font-extrabold text-muted">{g.label}</h2>
                <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                  {g.items.map((item) => (
                    <TaskRow key={item.key} item={item} today={today!} onOpen={setMenu} />
                  ))}
                </ul>
              </section>
            ))}
            {lists.map((l) => {
              const shown = openLists.includes(l.name);
              return (
                <section key={l.name} className="flex flex-col gap-1.5" aria-label={`Liste ${l.name}`} data-liste={l.name}>
                  <button
                    type="button"
                    onClick={() => setOpenLists((v) => (shown ? v.filter((x) => x !== l.name) : [...v, l.name]))}
                    aria-expanded={shown}
                    className="flex h-11 items-center gap-1 px-1 text-[15px] font-extrabold text-muted"
                  >
                    {l.name} · {l.items.length} <ChevronDown className={`h-4 w-4 transition ${shown ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
                  </button>
                  {shown && (
                    <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                      {l.items.map((item) => (
                        <TaskRow key={item.key} item={item} today={today!} onOpen={setMenu} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
            {givenItems.length > 0 && (
              <section className="flex flex-col gap-1.5" aria-label="Abgegeben">
                <button type="button" onClick={() => setShowGiven((v) => !v)} aria-expanded={showGiven} className="flex h-10 items-center gap-1 px-1 text-[15px] font-extrabold text-muted">
                  Abgegeben <ChevronDown className={`h-4 w-4 transition ${showGiven ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
                </button>
                {showGiven && (
                  <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                    {givenItems.map((item) => (
                      <li key={item.key} className="flex min-h-12 items-center gap-3 px-4 py-2">
                        <button type="button" onClick={() => setMenu(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${item.title} – Möglichkeiten`}>
                          <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${item.done ? "text-muted line-through" : ""}`}>{item.title}</span>
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
                <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex h-10 items-center gap-1 px-1 text-[15px] font-extrabold text-muted">
                  {showDone ? "Erledigte ausblenden" : "Erledigte anzeigen"} <ChevronDown className={`h-4 w-4 transition ${showDone ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
                </button>
                {showDone && (
                  <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                    {done.map((item) => (
                      <TaskRow key={item.key} item={item} today={today!} onOpen={setMenu} />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
      {menu && <ItemMenu item={menu} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu), setMenu(null))} />}
      {editing && <EntryForm entry={editing.entry} onClose={() => setEditing(null)} />}
      {adding !== null && <EntryForm kind="aufgabe" when="irgendwann" initialText={adding} onClose={() => setAdding(null)} />}
    </>
  );
}
