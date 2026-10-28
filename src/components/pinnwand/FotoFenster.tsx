"use client";

// Foto-Zettel angetippt (Tafel 123, Punkt 1): das Foto groß im Fenster, ganz
// zu sehen, darunter die Bildunterschrift, wer und wann, dazu „Erledigt“ und
// „Mehr“ (Reaktionen, Antworten, Löschen – das Menü wie bei jedem Zettel).

import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { doneLine, type PinMessage } from "@/lib/pinnwand";
import { FotoBild } from "@/components/pinnwand/Zettel";
import { pinMetaLine } from "@/components/pinnwand/PinSheets";
import { toggleDone } from "@/components/pinnwand/boardActions";
import type { BoardItem } from "@/components/pinnwand/useBoard";

type Props = { item: BoardItem & { kind: "pin"; pin: PinMessage }; me: string; onMore: () => void; onClose: () => void };

export function FotoFenster({ item, me, onMore, onClose }: Props) {
  const done = item.pin.data.erledigt;
  return (
    <Sheet title="Foto" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2" data-foto-fenster>
        <div className="overflow-hidden rounded-field bg-fill">
          <FotoBild pin={item.pin} big />
        </div>
        {item.pin.data.text && <p className="whitespace-pre-line break-words text-[17px] font-bold">{item.pin.data.text}</p>}
        <p className="text-[13px] font-semibold text-muted">{done ? doneLine(done, me) : pinMetaLine(item.pin, me)}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => (toggleDone(item, me), onClose())} className={`${buttonClass("primary", "md")} flex-1`}>
            {done ? "Doch nicht erledigt" : "Erledigt"}
          </button>
          <button type="button" onClick={onMore} className={`${buttonClass("secondary", "md")} flex-1`}>
            Mehr
          </button>
        </div>
      </div>
    </Sheet>
  );
}
