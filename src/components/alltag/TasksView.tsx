"use client";

// Seite "Aufgaben" (/aufgaben): zu erledigen, flexibel. Filter Alles ·
// Familie · Arbeit, Gruppen Heute dran · Diese Woche · Später · Irgendwann
// und eingeklappt "✓ N erledigt". Unerledigtes von gestern rutscht still in
// "Heute dran" ("von gestern" – nie "überfällig").

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { setDone, taskOverview, TASK_GROUPS, type DayItem } from "@/lib/aufgaben/model";
import { useEntries } from "@/lib/aufgaben/store";
import { toIsoDate, useToday } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { act, buzz } from "./actions";
import { ItemMenu, roomBar } from "./Items";
import { EntryForm } from "./EntryForm";
import { taskLine } from "./MiniCards";

type Filter = "alles" | "familie" | "arbeit";

export const ROUND_PLUS = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm active:scale-95";

function TaskRow({ item, onOpen }: { item: DayItem; onOpen: (item: DayItem) => void }) {
  const [popping, setPopping] = useState(false);
  const checked = item.done || popping;
  const toggle = () => {
    buzz();
    if (item.done) return act((list, stamp) => setDone(list, item, false, stamp));
    setPopping(true);
    setTimeout(() => {
      act((list, stamp) => setDone(list, item, true, stamp), `Erledigt ✓ ${item.title}`);
      setPopping(false);
    }, 380);
  };
  const line = taskLine(item);
  return (
    <li className="flex items-center gap-1 py-1.5 pr-3" data-item={item.key}>
      <button type="button" role="checkbox" aria-checked={checked} aria-label={`${item.title} erledigt`} onClick={toggle} className="flex h-11 w-12 shrink-0 items-center justify-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${checked ? "border-accent bg-accent text-on-accent" : "border-stone-300"}`}
          style={popping ? { animation: "check-pop 0.4s ease-out" } : undefined}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${item.title} – Möglichkeiten`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-base font-semibold leading-snug ${checked ? "text-muted line-through" : ""}`}>{item.title}</span>
          {line && <span className="block truncate text-sm text-muted">{line}</span>}
        </span>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${roomBar(item.room)} ${checked ? "opacity-40" : ""}`} aria-hidden />
      </button>
    </li>
  );
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
          <button type="button" onClick={() => setAdding(true)} aria-label="Neue Aufgabe" className={ROUND_PLUS}>
            <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden />
          </button>
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
        ) : open.length === 0 && done.length === 0 ? (
          <p className="px-1 py-6 text-center text-base text-muted">Gerade liegt nichts an. Sag einfach: „Ich muss noch …“</p>
        ) : (
          <>
            {open.length === 0 && <p className="px-1 py-2 text-lg font-bold">Alles erledigt 🌙</p>}
            {open.map((g) => (
              <section key={g.id} className="flex flex-col gap-1.5" aria-label={g.label}>
                <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">{g.label}</h2>
                <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                  {g.items.map((item) => (
                    <TaskRow key={item.key} item={item} onOpen={setMenu} />
                  ))}
                </ul>
              </section>
            ))}
            {done.length > 0 && (
              <section className="flex flex-col gap-1.5" aria-label="Erledigt">
                <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex h-10 items-center gap-1 px-1 text-xs font-bold uppercase tracking-wider text-muted">
                  ✓ {done.length} erledigt <ChevronDown className={`h-4 w-4 transition ${showDone ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
                </button>
                {showDone && (
                  <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                    {done.map((item) => (
                      <TaskRow key={item.key} item={item} onOpen={setMenu} />
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
      {adding && <EntryForm kind="aufgabe" onClose={() => setAdding(false)} />}
    </>
  );
}
