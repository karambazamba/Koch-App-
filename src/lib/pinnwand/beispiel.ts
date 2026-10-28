// Beispiel-Tag an der Pinnwand (Tafel 107): vorne ein oranger Zettel von Mia
// „Moin! Hier hängen eure Zettel.“, dahinter „Ole: Gummistiefel!“ (grün) und
// eine Beispiel-Sprachnachricht (rosa, 0:08), klein markiert „Beispiel“. Nur
// zum Anzeigen – liegt nie in den echten Speichern, nicht in Sicherung, Push
// oder KI; der erste echte Zettel ersetzt das Beispiel (`clearDemoTile`). Rein.

import type { MemoMessage } from "@/lib/pinnwand/memo";
import type { PinMessage } from "@/lib/pinnwand/model";
import type { ZettelFarbe } from "@/lib/pinnwand/tuer";

const T = "2000-01-01T00:00:00.000Z";
const base = { raum: "familie" as const, besitzer: "lokal", geaendert: T };

const pin = (id: string, author: string, text: string, farbe: ZettelFarbe | null, at: string): PinMessage => ({
  ...base,
  id: `beispiel:${id}`,
  typ: "pinnwand",
  erstellt: at,
  data: { text, author, reactions: {}, replyTo: null, readBy: [], pinned: false, farbe, papier: "zettel", foto: null, erledigt: null, archiv: null, notizFrage: true, groesse: "klein", sort: null, privat: false },
});

/** Die drei Beispiele, neueste zuerst; `mia` = der orange Zettel vorn */
export function demoBoard(helper: string): { pins: PinMessage[]; memos: MemoMessage[]; mia: string } {
  const mia = pin("mia", helper, "Moin! Hier hängen eure Zettel.", null, "2000-01-01T00:03:00.000Z");
  const ole = pin("ole", "Ole", "Gummistiefel!", 2, "2000-01-01T00:01:00.000Z");
  const memo: MemoMessage = {
    ...base,
    id: "beispiel:memo",
    typ: "memo",
    erstellt: "2000-01-01T00:02:00.000Z",
    data: { author: "Lisa", dauer: 8, mime: "audio/mp4", wave: [0.3, 0.6, 0.9, 0.5, 0.7, 0.4, 0.8, 0.5, 0.3, 0.6, 0.9, 0.4, 0.6, 0.3], gehoertVon: [], alleGehoertAm: null, reactions: {}, storagePath: null, farbe: 1, erledigt: null, archiv: null, groesse: "klein", sort: null },
  };
  return { pins: [mia, ole], memos: [memo], mia: mia.id };
}
