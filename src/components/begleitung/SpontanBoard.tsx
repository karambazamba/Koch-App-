"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { IdeaCards, type CardIdea } from "@/components/essen/IdeaCards";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { EMPTY_STOCK_HINT } from "@/lib/essen/dishIdeas";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { SPONTAN_FILTERS, type SpontanFilter, type SpontanIdea } from "@/lib/essen/spontan";
import { sortedBases, type BaseCounts } from "@/lib/essen/bases";

/** Spontan-Idee → Karte */
const spontanCard = (i: SpontanIdea): CardIdea => ({ id: i.id, title: i.title, category: i.category, minutes: i.minutes, recipeId: i.recipeId, needs: i.extra });

/** Lottes eine Zeile über den Ideen */
export function spontanHeading(ideas: SpontanIdea[], filters: SpontanFilter[], extra: string[], nearlyEmpty: boolean): string {
  if (!ideas.length) return "Damit fällt mir grad nichts ein. Was ist noch da?";
  const from = extra.length ? `Mit ${extra.join(", ")} und dem, was da ist` : nearlyEmpty ? "Mit Grundzutaten" : "Mit dem, was da ist";
  const order = filters.includes("reste") ? "Reste zuerst" : ideas.length > 1 ? "die schnellste zuerst" : "";
  const count = ideas.length === 3 ? "diese drei" : ideas.length === 2 ? "diese zwei" : "das hier";
  return `${from}, ${ideas.length === 1 ? "geht heute" : "gehen heute"} ${count}${order ? `, ${order}` : ""}:`;
}

/**
 * "Spontan kochen" im Chat – auf einen Blick: EIN Satz, eine graue Zeile
 * "Noch da: … ändern", genau 3 kompakte Ideen mit "Heute", darunter
 * "⚙️ Anpassen" und "🔄 Andere Ideen". Rechnet live aus dem Bestand.
 */
export function SpontanAnswer({
  heading,
  ideas,
  stock,
  nearlyEmpty,
  onToday,
  onAdjust,
  onMore,
  onNavigate,
  speaker,
}: {
  heading: string;
  /** Lautsprecher neben dem Satz */
  speaker?: ReactNode;
  ideas: SpontanIdea[];
  /** Aktueller Bestand (für "Noch da") */
  stock: PantryItem[];
  nearlyEmpty: boolean;
  onToday: (idea: SpontanIdea) => void;
  onAdjust: () => void;
  onMore: () => void;
  onNavigate: () => void;
}) {
  const shown = stock.slice(0, 5).map((p) => p.name);
  return (
    <div className="flex w-full flex-col gap-2" aria-label="Spontan kochen">
      <div className="flex w-full flex-col items-start gap-0.5">
        <p className="max-w-[85%] rounded-card rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink">{heading}</p>
        {speaker}
      </div>
      <p className="px-1 text-sm text-muted">
        {nearlyEmpty && shown.length === 0 ? (
          EMPTY_STOCK_HINT
        ) : (
          <>
            Noch da: {shown.join(", ")}
            {stock.length > 5 ? " …" : ""}
            {nearlyEmpty ? `. ${EMPTY_STOCK_HINT}` : ""}
          </>
        )}{" "}
        <Link href="/vorrat" onClick={onNavigate} className="font-semibold text-accent-strong underline">
          ändern
        </Link>
      </p>
      {ideas.length > 0 && (
        <IdeaCards
          ideas={ideas.map(spontanCard)}
          label="Ideen"
          onToday={(card) => {
            const idea = ideas.find((i) => i.id === card.id);
            if (idea) onToday(idea);
          }}
          onNavigate={onNavigate}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onAdjust} className={chipClass(false)}>
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Anpassen
        </button>
        {ideas.length > 0 && (
          <button type="button" onClick={onMore} className={chipClass(false)}>
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Andere Ideen
          </button>
        )}
      </div>
    </div>
  );
}

/** Ältere Ideen-Antworten: eingeklappt "Frühere Ideen" */
export function EarlierIdeas({ titles }: { titles: string[] }) {
  const [open, setOpen] = useState(false);
  if (!titles.length) return null;
  return (
    <div className="self-start text-sm text-muted">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="font-semibold underline-offset-2 active:underline">
        Frühere Ideen {open ? "▾" : "▸"}
      </button>
      {open && <p className="mt-1">{titles.join(" · ")}</p>}
    </div>
  );
}

/** "Ideen anpassen": Zeit, Vorrang, Beilage – dann 3 neue Ideen */
export function AdjustSheet({
  filters,
  bases,
  onApply,
  onClose,
}: {
  filters: SpontanFilter[];
  /** Beliebtheit der Beilagen (Reihenfolge) */
  bases: BaseCounts;
  onApply: (filters: SpontanFilter[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SpontanFilter[]>(filters);
  const toggle = (f: SpontanFilter) => setDraft((d) => (d.includes(f) ? d.filter((x) => x !== f) : [...d, f]));
  const fast = draft.includes("schnell");
  const label = (f: SpontanFilter) => SPONTAN_FILTERS.find((x) => x.value === f)?.label ?? f;
  return (
    <Sheet title="Ideen anpassen" onClose={onClose} above>
      <Group title="Zeit">
        <button type="button" role="radio" aria-checked={fast} onClick={() => !fast && toggle("schnell")} className={chipClass(fast)}>
          {label("schnell")}
        </button>
        <button type="button" role="radio" aria-checked={!fast} onClick={() => fast && toggle("schnell")} className={chipClass(!fast)}>
          egal
        </button>
      </Group>
      <Group title="Vorrang" multi>
        {(["reste", "einkauf"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={draft.includes(f)} onClick={() => toggle(f)} className={chipClass(draft.includes(f))}>
            {label(f)}
          </button>
        ))}
      </Group>
      <Group title="Beilage" multi>
        {sortedBases(bases).filter((b) => b.id !== "quinoa").map((b) => {
          const f: SpontanFilter = `basis:${b.id}`;
          return (
            <button key={b.id} type="button" aria-pressed={draft.includes(f)} onClick={() => toggle(f)} className={chipClass(draft.includes(f))}>
              {b.label}
            </button>
          );
        })}
      </Group>
      <p className="-mt-2 px-1 text-sm text-muted">Keine Beilage gewählt = egal.</p>
      <button type="button" onClick={() => onApply(draft)} className={`${buttonClass("primary", "lg")} mb-2 w-full`}>
        3 neue Ideen zeigen
      </button>
    </Sheet>
  );
}

function Group({ title, multi = false, children }: { title: string; multi?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="px-1 text-[15px] font-extrabold text-muted">{title}</h3>
      <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"} aria-label={title}>
        {children}
      </div>
    </section>
  );
}
