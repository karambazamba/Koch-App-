"use client";

// Fokus-Übungen (A-051, Tafel 138/4): kurzes Gespräch vor der Atem-Minute.
// „Eine Sache“: Mia fragt „Was ist jetzt das Wichtigste? Nur eine Sache.“ →
// Antwort (tippen; sprechen über die Diktier-Taste der Tastatur) → Karte
// „Steht oben“ (Aufgabe heute, ganz oben, Raum geraten) → „Gut. Jetzt eine
// Minute nur atmen, dann los.“ „Kopf leeren“: alles raus, Mia sortiert
// (Ergebnis-Karten wie im Gespräch), dann eine Minute Ruhe.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, SendHorizontal } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { ErgebnisKarten } from "@/components/begleitung/ErgebnisKarten";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { CARD, INPUT } from "@/components/ui/styles";
import type { AssistantData } from "@/lib/begleitung/ops";
import type { Ergebnis } from "@/lib/begleitung/ergebnis";
import { raumLabel, sichtRaum } from "@/lib/core/haushalt";
import { todayIso } from "@/lib/core/now";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { changeEntries, loadEntries } from "@/lib/kalender/store";
import { gelernteRaeume } from "@/lib/kalender/raum/gedaechtnis";
import type { CalendarEntry } from "@/lib/kalender/model";
import { ansageText } from "@/lib/durchatmen/ansagen";
import { sage } from "@/lib/durchatmen/anleitung";
import { eineSacheEintrag } from "@/lib/durchatmen/fokus";
import type { Art } from "@/lib/durchatmen/store";
import type { Uebung } from "@/lib/durchatmen/uebungen";
import { kopfLeeren } from "@/components/durchatmen/kopfLeeren";

/** Pause zwischen Mias letztem Satz und der Atem-Minute */
const BIS_ATMEN_MS = 2200;

function MiaSatz({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <BegleitungAvatar size={34} zustand="ruhig" />
      <p className={`${CARD} max-w-[80%] px-4 py-3 text-[16px] font-bold leading-snug text-ink`}>{children}</p>
    </div>
  );
}

const Gesagt = ({ text }: { text: string }) => <p className="ml-auto max-w-[80%] whitespace-pre-line rounded-card bg-accent px-4 py-3 text-[16px] font-bold leading-snug text-on-accent">{text}</p>;

const SENDEN = "hit flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-atem-tief text-atem-on active:scale-95 disabled:opacity-40";

export function FokusGespraech({ u, art, data, onAtmen, onClose, atmen }: { u: Uebung; art: Art; data: AssistantData | null; onAtmen: () => void; onClose: () => void; atmen: ReactNode }) {
  const [text, setText] = useState("");
  const [gesagt, setGesagt] = useState<string | null>(null);
  const [eintrag, setEintrag] = useState<CalendarEntry | null>(null);
  const [karten, setKarten] = useState<{ karten: Ergebnis[]; undo: (() => void) | null } | null>(null);
  const [fertig, setFertig] = useState(false);
  const [denkt, setDenkt] = useState(false);
  const haushalt = useHaushalt();
  const eine = u.id === "eine-sache";
  const weiterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (art === "stimme") sage(u.ansagen[0]);
    return () => {
      if (weiterTimer.current) clearTimeout(weiterTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);

  const danach = () => {
    setFertig(true);
    if (art === "stimme") sage(eine ? "dann-los" : "ruhe");
    weiterTimer.current = setTimeout(onAtmen, BIS_ATMEN_MS);
  };

  const senden = async () => {
    const t = text.trim();
    if (!t || gesagt) return;
    setGesagt(t);
    setText("");
    if (eine) {
      const e = eineSacheEintrag(t, { today: todayIso(), entries: loadEntries(), gelernt: gelernteRaeume() });
      if (e) {
        changeEntries((list) => [e, ...list]);
        setEintrag(e);
      }
      danach();
      return;
    }
    setDenkt(true);
    const r = data ? await kopfLeeren(t, data).catch(() => null) : null;
    setDenkt(false);
    setKarten(r ?? { karten: [], undo: null });
    danach();
  };

  return (
    <div className="flex w-full flex-col gap-3" data-fokus={u.id}>
      <MiaSatz>{ansageText(u.ansagen[0])}</MiaSatz>
      {gesagt === null ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void senden();
          }}
        >
          {eine ? (
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Die eine Sache" placeholder="Nur eine Sache …" autoFocus enterKeyHint="send" className={`${INPUT} flex-1 bg-surface`} />
          ) : (
            <MehrzeilenFeld value={text} onChange={setText} label="Was im Kopf ist" placeholder="Alles raus …" autoFocus className="flex-1 bg-surface" />
          )}
          <button type="submit" disabled={!text.trim()} aria-label={eine ? "Sichern" : "Sortieren"} className={SENDEN}>
            <SendHorizontal className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </form>
      ) : (
        <Gesagt text={gesagt} />
      )}
      {eintrag && (
        <div className={`${CARD} flex items-center gap-3 px-4 py-3`} data-steht-oben>
          <CircleCheck className="h-6 w-6 shrink-0" style={{ color: "var(--app-tile-aufgaben-ac)" }} strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold leading-snug">{eintrag.typ === "aufgabe" ? eintrag.data.title : ""}</span>
            <span className="block text-sm text-muted">Aufgabe · ganz oben · {raumLabel(sichtRaum(eintrag.raum, haushalt), haushalt)}</span>
          </span>
          <span className="shrink-0 rounded-full bg-good-pill px-2.5 py-1 text-[13px] font-extrabold text-on-good-pill">Steht oben</span>
        </div>
      )}
      {denkt && <MiaSatz>Ich sortier …</MiaSatz>}
      {karten && karten.karten.length > 0 && <ErgebnisKarten karten={karten.karten} undo={karten.undo ?? undefined} onClose={onClose} />}
      {fertig && <MiaSatz>{ansageText(eine ? "dann-los" : "ruhe")}</MiaSatz>}
      {atmen}
    </div>
  );
}
