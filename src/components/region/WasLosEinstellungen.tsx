"use client";

// Einstellungen → „Was los?“ (A-055): an/aus (Standard an für Wohnorte in
// Ostholstein), Wohnort (leer = Wetter-Ort, kein GPS), Umkreis 5 / 15 / 30 km
// und Kategorien an/aus. „Anzeigen“ öffnet das Fenster (bis Paket A den
// Mini-Kreis auf der Startseite einbindet). Ersetzt die alten Einstellungen
// „Tipps aus der Region“ – der Ort von dort bleibt der Wohnort hier.

import { useState } from "react";
import { Baby, Flag, Landmark, ShoppingBasket, Sparkles, Trees, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, INPUT, LABEL, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { SwitchRow } from "@/components/einstellungen/settings/SettingsParts";
import { usePlace } from "@/lib/wetter/client";
import { changeTipSettings, useTipSettings } from "@/lib/tipps/client";
import { KATEGORIE_NAME, KATEGORIEN, type Kategorie } from "@/lib/region/kategorien";
import { OHNE_GEWAEHR } from "@/lib/region/model";
import { UMKREISE, inOstholstein, type Umkreis } from "@/lib/region/orte";
import { setKategorie, setUmkreis, setWasLos, useWasLosAn, useWasLosDaten, useWasLosEinstellungen, useWasLosOrt } from "@/lib/region/client";
import { WasLosFenster } from "@/components/region/WasLosFenster";

const SYMBOL: Record<Kategorie, LucideIcon> = { kinder: Baby, kultur: Landmark, draussen: Trees, markt: ShoppingBasket, sonstiges: Sparkles };
const HINWEIS: Record<Kategorie, string> = { kinder: "Basteln, Kinderkino, Laternen", kultur: "Museum, Konzert, Lesung", draussen: "Führungen, Touren, Natur", markt: "Wochen- und Flohmärkte", sonstiges: "Was sonst nirgends passt" };

export function WasLosEinstellungen() {
  const an = useWasLosAn();
  const daten = useWasLosDaten();
  const e = useWasLosEinstellungen();
  const s = useTipSettings();
  const wetter = usePlace();
  const wohnort = useWasLosOrt();
  const [ort, setOrt] = useState<string | null>(null);
  const [fenster, setFenster] = useState(false);
  const saveOrt = () => {
    if (ort === null) return;
    const next = ort.trim();
    changeTipSettings((x) => ({ ...x, ort: next && next !== wetter ? next.slice(0, 60) : null }));
    setOrt(null);
  };
  const quelleAus = daten?.quelle === "aus";
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was los?" backHref="/profil" />
      <main className={`${PAGE_MAIN} gap-5`}>
        <ul className={CARD}>
          <SwitchRow icon={Flag} title="Was los?" hint="Veranstaltungen in der Umgebung, vom Kreis Ostholstein." checked={Boolean(an)} onChange={(on) => setWasLos(on)} />
        </ul>
        {an && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Wohnort</span>
              <input
                className={INPUT}
                value={ort ?? s.ort ?? ""}
                placeholder={`${wetter} (wie beim Wetter)`}
                onChange={(ev) => setOrt(ev.target.value)}
                onBlur={saveOrt}
                onKeyDown={(ev) => ev.key === "Enter" && (ev.currentTarget as HTMLInputElement).blur()}
                autoComplete="address-level2"
                aria-label="Wohnort für Was los?"
              />
              <span className="text-sm text-muted">{inOstholstein(wohnort) ? "Leer heißt: der Ort vom Wetter. Kein GPS." : "Veranstaltungen gibt es bisher nur für Orte in Ostholstein."}</span>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Umkreis</span>
              <Segmented<string> value={String(e.umkreis)} options={UMKREISE.map((k) => ({ value: String(k), label: `${k} km` }))} onChange={(v) => setUmkreis(Number(v) as Umkreis)} label="Umkreis" />
            </div>
            <section className="flex flex-col gap-2" aria-label="Kategorien">
              <h2 className={`px-1 ${SECTION_TITLE}`}>Was dich interessiert</h2>
              <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
                {KATEGORIEN.map((k) => (
                  <SwitchRow key={k} icon={SYMBOL[k]} title={KATEGORIE_NAME[k]} hint={HINWEIS[k]} checked={!e.kategorienAus.includes(k)} onChange={(on) => setKategorie(k, on)} />
                ))}
              </ul>
            </section>
            {!quelleAus && (
              <button type="button" onClick={() => setFenster(true)} className={`${buttonClass("secondary", "md")} w-full`}>
                Anzeigen
              </button>
            )}
            <p className="px-1 text-sm text-muted">{OHNE_GEWAEHR}. Von dir geht nichts an den Kreis.</p>
          </>
        )}
      </main>
      {fenster && <WasLosFenster onClose={() => setFenster(false)} />}
    </div>
  );
}
