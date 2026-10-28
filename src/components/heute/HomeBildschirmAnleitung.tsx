"use client";

// „Zeig’s mir“ (A-027): EIN Fenster mit drei einfachen, eigenen Skizzen (keine
// fremden Bildschirmfotos) – iPhone: Teilen → „Zum Home-Bildschirm“ →
// „Hinzufügen“; Android: Menü ⋮ → „App installieren“ → „Installieren“. Die
// Zeichen sind Linien-Icons (Share, MoreVertical, Plus), nie Emojis. Auch die
// kleine Skizze auf der Karte (`MiniSkizze`) kommt von hier.

import type { ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Copy, MoreVertical, Plus, Share } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { BrandMark } from "@/components/ui/BrandMark";
import { HOME_SCHRITTE, HOME_TITEL } from "@/lib/core/homeBildschirm";

type Weg = "ios" | "android";

/** Hervorgehobenes Symbol (wie gerade angetippt) */
function Ring({ children }: { children: ReactNode }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-strong ring-2 ring-accent">{children}</span>;
}

/** Eine Zeile im Menü der Skizze; `an` = die richtige */
function MenueZeile({ text, icon, an = false }: { text: string; icon?: ReactNode; an?: boolean }) {
  return (
    <span className={`flex h-8 items-center justify-between gap-2 rounded-field px-2.5 text-[12px] font-semibold ${an ? "bg-accent-soft text-accent-strong ring-2 ring-accent" : "text-muted"}`}>
      {text}
      {icon}
    </span>
  );
}

/** Rahmen einer Skizze: ein angedeuteter Handy-Ausschnitt */
function Rahmen({ children, unten = false }: { children: ReactNode; unten?: boolean }) {
  return <div className={`flex h-[92px] w-full flex-col rounded-field border border-line bg-fill p-2 ${unten ? "justify-end" : "justify-start"}`}>{children}</div>;
}

const plus = <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />;

function Skizze({ weg, schritt }: { weg: Weg; schritt: number }) {
  if (schritt === 2)
    return (
      <Rahmen>
        <span className="grid grid-cols-4 gap-2 p-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-9 w-9 rounded-icon bg-line" />
          ))}
          <span className="flex h-9 w-9 items-center justify-center rounded-icon ring-2 ring-accent ring-offset-2 ring-offset-fill">
            <BrandMark variant="icon" height={36} />
          </span>
        </span>
      </Rahmen>
    );
  if (weg === "ios") {
    if (schritt === 0)
      return (
        <Rahmen unten>
          <span className="flex items-center justify-around rounded-field bg-surface px-1 py-1 text-muted">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <ChevronRight className="h-4 w-4" aria-hidden />
            <Ring>
              <Share className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </Ring>
            <BookOpen className="h-4 w-4" aria-hidden />
            <Copy className="h-4 w-4" aria-hidden />
          </span>
        </Rahmen>
      );
    return (
      <Rahmen>
        <span className="flex flex-col gap-1 rounded-field bg-surface p-1">
          <MenueZeile text="Kopieren" />
          <MenueZeile text="Zum Home-Bildschirm" icon={plus} an />
        </span>
      </Rahmen>
    );
  }
  if (schritt === 0)
    return (
      <Rahmen>
        <span className="flex items-center justify-between rounded-field bg-surface px-2 py-1 text-[11px] text-muted">
          <span className="h-3 w-24 rounded-full bg-line" />
          <Ring>
            <MoreVertical className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </Ring>
        </span>
      </Rahmen>
    );
  return (
    <Rahmen>
      <span className="ml-auto flex w-[75%] flex-col gap-1 rounded-field bg-surface p-1">
        <MenueZeile text="Neuer Tab" />
        <MenueZeile text="App installieren" an />
      </span>
    </Rahmen>
  );
}

export function HomeBildschirmAnleitung({ weg, onClose }: { weg: Weg; onClose: () => void }) {
  return (
    <Sheet title={HOME_TITEL} onClose={onClose}>
      <ol className="flex flex-col gap-4 pb-2" data-home-anleitung={weg}>
        {HOME_SCHRITTE[weg].map((text, i) => (
          <li key={text} className="flex flex-col gap-2">
            <p className="text-[16px] font-semibold leading-snug">
              <span className="mr-1.5 text-accent-strong">{i + 1}.</span>
              {text}
            </p>
            <Skizze weg={weg} schritt={i} />
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/** Kleine Skizze auf der Karte: Teilen bzw. Menü → Zeile mit ＋ */
export function MiniSkizze({ weg }: { weg: Weg }) {
  return (
    <span className="flex items-center gap-2 text-muted" aria-hidden data-home-skizze>
      <span className="flex h-8 w-8 items-center justify-center rounded-field border border-line bg-surface text-accent-strong">
        {weg === "ios" ? <Share className="h-4 w-4" strokeWidth={2.25} /> : <MoreVertical className="h-4 w-4" strokeWidth={2.25} />}
      </span>
      <ArrowRight className="h-4 w-4" />
      <span className="flex h-8 items-center gap-2 rounded-field border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink">
        {weg === "ios" ? "Zum Home-Bildschirm" : "App installieren"}
        {weg === "ios" && <Plus className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />}
      </span>
    </span>
  );
}
