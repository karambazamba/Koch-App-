"use client";

// Zeile antippen (A-040, Tafel 127, Bild 3): EIN Fenster (`ui/Sheet`) mit
// Symbol und Name, darunter erst hier, wofür („für Gemüselasagne · Fr“) und
// die Rezeptmenge als Hinweis. Dann Menge („z. B. 1 Beutel“ – nur, wenn man
// sie selbst sagt), Laden („● Rewe ⌄“, ändern = gemerkt fürs nächste Mal)
// und „Von der Liste nehmen“.

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_BUTTON, INPUT_INLINE, chipClass } from "@/components/ui/styles";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { ladenFarbe } from "@/components/einkauf/seite/LadenKarten";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { wofuer } from "@/lib/einkauf/angebot/angebot";
import { ladenKorrigieren } from "@/lib/einkauf/shopRules";
import type { ListItem } from "@/lib/einkauf/listModel";

const lower = (s: string) => s.trim().toLowerCase();
const ZEILE = "flex min-h-14 items-center justify-between gap-3 border-t border-line py-2";

type Props = {
  item: ListItem;
  products: Record<string, string>;
  myShops: string[];
  /** Menge speichern (nur eigene Einträge) */
  onMenge?: (amount: string) => void;
  /** „Von der Liste nehmen“ */
  onWeg: () => void;
  onClose: () => void;
};

export function SacheFenster({ item, products, myShops, onMenge, onWeg, onClose }: Props) {
  const [menge, setMenge] = useState(item.amount);
  const [laden, setLaden] = useState(item.shop);
  const [auf, setAuf] = useState(false);
  const fuer = wofuer(item);
  const rezept = item.rezeptMenge ? `${item.rezeptMenge} im Rezept` : "";
  const laeden = [...myShops, ...(laden && !myShops.some((s) => lower(s) === lower(laden)) ? [laden] : [])];
  const schliessen = () => {
    if (onMenge && menge.trim() !== item.amount.trim()) onMenge(menge.trim().slice(0, 30));
    onClose();
  };
  const header = (
    <div className="flex items-center gap-3">
      <ItemSymbol id={symbolFor(item.name, products)} name={item.name} className="h-9 w-9 shrink-0 text-2xl" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-extrabold tracking-tight">{item.name}</h2>
        {fuer && (
          <p className="truncate text-[15px] text-muted" data-wofuer>
            {fuer}
          </p>
        )}
      </div>
      <button type="button" onClick={schliessen} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
  return (
    <Sheet title={item.name} onClose={schliessen} header={header}>
      <div className="flex flex-col" data-sache-fenster={item.name}>
        {onMenge && (
          <label className={ZEILE}>
            <span className="text-[17px] font-semibold">Menge</span>
            <input
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              onBlur={() => menge.trim() !== item.amount.trim() && onMenge(menge.trim().slice(0, 30))}
              placeholder={`z. B. ${item.packung || "1 Packung"}`}
              enterKeyHint="done"
              className={`${INPUT_INLINE} w-40 text-right`}
              data-menge
            />
          </label>
        )}
        {rezept && <p className="-mt-1 pb-2 text-right text-[13px] text-muted" data-rezept-menge>{rezept}</p>}
        <div className={`${ZEILE} flex-wrap`}>
          <span className="text-[17px] font-semibold">Laden</span>
          {!auf ? (
            <button type="button" onClick={() => setAuf(true)} className="hit inline-flex items-center gap-1.5 text-[17px] font-semibold text-muted" aria-label={`Laden: ${laden || "noch keiner"}, ändern`} data-laden-aendern>
              {laden && <span className="h-2.5 w-2.5 rounded-full" style={{ background: ladenFarbe(laden).voll }} aria-hidden />}
              {laden || (item.anywhere ? "Egal wo" : "Noch keiner")}
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          ) : (
            <div className="flex w-full flex-wrap gap-2 pb-1" role="radiogroup" aria-label="Laden">
              {[...laeden, ""].map((s) => (
                <button
                  key={s || "egal"}
                  type="button"
                  role="radio"
                  aria-checked={lower(s) === lower(laden)}
                  onClick={() => {
                    if (lower(s) !== lower(laden)) ladenKorrigieren(item.name, s);
                    setLaden(s);
                    setAuf(false);
                  }}
                  className={chipClass(lower(s) === lower(laden))}
                >
                  {s && <span className="h-2 w-2 rounded-full" style={{ background: ladenFarbe(s).voll }} aria-hidden />}
                  {s || "Egal wo"}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onWeg();
            onClose();
          }}
          className="hit flex min-h-14 items-center border-t border-line text-[17px] font-bold text-accent-strong"
          data-von-der-liste
        >
          Von der Liste nehmen
        </button>
      </div>
    </Sheet>
  );
}
