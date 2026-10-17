"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  SECTIONS,
  addManualItem,
  removeManualItem,
  setHave,
  shoppingListText,
  toggleChecked,
  type ListItem,
  type Section,
} from "@/lib/shoppingList";
import { useWeekShoppingList, type WeekChoice } from "@/lib/useWeekShoppingList";
import { formatWeekRange } from "@/lib/weekPlan";

const SKELETON = <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;

/** /einkaufsliste: automatisch aus dem Wochenplan, plus eigene Artikel. */
export function ShoppingListView() {
  // Start mit der Woche, für die gerade eingekauft wird; dann umschaltbar.
  const [choice, setChoice] = useState<WeekChoice>("planning");
  const data = useWeekShoppingList(choice);
  const [showHidden, setShowHidden] = useState(false);
  const [shareNote, setShareNote] = useState("");

  if (!data) return SKELETON;
  const { weekStart, isNext, list } = data;
  const range = formatWeekRange(weekStart);
  const visible = list.items.filter((i) => !i.hidden);
  const open = visible.filter((i) => !i.checked);
  const done = visible.filter((i) => i.checked);
  const hidden = list.items.filter((i) => i.hidden);

  const share = async () => {
    const text = shoppingListText(list, `🛒 Einkaufsliste ${range}`);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Einkaufsliste", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Liste kopiert – jetzt in WhatsApp oder eine Nachricht einfügen.");
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if ((error as Error)?.name !== "AbortError") setShareNote("Teilen hat nicht geklappt.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einkaufsliste" />
      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setChoice("current")}
            disabled={!isNext}
            aria-label="Diese Woche"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm active:scale-95 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-xl font-extrabold">{isNext ? "Nächste Woche" : "Diese Woche"}</p>
            <p className="whitespace-nowrap text-sm text-stone-500">{range}</p>
          </div>
          <button
            type="button"
            onClick={() => setChoice("next")}
            disabled={isNext}
            aria-label="Nächste Woche"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm active:scale-95 disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <section className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm" aria-label="Stand">
          <p className="text-lg font-extrabold" role="status">
            {open.length === 0 && done.length > 0
              ? "Alles erledigt ✓"
              : `${open.length} ${open.length === 1 ? "Sache" : "Sachen"} offen`}
            {done.length > 0 && open.length > 0 && (
              <span className="block text-sm font-semibold text-stone-500">{done.length} erledigt</span>
            )}
          </p>
          <button
            type="button"
            onClick={share}
            disabled={open.length === 0}
            className="h-12 shrink-0 rounded-2xl bg-emerald-500 px-4 font-bold text-white shadow-sm active:scale-95 disabled:opacity-40"
          >
            📤 Teilen
          </button>
        </section>
        {shareNote && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{shareNote}</p>
        )}

        {list.missing.length > 0 && (
          <section className="flex flex-col gap-1 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 text-amber-900">
            {list.missing.map((m) => (
              <p key={m}>
                ✏️ Für <span className="font-bold">{m}</span> fehlen Zutaten – selbst ergänzen.
              </p>
            ))}
          </section>
        )}

        {list.items.length === 0 && list.missing.length === 0 && (
          <p className="rounded-3xl bg-white p-5 text-center text-stone-600 shadow-sm">
            Im Wochenplan stehen noch keine Gerichte mit Rezept.{" "}
            <Link href="/wochenplan" className="font-bold text-orange-700 underline">
              Zum Wochenplan
            </Link>
          </p>
        )}

        {SECTIONS.map((section) => {
          const items = open.filter((i) => i.section === section.value);
          if (items.length === 0) return null;
          return (
            <section key={section.value} aria-label={section.label} className="flex flex-col gap-2">
              <h2 className="px-1 text-lg font-extrabold">
                {section.emoji} {section.label}
              </h2>
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-sm">
                {items.map((item) => (
                  <ItemRow key={item.key} item={item} weekStart={weekStart} />
                ))}
              </ul>
            </section>
          );
        })}

        {done.length > 0 && (
          <section aria-label="Erledigt" className="flex flex-col gap-2">
            <h2 className="px-1 text-lg font-extrabold text-stone-500">✓ Erledigt</h2>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white/70 shadow-sm">
              {done.map((item) => (
                <ItemRow key={item.key} item={item} weekStart={weekStart} />
              ))}
            </ul>
          </section>
        )}

        {hidden.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowHidden((v) => !v)}
              className="self-start px-1 text-sm font-semibold text-stone-500 underline"
            >
              {hidden.length} Artikel haben wir schon –{" "}
              {showHidden ? "ausblenden" : "anzeigen"}
            </button>
            {showHidden && (
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white/70 shadow-sm">
                {hidden.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 text-stone-500">
                      {item.amount} {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHave(weekStart, item.key, false)}
                      className="shrink-0 rounded-xl bg-orange-100 px-3 py-2 text-sm font-bold text-orange-800 active:scale-95"
                    >
                      Doch kaufen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <AddItemForm weekStart={weekStart} />
      </main>
    </div>
  );
}

function ItemRow({ item, weekStart }: { item: ListItem; weekStart: string }) {
  return (
    <li className="flex items-center gap-3 py-2 pl-3 pr-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`${item.name} ${item.checked ? "nicht mehr abhaken" : "abhaken"}`}
        onClick={() => toggleChecked(weekStart, item)}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-2xl font-bold active:scale-90 ${
          item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white text-transparent"
        }`}
      >
        ✓
      </button>
      <span className={`min-w-0 flex-1 ${item.checked ? "text-stone-400 line-through" : ""}`}>
        <span className="block text-lg font-semibold leading-tight">
          {item.amount && <span className="whitespace-nowrap font-bold">{item.amount} </span>}
          {item.name}
        </span>
        {item.dishes.length > 0 && (
          <span className="block text-xs text-stone-500">für {item.dishes.join(", ")}</span>
        )}
        {item.manualId && <span className="block text-xs text-stone-500">selbst hinzugefügt</span>}
      </span>
      {item.manualId ? (
        <button
          type="button"
          onClick={() => removeManualItem(weekStart, item.manualId!)}
          aria-label={`${item.name} entfernen`}
          className="h-11 w-11 shrink-0 text-2xl text-stone-400 active:scale-90"
        >
          ×
        </button>
      ) : (
        !item.checked && (
          <button
            type="button"
            onClick={() => setHave(weekStart, item.key, true)}
            className="shrink-0 rounded-xl bg-stone-100 px-2 py-2 text-xs font-bold text-stone-600 active:scale-95"
          >
            Haben wir schon
          </button>
        )
      )}
    </li>
  );
}

function AddItemForm({ weekStart }: { weekStart: string }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [section, setSection] = useState<Section>("sonstiges");

  const add = () => {
    if (!name.trim()) return;
    addManualItem(weekStart, { name: name.trim(), amount: amount.trim(), section });
    setName("");
    setAmount("");
  };

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm" aria-label="Artikel hinzufügen">
      <h2 className="text-lg font-bold">+ Eigener Artikel</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Menge"
          aria-label="Menge"
          className="h-14 w-24 shrink-0 rounded-2xl border-2 border-stone-200 px-3 text-lg outline-none focus:border-orange-400"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Klopapier, Kaffee"
          aria-label="Artikel"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              add();
              e.currentTarget.blur();
            }
          }}
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-200 px-4 text-lg outline-none focus:border-orange-400"
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-stone-600">Abteilung</span>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="h-14 rounded-2xl border-2 border-stone-200 bg-white px-3 text-lg outline-none focus:border-orange-400"
        >
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={add}
        disabled={!name.trim()}
        className="h-14 rounded-2xl bg-orange-500 text-lg font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40"
      >
        Hinzufügen
      </button>
    </section>
  );
}
