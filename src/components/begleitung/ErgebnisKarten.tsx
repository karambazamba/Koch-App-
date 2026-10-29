"use client";

// Mias Ergebnis-Karten (A-037, Tafel 126 „Einfach erzählen. Mia sortiert.“):
// unter ihrem kurzen Satz pro Eintrag eine weiße Karte, nacheinander weich
// eingeblendet (0,15 s Abstand). Links das Symbol in der Kachelfarbe, Mitte
// fett der Inhalt (nie abgeschnitten, sonst schrumpft die Pille aufs
// Häkchen), darunter „Termin · Familie ⌄“ (Raum ändern, `RaumZeile`) bzw.
// „Einkauf · für alle“, rechts die grüne Pille. Mehr als 4: „und N weitere ⌄“.
// Darunter EINMAL „Rückgängig“ (10 s, nimmt alles dieser Antwort zurück),
// danach steht alles in „Mia hat schon …“. Vorschau (große Dinge): dieselbe
// Karte mit orangem „Übernehmen“ → grün. Karte antippen = Eintrag öffnen.
// Die Karten werden nicht vorgelesen (nur Mias Satz).

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarDays, Check, ChevronDown, CircleCheck, Heart, Pin, Refrigerator, ShoppingCart, StickyNote, Utensils, type LucideIcon } from "lucide-react";
import { ergebnisAusEintrag, leuchtZiele, sichtbareErgebnisse, unterzeile, weitereText, type Ergebnis, type ErgebnisArt } from "@/lib/begleitung/ergebnis";
import { raumLabel, sichtRaum } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { eintragAendern } from "@/lib/kalender/eintragen/oeffnen";
import { loadEntries } from "@/lib/kalender/store";
import { leuchtenVergessen } from "@/lib/heute/aufleuchten";
import { CARD, chipClass } from "@/components/ui/styles";
import { RaumZeile } from "@/components/kalender/raum/RaumBestaetigung";
import { ErgebnisLaden } from "@/components/einkauf/merken/ErgebnisLaden";
import { useHintSeen } from "@/lib/core/hints";
import { useShoppingSettings } from "@/lib/einkauf/listStore";
import { UMLEGEN_HINWEIS } from "@/lib/einkauf/merken/karte";

const SYMBOL: Record<ErgebnisArt, LucideIcon> = {
  termin: CalendarDays,
  aufgabe: CircleCheck,
  einkauf: ShoppingCart,
  pinnwand: Pin,
  notiz: StickyNote,
  haus: Refrigerator,
  essen: Utensils,
  familie: Heart,
};

/** „Rückgängig“ so lange wie überall bei Mia */
const UNDO_MS = 10_000;
/** Abstand beim Einblenden */
const VERSATZ_S = 0.15;

type Vorschau = { uebernommen: readonly string[]; onUebernehmen: (id: string) => void };

type Props = {
  karten: Ergebnis[];
  /** Nimmt alles dieser Antwort zurück */
  undo?: () => void;
  /** Bühne schließen (vor dem Öffnen eines Eintrags) */
  onClose: () => void;
  /** Große Dinge: „Übernehmen“ statt der grünen Pille, bis übernommen */
  vorschau?: Vorschau;
};

