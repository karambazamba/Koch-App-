// Mias Nachschub im Speicher (A-052, für Wundertüte und Rätsel gleich): Fällt
// der Vorrat einer KI-Sorte unter 20 ungesehene, legt Mia im Hintergrund nach
// – höchstens 6 Anfragen am Tag je Gerät und Bereich, nie zwei gleichzeitig.
// Ohne KI passiert nichts (dann „… kommen bald.“, nie eine Wiederholung).

import { now, todayIso } from "@/lib/core/now";
import type { KiArt } from "@/lib/wundertuete/kiKarte";
import { brauchtNachschub, darfNachlegen, kiGezaehlt, nachlegen, neueKiId, type Karte, type KiZaehler, type Pool, type VorratStand } from "@/lib/wundertuete/vorrat";

type Stand<S extends string> = VorratStand<Karte<S>> & { ki?: KiZaehler };

const laufend = new Set<string>();

export async function nachschub<S extends string, T extends Stand<S>>(bereich: string, art: KiArt & S, pool: Pool<Karte<S>>, laden: () => T, speichern: (s: T) => void) {
  const tag = todayIso();
  const s = laden();
  if (laufend.has(bereich) || !brauchtNachschub(pool, s, art) || !darfNachlegen(s.ki, tag)) return;
  laufend.add(bereich);
  try {
    speichern({ ...s, ki: kiGezaehlt(s.ki, tag) });
    const { kiHolen } = await import("@/lib/wundertuete/kiHolen");
    const neu = await nachlegen(pool, laden(), art, kiHolen, () => neueKiId(now().getTime()));
    if (!neu.length) return;
    const st = laden();
    speichern({ ...st, eigene: [...st.eigene, ...neu.filter((n) => !st.eigene.some((e) => e.vorne === n.vorne))] });
  } finally {
    laufend.delete(bereich);
  }
}
