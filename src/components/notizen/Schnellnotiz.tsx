"use client";

// Schnellnotiz (früher "Kladde") = angeheftete Notiz „Schnellnotiz“. Oben
// auf der Notizen-Seite „Schnell was notieren …“ (`QuickNoteCard`, hängt eine
// Zeile an), von der Startseite über den Stift an der Notizen-Kachel als
// weißes Fenster (`SchnellnotizSheet`: ca. 85 % hoch, Cursor am Ende). Dort
// und im Notiz-Editor: "<Name>, räum auf" und "Leeren" (Gelöscht · Rückgängig).

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, buttonClass } from "@/components/ui/styles";
import { appendLine, changeSchnellnotiz, loadSchnellnotiz, saveSchnellnotiz, useSchnellnotiz } from "@/lib/notizen";
import { now } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { openHelper } from "@/lib/begleitung/open";

const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** "17:12" der letzten Änderung */
export const shortClock = (iso: string | null | undefined) => (iso ? CLOCK.format(new Date(iso)) : "");

/** "gespeichert · gerade eben" bzw. "· 17:12" */
const savedLabel = (iso: string | null | undefined, typed: boolean) => (iso ? (typed || now().getTime() - new Date(iso).getTime() < 60_000 ? "gerade eben" : shortClock(iso)) : "");

/** ✨ aufräumen + Leeren (mit Rückgängig) */
export function SchnellnotizActions({ name, text, onTidy }: { name: string; text: string; onTidy?: () => void }) {
  if (!text.trim()) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onTidy?.();
          openHelper(undefined, "Räum meine Schnellnotiz auf");
        }}
        className={buttonClass("secondary", "sm")}
      >
        {name}, räum auf
      </button>
      <button type="button" onClick={() => showDeleted(pushUndo("das Leeren der Schnellnotiz", changeSchnellnotiz("")), "Geleert")} className={buttonClass("ghost", "sm")}>
        Leeren
      </button>
    </>
  );
}

/** Oben auf der Notizen-Seite: „Schnell was notieren …“ – Enter hängt die Zeile an die Schnellnotiz */
export function QuickNoteCard() {
  const [line, setLine] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      className={`${CARD} flex items-center gap-2 px-4 py-1.5`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!line.trim()) return;
        saveSchnellnotiz(appendLine(loadSchnellnotiz().text, line));
        setLine("");
        setDone(true);
      }}
    >
      <PenLine className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
      <input
        value={line}
        onChange={(e) => (setLine(e.target.value), setDone(false))}
        placeholder="Schnell was notieren …"
        aria-label="Schnell was notieren"
        enterKeyHint="done"
        className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
      />
      {done && !line && (
        <span className="shrink-0 text-sm font-semibold text-good-ink" role="status">
          Notiert
        </span>
      )}
    </form>
  );
}

/** Schnellnotiz-Fenster (von der Startseite) */
export function SchnellnotizSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const schnellnotiz = useSchnellnotiz();
  const area = useRef<HTMLTextAreaElement>(null);
  const [typed, setTyped] = useState(false);
  // Cursor ans Ende, Tastatur sofort offen
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [schnellnotiz === undefined]); // eslint-disable-line react-hooks/exhaustive-deps -- Fokus ans Ende nur einmal, sobald die Schnellnotiz geladen ist (nicht bei jedem Tippen)
  const text = schnellnotiz?.text ?? "";
  const saved = savedLabel(schnellnotiz?.geaendert, typed);
  return (
    <Sheet
      title="Schnellnotiz"
      onClose={onClose}
      tall
      header={
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-accent" strokeWidth={2.25} aria-hidden />
          <h2 className="flex-1 text-xl font-extrabold tracking-tight">Schnellnotiz</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full bg-accent px-5 text-sm font-bold text-on-accent active:scale-95">
            Fertig
          </button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-3 pb-3">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => {
            setTyped(true);
            saveSchnellnotiz(e.target.value);
          }}
          placeholder="Schnell was aufschreiben …"
          aria-label="Schnellnotiz"
          className="min-h-40 w-full flex-1 resize-none rounded-card border border-line bg-surface p-4 text-base leading-relaxed placeholder:text-faint focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SchnellnotizActions name={name} text={text} onTidy={onClose} />
          <span className="flex-1" />
          {text && saved && (
            <span className="text-xs text-muted" role="status">
              gespeichert · {saved}
            </span>
          )}
        </div>
      </div>
    </Sheet>
  );
}
