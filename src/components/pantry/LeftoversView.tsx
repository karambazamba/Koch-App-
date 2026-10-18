"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/plan/Sheet";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { openHelper } from "@/lib/assistant/open";
import { formatAmount, parseAmount } from "@/lib/cookbook";
import {
  PANTRY_UNITS,
  clearPantry,
  formatPantryItem,
  removePantryItem,
  updatePantryItem,
  usePantry,
  type PantryItem,
} from "@/lib/pantry";
import { helperName } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

/**
 * /schnellkueche: Übersicht "Noch da" – Reste ändern oder löschen. Erfasst
 * wird im Gespräch mit dem Küchenhelfer (Kachel bzw. "Mit <Name> kochen").
 */
export function LeftoversView() {
  const pantry = usePantry();
  const profile = useProfile();
  const [editing, setEditing] = useState<PantryItem | null>(null);

  if (pantry === undefined || profile === undefined) {
    return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  }
  const name = helperName(profile);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was ist noch da?" />
      <main className={PAGE_MAIN}>
        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Vorrat">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className={SECTION_TITLE}>Noch da ({pantry.length})</h2>
            {pantry.length > 0 && (
              <button
                type="button"
                onClick={() => window.confirm("Alle Reste aus der Liste nehmen?") && clearPantry()}
                className="text-sm font-semibold text-muted underline"
              >
                Alles leeren
              </button>
            )}
          </div>
          {pantry.length === 0 ? (
            <p className="text-sm text-muted">Noch nichts eingetragen – erzähl {name} einfach, was übrig ist.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {pantry.map((item) => (
                  <button key={item.id} type="button" onClick={() => setEditing(item)} className={chipClass(true)}>
                    {formatPantryItem(item)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Antippen zum Ändern oder Löschen.</p>
            </>
          )}
        </section>

        <button type="button" onClick={() => openHelper("reste")} className={`${buttonClass("primary", "lg")} w-full`}>
          <HelperAvatar size={28} />
          Mit {name} kochen
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
  const [y, m, d] = item.addedAt.split("-");

  return (
    <Sheet title="Rest ändern" onClose={onClose}>
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
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Einheit"
          className={`${INPUT_BASE} h-12 w-24 shrink-0 px-2`}
        >
          {PANTRY_UNITS.map((u) => (
            <option key={u} value={u}>
              {u || "–"}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Zutat"
          className={`${INPUT_BASE} h-12 flex-1 px-3`}
        />
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
            updatePantryItem(item.id, { name: name.trim(), amount: parseAmount(amount), unit });
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
