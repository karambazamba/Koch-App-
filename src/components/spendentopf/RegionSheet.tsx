"use client";

// „Region wählen“: Suchfeld „Ort oder Postleitzahl“, darunter die Regionen mit
// Status (aktiv · bald · sucht Paten) und je einer Zeile Info.

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, INPUT } from "@/components/ui/styles";
import { searchRegions } from "@/lib/spendentopf/model";
import type { Region, RegionStatus } from "@/lib/spendentopf/regions";

const STATUS: Record<RegionStatus, { label: string; tone: string }> = {
  aktiv: { label: "aktiv", tone: "bg-good-soft text-good-ink" },
  bald: { label: "bald", tone: "bg-fill text-muted" },
  sucht_paten: { label: "sucht Paten", tone: "bg-accent-soft text-accent-strong" },
};

export function RegionSheet({ current, onPick, onClose }: { current: string | null; onPick: (r: Region) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = searchRegions(q);
  return (
    <Sheet title="Region wählen" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ort oder Postleitzahl" aria-label="Ort oder Postleitzahl" className={INPUT} inputMode="search" />
        <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`} aria-label="Regionen">
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-fill">
                <MapPin className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-base font-bold">
                    {r.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
                  </span>
                  <span className="truncate text-sm text-muted">{r.info}</span>
                </span>
                {r.id === current && <Check className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} aria-label="gewählt" />}
              </button>
            </li>
          ))}
          {!list.length && <li className="px-4 py-4 text-sm text-muted">Dafür kenne ich noch keine Region.</li>}
        </ul>
        <p className="px-1 text-sm text-muted">Automatisch nach eurem Wohnort – ändern geht jederzeit.</p>
      </div>
    </Sheet>
  );
}
