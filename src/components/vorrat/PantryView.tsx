"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Carrot, Check, Hourglass, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { openHelper } from "@/lib/begleitung/open";
import { formatAmount, parseAmount } from "@/lib/essen/cookbook";
import { parseLeftovers } from "@/lib/essen/leftovers/parser";
import {
  PANTRY_PLACES,
  PANTRY_UNITS,
  addPantryItems,
  removePantryItem,
  updatePantryItem,
  usePantry,
  type PantryItem,
  type PantryPlace,
} from "@/lib/vorrat/pantry";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { soonToUse } from "@/lib/essen/dishIdeas";
import { placeFor, replacePantry, loadPantry } from "@/lib/vorrat/pantry";
import { markMoved, toPutAway, useMovedKeys } from "@/lib/vorrat/einraeumen";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { showDeleted } from "@/lib/core/toast";
import { PANTRY, sortBy, via } from "@/lib/core/sort";
import { pushUndo } from "@/lib/core/undo";

const SHORT_DATE = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric" });

/**
 * /vorrat: was zu Hause ist – Reiter Kühlschrank, Tiefkühler, Schrank. Oben
 * (nur wenn passend) „Vom Einkauf einräumen“ und „Bald aufbrauchen“ mit
 * Menge −/+ und „Rezept dazu“; darunter je Ort eine Liste mit Menge −/+.
 * Antippen = ändern, verschieben oder löschen; „Spontan kochen“ macht Ideen.
 */
export function PantryView() {
  const pantry = usePantry();
  const profile = useProfile();
  const today = useToday();
  const [place, setPlace] = useState<PantryPlace>("kuehlschrank");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [input, setInput] = useState("");
  const [hint, setHint] = useState("");
  const shopping = useWeekShoppingList("current");
  const moved = useMovedKeys(shopping?.weekStart);

  if (pantry === undefined || profile === undefined || !today) {
    return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  }
  const name = helperName(profile);
  const label = PANTRY_PLACES.find((p) => p.value === place)!;
  const todayIso = toIsoDate(today);
  const soon = soonToUse(pantry, todayIso);
  // Regel `PANTRY`: Bald aufbrauchen → Ort → Name
  const items = sortBy(
    pantry.filter((p) => p.place === place),
    ...via((p: PantryItem) => ({ name: p.name, place: p.place, soon: soon.includes(p) }), PANTRY),
  );
  const putAway = shopping ? toPutAway(shopping.list.items, pantry, moved) : [];

  const putAwayAll = () => {
    if (!shopping) return;
    const before = loadPantry();
    addPantryItems(putAway.map((i) => ({ name: i.name, amount: null, unit: "", place: placeFor(i.name) })), todayIso);
    markMoved(shopping.weekStart, putAway.map((i) => i.key));
    pushUndo("Einkauf eingeräumt", () => replacePantry(before));
  };

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
        {putAway.length > 0 && (
          <section className="flex items-center gap-3 rounded-card border border-good-soft bg-good-soft px-4 py-3" aria-label="Vom Einkauf einräumen">
            <ShoppingBag className="h-5 w-5 shrink-0 text-good-ink" strokeWidth={2} aria-hidden />
            <p className="min-w-0 flex-1 text-[15px] font-semibold text-good-ink">
              Vom Einkauf einräumen: <span className="font-normal">{putAway.slice(0, 3).map((i) => i.name).join(", ")}{putAway.length > 3 ? " …" : ""}</span>
            </p>
            <button type="button" onClick={putAwayAll} className="hit shrink-0 rounded-full bg-good px-3 py-1.5 text-[13px] font-bold text-on-color">
              Einräumen
            </button>
          </section>
        )}

        {soon.length > 0 && (
          <section className="flex flex-col gap-2 rounded-card border border-accent-soft bg-accent-soft p-4" aria-label="Bald aufbrauchen">
            <h2 className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide text-accent-strong">
              <Hourglass className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Bald aufbrauchen
            </h2>
            <ul className="flex flex-col">
              {soon.slice(0, 4).map((item) => (
                <PantryRow key={item.id} item={item} today={todayIso} onOpen={() => setEditing(item)} soft />
              ))}
            </ul>
            <Link href="/?seite=essen" className="hit self-start rounded-full bg-surface px-3 py-1.5 text-[13px] font-bold text-accent-strong shadow-card">
              Rezept dazu
            </Link>
          </section>
        )}

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
              <ul className="-mx-1 flex flex-col divide-y divide-line">
                {items.map((item) => (
                  <PantryRow key={item.id} item={item} today={todayIso} onOpen={() => setEditing(item)} />
                ))}
              </ul>
              <p className="text-xs text-muted">Antippen zum Ändern oder Verschieben, − bis null = aufgebraucht.</p>
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

/** Schritt für −/+: Gramm/Milliliter in 100ern, sonst Stück */
const stepOf = (unit: string) => (unit === "g" || unit === "ml" ? 100 : 1);

/** Eine Vorrat-Zeile: Ort-Symbol, Name, kleine Info, Menge −/+ (bis null = aufgebraucht, mit Rückgängig) */
function PantryRow({ item, today, onOpen, soft = false }: { item: PantryItem; today: string; onOpen: () => void; soft?: boolean }) {
  const place = PANTRY_PLACES.find((p) => p.value === item.place);
  const days = item.addedAt ? Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${item.addedAt}T12:00:00Z`)) / 86_400_000) : null;
  const info = item.place === "tiefkuehler" && item.addedAt ? `seit ${SHORT_DATE.format(new Date(`${item.addedAt}T12:00:00`))}` : days !== null && days >= 2 ? `seit ${days} Tagen` : days === 1 ? "seit gestern" : "";
  const step = stepOf(item.unit);
  const change = (delta: number) => {
    const next = (item.amount ?? 0) + delta;
    if (next <= 0) {
      const before = loadPantry();
      removePantryItem(item.id);
      showDeleted(() => replacePantry(before), `${item.name} aufgebraucht`);
      return;
    }
    updatePantryItem(item.id, { amount: next });
  };
  return (
    <li className="flex min-h-12 items-center gap-2 py-1">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 px-1 text-left">
        <span className="text-lg" aria-hidden>
          {place?.emoji}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{item.name}</span>
          {info && <span className={`text-xs ${soft ? "text-accent-strong" : "text-muted"}`}>{info}</span>}
        </span>
      </button>
      <span className={`flex shrink-0 items-center gap-1 rounded-full ${soft ? "bg-surface" : "bg-fill"} p-0.5`}>
        <button type="button" onClick={() => change(-step)} aria-label={`${item.name} weniger`} className="hit flex h-8 w-8 items-center justify-center rounded-full text-muted active:bg-fill-strong">
          <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
        <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">{item.amount === null ? "–" : `${formatAmount(item.amount)}${item.unit ? ` ${item.unit}` : ""}`}</span>
        <button type="button" onClick={() => change(step)} aria-label={`${item.name} mehr`} className="hit flex h-8 w-8 items-center justify-center rounded-full text-accent-strong active:bg-fill-strong">
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </span>
    </li>
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
            const before = loadPantry();
            removePantryItem(item.id);
            showDeleted(() => replacePantry(before), `${item.name} gelöscht`);
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
