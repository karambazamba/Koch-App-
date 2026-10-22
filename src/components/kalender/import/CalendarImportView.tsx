"use client";

// /profil/kalender: Termine aus Apple- oder Google-Kalender übernehmen.
// Einmal per Datei (.ics): wählen → Vorschau („112 Termine gefunden · 8
// Serien · ab heute 46“), Zeitraum und Familie/Arbeit je Kalender →
// „Übernehmen“ → Meldung „46 Termine übernommen · Rückgängig“ (alle auf
// einmal). Das Lesen steckt in `lib/kalender/import` (erst hier geladen).
// Darunter dauerhaft verbinden per Kalender-Link (`AboSection`).

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { CARD, NOTE, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { SettingsPage } from "@/components/einstellungen/settings/SettingsParts";
import type { Room } from "@/lib/core/entries";
import { todayIso, nowIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { plural } from "@/lib/core/text";
import { changeEntries } from "@/lib/kalender/store";
import { parseIcs, type IcsCalendar } from "@/lib/kalender/import/ics";
import { mergeImport, planImport, summarize, type ImportRange } from "@/lib/kalender/import/plan";
import { AboSection } from "@/components/kalender/import/AboSection";

const SOURCE: Record<IcsCalendar["source"], string> = { google: "Google", apple: "Apple", ics: "Kalender" };
/** Kalender, die nach Arbeit klingen, starten in „Arbeit“ */
const workish = (name: string) => /arbeit|work|büro|job|dienst/i.test(name);

type Loaded = { cals: IcsCalendar[]; rooms: Room[] };

export function CalendarImportView() {
  const file = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [range, setRange] = useState<ImportRange>("ab-heute");
  const [error, setError] = useState("");
  const [report, setReport] = useState<string[]>([]);

  const read = async (files: FileList | null) => {
    setError("");
    setReport([]);
    const cals = (await Promise.all([...(files ?? [])].map(async (f) => parseIcs(await f.text())))).filter((c): c is IcsCalendar => c !== null && c.events.length > 0);
    if (!cals.length) {
      setLoaded(null);
      setError("Hm, da waren keine Termine drin – ist es eine Kalender-Datei (.ics)?");
      return;
    }
    const names = summarize(cals, todayIso()).map((s) => s.name);
    setLoaded({ cals, rooms: names.map((n) => (workish(n) ? "arbeit" : "familie")) });
  };

  const take = () => {
    if (!loaded) return;
    const today = todayIso();
    const plan = planImport(loaded.cals, { range, today, rooms: loaded.rooms });
    let counts = { added: 0, updated: 0 };
    const undo = changeEntries((entries) => {
      const merged = mergeImport(entries, plan.entries, nowIso());
      counts = { added: merged.added, updated: merged.updated };
      return merged.entries;
    });
    const total = counts.added + counts.updated;
    const text = `${plural(total, "Termin", "Termine")} übernommen`;
    pushUndo(text, undo);
    showToast({ text, undo, undoneText: "Wieder wie vorher" });
    setReport([
      ...(counts.updated ? [`${plural(counts.updated, "Termin war", "Termine waren")} schon da und ${counts.updated === 1 ? "ist" : "sind"} jetzt aktuell.`] : []),
      ...plan.expanded.map((x) => `„${x.title}“ (${x.rule}) kann unser Kalender nicht als Serie – ich habe ${plural(x.count, "einzelnen Termin", "einzelne Termine")} für die nächsten 12 Monate angelegt.`),
    ]);
    setLoaded(null);
    if (file.current) file.current.value = "";
  };

  const summary = loaded ? summarize(loaded.cals, todayIso()) : [];
  const sum = (k: "found" | "series" | "fromToday") => summary.reduce((n, s) => n + s[k], 0);

  return (
    <SettingsPage title="Kalender übernehmen" question="Termine aus Apple oder Google holen" note={false}>
      {() => (
        <>
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Einmal übernehmen">
            <h2 className={SECTION_TITLE}>Einmal übernehmen – per Datei</h2>
            <ul className="flex flex-col gap-1.5 text-[15px] text-muted">
              <li>
                <b className="text-ink">Google:</b> calendar.google.com → Einstellungen → Importieren &amp; exportieren → Exportieren. Die ZIP-Datei öffnen, darin liegt die .ics-Datei.
              </li>
              <li>
                <b className="text-ink">Apple:</b> Am Mac in „Kalender“ den Kalender wählen → Ablage → Exportieren.
              </li>
            </ul>
            <input ref={file} type="file" accept=".ics,text/calendar" multiple className="sr-only" id="kalender-datei" onChange={(e) => void read(e.target.files)} />
            <label htmlFor="kalender-datei" className={`${buttonClass("primary")} w-full cursor-pointer`}>
              <FileUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              Datei wählen
            </label>
            {error && <p className={NOTE}>{error}</p>}
          </section>

          {loaded && (
            <section className={`${CARD} flex flex-col gap-4 p-4`} aria-label="Vorschau">
              <p className="text-[17px] font-bold" data-testid="kalender-vorschau">
                {plural(sum("found"), "Termin", "Termine")} gefunden · {plural(sum("series"), "Serie", "Serien")} · ab heute {sum("fromToday")}
              </p>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-muted">Zeitraum</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRange("ab-heute")} className={chipClass(range === "ab-heute")} aria-pressed={range === "ab-heute"}>
                    Ab heute
                  </button>
                  <button type="button" onClick={() => setRange("alles")} className={chipClass(range === "alles")} aria-pressed={range === "alles"}>
                    Alles
                  </button>
                </div>
              </div>
              {summary.map((s, i) => (
                <div key={`${s.name}-${i}`} className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-muted">
                    {s.name} <span className="font-normal">({SOURCE[s.source]})</span>
                  </span>
                  <div className="flex gap-2" role="group" aria-label={`Raum für ${s.name}`}>
                    {(["familie", "arbeit"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={loaded.rooms[i] === r}
                        onClick={() => setLoaded({ ...loaded, rooms: loaded.rooms.map((x, j) => (j === i ? r : x)) })}
                        className={chipClass(loaded.rooms[i] === r)}
                      >
                        {r === "familie" ? "Familie" : "Arbeit"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={take} className={`${buttonClass("primary")} w-full`}>
                Übernehmen
              </button>
            </section>
          )}

          {report.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Bericht">
              {report.map((line) => (
                <li key={line} className={NOTE}>
                  {line}
                </li>
              ))}
            </ul>
          )}

          <AboSection />
        </>
      )}
    </SettingsPage>
  );
}
