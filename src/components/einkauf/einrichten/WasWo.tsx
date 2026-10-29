"use client";

// Schritt 2 „Was holst du wo?“ (A-067, Tafel 151 Bild 2) – auch später unter
// Einkauf → „···“ → „Meine Läden & was wo“. Oben „Das meiste bei [Rewe ⌄]“,
// darunter die festen Sorten mit Laden-Chip („Wochenmarkt + Rewe ⌄“).
// Antippen klappt die gewählten Läden auf: Hauptladen = einer, Sorte = bis zu
// drei (Reihenfolge = Vorrang, Nachtrag). Darunter ein Satz-Feld („Fleisch
// hole ich beim Schlachter“, legt den Laden bei Bedarf an). Lange Namen
// brechen um, nie „…“.

import { useState } from "react";
import { ArrowUp, Check, ChevronDown } from "lucide-react";
import { CARD_LIST, INPUT_BASE, chipClass } from "@/components/ui/styles";
import { ShopDot } from "@/components/einkauf/MeineLaeden";
import { SORTEN, type SorteId } from "@/lib/einkauf/sorten/sorten";
import { MAX_JE_SORTE, laedenFuerSorte, mitHaupt, mitSorte, planText, sorteUmschalten, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { parseSorteRegel } from "@/lib/einkauf/sorten/saetze";

const lower = (s: string) => s.trim().toLowerCase();

type Props = {
  laeden: string[];
  plan: LadenPlan;
  onPlan: (p: LadenPlan) => void;
  /** Ein Satz hat einen neuen Laden genannt */
  onNeuerLaden: (name: string) => void;
};

/** Sorten, die angezeigt werden: „Tier“ nur, wenn es dafür schon eine Regel gibt */
const sichtbar = (plan: LadenPlan) => SORTEN.filter((s) => s.id !== "tier" || plan.regeln.tier?.length);

export function WasWo({ laeden, plan, onPlan, onNeuerLaden }: Props) {
  const [auf, setAuf] = useState<SorteId | "haupt" | null>(null);
  const [satz, setSatz] = useState("");
  const [hinweis, setHinweis] = useState("");

  const sagen = () => {
    const r = parseSorteRegel(satz, laeden);
    if (!r) return setHinweis("Sag’s so: „Getränke kaufe ich bei Edeka.“");
    for (const l of r.laeden) if (!laeden.some((x) => lower(x) === lower(l))) onNeuerLaden(l);
    onPlan(mitSorte(plan, r.sorte, r.laeden));
    setSatz("");
    setHinweis(`${SORTEN.find((s) => s.id === r.sorte)!.label} → ${planText(r.laeden)}`);
  };

  const chips = (gewaehlt: string[], onTap: (shop: string) => void, label: string) => (
    <div className="flex flex-wrap gap-1.5 px-4 pb-3" role="group" aria-label={label}>
      {laeden.map((shop) => {
        const on = gewaehlt.some((x) => lower(x) === lower(shop));
        return (
          <button key={shop} type="button" aria-pressed={on} onClick={() => onTap(shop)} className={`${chipClass(on)} min-h-11 shrink-0`}>
            {on ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden /> : <ShopDot shop={shop} />}
            {shop}
          </button>
        );
      })}
    </div>
  );

  const knopf = (wert: string[], aufgeklappt: boolean, onTap: () => void, label: string, data?: string) => (
    <button
      type="button"
      onClick={onTap}
      aria-expanded={aufgeklappt}
      aria-label={`${label}: ${planText(wert)}, ändern`}
      className="hit inline-flex max-w-[60%] shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-left text-[15px] font-bold leading-snug text-ink [overflow-wrap:anywhere] active:scale-[0.98]"
      data-sorte-laden={data}
    >
      <ShopDot shop={wert[0] ?? ""} />
      <span>{planText(wert)}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${aufgeklappt ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
    </button>
  );

  return (
    <div className="flex flex-col gap-4" data-was-wo>
      <ul className={CARD_LIST}>
        <li>
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
            <span className="text-[16px] font-extrabold">Das meiste bei</span>
            {knopf([plan.haupt], auf === "haupt", () => setAuf(auf === "haupt" ? null : "haupt"), "Das meiste bei", "haupt")}
          </div>
          {auf === "haupt" &&
            chips([plan.haupt], (shop) => {
              onPlan(mitHaupt(plan, shop));
              setAuf(null);
            }, "Das meiste bei")}
        </li>
      </ul>
      <section aria-label="Sorten">
        <ul className={CARD_LIST}>
          {sichtbar(plan).map((s) => {
            const wert = laedenFuerSorte(plan, s.id);
            const zu = auf !== s.id;
            return (
              <li key={s.id} data-sorte={s.id}>
                <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 text-[15px] font-semibold leading-snug">{s.label}</span>
                  {knopf(wert, !zu, () => setAuf(zu ? s.id : null), s.label, s.id)}
                </div>
                {!zu && (
                  <>
                    <p className="-mt-1 px-4 pb-1.5 text-[13px] text-muted">Bis zu {MAX_JE_SORTE} Läden, der erste zuerst.</p>
                    {chips(wert, (shop) => onPlan(sorteUmschalten(plan, s.id, shop)), s.label)}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (satz.trim()) sagen();
        }}
      >
        <div className="flex items-center gap-2">
          <input value={satz} onChange={(e) => setSatz(e.target.value)} enterKeyHint="done" aria-label="Oder in einem Satz" placeholder="„Fleisch hole ich beim Schlachter“" className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`} data-was-wo-satz />
          <button type="submit" aria-label="Übernehmen" aria-disabled={!satz.trim()} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${satz.trim() ? "" : "opacity-50"}`}>
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        {hinweis && <p className="px-1 text-[13px] text-muted" data-was-wo-hinweis>{hinweis}</p>}
      </form>
    </div>
  );
}
