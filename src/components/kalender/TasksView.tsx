"use client";

// Seite "Aufgaben" (/aufgaben): zu erledigen, flexibel. Filter Alles ·
// Familie · Arbeit, Gruppen Heute dran · Diese Woche · Später · Irgendwann
// und eingeklappt "✓ N erledigt". Unerledigtes von gestern rutscht still in
// "Heute dran" ("von gestern" – nie "überfällig").

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { setDone, taskOverview, TASK_GROUPS, type DayItem } from "@/lib/kalender/model";
import { useEntries } from "@/lib/kalender/store";
import { toIsoDate, useToday } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { act, buzz } from "@/components/heute/actions";
import { ItemMenu } from "@/components/kalender/Items";
import { EntryForm } from "@/components/kalender/EntryForm";
import { TaskLine, useLeaving } from "@/components/heute/MiniCards";
import { TaskQuickAdd } from "@/components/kalender/TaskQuickAdd";
import { askMiaFirst } from "@/lib/begleitung/open";

type Filter = "alles" | "familie" | "arbeit";


function TaskRow({ item, today, onOpen }: { item: DayItem; today: string; onOpen: (item: DayItem) => void }) {
  // Abhaken: ca. 2 s durchgestrichen (nochmal tippen = doch nicht); Erledigtes unter "✓ erledigt" zurückholen
  const { leaving, start } = useLeaving((it) => act((list, stamp) => setDone(list, it, true, stamp), it.title, { done: true }));
  const toggle = (it: DayItem) => {
    if (it.done) {
      buzz();
      return act((list, stamp) => setDone(list, it, false, stamp));
    }
    start(it);
  };
  return <TaskLine item={item} today={today} onOpen={onOpen} onDone={toggle} leaving={leaving === item.key} />;
}

export function TasksView() {
  const entries = useEntries();
  const now = useToday();
  const work = useWorkRoom();
  const [filter, setFilter] = useState<Filter>("alles");
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  const [adding, setAdding] = useState(false);
  const today = now ? toIsoDate(now) : undefined;
  const groups = entries && today ? taskOverview(entries, today) : null;
  const pick = (list: DayItem[]) => list.filter((i) => filter === "alles" || i.room === filter);
  const hasWork = work || Boolean(entries?.some((e) => e.raum === "arbeit"));
  const open = groups ? TASK_GROUPS.filter((g) => g.id !== "erledigt").map((g) => ({ ...g, items: pick(groups[g.id]) })).filter((g) => g.items.length) : [];
  const done = groups ? pick(groups.erledigt) : [];
  return (
    <>
      <PageHeader
        title="Aufgaben"
        backHref="/"
        action={
          <PagePlus label="Neue Aufgabe" onClick={() => askMiaFirst("aufgabe", () => setAdding(true))} />
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
              { value: "familie", label: "Familie" },
              { value: "arbeit", label: "Arbeit" },
            ]}
          />
        )}
        {!groups ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <>
            {open.length === 0 && (
              <section className="flex flex-col items-center gap-3 px-4 py-8 text-center" aria-label="Alles erledigt">
                <BegleitungAvatar size={88} />
                <h2 className="text-[22px] font-extrabold">Alles erledigt.</h2>
                <p className="max-w-xs text-base text-muted">Wenn dir etwas einfällt, sag einfach „Ich muss noch …“ – ich merk’s mir.</p>
                <button type="button" onClick={() => setAdding(true)} className={`${buttonClass("primary", "md")} mt-1`}>
                  Neue Aufgabe
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
      {adding && <TaskQuickAdd defaultWhen="irgendwann" onClose={() => setAdding(false)} />}
    </>
  );
}
