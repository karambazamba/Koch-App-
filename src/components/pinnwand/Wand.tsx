"use client";

// Die Wand an der Kühlschranktür (Tafel 123 A): kleine Zettel in zwei
// Spalten (immer in die kürzere), große quer über beide; Abstände
// gleichmäßig, so hoch wie der Inhalt. Mit `ordnen` hängen die Gesten dran
// (lange drücken = Fenster, halten und ziehen = verschieben, `useWandGesten`).

import type { ReactNode } from "react";
import { guessHeight, wandBlocks } from "@/lib/pinnwand";
import { entryOf, type BoardItem } from "@/components/pinnwand/useBoard";
import { useWandGesten } from "@/components/pinnwand/useWandGesten";

const heightOf = (i: BoardItem) => (i.kind === "memo" ? guessHeight("memo") : guessHeight(i.pin.data.papier, i.pin.data.text, i.pin.data.groesse === "gross"));
const groesseOf = (i: BoardItem) => entryOf(i).data.groesse ?? "klein";

type Props = {
  items: BoardItem[];
  render: (item: BoardItem, lifted: boolean) => ReactNode;
  /** Gesten an: lange drücken (Fenster) und ziehen (Reihenfolge) */
  ordnen?: { onHold: (id: string) => void; onDrop: (id: string, to: number) => void };
  label?: string;
};

export function Wand({ items, render, ordnen, label = "Zettel" }: Props) {
  const { order, lifted, container, handlers } = useWandGesten({ items, enabled: Boolean(ordnen), onHold: ordnen?.onHold ?? (() => undefined), onDrop: ordnen?.onDrop ?? (() => undefined) });
  const blocks = wandBlocks(order, groesseOf, heightOf);
  return (
    <div ref={container} {...handlers} className="flex flex-col gap-5 pt-3" aria-label={label} role="group" data-no-swipe={lifted ? true : undefined} data-wand>
      {blocks.map((b, n) =>
        b.art === "breit" ? (
          <div key={b.item.id} data-flip={b.item.id} className="relative">
            {render(b.item, lifted === b.item.id)}
          </div>
        ) : (
          <div key={`paar-${n}`} className="grid grid-cols-2 gap-x-3.5">
            {b.spalten.map((col, c) => (
              <ul key={c} className="flex min-w-0 flex-col gap-5" aria-label={c === 0 ? "Zettel links" : "Zettel rechts"}>
                {col.map((i) => (
                  <li key={i.id} data-flip={i.id} className="relative">
                    {render(i, lifted === i.id)}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
