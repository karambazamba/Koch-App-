"use client";

// Fenster „Liste einfügen“: großes Feld, darunter die Vorschau („37 Aufgaben
// gefunden · 12 mit Datum · 3 Listen (Haus, Arbeit, Kinder)“) zum Abwählen,
// „Alle übernehmen“ / „Nur mit Datum“. Doppelte werden nicht zweimal
// angelegt („4 schon vorhanden“). Kleine Anleitung je nach Gerät.

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, NOTE, SUBTLE, buttonClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { todayIso } from "@/lib/core/now";
import { dayWord, shortDay } from "@/lib/core/schnelleingabe";
import { changeEntries, loadEntries } from "@/lib/kalender/store";
import { hatDatum, listSummary, readPastedList, splitDuplicates, toAufgaben, type ListZeile } from "@/lib/kalender/liste/einfuegen";

/** „bis Fr, 23. Okt“, „Morgen · Do“ – leer ohne Datum */
function wann(z: ListZeile, today: string): string {
  const d = z.data;
  if (d.due) return `bis ${shortDay(d.due)}`;
  if (d.date) return dayWord(d.date, today);
  return d.repeat ? "regelmäßig" : "";
}

function anleitung(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|Macintosh/.test(ua)) return "Apple Erinnerungen: Liste öffnen → „…“ → „Erinnerungen auswählen“ → alle antippen → „Kopieren“. Dann hier einfügen.";
  if (/Android/.test(ua)) return "Aus Google Notizen, Todoist oder einer Notiz: Text lange drücken → „Alles auswählen“ → „Kopieren“. Dann hier einfügen.";
  return "Liste in der anderen App markieren, kopieren und hier einfügen.";
}

export function ListeEinfuegen({ initial, onClose }: { initial: string; onClose: () => void }) {
  const today = todayIso();
  const [text, setText] = useState(initial);
  const [preview, setPreview] = useState(Boolean(initial.trim()));
  const [off, setOff] = useState<Set<number>>(() => new Set());
  const read = useMemo(() => {
    const lesung = readPastedList(text, today);
    return { ...lesung, ...splitDuplicates(lesung.zeilen, loadEntries()) };
  }, [text, today]);
  const chosen = read.neu.filter((_, i) => !off.has(i));
  const dated = read.neu.filter(hatDatum);

  const save = (zeilen: ListZeile[]) => {
    if (!zeilen.length) return onClose();
    const tasks = toAufgaben(zeilen);
    const undo = changeEntries((list) => [...list, ...tasks]);
    const label = `${tasks.length} ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}`;
    showToast({
      text: `Eingetragen: ${label}`,
      undo: pushUndo(label, undo),
      undoneText: "Wieder weg",
      seconds: 4,
      small: true,
    });
    onClose();
  };

  return (
    <Sheet title="Liste einfügen" onClose={onClose} tall above>
      {!preview ? (
        <div className="flex flex-col gap-3 pb-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Liste hier einfügen"
            aria-label="Liste hier einfügen"
            autoFocus
            rows={9}
            className={`${INPUT_BASE} min-h-48 w-full resize-none px-4 py-3 leading-relaxed`}
          />
          <p className={SUBTLE}>Jede Zeile wird eine Aufgabe. Kästchen und Abgehaktes räume ich weg, Überschriften werden Listen.</p>
          <p className={NOTE}>{anleitung()}</p>
          <button type="button" onClick={() => (setOff(new Set()), setPreview(true))} disabled={!read.zeilen.length} className={`${buttonClass("primary", "lg")} disabled:opacity-40`}>
            Weiter
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-2" data-liste-vorschau>
          <p className="text-[17px] font-bold leading-snug" role="status">
            {read.neu.length ? listSummary(read.neu) : "Das steht schon alles drin."}
          </p>
          {(read.vorhanden > 0 || read.abgehakt > 0) && (
            <p className={SUBTLE}>{[read.vorhanden ? `${read.vorhanden} schon vorhanden` : "", read.abgehakt ? `${read.abgehakt} schon abgehakt` : ""].filter(Boolean).join(" · ")}</p>
          )}
          {read.neu.length > 0 && (
            <ul className="flex flex-col divide-y divide-line rounded-field border border-line" aria-label="Gefundene Aufgaben">
              {read.neu.map((z, i) => {
                const on = !off.has(i);
                const when = wann(z, today);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setOff((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set([...s, i])))}
                      className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-on-accent" : "border-line"}`} aria-hidden>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${on ? "" : "text-muted line-through"}`}>{z.title}</span>
                      {(when || z.liste) && <span className="shrink-0 text-[13px] text-muted">{[when, z.liste].filter(Boolean).join(" · ")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-col gap-2 pt-1">
            {read.neu.length > 0 && (
              <button type="button" onClick={() => save(chosen)} className={buttonClass("primary", "lg")}>
                {off.size ? `${chosen.length} übernehmen` : "Alle übernehmen"}
              </button>
            )}
            {dated.length > 0 && dated.length < read.neu.length && (
              <button type="button" onClick={() => save(dated)} className={buttonClass("secondary", "lg")}>
                Nur mit Datum
              </button>
            )}
            <button type="button" onClick={() => setPreview(false)} className="hit self-center text-[15px] font-semibold text-muted">
              Liste ändern
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
