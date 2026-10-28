"use client";

// Abhaken wie bei Aufgaben (A-041, Tafel 128, Bild 1) – EIN Ablauf für jede
// Stelle, an der Einkauf abgehakt wird: Tippen = Häkchen orange, die Zeile
// bleibt 1 s stehen (nochmal tippen = zurück, auch das Gemerkte), dann
// gleitet sie 0,8 s weich weg (transform/opacity) in „Im Wagen ⌄“. Kein
// Durchstreichen. Auf einer Laden-Seite merkt sich Mia dabei den Laden.
// `abhakenAblauf` ist der Ablauf ohne React (testbar), `useAbhaken` die Hülle.

import { useEffect, useState } from "react";
import { toggleChecked } from "@/lib/einkauf/listEdits";
import type { ListItem } from "@/lib/einkauf/listModel";
import { noteShopCheck } from "@/lib/einkauf/shopRules";
import { GLEITEN_MS, STEHEN_MS } from "@/lib/einkauf/wagen/wagen";

type Optionen = {
  weekStart: string;
  /** „YYYY-MM-DD“ (Stammliste lernt den Kauf) */
  today: string;
  /** Laden der Seite ("" = keiner: nichts merken) */
  shop: string;
  /** Beim Abhaken (z. B. Einkauf beginnt, Vibration) */
  onAbhaken?: (item: ListItem) => void;
};

export type AbhakenStand = { bleibt: string[]; gleitet: string[] };

/** Der Ablauf ohne React: `onStand` meldet, was gerade stehen bleibt bzw. weggleitet */
export function abhakenAblauf(onStand: (s: AbhakenStand) => void) {
  let stand: AbhakenStand = { bleibt: [], gleitet: [] };
  const uhren = new Map<string, ReturnType<typeof setTimeout>[]>();
  const zurueck = new Map<string, () => void>();
  const setzen = (s: AbhakenStand) => {
    stand = s;
    onStand(s);
  };
  const stopp = (key: string) => {
    uhren.get(key)?.forEach((id) => clearTimeout(id));
    uhren.delete(key);
    zurueck.delete(key);
    setzen({ bleibt: stand.bleibt.filter((k) => k !== key), gleitet: stand.gleitet.filter((k) => k !== key) });
  };
  return {
    tick(item: ListItem, { weekStart, today, shop, onAbhaken }: Optionen) {
      if (!item.checked) {
        onAbhaken?.(item);
        setzen({ ...stand, bleibt: [...stand.bleibt, item.key] });
        const a = setTimeout(() => setzen({ ...stand, gleitet: [...stand.gleitet, item.key] }), STEHEN_MS);
        const b = setTimeout(() => stopp(item.key), STEHEN_MS + GLEITEN_MS);
        uhren.set(item.key, [a, b]);
        // Mia merkt sich den Laden (still); nochmal tippen in der Sekunde nimmt es zurück
        if (shop) zurueck.set(item.key, noteShopCheck(item.name, shop));
      } else {
        zurueck.get(item.key)?.();
        stopp(item.key);
      }
      toggleChecked(weekStart, item, today, { imHaus: false });
    },
    aufraeumen() {
      uhren.forEach((ids) => ids.forEach((id) => clearTimeout(id)));
      uhren.clear();
    },
  };
}

export function useAbhaken(optionen: Optionen) {
  const [stand, setStand] = useState<AbhakenStand>({ bleibt: [], gleitet: [] });
  const [ablauf] = useState(() => abhakenAblauf(setStand));
  useEffect(() => () => ablauf.aufraeumen(), [ablauf]);
  return { ...stand, tick: (item: ListItem) => ablauf.tick(item, optionen) };
}
