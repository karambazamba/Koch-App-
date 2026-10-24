"use client";

// Mias Antwort auf einen Rezept-Link: Bild (nur verlinkt), Titel, Quelle ↗,
// „Für 5 ▾“ (Haushaltsgröße, umgerechnet), „auf die Liste: …“ und grün „im
// Haus: …“. Knöpfe: „3 auf die Liste“ / „In den Wochenplan“ (Tag wählen).
// Kein eigenes Fenster, kein Rezepttext.

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { addDays, todayIso } from "@/lib/core/now";
import { useStock } from "@/lib/essen/useStock";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { DEFAULT_SHOPPING_DAY } from "@/lib/essen/weekPlan";
import { linkKarte } from "@/lib/essen/rezeptLink/karte";
import { mengeText, type LinkRezept } from "@/lib/essen/rezeptLink/lesen";
import { linkAufDieListe, linkInDenWochenplan } from "@/lib/essen/rezeptLink/uebernehmen";
import { dayWord } from "@/lib/core/schnelleingabe";

export function RezeptLinkKarte({ rezept }: { rezept: LinkRezept }) {
  const profile = useProfile();
  const stock = useStock();
  const shopping = useWeekShoppingList("planning");
  const household = profile ? Math.max(1, profile.persons.length || profile.adults + profile.kids || 2) : 2;
  const [persons, setPersons] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (!stock || !shopping || profile === undefined) return <div className={`${CARD} h-40 w-full animate-pulse`} />;
  const today = todayIso();
  const n = persons ?? household;
  const karte = linkKarte(
    rezept,
    n,
    stock,
    shopping.list.items.filter((i) => !i.checked && !i.hidden).map((i) => i.name),
    today,
  );

  const aufDieListe = () => {
    const undo = linkAufDieListe(rezept, karte.toList, shopping.weekStart);
    const text = `Auf der Liste: ${karte.toList.map((z) => z.name).join(", ")}`;
    showToast({ text, undo: pushUndo(text, undo), undoneText: "Wieder weg", seconds: 4, small: true });
    setDone("Steht auf der Liste.");
  };
  const einplanen = (date: string) => {
    const undo = linkInDenWochenplan(rezept, date, profile?.shoppingDay || DEFAULT_SHOPPING_DAY, n);
    const text = `${rezept.title} · ${dayWord(date, today)}`;
    showToast({ text: `Eingeplant: ${text}`, undo: pushUndo(text, undo), undoneText: "Wieder raus", seconds: 4, small: true });
    setPicking(false);
    setDone(`Eingeplant für ${dayWord(date, today)} – die Zutaten kommen über den Plan auf die Liste.`);
  };

  return (
    <section className={`${CARD} flex w-full flex-col gap-3 overflow-hidden`} aria-label={`Rezept: ${rezept.title}`} data-rezept-link>
      {rezept.image && (
        // eslint-disable-next-line @next/next/no-img-element -- fremdes Bild, nur verlinkt (nichts gespeichert)
        <img src={rezept.image} alt="" referrerPolicy="no-referrer" loading="lazy" className="-mb-1 h-36 w-full object-cover" />
      )}
      <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
        <p className="text-[17px] font-bold leading-snug">{rezept.title}</p>
        <a href={rezept.url} target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-1 self-start text-sm font-semibold text-muted underline">
          {rezept.source}
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </a>
        <label className="flex items-center gap-2 text-[15px] font-semibold">
          Für
          <select value={n} onChange={(e) => setPersons(Number(e.target.value))} aria-label="Für wie viele Personen" className="h-11 rounded-field border border-line bg-surface px-2 text-base">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {rezept.servings && rezept.servings !== n ? <span className="text-sm font-normal text-muted">(umgerechnet von {rezept.servings})</span> : null}
        </label>
        {karte.toList.length > 0 && (
          <p className="text-[14px] font-semibold text-accent-strong">
            auf die Liste: {karte.toList.map((z) => [mengeText(z), z.name].filter(Boolean).join(" ")).join(", ")}
          </p>
        )}
        {karte.imHaus.length > 0 && <p className="text-[14px] font-semibold text-good-ink">im Haus: {karte.imHaus.join(", ")}</p>}
        {karte.vermutlich.length > 0 && <p className="text-[14px] font-semibold text-muted">vermutlich im Haus: {karte.vermutlich.join(", ")}</p>}
        {karte.schonDrauf.length > 0 && <p className="text-[14px] text-muted">steht schon drauf: {karte.schonDrauf.join(", ")}</p>}
        {done ? (
          <p className="text-[15px] font-semibold" role="status">
            {done}
          </p>
        ) : picking ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Für welchen Tag?">
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => (
              <button key={d} type="button" onClick={() => einplanen(d)} className={chipClass(false)}>
                {dayWord(d, today)}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {karte.toList.length > 0 && (
              <button type="button" onClick={aufDieListe} className={buttonClass("primary", "md")}>
                {karte.toList.length} auf die Liste
              </button>
            )}
            <button type="button" onClick={() => setPicking(true)} className={buttonClass(karte.toList.length ? "secondary" : "primary", "md")}>
              In den Wochenplan
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
