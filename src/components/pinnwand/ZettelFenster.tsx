"use client";

// Lange gedrückt (Tafel 123 C): ein Fenster für Größe und Platz – Schalter
// „Klein | Groß“ (klein = halbe Breite, groß = volle Breite), „Nach oben“,
// „Nur für mich“ bzw. „Für alle“ (nur Zettel; Sprachnachrichten sind immer
// für die anderen), „Erledigt“, leise darunter „Zum Verschieben: halten und
// ziehen“. Titel = der Zettel in Anführungszeichen (wie auf der Tafel).
// Still: nichts davon meldet sich (nichts wird gelöscht).

import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { CARD_LIST } from "@/components/ui/styles";
import { FUER_ALLE, GROESSEN, zettelTitel, NACH_OBEN, NUR_FUER_MICH, VERSCHIEBEN_HINWEIS, type Groesse } from "@/lib/pinnwand";
import { setGroesse, setPrivat, toggleDone, toTop } from "@/components/pinnwand/boardActions";
import { entryOf, type BoardItem } from "@/components/pinnwand/useBoard";

function Zeile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center px-4 text-left text-[16px] font-semibold text-ink active:bg-fill">
      {label}
    </button>
  );
}

type Props = { item: BoardItem; all: BoardItem[]; me: string; onClose: () => void };

export function ZettelFenster({ item, all, me, onClose }: Props) {
  const e = entryOf(item);
  const groesse: Groesse = e.data.groesse ?? "klein";
  const privat = item.kind === "pin" && item.pin.data.privat;
  const titel = item.kind === "memo" ? "Sprachnachricht" : zettelTitel(item.pin.data.text);
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };
  return (
    <Sheet title={titel} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2" data-zettel-fenster>
        <Segmented<Groesse> label="Größe" value={groesse} onChange={(g) => setGroesse(item, g)} options={[...GROESSEN]} />
        <div className={CARD_LIST}>
          <Zeile label={NACH_OBEN} onClick={run(() => toTop(item, all))} />
          {item.kind === "pin" && <Zeile label={privat ? FUER_ALLE : NUR_FUER_MICH} onClick={run(() => void setPrivat(item, !privat))} />}
          <Zeile label={e.data.erledigt ? "Doch nicht erledigt" : "Erledigt"} onClick={run(() => toggleDone(item, me))} />
        </div>
        <p className="px-1 text-center text-[13px] text-muted">{VERSCHIEBEN_HINWEIS}</p>
      </div>
    </Sheet>
  );
}
