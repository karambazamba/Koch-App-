"use client";

// Läden einrichten (A-067, Tafel 151 Bild 1–3): einmal sagen, wo der
// Haushalt was kauft – danach legt Mia jede Sache selbst in den richtigen
// Laden. Startet beim ersten Öffnen der Einkaufsliste (statt der früheren
// Frage „In welchen Läden kaufst du ein?“) bzw. über „Sortieren ›“; oben ✕
// und „Später“, nie Pflicht.
// 1 „Wo kaufst du ein?“: Chips (genutzte Läden vorausgewählt), „Eigener
//   Laden“ nimmt auch einen Satz („Rewe, Lidl und dm“), „Weiter · 5 Läden“.
// 2 „Was holst du wo?“ (`WasWo`), „Speichern“.
// 3 „Fertig!“: was gerade ohne Laden war, ist sofort einsortiert; kurzes
//   Beispiel; „Mia lernt dazu …“; „Zur Einkaufsliste“.

import { useState } from "react";
import { Check, X } from "lucide-react";
import { CARD, CARD_LIST, ICON_BUTTON, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { ShopDot } from "@/components/einkauf/MeineLaeden";
import { WasWo } from "@/components/einkauf/einrichten/WasWo";
import { EINRICHTEN_LAEDEN, laedenAusSatz, planText, vorschlagPlan, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { einrichtungSpeichern } from "@/lib/einkauf/sorten/einrichten";
import { ladenHerkunft } from "@/lib/einkauf/shopRules";
import { helperName } from "@/lib/einstellungen/profile";
import type { ShoppingSettings } from "@/lib/einkauf/listModel";

const lower = (s: string) => s.trim().toLowerCase();
const has = (list: readonly string[], s: string) => list.some((x) => lower(x) === lower(s));

/** Beispiel in Schritt 3, wenn auf der Liste nichts steht */
const BEISPIEL = ["Milch", "Zahnpasta", "Äpfel"];

type Props = {
  /** Vorausgewählt (Meine Läden, Läden an Sachen) */
  vorauswahl: string[];
  /** Selbst angelegte Läden (erscheinen als Chips) */
  eigene: string[];
  /** Was gerade ohne Laden auf der Liste steht (Namen) */
  ohne: string[];
  settings: ShoppingSettings;
  onSpaeter: () => void;
  onFertig: () => void;
};

export function Einrichten({ vorauswahl, eigene, ohne, settings, onSpaeter, onFertig }: Props) {
  const [schritt, setSchritt] = useState<1 | 2 | 3>(1);
  const [laeden, setLaeden] = useState<string[]>(() => vorauswahl.filter((s, i) => vorauswahl.findIndex((x) => lower(x) === lower(s)) === i));
  const [chipsDazu, setChipsDazu] = useState<string[]>(() => [...eigene, ...vorauswahl].filter((s) => !has(EINRICHTEN_LAEDEN, s)));
  const [plan, setPlan] = useState<LadenPlan | null>(null);
  const [feld, setFeld] = useState("");
  const [einsortiert, setEinsortiert] = useState(0);

  const alleChips = [...EINRICHTEN_LAEDEN, ...chipsDazu.filter((s) => !has(EINRICHTEN_LAEDEN, s))];
  const umschalten = (s: string) => setLaeden((l) => (has(l, s) ? l.filter((x) => lower(x) !== lower(s)) : [...l, s]));
  const dazu = (namen: string[]) => {
    setChipsDazu((c) => [...c, ...namen.filter((n) => !has([...EINRICHTEN_LAEDEN, ...c], n))]);
    setLaeden((l) => [...l, ...namen.filter((n) => !has(l, n))]);
  };

  const weiter = () => {
    // Plan aus Schritt 2 behalten, wenn man zurückkam; sonst Vorschlag
    setPlan((p) => (p && has(laeden, p.haupt) ? p : vorschlagPlan(laeden)));
    setSchritt(2);
  };
  const speichern = () => {
    if (!plan) return;
    einrichtungSpeichern(laeden, plan);
    setEinsortiert(ohne.length);
    setSchritt(3);
  };

  const kopf = (
    <div className="flex h-12 items-center justify-between px-1">
      <button type="button" onClick={onSpaeter} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      <span className="flex gap-1.5" aria-label={`Schritt ${schritt} von 3`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-6 rounded-full ${n <= schritt ? "bg-accent" : "bg-fill"}`} aria-hidden />
        ))}
      </span>
      {schritt < 3 ? (
        <button type="button" onClick={onSpaeter} className="hit px-2 text-[15px] font-bold text-muted" data-einrichten-spaeter>
          Später
        </button>
      ) : (
        <span className="w-11" />
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col" data-einrichten={schritt}>
      <header className="px-3 pt-[env(safe-area-inset-top)]">{kopf}</header>
      <main className={PAGE_MAIN}>
        {schritt === 1 && (
          <>
            <div>
              <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Wo kaufst du ein?</h1>
              <p className="text-[15px] text-muted">Alle antippen, die passen. Danach sortier ich jede Sache selbst ein.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Läden">
              {alleChips.map((s) => {
                const on = has(laeden, s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => umschalten(s)} className={`${chipClass(on)} min-h-11 shrink-0`}>
                    {on ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden /> : <ShopDot shop={s} />}
                    {s}
                  </button>
                );
              })}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const namen = laedenAusSatz(feld, alleChips);
                if (namen.length) dazu(namen);
                setFeld("");
              }}
            >
              <input value={feld} onChange={(e) => setFeld(e.target.value)} maxLength={80} enterKeyHint="done" aria-label="Eigener Laden" placeholder="Eigener Laden oder „Rewe, Lidl und dm“" className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`} data-eigener-laden />
              <button type="submit" aria-disabled={!feld.trim()} className={`${buttonClass("soft", "md")} shrink-0 ${feld.trim() ? "" : "opacity-50"}`}>
                Dazu
              </button>
            </form>
            <button type="button" onClick={weiter} disabled={!laeden.length} className={`${buttonClass("primary", "lg")} w-full disabled:opacity-50`} data-einrichten-weiter>
              {laeden.length ? `Weiter · ${laeden.length} ${laeden.length === 1 ? "Laden" : "Läden"}` : "Weiter"}
            </button>
          </>
        )}

        {schritt === 2 && plan && (
          <>
            <div>
              <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Was holst du wo?</h1>
              <p className="text-[15px] text-muted">Hab schon was vorgeschlagen. Antippen zum Ändern.</p>
            </div>
            <WasWo laeden={laeden} plan={plan} onPlan={setPlan} onNeuerLaden={(n) => dazu([n])} />
            <button type="button" onClick={speichern} className={`${buttonClass("primary", "lg")} w-full`} data-einrichten-speichern>
              Speichern
            </button>
            <button type="button" onClick={() => setSchritt(1)} className="hit self-center text-[15px] font-bold text-muted">
              Zurück zu den Läden
            </button>
          </>
        )}

        {schritt === 3 && plan && <Fertig plan={plan} einsortiert={einsortiert} ohne={ohne} settings={settings} onFertig={onFertig} />}
      </main>
    </div>
  );
}

