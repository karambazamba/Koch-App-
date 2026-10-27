"use client";

// Eine Bühne für jedes Gespräch mit Mia (Startseiten-Mia, „＋“, Wochencheck,
// Termin per Satz, Kochidee): die Seite dahinter bleibt verschwommen unter
// einem warmen Schleier sichtbar, oben ✕ und „Verlauf“, das Gespräch läuft
// oben mit, Mia steht groß im unteren Drittel. Sie fliegt beim Öffnen vom
// Mia-Knopf an ihren Platz und beim Schließen dorthin zurück. Antippen =
// zuhören ↔ fertig. Bewegung nur über transform/opacity (globals.css
// „Eine Bühne“); Bewegung reduzieren = nur Überblenden.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChefHat, History, ListChecks, Pin, ShoppingCart, StickyNote, X, type LucideIcon } from "lucide-react";
import { StageSheet } from "@/components/ui/Sheet";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import type { AvatarZustand } from "@/lib/core/avatarState";
import { STAGE_CENTER, STAGE_SIZE, type StageState } from "@/lib/begleitung/stage";

/** So lange fliegt Mia beim Schließen zurück an ihren Knopf */
const CLOSE_MS = 800;

const AVATAR: Record<StageState, AvatarZustand | undefined> = { zuhoeren: "zuhoeren", ueberlegen: "denken", sprechen: "sprechen", warten: undefined };

/** Wo der Mia-Knopf beim Öffnen war – Start und Ziel des Flugs */
let origin: DOMRect | null = null;
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;


