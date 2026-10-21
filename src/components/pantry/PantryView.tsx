"use client";

import { useState } from "react";
import { ArrowUp, Carrot, Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { openHelper } from "@/lib/lotte/open";
import { formatAmount, parseAmount } from "@/lib/essen/cookbook";
import { parseLeftovers } from "@/lib/essen/leftovers/parser";
import {
  PANTRY_PLACES,
  PANTRY_UNITS,
  addPantryItems,
  formatPantryItem,
  removePantryItem,
  updatePantryItem,
  usePantry,
  type PantryItem,
  type PantryPlace,
} from "@/lib/essen/pantry";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";

const SHORT_DATE = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric" });

/**
 * /vorrat: was zu Hause ist – Reiter Kühlschrank (die frühere Liste "Noch
 * da"), Tiefkühler und Vorratsschrank. Antippen = ändern, verschieben oder
 * löschen; "Spontan kochen" macht daraus Ideen.
 */
export function PantryView() {
  const pantry = usePantry();
  const profile = useProfile();
  const today = useToday();
  const [place, setPlace] = useState<PantryPlace>("kuehlschrank");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [input, setInput] = useState("");
  const [hint, setHint] = useState("");

  if (pantry === undefined || profile === undefined || !today) {
    return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  }
  const name = helperName(profile);
  const items = pantry.filter((p) => p.place === place);
  const label = PANTRY_PLACES.find((p) => p.value === place)!;

  const add = async () => {
    const parsed = await parseLeftovers(input);
    const known = parsed.filter((p) => p.known);
    // Hier wird bewusst eingetragen – auch Unbekanntes so übernehmen, wie geschrieben
    const all = [...known, ...parsed.filter((p) => !p.known).map((p) => ({ ...p, name: p.suggestion ?? p.name }))];
    if (!all.length) {
      setHint("Schreib z. B. „2 Karotten, Joghurt“.");
      return;
    }
    addPantryItems(all.map(({ name: n, amount, unit }) => ({ name: n, amount, unit, place })), toIsoDate(today));
    setInput("");
    setHint("");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Vorrat" />
      <main className={PAGE_MAIN}>
        <Segmented
          label="Ort"
          value={place}
          onChange={setPlace}
          options={PANTRY_PLACES.map((p) => ({ value: p.value, label: p.short }))}
        />
        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label={label.label}>
          <h2 className={SECTION_TITLE}>
            {label.emoji} {place === "kuehlschrank" ? "Noch da" : label.label}
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted">
              {place === "kuehlschrank"
                ? `Noch nichts eingetragen – erzähl ${name} einfach, was übrig ist.`
                : `Hier ist noch nichts eingetragen.`}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => setEditing(item)} className={chipClass(true)}>
                    {formatPantryItem(item)}
                    {place === "tiefkuehler" && item.addedAt && (
                      <span className="text-xs font-normal opacity-70">seit {SHORT_DATE.format(new Date(`${item.addedAt}T12:00:00`))}</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Antippen zum Ändern, Verschieben oder Löschen.</p>
            </>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={place === "tiefkuehler" ? "z. B. 2 Hähnchenbrust" : "z. B. 2 Karotten, Joghurt"}
              aria-label={`In ${label.label} eintragen`}
              enterKeyHint="done"
              className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
            />
            <button type="submit" disabled={!input.trim()} aria-label="Eintragen" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-field bg-accent text-on-accent shadow-sm active:scale-95 disabled:opacity-40">
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </form>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </section>

        <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("primary", "lg")} w-full`}>
          <Carrot className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Spontan kochen mit {name}
        </button>
      </main>

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditSheet({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(formatAmount(item.amount));
  const [unit, setUnit] = useState(item.unit);
  const [place, setPlace] = useState(item.place);
  const [y, m, d] = item.addedAt.split("-");

  return (
    <Sheet title="Im Vorrat ändern" onClose={onClose}>
      {item.addedAt && (
        <p className="text-sm text-muted">
          Eingetragen am {Number(d)}.{Number(m)}.{y}
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Menge"
          aria-label="Menge"
          className={`${INPUT_BASE} h-12 w-20 shrink-0 px-2 text-center`}
        />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit" className={`${INPUT_BASE} h-12 w-24 shrink-0 px-2`}>
          {PANTRY_UNITS.map((u) => (
            <option key={u} value={u}>
              {u || "–"}
            </option>
          ))}
        </select>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Zutat" className={`${INPUT_BASE} h-12 flex-1 px-3`} />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wo liegt es?">
        {PANTRY_PLACES.map((p) => (
          <button key={p.value} type="button" role="radio" aria-checked={place === p.value} onClick={() => setPlace(p.value)} className={chipClass(place === p.value)}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            removePantryItem(item.id);
            onClose();
          }}
          className={buttonClass("danger", "lg")}
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Löschen
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            updatePantryItem(item.id, { name: name.trim(), amount: parseAmount(amount), unit, place });
            onClose();
          }}
          className={buttonClass("primary", "lg")}
        >
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