function Fertig({ plan, einsortiert, ohne, settings, onFertig }: { plan: LadenPlan; einsortiert: number; ohne: string[]; settings: ShoppingSettings; onFertig: () => void }) {
  const namen = ohne.length ? ohne.slice(0, 3) : BEISPIEL;
  const wissen = { ...settings, ladenPlan: plan };
  return (
    <>
      <div>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Fertig!</h1>
        <p className="text-[15px] text-muted" data-einsortiert={einsortiert}>
          {einsortiert ? `${einsortiert} ${einsortiert === 1 ? "Sache ist" : "Sachen sind"} schon einsortiert.` : "Ab jetzt sortier ich alles selbst ein."}
        </p>
      </div>
      <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="So geht’s">
        <p className="text-[15px] font-bold">„{namen.join(", ").replace(/, ([^,]*)$/, " und $1")}“</p>
        <ul className={`${CARD_LIST} shadow-none`}>
          {namen.map((n) => {
            const h = ladenHerkunft(n, wissen);
            const shops = h ? [h.shop, ...(h.auch ?? [])].filter(Boolean) : [plan.haupt];
            return (
              <li key={n} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2" data-beispiel={n}>
                <span className="font-semibold">{n}</span>
                <span className="flex items-center gap-1.5 text-right text-[14px] font-bold text-muted [overflow-wrap:anywhere]">
                  <ShopDot shop={shops[0] ?? ""} />
                  {planText(shops)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="px-1 text-[15px] text-muted">{helperName()} lernt dazu: Holst du etwas zweimal woanders, fragt sie einmal kurz nach.</p>
      <button type="button" onClick={onFertig} className={`${buttonClass("primary", "lg")} w-full`} data-einrichten-fertig>
        Zur Einkaufsliste
      </button>
    </>
  );
}
