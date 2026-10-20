"use client";

// Schnellnotiz (früher "Kladde") = Schmierzettel, ein freier Text, speichert
// selbst. Oben auf der Notizen-Seite direkt beschreibbar (`SchnellnotizCard`),
// von der Startseite über ✎ an der Notizen-Kachel als Fenster
// (`SchnellnotizSheet`: ca. 85 % hoch, Tastatur sofort offen, Cursor am Ende).
// Beide mit "✨ <Name>, räum auf" und "Leeren" (Gelöscht · Rückgängig).

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { changeSchnellnotiz, saveSchnellnotiz, useSchnellnotiz } from "@/lib/notizen";
import { now } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { openHelper } from "@/lib/lotte/open";

const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** "17:12" der letzten Änderung */
export const shortClock = (iso: string | null | undefined) => (iso ? CLOCK.format(new Date(iso)) : "");

/** "gespeichert · gerade eben" bzw. "· 17:12" */
const savedLabel = (iso: string | null | undefined, typed: boolean) => (iso ? (typed || now().getTime() - new Date(iso).getTime() < 60_000 ? "gerade eben" : shortClock(iso)) : "");

/** ✨ aufräumen + Leeren (mit Rückgängig) */
function Actions({ name, text, onTidy }: { name: string; text: string; onTidy?: () => void }) {
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
        ✨ {name}, räum auf
      </button>
      <button type="button" onClick={() => showDeleted(pushUndo("das Leeren der Schnellnotiz", changeSchnellnotiz("")), "Geleert")} className={buttonClass("ghost", "sm")}>
        Leeren
      </button>
    </>
  );
}

/** Oben auf der Notizen-Seite: direkt beschreibbar */
export function SchnellnotizCard({ name }: { name: string }) {
  const schnellnotiz = useSchnellnotiz();
  const [typed, setTyped] = useState(false);
  const text = schnellnotiz?.text ?? "";
  const saved = text ? savedLabel(schnellnotiz?.geaendert, typed) : "";
  return (
    <section id="schnellnotiz" className="flex scroll-mt-24 flex-col gap-2 rounded-2xl border border-schnellnotiz-line bg-schnellnotiz p-4" aria-label="Schnellnotiz">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-schnellnotiz-ink" strokeWidth={2} aria-hidden />
        <h2 className="flex-1 text-xs font-bold uppercase tracking-wider text-schnellnotiz-ink">Schnellnotiz</h2>
        {saved && (
          <span className="text-xs text-muted" role="status">
            gespeichert · {saved}
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setTyped(true);
          saveSchnellnotiz(e.target.value);
        }}
        placeholder="Schnell was aufschreiben …"
        aria-label="Schnellnotiz"
        rows={4}
        className="min-h-24 w-full resize-y bg-transparent text-base leading-relaxed placeholder:text-muted/70 focus:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        <Actions name={name} text={text} />
      </div>
    </section>
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
  }, [schnellnotiz === undefined]); // eslint-disable-line react-hooks/exhaustive-deps
  const text = schnellnotiz?.text ?? "";
  const saved = savedLabel(schnellnotiz?.geaendert, typed);
  return (
    <Sheet
      title="Schnellnotiz"
      onClose={onClose}
      tall
      header={
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-schnellnotiz-ink" strokeWidth={2.25} aria-hidden />
          <h2 className="flex-1 text-xl font-extrabold tracking-tight">Schnellnotiz</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full bg-bar px-5 text-sm font-bold text-on-bar active:scale-95">
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
          className="min-h-40 w-full flex-1 resize-none rounded-2xl border border-schnellnotiz-line bg-schnellnotiz p-4 text-base leading-relaxed placeholder:text-muted/70 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Actions name={name} text={text} onTidy={onClose} />
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
