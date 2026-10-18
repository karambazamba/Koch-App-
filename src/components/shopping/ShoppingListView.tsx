"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Beef,
  Carrot,
  Check,
  ChevronLeft,
  ChevronRight,
  Croissant,
  CupSoda,
  Milk,
  Package,
  PenLine,
  Plus,
  Share2,
  ShoppingBag,
  Snowflake,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, CARD_LIST, ICON_BUTTON, INPUT, INPUT_BASE, LABEL, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
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
import { BasicsSection } from "./BasicsSection";
import { formatWeekRange } from "@/lib/weekPlan";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

/** Abteilungen als Linien-Icons (das Emoji in SECTIONS bleibt für den Teilen-Text) */
const SECTION_ICONS: Record<Section, LucideIcon> = {
  "obst-gemuese": Carrot,
  "fleisch-fisch": Beef,
  kuehlregal: Milk,
  brot: Croissant,
  vorrat: Package,
  tiefkuehl: Snowflake,
  getraenke: CupSoda,
  sonstiges: ShoppingBag,
};

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
      <main className={PAGE_MAIN}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setChoice("current")}
            disabled={!isNext}
            aria-label="Diese Woche"
            className={ICON_BUTTON}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold">{isNext ? "Nächste Woche" : "Diese Woche"}</p>
            <p className="whitespace-nowrap text-sm text-muted">{range}</p>
          </div>
          <button
            type="button"
            onClick={() => setChoice("next")}
            disabled={isNext}
            aria-label="Nächste Woche"
            className={ICON_BUTTON}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <section className={`${CARD} flex items-center justify-between gap-3 p-4`} aria-label="Stand">
          <p className="text-lg font-bold" role="status">
            {open.length === 0 && done.length > 0
              ? "Alles erledigt ✓"
              : `${open.length} ${open.length === 1 ? "Sache" : "Sachen"} offen`}
            {done.length > 0 && open.length > 0 && (
              <span className="block text-sm font-normal text-muted">{done.length} erledigt</span>
            )}
          </p>
          <button
            type="button"
            onClick={share}
            disabled={open.length === 0}
            className={buttonClass("primary")}
          >
            <Share2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Teilen
          </button>
        </section>
        {shareNote && (
          <p className="rounded-xl bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">{shareNote}</p>
        )}

        {list.missing.length > 0 && (
          <section className={`${CARD} flex flex-col gap-2 p-4`}>
            {list.missing.map((m) => (
              <p key={m} className="flex items-start gap-2 text-sm text-muted">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
                <span>
                  Für <span className="font-bold text-ink">{m}</span> fehlen Zutaten – selbst ergänzen.
                </span>
              </p>
            ))}
          </section>
        )}

        {list.items.length === 0 && list.missing.length === 0 && (
          <p className={`${CARD} p-5 text-center text-muted`}>
            Im Wochenplan stehen noch keine Gerichte mit Rezept.{" "}
            <Link href="/wochenplan" className="font-bold text-accent-strong underline">
              Zum Wochenplan
            </Link>
          </p>
        )}

        {SECTIONS.map((section) => {
          const items = open.filter((i) => i.section === section.value);
          if (items.length === 0) return null;
          const Icon = SECTION_ICONS[section.value];
          return (
            <section key={section.value} aria-label={section.label} className="flex flex-col gap-2">
              <h2 className={`${SECTION_TITLE} flex items-center gap-2 px-1`}>
                <Icon className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                {section.label}
              </h2>
              <ul className={CARD_LIST}>
                {items.map((item) => (
                  <ItemRow key={item.key} item={item} weekStart={weekStart} />
                ))}
              </ul>
            </section>
          );
        })}

        {done.length > 0 && (
          <section aria-label="Erledigt" className="flex flex-col gap-2">
            <h2 className={`${SECTION_TITLE} flex items-center gap-2 px-1 text-muted`}>
              <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              Erledigt
            </h2>
            <ul className={`${CARD_LIST} opacity-80`}>
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
              className="self-start px-1 text-sm font-semibold text-muted underline"
            >
              {hidden.length} Artikel haben wir schon –{" "}
              {showHidden ? "ausblenden" : "anzeigen"}
            </button>
            {showHidden && (
              <ul className={CARD_LIST}>
                {hidden.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 text-muted">
                      {item.amount} {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHave(weekStart, item.key, false)}
                      className={buttonClass("soft", "sm")}
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

        <BasicsSection />
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
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          item.checked ? "border-accent bg-accent text-white" : "border-stone-300 bg-surface text-transparent"
        }`}
      >
        <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
      </button>
      <span className={`min-w-0 flex-1 ${item.checked ? "text-stone-400 line-through" : ""}`}>
        <span className="block text-base font-semibold leading-snug">
          {item.amount && <span className="whitespace-nowrap font-bold">{item.amount} </span>}
          {item.name}
        </span>
        {item.dishes.length > 0 && (
          <span className="block text-xs text-muted">für {item.dishes.join(", ")}</span>
        )}
        {item.manualId && <span className="block text-xs text-muted">selbst hinzugefügt</span>}
        {item.basic && <span className="block text-xs text-muted">immer da</span>}
      </span>
      {item.manualId ? (
        <button
          type="button"
          onClick={() => removeManualItem(weekStart, item.manualId!)}
          aria-label={`${item.name} entfernen`}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-stone-400 transition active:scale-90"
        >
          <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : (
        !item.checked && (
          <button
            type="button"
            onClick={() => setHave(weekStart, item.key, true)}
            className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-xs font-bold text-muted transition active:scale-95"
          >
            Haben wir schon
          </button>
        )
      )}
    </li>
  );
}

/** Feldstil ohne feste Breite/Höhe, für nebeneinanderliegende Felder */

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
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Artikel hinzufügen">
      <h2 className={SECTION_TITLE}>Eigener Artikel</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Menge"
          aria-label="Menge"
          className={`${INPUT_BASE} h-12 w-24 shrink-0 px-3`}
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
          className={`${INPUT_BASE} h-12 flex-1 px-4`}
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Abteilung</span>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className={INPUT}
        >
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={add}
        disabled={!name.trim()}
        className={`${buttonClass("primary", "lg")} w-full`}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Hinzufügen
      </button>
    </section>
  );
}
