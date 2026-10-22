"use client";

// Mia in der Mitte (Tafel 53): eine Vollbild-Ebene über verschwommenem
// Hintergrund. Oben ✕ und „Verlauf“, darunter die große Mia (fliegt beim
// Öffnen vom Knopf in die Mitte), eine kleine Status-Zeile (ICH HÖRE ZU … /
// ICH DENKE … / ERLEDIGT) und groß der Text: beim Zuhören das Gesagte (Tage,
// Uhrzeiten, Namen orange), danach Mias Antwort als Untertitel. Ab der
// zweiten Runde wird Mia kleiner. Schließen per ✕, Runterwischen, Zurück,
// Escape. Bewegung nur über transform/opacity (globals.css „Mia zuerst“).

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { History, X } from "lucide-react";
import { StageSheet } from "@/components/ui/Sheet";
import { readSentence } from "@/lib/kalender/sentence";
import { todayIso } from "@/lib/core/now";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";

export type StageStatus = "bereit" | "hoert" | "denkt" | "erledigt";

const STATUS_TEXT: Record<StageStatus, (name: string) => string> = {
  bereit: (n) => n.toUpperCase(),
  hoert: () => "ICH HÖRE ZU …",
  denkt: () => "ICH DENKE …",
  erledigt: () => "ERLEDIGT",
};

/** Kernwörter (Tag, Uhrzeit, Namen aus dem Haushalt) orange hervorheben */
function Highlighted({ text, names }: { text: string; names: string[] }) {
  const spans = readSentence(text, todayIso()).spans.map((s) => ({ ...s }));
  for (const n of names) {
    if (n.length < 2) continue;
    const re = new RegExp(`(?<![a-zäöüß])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-zäöüß])`, "gi");
    for (const m of text.matchAll(re)) spans.push({ start: m.index!, end: m.index! + m[0].length });
  }
  spans.sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let at = 0;
  spans.forEach((s, i) => {
    if (s.start < at) return;
    parts.push(text.slice(at, s.start));
    parts.push(
      <span key={i} className="text-accent-strong">
        {text.slice(s.start, s.end)}
      </span>,
    );
    at = s.end;
  });
  parts.push(text.slice(at));
  return <>{parts}</>;
}

/** Große Mia mit Status und Text – fliegt beim ersten Erscheinen vom Mia-Knopf in die Mitte */
export function MiaStage({ name, status, text, live, compact, names, done }: { name: string; status: StageStatus; text: string; live: boolean; compact: boolean; names: string[]; done: boolean }) {
  const avatar = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<string | undefined>(undefined);
  // Flug: Start dort, wo der Knopf ist (eine Bewegung, Größe und Ort zugleich)
  useLayoutEffect(() => {
    const button = document.querySelector("[data-mia-knopf]")?.getBoundingClientRect();
    const own = avatar.current?.getBoundingClientRect();
    if (!button || !own || !own.width) return;
    const dx = button.left + button.width / 2 - (own.left + own.width / 2);
    const dy = button.top + button.height / 2 - (own.top + own.height / 2);
    setFlight(`translate(${dx}px, ${dy}px) scale(${button.width / own.width})`);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setFlight(undefined)));
    return () => cancelAnimationFrame(raf);
  }, []);
  const size = compact ? 82 : 150;
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-2 text-center">
      <div ref={avatar} className={`mia-flug relative ${done ? "mia-huepfer" : ""}`} style={{ transform: flight }}>
        {status === "hoert" && (
          <>
            <span className="mia-wellen" aria-hidden />
            <span className="mia-wellen zwei" aria-hidden />
          </>
        )}
        <BegleitungAvatar size={size} groesse="gross" />
      </div>
      <p className="text-[13px] font-extrabold tracking-[0.12em] text-accent-strong" role="status">
        {STATUS_TEXT[status](name)}
      </p>
      {text && (
        <p key={live ? "live" : text} className={`mia-text max-w-md text-balance font-bold leading-snug text-ink ${compact ? "text-[19px]" : "text-[24px]"}`} aria-live="polite">
          {live ? <Highlighted text={text} names={names} /> : text}
        </p>
      )}
    </div>
  );
}

/** Die Ebene selbst (Vollbild-Fenster `StageSheet`): Kopf mit ✕ bzw. „Abbrechen“ und „Verlauf“ */
export function MiaLayer({ name, onClose, onHistory, history = false, inset = 0, closeText, children }: { name: string; onClose: () => void; onHistory?: () => void; history?: boolean; inset?: number; /** Text statt ✕ (z. B. „Abbrechen“) */ closeText?: string; children: ReactNode }) {
  return (
    <StageSheet
      title={name}
      onClose={onClose}
      inset={inset}
      left={
        closeText ? (
          <button type="button" onClick={onClose} className="hit min-h-11 px-2 text-[15px] font-semibold text-accent-strong">
            {closeText}
          </button>
        ) : (
          <button type="button" onClick={onClose} aria-label="Schließen" className="hit flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-fill">
            <X className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
        )
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
