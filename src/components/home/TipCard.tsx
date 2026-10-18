"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Lightbulb } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { Sheet } from "@/components/plan/Sheet";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { dismissTipCard, markTipCardShown, nextTipCard, type TipCardData } from "@/lib/tips";

/** Ab so viel seitlicher Bewegung zählt es als Wischen */
const SWIPE = 60;

/**
 * Tipp auf Lottes Platz: Glühbirne, kleine Überschrift, 1–2 Sätze,
 * "Mehr dazu ›". Tippen = Details, nach links wischen = für heute weg, nach
 * rechts = nächster Tipp (höchstens 3 am Tag). Punkte zeigen, wo man ist.
 */
export function TipCard({
  deck,
  index,
  date,
  showHint,
  onAction,
  onDismiss,
  onGesture,
}: {
  deck: TipCardData[];
  index: number;
  date: string;
  /** Allererster Tipp: Gesten-Hinweis */
  showHint: boolean;
  /** Zusatz-Knopf (Twist: "Übernehmen", Gesundheit: "Ausprobieren") */
  onAction?: (card: TipCardData) => void;
  /** Nach links weggewischt (z. B. Gesundheits-Tipp: "Nein danke") */
  onDismiss?: (card: TipCardData) => void;
  /** Jemand hat etwas getan (für "nervt nie") */
  onGesture: (kind: "next" | "gone" | "detail" | "action") => void;
}) {
  const card = deck[index];
  const [dx, setDx] = useState(0);
  const [detail, setDetail] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (card) markTipCardShown(date, card.id);
  }, [card, date]);

  if (!card) return null;
  const actionLabel = card.kind === "twist" ? "Übernehmen" : card.kind === "gesund" ? "Ausprobieren" : null;

  const next = () => {
    onGesture("next");
    nextTipCard(date, deck.length);
  };
  const gone = () => {
    onGesture("gone");
    onDismiss?.(card);
    dismissTipCard(date, card.category);
  };
  const action = () => {
    onGesture("action");
    onAction?.(card);
  };

  return (
    <section className="flex items-start gap-2.5" aria-label="Tipp" aria-roledescription="Tipp-Karte">
      <HelperAvatar size={40} variant="badge" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div
          role="button"
          tabIndex={0}
          aria-label={`${card.title}: ${card.text} – antippen für mehr`}
          data-no-swipe
          onKeyDown={(e) => {
            if (e.key === "Enter") setDetail(true);
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") gone();
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          }}
          onPointerMove={(e) => {
            if (!start.current || start.current.id !== e.pointerId) return;
            const moveX = e.clientX - start.current.x;
            if (Math.abs(moveX) > Math.abs(e.clientY - start.current.y)) setDx(moveX);
          }}
          onPointerUp={(e) => {
            const s = start.current;
            start.current = null;
            setDx(0);
            if (!s) return;
            const moveX = e.clientX - s.x;
            const moveY = e.clientY - s.y;
            if (moveX <= -SWIPE) gone();
            else if (moveX >= SWIPE) next();
            else if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) {
              onGesture("detail");
              setDetail(true);
            }
          }}
          onPointerCancel={() => {
            start.current = null;
            setDx(0);
          }}
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.4, 1 - Math.abs(dx) / 240) : undefined, touchAction: "pan-y" }}
          className="cursor-pointer select-none rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-left transition-[transform,opacity] duration-75"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-strong">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="truncate">{card.title}</span>
          </p>
          <p className="mt-0.5 text-[15px] leading-snug text-ink">{card.text}</p>
          <span className="mt-0.5 inline-flex items-center text-sm font-semibold text-accent-strong">
            Mehr dazu <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {actionLabel && (
            <button type="button" onClick={action} className={chipClass(false)}>
              {actionLabel}
            </button>
          )}
          {deck.length > 1 && (
            <span className="flex gap-1" aria-label={`Tipp ${index + 1} von ${deck.length}`}>
              {deck.map((d, i) => (
                <span key={d.id} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-accent" : "bg-stone-300"}`} aria-hidden />
              ))}
            </span>
          )}
          {showHint && <span className="text-xs text-muted">← weg · tippen = mehr · nächster →</span>}
        </div>
      </div>
      {detail && (
        <Sheet title={card.title} onClose={() => setDetail(false)}>
          <p className="text-base leading-relaxed">{card.text}</p>
          <p className="text-base leading-relaxed text-muted">{card.detail}</p>
          {card.kind === "tip" && card.steps && (
            <ol className="flex flex-col gap-2">
              {card.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-base">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="grid grid-cols-2 gap-2 pb-2">
            {actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  setDetail(false);
                  action();
                }}
                className={buttonClass("primary", "lg")}
              >
                {actionLabel}
              </button>
            ) : (
              <button type="button" onClick={() => setDetail(false)} className={buttonClass("primary", "lg")}>
                Danke!
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDetail(false);
                next();
              }}
              className={buttonClass("secondary", "lg")}
            >
              {index + 1 < deck.length ? "Nächster Tipp" : "Für heute genug"}
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
