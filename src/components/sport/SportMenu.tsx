"use client";

// „•••“ der Sport-Seite (A-044, Tafel 132): hier liegt der Rest. Wochenziel
// (1×–7× oder „Ohne Ziel“), Packlisten, Meine Sportarten und „Erinnerung am
// Vorabend“ (Schalter, Standard aus; 19:00, zählt zur Regel höchstens 1
// Mitteilung am Tag). Aktueller Wert rechts.

import { useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST, INPUT, buttonClass } from "@/components/ui/styles";
import { forgetSport, rememberSport, setPack, setSportErinnerung, setSportGoal } from "@/lib/sport/actions";
import { SPORTS, packFor, sportById, type SportState } from "@/lib/sport";
import { buzz } from "@/components/heute/actions";
import { SportIcon } from "@/components/sport/SportIcon";

const ROW = "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background";

/** Meine Sportarten: zuletzt genutzte und eigene (ohne doppelte) */
const meineSportarten = (state: Pick<SportState, "custom">, recent: readonly string[]) => [...new Set([...recent, ...state.custom])];

export function SportMenu({ state, recent }: { state: SportState; recent: string[] }) {
  const [open, setOpen] = useState<"menu" | "packs" | "sports" | null>(null);
  const [pack, setPackFor] = useState<string | null>(null);
  const meine = meineSportarten(state, recent);
  const packs = [...new Set([...meine, "laufen", "fitness"])].slice(0, 6);
  const label = (ids: string[]) => ids.map((id) => sportById(id).label).join(", ");
  return (
    <>
      <button type="button" onClick={() => setOpen("menu")} aria-label="Mehr" className="hit flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-fill text-ink active:scale-95">
        <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      </button>
      {open === "menu" && (
        <Sheet title="Sport" onClose={() => setOpen(null)}>
          <ul className={`${CARD_LIST} mb-3`}>
            <li>
              <label className={ROW}>
                <span className="flex-1 text-base font-bold">Wochenziel</span>
                <span className="relative flex items-center gap-1 text-[15px] font-semibold text-muted">
                  <select
                    value={state.goal === null ? "ohne" : String(state.goal)}
                    onChange={(e) => {
                      setSportGoal(e.target.value === "ohne" ? null : Number(e.target.value));
                      buzz();
                    }}
                    className="hit appearance-none bg-transparent pr-5 text-right text-base font-semibold text-muted"
                    aria-label="Wochenziel"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                    <option value="ohne">Ohne Ziel</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
              </label>
            </li>
            <li>
              <button type="button" onClick={() => setOpen("packs")} className={ROW}>
                <span className="flex-1 text-base font-bold">Packlisten</span>
                <span className="max-w-[50%] truncate text-[15px] text-muted">{label(packs.slice(0, 2))}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2.25} aria-hidden />
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setOpen("sports")} className={ROW}>
                <span className="flex-1 text-base font-bold">Meine Sportarten</span>
                <span className="max-w-[50%] truncate text-[15px] text-muted">{meine.length ? label(meine) : "Noch keine"}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2.25} aria-hidden />
              </button>
            </li>
            <li>
              <label className={`${ROW} cursor-pointer`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-bold">Erinnerung am Vorabend</span>
                  <span className="text-sm text-muted">Um 19 Uhr, wenn morgen ein Training geplant ist.</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={state.erinnerung}
                  onChange={(e) => {
                    setSportErinnerung(e.target.checked);
                    buzz();
                  }}
                  aria-label="Erinnerung am Vorabend"
                  className="h-6 w-6 shrink-0 accent-accent"
                />
              </label>
            </li>
          </ul>
        </Sheet>
      )}
      {open === "packs" && (
        <Sheet title="Packlisten" onClose={() => setOpen("menu")}>
          <ul className={`${CARD_LIST} mb-3`}>
            {packs.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => setPackFor(id)} className={ROW} aria-label={`Packliste ${sportById(id).label} bearbeiten`}>
                  <SportIcon sport={id} className="h-5 w-5 text-accent" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-bold">{sportById(id).label}</span>
                    <span className="truncate text-sm text-muted">{packFor(state, id).join(", ")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {open === "sports" && <SportartenSheet state={state} meine={meine} onClose={() => setOpen("menu")} />}
      {pack && <PackSheet sport={pack} items={packFor(state, pack)} onClose={() => setPackFor(null)} />}
    </>
  );
}

function SportartenSheet({ state, meine, onClose }: { state: SportState; meine: string[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const known = SPORTS.map((s) => s.id);
  return (
    <Sheet title="Meine Sportarten" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3">
        {meine.length > 0 && (
          <ul className={CARD_LIST}>
            {meine.map((id) => (
              <li key={id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <SportIcon sport={id} className="h-5 w-5 text-accent" />
                <span className="flex-1 text-base font-bold">{sportById(id).label}</span>
                {state.custom.includes(id) && !known.includes(id) && (
                  <button type="button" onClick={() => (forgetSport(id), buzz())} className="hit flex h-11 w-11 items-center justify-center text-muted" aria-label={`${id} entfernen`}>
                    <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            rememberSport(name);
            buzz();
            setName("");
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Tennis" maxLength={30} className={INPUT} aria-label="Eigene Sportart" />
          <button type="submit" disabled={!name.trim()} className={buttonClass("secondary", "md")}>
            Dazu
          </button>
        </form>
      </div>
    </Sheet>
  );
}

function PackSheet({ sport, items, onClose }: { sport: string; items: string[]; onClose: () => void }) {
  const [text, setText] = useState(items.join(", "));
  return (
    <Sheet title={`Packliste ${sportById(sport).label}`} onClose={onClose}>
      <form
        className="flex flex-col gap-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPack(sport, text.split(/[,\n]/));
          buzz();
          onClose();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Was kommt mit? (mit Komma getrennt)</span>
          <input value={text} onChange={(e) => setText(e.target.value)} className={INPUT} aria-label="Packliste" />
        </label>
        <button type="submit" className={buttonClass("primary", "lg")}>
          Speichern
        </button>
      </form>
    </Sheet>
  );
}
