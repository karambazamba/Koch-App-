"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CARD, INPUT_BASE, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { addBasic, removeBasic, updateBasic, useShoppingBasics, type BasicItem } from "@/lib/shoppingList";

/**
 * "Immer da": Basics wie Brot, Aufschnitt, Joghurt, Obst – kommen jede Woche
 * automatisch auf die Liste. Frei bearbeitbar, einzeln abschaltbar.
 */
export function BasicsSection() {
  const basics = useShoppingBasics();
  const [name, setName] = useState("");
  if (!basics) return null;

  const add = () => {
    if (!name.trim()) return;
    addBasic(name);
    setName("");
  };

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Immer da">
      <div>
        <h2 className={SECTION_TITLE}>Immer da</h2>
        <p className="text-sm text-muted">Kommt jede Woche automatisch mit auf die Liste. Ausschalten, was ihr gerade nicht braucht.</p>
      </div>
      {basics.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {basics.map((item) => (
            <BasicRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Bananen, Kaffee"
          aria-label="Neuer Basic-Artikel"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              add();
              e.currentTarget.blur();
            }
          }}
          className={`${INPUT_BASE} h-12 flex-1 px-4`}
        />
        <button type="button" onClick={add} disabled={!name.trim()} className={buttonClass("primary")}>
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Dazu
        </button>
      </div>
    </section>
  );
}

function BasicRow({ item }: { item: BasicItem }) {
  // Name direkt bearbeitbar; gespeichert beim Verlassen des Felds
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const save = () => {
    if (!name.trim()) {
      setName(item.name);
      return;
    }
    if (name.trim() !== item.name || amount.trim() !== item.amount) updateBasic(item.id, { name: name.trim(), amount: amount.trim() });
  };
  return (
    <li className="flex items-center gap-2 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={item.active}
        aria-label={`${item.name} ${item.active ? "ausschalten" : "einschalten"}`}
        onClick={() => updateBasic(item.id, { active: !item.active })}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${item.active ? "bg-accent" : "bg-stone-300"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${item.active ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`}
          aria-hidden
        />
      </button>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={save}
        placeholder="Menge"
        aria-label={`Menge für ${item.name}`}
        className={`${INPUT_BASE} h-10 w-20 shrink-0 px-2 text-sm`}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        aria-label={`Name von ${item.name}`}
        className={`${INPUT_BASE} h-10 flex-1 px-3 ${item.active ? "" : "line-through opacity-60"}`}
      />
      <button
        type="button"
        onClick={() => removeBasic(item.id)}
        aria-label={`${item.name} entfernen`}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-stone-400 transition active:scale-90"
      >
        <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}