/** Verschiebung von `el` zum Mia-Knopf (Ort und Größe zugleich) */
function towardOrigin(el: Element | null): string | undefined {
  const own = el?.getBoundingClientRect();
  if (!origin || !own?.width) return undefined;
  const dx = origin.left + origin.width / 2 - (own.left + own.width / 2);
  const dy = origin.top + origin.height / 2 - (own.top + own.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${origin.width / own.width})`;
}

/**
 * Schließen: die Bühne ist sofort weg (Verlauf, Tipps, nächstes Fenster gehen
 * gleich), nur eine Kopie von Mia fliegt zurück an ihren Knopf und der
 * Schleier blendet aus – beides fängt keine Tipps ab.
 */
function flyBack() {
  const mia = document.querySelector("[data-buehne-mia]");
  const rect = mia?.getBoundingClientRect();
  if (!mia || !rect?.width || !origin) return;
  const veil = document.createElement("div");
  veil.className = "mia-geist-schleier pointer-events-none fixed inset-0 z-40 bg-background/75 backdrop-blur-[14px]";
  const ghost = document.createElement("div");
  ghost.className = "mia-flug pointer-events-none fixed z-50";
  Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  ghost.setAttribute("aria-hidden", "true");
  ghost.appendChild(mia.cloneNode(true));
  document.body.append(veil, ghost);
  const to = towardOrigin(ghost);
  requestAnimationFrame(() => requestAnimationFrame(() => (ghost.style.transform = to ?? "")));
  window.setTimeout(() => (veil.remove(), ghost.remove()), CLOSE_MS);
}

/** Große Mia: Zustand, Wellen, Tonwelle, Satz darunter – ein Knopf (zuhören ↔ fertig) */
export function StageMia({ state, size = STAGE_SIZE.big, hint, label, done = false, pause = false, onTap }: { state: StageState; size?: number; hint?: string; label: string; done?: boolean; /** Stille nach dem letzten Wort: Mia blinzelt, ein dünner Ring läuft ab, dann wird abgeschickt */ pause?: boolean; onTap: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [flight, setFlight] = useState<string | undefined>(undefined);
  // Einfliegen: Start dort, wo der Knopf ist (eine Bewegung, Größe und Ort zugleich)
  useLayoutEffect(() => {
    origin = document.querySelector("[data-mia-knopf]")?.getBoundingClientRect() ?? origin;
    const from = towardOrigin(ref.current);
    if (!from) return;
    setFlight(from);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setFlight(undefined)));
    return () => cancelAnimationFrame(raf);
  }, []);
  const zustand = done ? "freuen" : AVATAR[state];
  return (
    <div className="flex flex-col items-center gap-2" data-daneben>
      {state === "zuhoeren" && (
        <span className="mia-tonwelle" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      )}
      <button
        ref={ref}
        type="button"
        data-buehne-mia
        onClick={onTap}
        aria-label={label}
        aria-pressed={state === "zuhoeren"}
        className={`mia-flug relative rounded-full ${(state === "warten" || pause) && !done ? "mia-zwinkern" : ""} ${done ? "mia-huepfer" : ""}`}
        style={{ transform: flight, width: size, height: size }}
      >
        {(state === "zuhoeren" || state === "warten") && (
          <>
            <span className={`mia-wellen ${state === "warten" ? "ruhig" : ""}`} aria-hidden />
            <span className={`mia-wellen zwei ${state === "warten" ? "ruhig" : ""}`} aria-hidden />
          </>
        )}
        <BegleitungAvatar size={size} groesse="gross" zustand={zustand} />
        {pause && (
          // Ring konzentrisch: feste Größe (Mia + 2 × 8 px), Mitte = Mitte des Knopfs; Start oben, läuft im Uhrzeigersinn ab
          <svg
            className="mia-pause-ring pointer-events-none absolute"
            style={{ width: size + 16, height: size + 16, left: -8, top: -8 }}
            viewBox="0 0 100 100"
            aria-hidden
            data-pause-ring
          >
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="var(--app-accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" pathLength="100" transform="rotate(-90 50 50)" />
          </svg>
        )}
      </button>
      {hint ? (
        <p key={hint} className="mia-text text-center text-[13px] font-semibold text-muted" role="status">
          {hint}
        </p>
      ) : (
        <span className="h-[18px]" aria-hidden />
      )}
    </div>
  );
}

/** Unterer Teil der Bühne: Mias Mittelpunkt bei ~64 % der Höhe (über der Safe-Area) */
export function StageFoot({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom flex shrink-0 flex-col items-center gap-1 px-4" style={{ height: `calc(${Math.round((1 - STAGE_CENTER) * 100)}dvh + ${STAGE_SIZE.big / 2 + 22}px)` }} data-daneben>
      {children}
    </div>
  );
}

const TOPIC_ICON: Record<string, LucideIcon> = { PINNWAND: Pin, TERMIN: CalendarDays, KOCHIDEE: ChefHat, WOCHENCHECK: ListChecks, AUFGABE: ListChecks, EINKAUF: ShoppingCart, NOTIZ: StickyNote };

/** Kleiner Bereichs-Kopf über Mias erster Blase („📌 PINNWAND“, „KOCHIDEE“ …) – Symbol als Linien-Icon */
export function StageTopic({ topic }: { topic?: string }) {
  if (!topic) return null;
  const Icon = TOPIC_ICON[topic];
  return (
    <p className="flex items-center gap-1.5 pl-11 text-[12px] font-extrabold tracking-[0.12em] text-accent-strong">
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
      {topic}
    </p>
  );
}

/** Mias Blase mit kleiner Mia daneben (nur bei der ersten Blase einer Folge) */
export function MiaBubble({ lead, children }: { lead: boolean; children: ReactNode }) {
  return (
    <div className="flex max-w-[92%] items-end gap-2 self-start">
      {lead ? <BegleitungAvatar size={36} /> : <span className="w-9 shrink-0" aria-hidden />}
      <div className="min-w-0 whitespace-pre-line rounded-card rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink">{children}</div>
    </div>
  );
}

/**
 * Eigene Blase (Orange) – beim Sprechen erscheint der Text live und wächst
 * mit; ist er sehr lang, zeigt sie die letzten Zeilen (oben leicht
 * ausgeblendet). `wartet`: gemerkt, geht nach Mias Antwort raus.
 */
export function OwnBubble({ children, live = false, wartet = false }: { children: ReactNode; live?: boolean; wartet?: boolean }) {
  return (
    <div className={`flex max-w-[85%] flex-col items-end gap-1 self-end ${live ? "opacity-90" : ""}`} data-eigene-blase={live ? "live" : wartet ? "wartet" : undefined}>
      <p className={`whitespace-pre-line rounded-card rounded-br-md bg-accent px-4 py-2.5 text-base leading-snug text-on-accent ${live ? "live-blase" : ""}`} aria-live={live ? "polite" : undefined}>
        {live ? <span className="live-blase-text">{children}</span> : children}
      </p>
      {wartet && <span className="text-[12px] font-semibold text-muted">wartet</span>}
    </div>
  );
}

/** Die Bühne selbst (Vollbild `StageSheet`): Kopf mit ✕ bzw. „Abbrechen“ und „Verlauf“; Schließen fliegt Mia zurück */
export function MiaLayer({ name, onClose, onHistory, history = false, inset = 0, children }: { name: string; onClose: () => void; onHistory?: () => void; history?: boolean; inset?: number; children: ReactNode }) {
  const close = () => {
    if (!reduced()) flyBack();
    onClose();
  };
  return (
      <StageSheet
        title={name}
        onClose={close}
        inset={inset}
        left={
          // Immer ✕ – wie jedes Fenster (Launch 1.0, auch im Wochencheck)
          <button type="button" onClick={close} aria-label="Schließen" className="hit flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-fill">
            <X className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
        }
        right={
          onHistory ? (
            <button type="button" onClick={onHistory} aria-pressed={history} className="hit flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold text-accent-strong active:bg-fill">
              <History className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Verlauf
            </button>
          ) : (
            <span className="w-20" aria-hidden />
          )
        }
      >
        {children}
      </StageSheet>
  );
}