export function ErgebnisKarten({ karten, undo, onClose, vorschau }: Props) {
  const [offen, setOffen] = useState(false);
  const [undoShown, setUndoShown] = useState(Boolean(undo));
  const [undone, setUndone] = useState(false);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndoShown(false), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo]);
  const { zeigen, weitere } = sichtbareErgebnisse(karten, offen);
  // A-067: mit Laden-Plan einmal klein, wie man umlegt (bis man es einmal getan hat)
  const umlegenGesehen = useHintSeen("einkauf-umlegen");
  const plan = Boolean(useShoppingSettings()?.ladenPlan);
  const umlegen = plan && umlegenGesehen === false && !vorschau && !undone && karten.some((k) => k.laden);
  return (
    <section className={`flex w-full flex-col gap-2 pl-11 ${undone ? "opacity-50" : ""}`} aria-label={vorschau ? "Vorschlag" : "Eingetragen"} data-ergebnis-karten>
      <ul className="flex flex-col gap-2">
        {zeigen.map((k, i) => (
          <ErgebnisKarte key={k.id} karte={k} index={i} undone={undone} onClose={onClose} vorschau={vorschau} />
        ))}
      </ul>
      {umlegen && (
        <p className="px-1 text-[13px] text-muted" data-umlegen-hinweis>
          {UMLEGEN_HINWEIS}
        </p>
      )}
      {weitere > 0 && (
        <button type="button" onClick={() => setOffen(true)} className="hit inline-flex min-h-8 items-center gap-1 self-start px-1 text-[14px] font-bold text-muted" data-weitere>
          {weitereText(weitere)}
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {undo && undoShown && !undone && (
        <button
          type="button"
          onClick={() => {
            undo();
            leuchtenVergessen(leuchtZiele(karten));
            setUndone(true);
          }}
          className={`${chipClass(false, "muted")} self-start`}
        >
          Rückgängig
        </button>
      )}
    </section>
  );
}

/** Termin/Aufgabe aus den Regeln ohne KI (nur `turn.raum`): dieselbe Karte, aus dem Speicher gelesen */
export function EintragErgebnis({ eintrag, undo, onClose }: { eintrag: { id: string }; undo?: () => void; onClose: () => void }) {
  const [karte] = useState(() => {
    const e = loadEntries().find((x) => x.id === eintrag.id);
    return e && (e.typ === "termin" || e.typ === "aufgabe") ? ergebnisAusEintrag(e) : null;
  });
  return karte ? <ErgebnisKarten karten={[karte]} undo={undo} onClose={onClose} /> : null;
}

function ErgebnisKarte({ karte, index, undone, onClose, vorschau }: { karte: Ergebnis; index: number; undone: boolean; onClose: () => void; vorschau?: Vorschau }) {
  const haushalt = useHaushalt();
  const Icon = SYMBOL[karte.art];
  const offenerVorschlag = Boolean(vorschau && !vorschau.uebernommen.includes(karte.id));
  const text = useRef<HTMLSpanElement>(null);
  // Mehr als 2 Zeilen? Dann schrumpft die Pille aufs Häkchen (der Text wird nie abgeschnitten)
  const [kurz, setKurz] = useState(false);
  useLayoutEffect(() => {
    const el = text.current;
    if (!el || kurz) return;
    const pruefen = () => {
      const zeile = parseFloat(getComputedStyle(el).lineHeight) || 20;
      if (el.scrollHeight > zeile * 2 + 2) setKurz(true);
    };
    pruefen();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(pruefen) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [kurz]);
  const raumName = karte.raum ? raumLabel(sichtRaum(karte.raum, haushalt), haushalt) : null;
  const farbe = { background: `var(--app-tile-${karte.kachel})`, color: `var(--app-tile-${karte.kachel}-ac)` } as CSSProperties;
  const oeffnen = () => {
    onClose();
    const e = karte.eintragId ? loadEntries().find((x) => x.id === karte.eintragId) : null;
    if (e) window.setTimeout(() => eintragAendern(e), 0);
  };
  const ziel = !undone && !offenerVorschlag;
  return (
    <li className={`ergebnis-karte ${CARD} relative flex min-h-16 items-center gap-3 px-3 py-2.5`} style={{ animationDelay: `${index * VERSATZ_S}s` }} data-ergebnis={karte.art}>
      {/* Ganze Karte = Eintrag öffnen (Raum-Zeile und Knopf liegen darüber) */}
      {ziel && karte.eintragId ? (
        <button type="button" onClick={oeffnen} className="absolute inset-0 rounded-card" aria-label={`${karte.text} öffnen`} />
      ) : ziel && karte.href ? (
        <Link href={karte.href} onClick={onClose} className="absolute inset-0 rounded-card" aria-label={`${karte.text} öffnen`} />
      ) : null}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field" style={farbe} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span ref={text} className={`text-[15px] font-bold leading-snug text-ink [overflow-wrap:anywhere] ${undone ? "line-through" : ""}`} data-ergebnis-text>
          {karte.text}
        </span>
        {karte.raum && karte.eintragId && !offenerVorschlag ? (
          <RaumZeile eintrag={{ id: karte.eintragId, raum: karte.raum }} art={karte.artText} aus={undone} />
        ) : karte.laden && !offenerVorschlag ? (
          // Einkauf (A-041): „Rewe · wie immer ⌄“, antippen = anderer Laden
          <ErgebnisLaden sache={karte.laden.sache} gesagt={karte.laden.gesagt} art={karte.artText} aus={undone} />
        ) : (
          <span className="text-[13px] font-semibold leading-snug text-muted">{unterzeile(karte, raumName)}</span>
        )}
      </div>
      {offenerVorschlag ? (
        <button type="button" onClick={() => vorschau!.onUebernehmen(karte.id)} className="hit relative z-10 inline-flex h-9 shrink-0 items-center rounded-full bg-accent px-3.5 text-[14px] font-extrabold text-on-accent active:scale-95">
          Übernehmen
        </button>
      ) : (
        !undone && <Pille text={karte.pille} kurz={kurz} />
      )}
    </li>
  );
}

function Pille({ text, kurz }: { text: string; kurz: boolean }) {
  return (
    <span className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-good-pill text-[13px] font-extrabold text-on-good-pill ${kurz ? "w-8 justify-center" : "px-3"}`} data-pille={kurz ? "kurz" : "lang"}>
      <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
      {kurz ? <span className="sr-only">{text}</span> : text}
    </span>
  );
}
