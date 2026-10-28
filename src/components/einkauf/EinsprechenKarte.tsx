"use client";

// „Hab ich: 9 Sachen“ (Tafel 110, Bild 2) – was Mia aus dem Einsprechen
// gehört hat, als Chips: × nimmt eine Sache raus (nochmal antippen holt sie
// zurück), der Farbpunkt zeigt den gemerkten Laden. „Weiter erzählen“ = Mia
// hört weiter zu, „Passt“ = auf die Liste (Gemerktes direkt in den Laden,
// der Rest in „Noch ohne Laden“). Ersetzt im Modus „Einkauf“ die Vorschau.
// Daneben: die Live-Blase, in der Ignoriertes durchgestrichen steht.

import { Check, Mic, X } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { einkaufVerstehen, habIchText, ladenFuer } from "@/lib/einkauf/einsprechen";
import { loadShoppingSettings } from "@/lib/einkauf/shoppingList";
import type { ChangeOp } from "@/lib/begleitung/ops";

type Props = {
  ops: ChangeOp[];
  selected: Set<string>;
  onToggle: (opId: string) => void;
  onApply: () => void;
  onMore: () => void;
};

export function EinsprechenKarte({ ops, selected, onToggle, onApply, onMore }: Props) {
  const settings = loadShoppingSettings();
  const sachen = ops.filter((op) => op.type === "add_shopping");
  const count = sachen.filter((op) => selected.has(op.id)).length;
  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label={habIchText(count)} data-einsprechen-karte>
      <h3 className="text-lg font-bold">{habIchText(count)}</h3>
      <ul className="flex flex-wrap gap-2">
        {sachen.map((op) => {
          if (op.type !== "add_shopping") return null;
          const on = selected.has(op.id);
          const laden = ladenFuer(op, settings);
          return (
            <li key={op.id}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={on ? `${op.name} rausnehmen` : `${op.name} wieder dazu`}
                onClick={() => onToggle(op.id)}
                className={`hit flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[15px] font-bold transition active:scale-95 ${on ? "border-line bg-surface" : "border-transparent bg-fill text-muted line-through"}`}
                data-sache={op.name}
              >
                {laden && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--app-shop-${shopTone(laden)})` }} title={laden} aria-hidden />}
                {op.amount ? `${op.amount} ${op.name}` : op.name}
                {on && <X className="h-4 w-4 text-muted" strokeWidth={2.5} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onMore} className={buttonClass("secondary")} data-weiter-erzaehlen>
          <Mic className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Weiter erzählen
        </button>
        <button type="button" onClick={onApply} disabled={count === 0} className={buttonClass("primary")} data-passt>
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Passt
        </button>
      </div>
    </section>
  );
}

/** Live-Blase beim Einsprechen: was Mia ignoriert, steht durchgestrichen */
export function EinsprechenLive({ text }: { text: string }) {
  const teile = einkaufVerstehen(text, loadShoppingSettings()).teile;
  return (
    <>
      {teile.map((t, i) =>
        t.weg ? (
          <s key={i} className="opacity-60" data-ignoriert>
            {t.text}
          </s>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
