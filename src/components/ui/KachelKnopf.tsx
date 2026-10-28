"use client";

// Weiße Pille unten in einer Bild-Kachel (A-046, Tafel 134): „Wochenplan ›“,
// „Weiter kochen ›“ – sichtbar 32 px hoch, 12,5 px fett, Tippfläche 44 px.
// Text nie mit „…“ gekürzt (A-045): passt er nicht, Stufe für Stufe kleiner
// (`knopfStufen`: ohne Symbol → 12 px → kurze Form → weniger Innenabstand),
// gemessen vor dem Zeichnen und neu bei anderer Breite oder nachgeladener
// Schrift.

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { knopfStufen } from "@/lib/heute/kachelKnopf";

const PILLE_PX = [12.5, 12] as const;

/** Link (`open` = Adresse) oder Schritt (`open` = Funktion) */
export function KachelKnopf({ label, open, data }: { label: string; open: string | (() => void); data?: string }) {
  const stufen = useMemo(() => knopfStufen(label, { icon: false, px: PILLE_PX }), [label]);
  // Stufe gehört zu genau diesen Stufen – neuer Text = wieder von vorn
  const [stand, setStand] = useState({ stufen, i: 0 });
  const stufe = stand.stufen === stufen ? stand.i : 0;
  const ref = useRef<HTMLSpanElement | null>(null);
  const [messung, setMessung] = useState(0);
  // Neue Breite oder nachgeladene Schrift: von vorn messen
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    let breite = el.clientWidth;
    const neu = () => {
      setStand({ stufen, i: 0 });
      setMessung((m) => m + 1);
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (el.clientWidth !== breite) {
        breite = el.clientWidth;
        neu();
      }
    });
    ro?.observe(el);
    document.fonts?.ready.then(neu, () => {});
    return () => ro?.disconnect();
  }, [stufen]);
  // Läuft der Text über, die nächste Stufe (vor dem Zeichnen, also ohne Flackern)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    if (el.scrollWidth > el.clientWidth + 0.5 && stufe < stufen.length - 1) setStand({ stufen, i: stufe + 1 });
  }, [stufe, stufen, messung]);
  const s = stufen[Math.min(stufe, stufen.length - 1)];
  const cls = "flex h-11 min-w-0 max-w-full items-center active:scale-[0.97]";
  const inner = (
    <span
      ref={ref}
      className={`flex h-8 min-w-0 max-w-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-full bg-on-color font-extrabold text-on-photo-dark shadow-float ${s.eng ? "px-1.5" : "px-3"}`}
      style={{ fontSize: s.px }}
      data-knopf-stufe={stufe}
    >
      {s.text}
    </span>
  );
  const extra = { ...(data ? { [`data-${data}`]: true } : {}), "aria-label": label.replace(/\s*›$/, "") };
  return typeof open === "string" ? (
    <Link href={open} className={cls} onClick={(e) => e.stopPropagation()} {...extra}>
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      {...extra}
    >
      {inner}
    </button>
  );
}
