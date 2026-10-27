"use client";

// Schnellnotiz = schnell eine eigene Notiz. Oben auf der Notizen-Seite das
// Schnellfeld (`QuickNoteCard`): mehrzeilig, Return = neue Zeile, „Sichern“
// erscheint, sobald Text drin ist; erste Zeile = Titel. Von der Startseite
// öffnet der Stift an der Notizen-Kachel die Schnelleingabe „Neue Notiz“.

import { useState } from "react";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { CARD, buttonClass } from "@/components/ui/styles";
import { changeNotes, noteFromText, upsertNote } from "@/lib/notizen";

const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** "17:12" der letzten Änderung */
export const shortClock = (iso: string | null | undefined) => (iso ? CLOCK.format(new Date(iso)) : "");

/** Oben auf der Notizen-Seite: schnell eine eigene Notiz aufschreiben */
export function QuickNoteCard() {
  const [text, setText] = useState("");
  const ready = Boolean(text.trim());
  const save = () => {
    const note = noteFromText(text);
    if (!note) return;
    changeNotes((all) => upsertNote(all, note));
    setText("");
  };
  return (
    <section className={`${CARD} flex flex-col gap-2 p-3`} aria-label="Schnell was aufschreiben" data-schnellfeld>
      <MehrzeilenFeld value={text} onChange={setText} label="Schnell was aufschreiben" placeholder="Schnell was aufschreiben …" className="border-0 bg-fill" />
      <div className="flex min-h-11 items-center justify-between gap-2 px-1">
        <span className="text-[13px] text-faint">Return = neue Zeile</span>
        {ready && (
          <button type="button" onClick={save} onPointerDown={(e) => e.preventDefault()} className={buttonClass("primary", "sm")}>
            Sichern
          </button>
        )}
      </div>
    </section>
  );
}
