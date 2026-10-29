"use client";

// Mias Ohr live im Browser: Mikrofon (über `core/mic`, nur EIN „Erlauben“),
// Ton als Werte für `ohrLive.ts` und der echte Websocket. Der Ton geht nur an
// den Anbieter und wird nirgends abgelegt. Nur `useSpeechInput` (Bühne) nutzt
// das; Pinnwand-Sprachnachrichten haben ihre eigene Aufnahme.
// Mikrofon, Ton-Kontext und Vorlauf (A-056) stehen in `ohrMikro.ts`.

import { micLog } from "@/lib/core/micLog";
import type { LiveDeps, LiveSocket } from "@/lib/begleitung/ohrLive";
import { ohrToken } from "@/lib/begleitung/stimmeClient";
import type { Vorlauf } from "@/lib/begleitung/ohrPuffer";
import { mikroAn } from "@/lib/begleitung/ohrMikro";

/** Die echten Teile für eine Zuhör-Runde – mit Vorlauf kommt zuerst der gepufferte Anfang */
export function liveDeps(v: Vorlauf | null = null): LiveDeps {
  return {
    token: ohrToken,
    mikro: v ? v.nehmen : mikroAn,
    ...(v ? { tippenAm: v.gestartetAm, mikroAm: v.mikroAm } : {}),
    socket: (url) => new WebSocket(url) as unknown as LiveSocket,
    log: micLog,
    uhr: () => performance.now(),
  };
}
