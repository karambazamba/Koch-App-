"use client";

// Einstellungen → „Tipps aus der Region“: Ort (übernimmt den Wetter-Ort,
// änderbar), Umkreis 5/10/20/40 km (Standard 20) und „Tipps im Kalender
// zeigen“. Keine Ortung – nur der Ort von hier.

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, INPUT, LABEL, PAGE_MAIN } from "@/components/ui/styles";
import { SwitchRow } from "@/components/profile/settings/SettingsParts";
import { usePlace } from "@/lib/wetter/client";
import { TIP_RADII, type TipRadius } from "@/lib/tipps/model";
import { changeTipSettings, forgetTips, useTipSettings } from "@/lib/tipps/client";

export function TipSettingsView() {
  const s = useTipSettings();
  const weather = usePlace();
  const [ort, setOrt] = useState<string | null>(null);
  const value = ort ?? s.ort ?? "";
  const saveOrt = () => {
    if (ort === null) return;
    const next = ort.trim();
    changeTipSettings((x) => ({ ...x, ort: next && next !== weather ? next.slice(0, 60) : null }));
    setOrt(null);
    forgetTips();
  };
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Tipps aus der Region" backHref="/profil" />
      <main className={`${PAGE_MAIN} gap-5`}>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Ort</span>
          <input
            className={INPUT}
            value={value}
            placeholder={`${weather} (wie beim Wetter)`}
            onChange={(e) => setOrt(e.target.value)}
            onBlur={saveOrt}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            autoComplete="address-level2"
            aria-label="Ort für die Tipps"
          />
          <span className="text-sm text-muted">Leer = der Wetter-Ort. Kein GPS – nur dieser Ort zählt.</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Umkreis</span>
          <Segmented<string>
            value={String(s.km)}
            options={TIP_RADII.map((k) => ({ value: String(k), label: `${k} km` }))}
            onChange={(v) => {
              changeTipSettings((x) => ({ ...x, km: Number(v) as TipRadius }));
              forgetTips();
            }}
            label="Umkreis"
          />
        </div>
        <ul className={CARD}>
          <SwitchRow icon={CalendarDays} title="Tipps im Kalender zeigen" hint="Als lila Ebene – erst „Übernehmen“ macht einen Termin daraus." checked={s.kalender} onChange={(on) => changeTipSettings((x) => ({ ...x, kalender: on }))} />
        </ul>
      </main>
    </div>
  );
}
