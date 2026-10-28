// Beispiel-Tag an der Pinnwand je Haushalt (Tafel 119): Familie = vorne
// Felix „Bin um 18 Uhr da“ (gelb), dahinter Mathis’ Sprachnachricht (0:08)
// und Lisa „Ole: Gummistiefel!“ (grün); zu zweit = Anna „Brot kaufen?“, Toms
// Sprachnachricht und Tom „Wäsche ist durch“. Klein markiert „Beispiel“. Nur
// zum Anzeigen – liegt nie in den echten Speichern, nicht in Sicherung, Push
// oder KI; der erste echte Zettel ersetzt das Beispiel (`clearDemoTile`). Rein.

import type { MemoMessage } from "@/lib/pinnwand/memo";
import type { PinMessage } from "@/lib/pinnwand/model";
import type { ZettelFarbe } from "@/lib/pinnwand/tuer";
import type { Haushalt } from "@/lib/core/haushalt";

const T = "2000-01-01T00:00:00.000Z";
const base = { raum: "familie" as const, besitzer: "lokal", geaendert: T };

const pin = (id: string, author: string, text: string, farbe: ZettelFarbe | null, at: string): PinMessage => ({
  ...base,
  id: `beispiel:${id}`,
  typ: "pinnwand",
  erstellt: at,
  data: { text, author, reactions: {}, replyTo: null, readBy: [], pinned: false, farbe, papier: "zettel", foto: null, erledigt: null, archiv: null, notizFrage: true, groesse: "klein", sort: null, privat: false },
});

type Fassung = { vorn: [string, string]; hinten: [string, string]; memo: string };

const FASSUNG: Record<"familie" | "paar", Fassung> = {
  familie: { vorn: ["Felix", "Bin um 18 Uhr da"], hinten: ["Lisa", "Ole: Gummistiefel!"], memo: "Mathis" },
  paar: { vorn: ["Anna", "Brot kaufen?"], hinten: ["Tom", "Wäsche ist durch"], memo: "Tom" },
};

/** Die drei Beispiele, neueste zuerst: vorn (gelb), dahinter (grün) und eine Sprachnachricht (rosa, 0:08) */
export function demoBoard(haushalt: Haushalt = "familie"): { pins: PinMessage[]; memos: MemoMessage[] } {
  const f = FASSUNG[haushalt === "paar" ? "paar" : "familie"];
  const vorn = pin("vorn", f.vorn[0], f.vorn[1], 0, "2000-01-01T00:03:00.000Z");
  const hinten = pin("hinten", f.hinten[0], f.hinten[1], 2, "2000-01-01T00:01:00.000Z");
  const memo: MemoMessage = {
    ...base,
    id: "beispiel:memo",
    typ: "memo",
    erstellt: "2000-01-01T00:02:00.000Z",
    data: { author: f.memo, dauer: 8, mime: "audio/mp4", wave: [0.3, 0.6, 0.9, 0.5, 0.7, 0.4, 0.8, 0.5, 0.3, 0.6, 0.9, 0.4, 0.6, 0.3], gehoertVon: [], alleGehoertAm: null, reactions: {}, storagePath: null, farbe: 1, erledigt: null, archiv: null, groesse: "klein", sort: null },
  };
  return { pins: [vorn, hinten], memos: [memo] };
}
