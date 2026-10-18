"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { useHealthTip, useWeekPraise } from "@/components/assistant/useHealthTip";
import { chipClass } from "@/components/ui/styles";
import { useAssistantStatus } from "@/lib/assistant/client";
import { openHelper } from "@/lib/assistant/open";
import type { Recipe } from "@/lib/cookbook";
import { declineTip, markTipShown, tryTip, undoTip } from "@/lib/healthTips";
import { isPaused, noteAnswered, noteDismissed, noteShown, useNudges, type NudgeKind } from "@/lib/nudges";
import { setHave } from "@/lib/shoppingList";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import { addDays, planningWeekStart, useWeekPlan } from "@/lib/weekPlan";
import type { HomeData } from "./useHomeData";

type Chip = { label: string; href?: string; onClick?: () => void };
type Note = { kind: NudgeKind; text: string; chips: Chip[] };

function names(list: string[]): string {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} und ${list[1]}`;
  return `${list[0]}, ${list[1]} und ${list.length - 2} weitere Sachen`;
}

/**
 * Höchstens ein Satz vom Küchenhelfer – nur wenn es etwas Wichtiges gibt,
 * immer als Angebot oder Erledigt-Meldung, mit höchstens 2 Antworten.
 * Reihenfolge: Einkauf für morgen, nächste Woche planen, Lob, Gesundheits-Tipp.
 * Eine Art, die 3× ignoriert wurde, pausiert 2 Wochen.
 */
export function HelperNote({ data }: { data: HomeData }) {
  const nudges = useNudges();
  const status = useAssistantStatus(true);
  const current = useWeekShoppingList("current");
  const next = useWeekShoppingList("next");
  const target = planningWeekStart(data.today, data.profile.shoppingDay || "Montag");
  const targetPlan = useWeekPlan(target.weekStart);
  const tip = useHealthTip();
  const praise = useWeekPraise();
  const [done, setDone] = useState<{ text: string; undo?: () => void } | null>(null);
  const { todayIso } = data;

  const note = ((): Note | null => {
    if (!nudges || !current || !next || targetPlan === undefined) return null;
    const allowed = (kind: NudgeKind) => !isPaused(nudges, kind, todayIso);

    // 1. Für morgen fehlt noch etwas
    const tomorrow = data.tomorrow;
    const entry = tomorrow && !tomorrow.away ? tomorrow.slot.entry : null;
    if (entry && allowed("einkauf-morgen")) {
      const label = `${entry.title} (${tomorrow!.weekday.slice(0, 2)})`;
      const shopping = [current, next].find((s) => s.weekStart <= tomorrow!.date && tomorrow!.date < addWeek(s.weekStart));
      const missing = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden && i.dishes.some((d) => d.startsWith(label)));
      if (shopping && missing.length > 0) {
        return {
          kind: "einkauf-morgen",
          text: `Für morgen fehlen noch ${names(missing.map((i) => i.name))} – steht schon auf der Liste.`,
          chips: [
            { label: "Zur Liste", href: "/einkaufsliste" },
            {
              label: "Haben wir schon",
              onClick: () => {
                missing.forEach((i) => setHave(shopping.weekStart, i.key, true));
                setDone({ text: "Alles klar, hab's von der Liste genommen." });
              },
            },
          ],
        };
      }
    }

    // 2. Nächste Woche ist noch ganz offen
    if (target.isNext && !targetPlan && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Nächste Woche ist noch frei – soll ich schon mal was vorschlagen?",
        chips: [
          status?.configured
            ? { label: "Ja, gern", onClick: () => openHelper(undefined, "Plan mir bitte die nächste Woche.") }
            : { label: "Ja, gern", href: "/woche/check" },
          { label: "Später", onClick: () => noteDismissed("wochenplanung", todayIso) },
        ],
      };
    }

    // 3. Lob zum Wochenrückblick
    if (praise && allowed("lob")) return { kind: "lob", text: praise, chips: [{ label: "Danke 😊" }] };

    // 4. Sanfter Gesundheits-Tipp
    if (tip && allowed("tipp")) {
      const recipe: Recipe | undefined = data.recipes[tip.tip.recipeId];
      if (recipe) {
        return {
          kind: "tipp",
          text: `Kleine Idee für ${tip.tip.title}: ${tip.tip.text}`,
          chips: [
            {
              label: "Ausprobieren",
              onClick: () => {
                const previous = tryTip(tip.tip, recipe);
                setDone({ text: "Ausprobiert ✓ Steht jetzt so im Rezept.", undo: previous ? () => undoTip(tip.tip, previous) : undefined });
              },
            },
            { label: "Nein danke", onClick: () => declineTip(tip.tip) },
          ],
        };
      }
    }
    return null;
  })();

  const kind = note?.kind;
  useEffect(() => {
    if (!kind) return;
    noteShown(kind, todayIso);
    if (kind === "tipp" && tip) markTipShown(tip.weekStart, tip.tip.key);
  }, [kind, todayIso, tip]);

  if (done) {
    return (
      <Bubble text={done.text}>
        {done.undo && (
          <button
            type="button"
            onClick={() => {
              done.undo?.();
              setDone({ text: "Okay, wieder wie vorher." });
            }}
            className={chipClass(false, "muted")}
          >
            Rückgängig
          </button>
        )}
      </Bubble>
    );
  }
  if (!note) return null;
  return (
    <Bubble text={note.text}>
      {note.chips.slice(0, 2).map((c) =>
        c.href ? (
          <Link key={c.label} href={c.href} onClick={() => noteAnswered(note.kind, todayIso)} className={chipClass(false)}>
            {c.label}
          </Link>
        ) : (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              if (c.label !== "Später") noteAnswered(note.kind, todayIso);
              c.onClick?.();
            }}
            className={chipClass(false)}
          >
            {c.label}
          </button>
        ),
      )}
    </Bubble>
  );
}

const addWeek = (weekStart: string) => addDays(weekStart, 7);

function Bubble({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <section className="flex items-start gap-2.5" aria-label="Küchenhelfer">
      <HelperAvatar size={40} variant="badge" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-ink">{text}</p>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}
