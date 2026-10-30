"use client";

// Für Entwickler (Auftrag „Mia auf Claude-Niveau“): KI-Kosten der letzten 7
// Tage auf diesem Gerät, das Tempo der Gespräche (Median der letzten 20), der Prüfstand (Alltagssätze durch die echte Mia,
// Ziel ≥ 95 %) und der Prüfstand „Ton“ (30 Sätze, nur der Klang, Ziel
// ≥ 90 %). Beide brauchen das Prüfstand-Geheimnis aus Vercel
// (PRUEFSTAND_SECRET) – es wird nur für diesen Aufruf eingetippt, nie
// gespeichert, nie angezeigt. Ablauf je Lauf in `PruefstandLauf`.

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { toIsoDate, useToday } from "@/lib/core/now";
import { lastWeekCosts } from "@/lib/begleitung/usage";
import { helperName } from "@/lib/einstellungen/profile";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { TON_SAETZE, TON_ZIEL } from "@/lib/begleitung/pruefstand/ton";
import { MicLogList } from "@/components/einstellungen/settings/MicLogSection";
import { PruefstandLauf } from "@/components/einstellungen/settings/PruefstandLauf";
import { TempoSection } from "@/components/einstellungen/settings/TempoSection";
import { AnsagenStand } from "@/components/durchatmen/AnsagenStand";
import { WundertueteNachschub } from "@/components/wundertuete/WundertueteNachschub";
import { WasLosStatus } from "@/components/region/WasLosStatus";
import { PushProtokoll } from "@/components/heute/mitteilungen/PushProtokoll";

export function AdminView() {
  // Erst im Browser (beim Vorrendern gibt es kein „heute“ und keinen Speicher)
  const today = useToday();
  const cost = today ? lastWeekCosts(toIsoDate(today)) : { requests: 0, small: 0, large: 0, upgraded: 0, zeichen: 0, sekunden: 0, usd: 0 };
  const [secret, setSecret] = useState("");
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Für Entwickler" backHref="/profil/daten" />
      <main className={`${PAGE_MAIN} gap-5`}>
        <section className="flex flex-col gap-2" aria-label="KI-Kosten letzte 7 Tage">
          <h2 className={`px-1 ${SECTION_TITLE}`}>KI-Kosten letzte 7 Tage</h2>
          <div className={`${CARD} grid grid-cols-2 gap-3 p-4 text-[15px]`}>
            <span>Anfragen</span>
            <span className="text-right font-bold tabular-nums">{cost.requests}</span>
            <span>davon klein / groß</span>
            <span className="text-right font-bold tabular-nums">
              {cost.small} / {cost.large}
            </span>
            <span>hochgeschaltet</span>
            <span className="text-right font-bold tabular-nums">{cost.upgraded}</span>
            <span>Vorgelesen (Zeichen)</span>
            <span className="text-right font-bold tabular-nums">{cost.zeichen}</span>
            <span>Zugehört (Sekunden)</span>
            <span className="text-right font-bold tabular-nums">{cost.sekunden}</span>
            <span>Kosten (dieses Gerät)</span>
            <span className="text-right font-bold tabular-nums">{cost.usd.toFixed(2)} $</span>
          </div>
        </section>
        <TempoSection />
        <WundertueteNachschub />
        <WasLosStatus />
        <PushProtokoll />
        <div className={`${CARD} overflow-hidden`}>
          <MicLogList as="section" />
        </div>
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Prüfstand-Geheimnis"
          aria-label="Prüfstand-Geheimnis"
          className="h-12 rounded-field border border-line bg-surface px-3 text-base"
        />
        <PruefstandLauf titel="Prüfstand" saetze={PRUEFSAETZE} secret={secret} hinweis={`${PRUEFSAETZE.length} Alltagssätze durch ${helperName(null)}. Ziel: mindestens 95 % richtig. Kostet ein paar Cent.`} dauer="Bildschirm anlassen, dauert ca. 5 Minuten." />
        <PruefstandLauf titel="Prüfstand Ton" art="ton" saetze={TON_SAETZE} secret={secret} hinweis={`${TON_SAETZE.length} Alltagssätze: kurz, locker, ohne Floskel, höchstens eine Frage. Ziel: mindestens ${TON_ZIEL} %.`} dauer="Bildschirm anlassen, dauert ca. 1 Minute." />
        <AnsagenStand />
      </main>
    </div>
  );
}
