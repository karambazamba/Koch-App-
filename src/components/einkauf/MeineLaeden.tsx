"use client";

// Läden bewusst wählen (Tafel 88/91; die einmalige Frage ist seit A-067 die
// Einrichtung in `einrichten/`): das Fenster „Meine Läden“ (＋ in der Laden-Reihe: wählen, sortieren, anlegen,
// entfernen, feste Regeln „Immer hier“) und die Reihe „Kommt auf die Liste
// für“ beim Hinzufügen. Keine Logos: ein Farbpunkt je Laden.

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, ICON_BUTTON, INPUT_BASE, buttonClass, chipClass } from "@/components/ui/styles";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { removeShop } from "@/lib/einkauf/shops";
import { FRAGE_LAEDEN, addMyShop, chooseMyShops, isSuggestion, laterShops, moveMyShop, removeMyShop, shopChoices } from "@/lib/einkauf/meineLaeden";
import { removeShopRule, rulesByShop } from "@/lib/einkauf/shopRules";

const lower = (s: string) => s.trim().toLowerCase();

export const ShopDot = ({ shop, big = false }: { shop: string; big?: boolean }) => (
  <span className={`${big ? "h-2.5 w-2.5" : "h-2 w-2"} shrink-0 rounded-full`} style={{ background: `var(--app-shop-${shopTone(shop)})` }} aria-hidden />
);

/** Feld „Eigener Laden“ mit Hinzufügen */
function EigenerLaden({ onAdd, autoFocus = false }: { onAdd: (name: string) => void; autoFocus?: boolean }) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim().slice(0, 30));
        setName("");
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus={autoFocus}
        maxLength={30}
        enterKeyHint="done"
        aria-label="Anderer Laden"
        placeholder="Anderer Laden, z. B. Famila"
        className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
      />
      <button type="submit" aria-label="Laden dazu" aria-disabled={!name.trim()} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong active:scale-95 ${name.trim() ? "" : "opacity-50"}`}>
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      </button>
    </form>
  );
}

const ROW = "hit flex min-h-12 items-center gap-2 rounded-field border px-3 text-left text-[15px] font-semibold active:scale-[0.98]";

/** Chip zum Ankreuzen (Häkchen, Farbpunkt) */
function ShopChip({ shop, on, onTap }: { shop: string; on: boolean; onTap: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onTap} className={`${chipClass(on)} shrink-0`}>
      {on ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden /> : <ShopDot shop={shop} />}
      {shop}
    </button>
  );
}

/**
 * ＋ in der Laden-Reihe: Läden an- und abwählen, sortieren (Reihenfolge der
 * Liste), eigenen dazu, eigenen entfernen; je Laden „Immer hier: …“ (feste
 * Regeln, antippen = Regel weg).
 */
export function MeineLaedenSheet({ shops, myShops, rules = {}, onClose }: { shops: string[]; myShops: string[]; rules?: Record<string, string>; onClose: () => void }) {
  const isOn = (s: string) => myShops.some((p) => lower(p) === lower(s));
  const ownShop = (s: string) => !isSuggestion(s);
  const byShop = rulesByShop(rules);
  const rest = shopChoices(shops, myShops).filter((s) => !isOn(s));
  const fixed = (s: string) => Object.entries(byShop).find(([k]) => lower(k) === lower(s))?.[1] ?? [];
  return (
    <Sheet title="Meine Läden" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3" data-meine-laeden>
        {myShops.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Meine Läden">
            {myShops.map((s, i) => (
              <li key={s} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <button type="button" aria-pressed onClick={() => removeMyShop(s)} className={`${ROW} flex-1 border-accent bg-accent-soft`}>
                    <ShopDot shop={s} big />
                    <span className="min-w-0 flex-1 truncate">{s}</span>
                    <Check className="h-4 w-4 shrink-0 text-accent-strong" strokeWidth={2.75} aria-hidden />
                  </button>
                  <button type="button" onClick={() => moveMyShop(s, -1)} disabled={i === 0} aria-label={`${s} nach oben`} className={`${ICON_BUTTON} border-0 disabled:opacity-30`}>
                    <ChevronUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </button>
                  <button type="button" onClick={() => moveMyShop(s, 1)} disabled={i === myShops.length - 1} aria-label={`${s} nach unten`} className={`${ICON_BUTTON} border-0 disabled:opacity-30`}>
                    <ChevronDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
                {fixed(s).length > 0 && (
                  <p className="flex flex-wrap items-center gap-1.5 pl-3 text-[13px] text-muted" data-immer-hier>
                    Immer hier:
                    {fixed(s).map((item) => (
                      <button key={item} type="button" onClick={() => removeShopRule(item)} aria-label={`${item} nicht mehr immer bei ${s}`} className="hit inline-flex min-h-8 items-center gap-1 rounded-full bg-fill px-2.5 font-semibold text-ink">
                        {item}
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      </button>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <ul className="flex flex-col gap-2" aria-label="Weitere Läden">
          {rest.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <button type="button" aria-pressed={false} onClick={() => addMyShop(s)} className={`${ROW} flex-1 border-line bg-surface`}>
                <ShopDot shop={s} big />
                <span className="min-w-0 flex-1 truncate">{s}</span>
              </button>
              {ownShop(s) && (
                <button type="button" onClick={() => removeShop(s)} className="hit px-2 text-sm font-semibold text-muted">
                  Entfernen
                </button>
              )}
            </li>
          ))}
        </ul>
        <EigenerLaden onAdd={addMyShop} />
      </div>
    </Sheet>
  );
}

/** Beim Hinzufügen: „Kommt auf die Liste für“ – Egal wo + meine Läden (`null` = nichts gewählt → „Noch ohne Laden“) */
export function LadenWahl({ myShops, value, onChange, hint }: { myShops: string[]; value: string | null; onChange: (shop: string) => void; hint?: string }) {
  if (!myShops.length) return null;
  const options = ["", ...myShops];
  return (
    <div className="flex flex-col gap-1.5" data-laden-wahl>
      <p className="text-[13px] font-semibold text-muted">Kommt auf die Liste für</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Kommt auf die Liste für" data-no-swipe>
        {options.map((s) => (
          <button key={s || "egal"} type="button" role="radio" aria-checked={value !== null && lower(value) === lower(s)} onPointerDown={(e) => e.preventDefault()} onClick={() => onChange(s)} className={`${chipClass(value !== null && lower(value) === lower(s))} shrink-0`}>
            {s && <ShopDot shop={s} />}
            {s || "Egal wo"}
          </button>
        ))}
      </div>
      {hint && (
        <p className="text-[13px] text-muted" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
