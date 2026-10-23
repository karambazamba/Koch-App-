"use client";

import { useState } from "react";
import { Check, Info, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST, INPUT, INPUT_BASE, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { compareText } from "@/lib/core/sort";
import {
  addStaple,
  allShops,
  isStaple,
  removeStaple,
  rhythmLabel,
  stapleInterval,
  type ListItem,
  type ShoppingSettings,
} from "@/lib/einkauf/shoppingList";
import { showDeleted } from "@/lib/core/toast";

/** Inhalt einer Artikelzeile: Häkchen, Name, Menge rechtsbündig, optional Info */
export function ItemContent({
  item,
  onToggle,
  onInfo,
  infoOpen,
}: {
  item: ListItem;
  onToggle: () => void;
  onInfo: () => void;
  infoOpen: boolean;
}) {
  return (
    <>
      <div className="flex min-h-12 items-center gap-3 py-1.5 pl-3 pr-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={item.checked}
          aria-label={`${item.name} ${item.checked ? "nicht mehr abhaken" : "abhaken"}`}
          onClick={onToggle}
          className={`hit flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            item.checked ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-transparent"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
        </button>
        <span className={`min-w-0 flex-1 truncate text-base font-semibold ${item.checked ? "text-faint line-through" : "text-ink"}`}>
          {item.name}
          {item.optional && <span className="ml-1.5 text-xs font-normal text-muted">optional</span>}
          {item.dishes.length > 0 && !item.checked && (
            <span className="ml-1.5 inline-block max-w-[9rem] truncate rounded-full bg-fill px-2 py-0.5 align-middle text-[11px] font-semibold text-muted">{item.dishes[0].replace(/\s*\([^)]*\)\s*$/, "")}</span>
          )}
        </span>
        {item.dishes.length > 0 && (
          <button
            type="button"
            onClick={onInfo}
            aria-label={`Wofür: ${item.name}`}
            aria-expanded={infoOpen}
            className="hit -mx-1 flex h-8 w-8 shrink-0 items-center justify-center text-faint"
          >
            <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        )}
        <span className={`shrink-0 text-right text-sm tabular-nums ${item.checked ? "text-faint line-through" : "text-muted"}`}>
          {item.amount}
        </span>
      </div>
      {infoOpen && item.dishes.length > 0 && (
        <p className="px-14 pb-2 text-xs text-muted" role="note">
          Für {item.dishes.join(", ")}
        </p>
      )}
    </>
  );
}

/** Artikel bearbeiten: umbenennen ("Immer so?"), Laden, bei eigenen Artikeln Menge */
export function EditItemSheet({
  item,
  settings,
  onClose,
  onSave,
  remove,
}: {
  item: ListItem;
  settings: ShoppingSettings;
  onClose: () => void;
  onSave: (changes: { name: string; always: boolean; shop: string; amount: string }) => void;
  /** Löschen (eigene Artikel) bzw. „Haben wir schon“ (Zutaten aus Gerichten) */
  remove?: { label: string; onClick: () => void };
}) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const [shop, setShop] = useState(item.shop);
  const [newShop, setNewShop] = useState("");
  const [ask, setAsk] = useState(false);
  const renamed = name.trim() && name.trim() !== item.name;
  const shops = allShops(settings);

  if (ask) {
    return (
      <Sheet title="Immer so?" onClose={onClose}>
        <p className="text-base">
          Soll statt „{item.originalName}“ immer „{name.trim()}“ auf der Liste stehen? Die Rezepte bleiben, wie sie sind.
        </p>
        <button type="button" onClick={() => onSave({ name, always: true, shop, amount })} className={`${buttonClass("primary", "lg")} w-full`}>
          Ja, immer
        </button>
        <button type="button" onClick={() => onSave({ name, always: false, shop, amount })} className={`${buttonClass("secondary", "lg")} w-full`}>
          Nur diesmal
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Artikel bearbeiten" onClose={onClose}>
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} aria-label="Name" />
      </label>
      {item.manualId && (
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Menge</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} aria-label="Menge" placeholder="z. B. 2 Packungen" />
        </label>
      )}
      <div className="flex flex-col gap-2">
        <span className={LABEL}>Laden</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Laden">
          <button type="button" role="radio" aria-checked={!shop} onClick={() => setShop("")} className={chipClass(!shop, "muted")}>
            Egal
          </button>
          {[...shops, ...(shop && !shops.includes(shop) ? [shop] : [])].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={shop === s} onClick={() => setShop(s)} className={chipClass(shop === s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newShop}
            onChange={(e) => setNewShop(e.target.value)}
            placeholder="Neuer Laden"
            aria-label="Neuer Laden"
            className={`${INPUT_BASE} h-11 min-w-0 flex-1 px-3`}
          />
          <button
            type="button"
            disabled={!newShop.trim()}
            onClick={() => {
              setShop(newShop.trim());
              setNewShop("");
            }}
            className={buttonClass("secondary", "sm")}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Anlegen
          </button>
        </div>
      </div>
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => (renamed ? setAsk(true) : onSave({ name: item.name, always: false, shop, amount }))}
        className={`${buttonClass("primary", "lg")} w-full`}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Speichern
      </button>
      {remove && (
        <button type="button" onClick={remove.onClick} className={`${buttonClass("secondary", "lg")} w-full`}>
          {remove.label}
        </button>
      )}
    </Sheet>
  );
}

/** Stammliste: gelernte und feste Stammartikel mit Rhythmus */
export function StaplesSheet({ settings, onClose }: { settings: ShoppingSettings; onClose: () => void }) {
  const [name, setName] = useState("");
  const staples = settings.staples.filter(isStaple).sort((a, b) => compareText(a.name, b.name));
  return (
    <Sheet title="Stammliste" onClose={onClose}>
      <p className="text-sm text-muted">
        Lerne ich aus euren abgehakten Artikeln: Was ihr regelmäßig kauft, schlage ich am Einkaufstag vor.
      </p>
      {staples.length === 0 ? (
        <p className="text-sm text-muted">Noch nichts gelernt.</p>
      ) : (
        <ul className={CARD_LIST}>
          {staples.map((st) => (
            <li key={st.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{st.name}</span>
                <span className="block text-xs text-muted">
                  {rhythmLabel(stapleInterval(st)!)}
                  {st.intervalDays ? "" : " · gelernt"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => showDeleted(removeStaple(st.id), `${st.name} nicht mehr in der Stammliste`)}
                aria-label={`${st.name} aus der Stammliste nehmen`}
                className="flex h-10 w-10 items-center justify-center text-faint"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addStaple(name);
          setName("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Kaffee"
          aria-label="Stammartikel hinzufügen"
          className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
        />
        <button type="submit" disabled={!name.trim()} className={buttonClass("primary")}>
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Jede Woche
        </button>
      </form>
    </Sheet>
  );
}

