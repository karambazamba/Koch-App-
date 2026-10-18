"use client";

import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, CARD_LIST, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { dishEmoji } from "@/lib/dishEmoji";
import { EMPTY_STOCK_HINT, usesLine } from "@/lib/dishIdeas";
import { openHelper } from "@/lib/assistant/open";
import { IDEA_FILTERS, type IdeaFilter } from "@/lib/ideas";
import { personLabel } from "@/lib/profile";
import { showToast } from "@/lib/toast";
import { putAside, useTodayIdeas } from "@/lib/useIdeas";
import { usePlanStyle } from "@/lib/usePlanStyle";
import { addWish, parseWish, wishLabel } from "@/lib/wishes";
import { IdeaSheet } from "./IdeaSheet";
import { PlanUnlockSheet } from "./PlanUnlockSheet";
import { useIdeaChoice } from "./useIdeaChoice";

/** /ideen: Ideen für heute mit Filtern, Wünsche ganz oben */
export function IdeasView() {
  const [filters, setFilters] = useState<IdeaFilter[]>([]);
  const data = useTodayIdeas(filters);
  const plan = usePlanStyle();
  const { choose, dialog } = useIdeaChoice();
  const [openId, setOpenId] = useState<string | null>(null);
  const [unlock, setUnlock] = useState(false);
  const [wishText, setWishText] = useState("");
  const [wishWho, setWishWho] = useState<string | null>(null);

  if (!data) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const ideas = data.ideas.slice(0, 12);
  const open = ideas.find((i) => i.id === openId);
  const kids = data.profile.persons;
  const aside = (idea: (typeof ideas)[number]) => {
    const undo = putAside(data.todayIso, idea);
    if (undo) showToast({ text: `${idea.reason} ist weggeräumt.`, undo });
    setOpenId(null);
  };
  const saveWish = () => {
    const text = wishText.trim();
    if (!text) return;
    const parsed = parseWish(text, data.profile.persons);
    const person = data.profile.persons.find((p) => p.id === wishWho);
    const who = parsed?.who || (person ? personLabel(person, data.profile.persons) : "");
    addWish({ personId: parsed?.personId ?? person?.id ?? null, who, dish: parsed?.dish ?? text.charAt(0).toUpperCase() + text.slice(1) }, data.todayIso);
    setWishText("");
    showToast({ text: `Notiert ✓ ${wishLabel(who)} steht jetzt ganz oben.` });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Ideen" />
      <main className={PAGE_MAIN}>
        <p className="px-1 text-base text-muted">Was gibt&apos;s heute? Tipp eine Idee an – sie wird euer Heute.</p>
        {data.nearlyEmpty && (
          <button type="button" onClick={() => openHelper("spontan")} className="self-start px-1 text-left text-sm font-semibold text-accent-strong underline">
            {EMPTY_STOCK_HINT}
          </button>
        )}
        <div role="group" aria-label="Filtern" className="flex flex-wrap gap-2">
          {IDEA_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filters.includes(f.value)}
              onClick={() => setFilters((list) => (list.includes(f.value) ? list.filter((x) => x !== f.value) : [...list, f.value]))}
              className={chipClass(filters.includes(f.value))}
            >
              {f.label}
            </button>
          ))}
        </div>

        {ideas.length === 0 ? (
          <p className={`${CARD} p-5 text-center text-muted`}>Damit fällt mir gerade nichts ein – nimm einen Filter raus oder erzähl mir, was im Haus ist.</p>
        ) : (
          <ul className={CARD_LIST} aria-label="Ideen">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpenId(idea.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-2xl" aria-hidden>
                    {dishEmoji(idea.title, idea.category)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-snug">{idea.title}</span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                      <span className={idea.wishId || idea.uses.length ? "font-semibold text-accent-strong" : ""}>
                        {idea.uses.length && !idea.wishId ? usesLine(idea.uses, idea.needs, 3) : idea.reason}
                      </span>
                      {idea.minutes !== null && (
                        <span className="inline-flex items-center gap-1">
                          · <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {idea.minutes} Min.
                        </span>
                      )}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => choose(idea, data.profile, data.today, data.recipes)} className={buttonClass("soft", "sm")}>
                  Heute
                </button>
                <button type="button" onClick={() => aside(idea)} aria-label={`${idea.title}: nicht jetzt`} className="-mr-2 flex h-10 w-10 items-center justify-center text-stone-400">
                  <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Wunsch">
          <p className="font-bold">Jemand wünscht sich was?</p>
          {kids.length > 1 && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wer wünscht sich was?">
              {kids.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={wishWho === p.id} onClick={() => setWishWho(wishWho === p.id ? null : p.id)} className={chipClass(wishWho === p.id)}>
                  {personLabel(p, kids)}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveWish();
            }}
          >
            <input
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="z. B. Pfannkuchen"
              aria-label="Wunsch"
              enterKeyHint="done"
              className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
            />
            <button type="submit" disabled={!wishText.trim()} aria-label="Wunsch merken" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent shadow-sm active:scale-95 disabled:opacity-40">
              <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </form>
        </section>

        {plan?.style === "spontan" && (
          <button type="button" onClick={() => setUnlock(true)} className="self-center px-4 py-2 text-sm font-semibold text-muted underline">
            Lieber ein paar Tage vorplanen?
          </button>
        )}
      </main>
      {open && <IdeaSheet idea={open} onChoose={() => { setOpenId(null); choose(open, data.profile, data.today, data.recipes); }} onDismiss={() => aside(open)} onClose={() => setOpenId(null)} />}
      {unlock && <PlanUnlockSheet profile={data.profile} today={data.today} onClose={() => setUnlock(false)} />}
      {dialog}
    </div>
  );
}
