"use client";

// Rahmen einer Kachel auf der Startseite (`HomeBoard`): normal nur die
// Pastell-Farbe (data-tone, gewählte Farbe data-farbe), im Bearbeiten-Modus
// "–" oben links und IN der Kachel unten rechts der Größen-Umschalter (nur die
// erlaubten Größen, XS · S · M) mit der Farbwahl darunter (Tafel 108/118). Die
// Kachel behält dabei genau ihre Fläche im Raster (Bearbeiten = Fertig-Ansicht);
// bei XS öffnet der Farb-Knopf die Reihe über der kleinen Kachel.
// Ganze Kachel = Seite: ein Tipp auf freie Fläche öffnet `href` (Zeilen,
// Knöpfe und Links in der Kachel behalten ihr eigenes Ziel).

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Minus, Palette } from "lucide-react";
import { tileMeta, type HomeTile, type TileSize } from "@/lib/core/homeLayout";
import { farbWaehlbar, type KachelFarbe } from "@/lib/heute/kachelFarben";
import { FarbWahl } from "@/components/heute/FarbWahl";

const GROESSE_WORT: Record<TileSize, string> = { XS: "ganz klein", S: "klein", M: "mittel" };

/** Im Bearbeiten-Modus: "–" oben links, in der Kachel der Größen-Umschalter und die Farbwahl, Inhalt nicht antippbar */
export function EditFrame({
  tile,
  editing,
  href,
  onRemove,
  onResize,
  onFarbe,
  children,
}: {
  tile: HomeTile;
  editing: boolean;
  href?: string | null;
  onRemove: () => void;
  onResize: (s: TileSize) => void;
  onFarbe: (f: KachelFarbe | undefined) => void;
  children: ReactNode;
}) {
  const meta = tileMeta(tile.id);
  const router = useRouter();
  const [farbeOffen, setFarbeOffen] = useState(false);
  // data-tone: Pastell-Farben der Kachel (Fläche, Akzent, innere Karten)
  if (!editing)
    return (
      <div
        data-tone={tile.id}
        data-farbe={tile.farbe}
        className="contents"
        data-kachel-ziel={href ?? undefined}
        onClick={href ? (e) => !eigenesZiel(e.target, e.currentTarget) && router.push(href, { scroll: false }) : undefined}
      >
        {children}
      </div>
    );
  const farbe = farbWaehlbar(tile.id);
  const xs = tile.size === "XS";
  return (
    <div data-tone={tile.id} data-farbe={tile.farbe} className="relative h-full min-w-0">
      <div inert className="pointer-events-none h-full select-none [&>*]:h-full">
        {children ?? <div className="flex h-full items-center rounded-card border border-line bg-surface px-4 text-sm font-bold text-muted">{meta.label}</div>}
      </div>
      <button type="button" onClick={onRemove} aria-label={`${meta.label} entfernen`} className="absolute -left-3 -top-3 z-10 flex h-11 w-11 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card">
          <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />
        </span>
      </button>
      <div className={`absolute z-10 flex items-end gap-1.5 ${xs ? "bottom-1.5 right-1.5 flex-row" : "bottom-2 right-2 left-2 flex-col"} empty:hidden`} data-kachel-knoepfe>
        {meta.sizes.length > 1 && (
          <div className="flex overflow-hidden rounded-full border border-line bg-surface text-xs font-bold shadow" role="radiogroup" aria-label={`Größe ${meta.label}`}>
            {meta.sizes.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={tile.size === s}
                aria-label={`${meta.label} ${GROESSE_WORT[s]}`}
                onClick={() => onResize(s)}
                className={`hit flex h-8 items-center justify-center ${s === "XS" ? "w-10" : "w-9"} ${tile.size === s ? "bg-accent text-on-accent" : "text-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {farbe && xs && (
          <button type="button" onClick={() => setFarbeOffen((o) => !o)} aria-expanded={farbeOffen} aria-label={`Farbe ${meta.label} wählen`} className="hit flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted shadow">
            <Palette className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        )}
        {farbe && !xs && <FarbWahl label={meta.label} farbe={tile.farbe} onFarbe={onFarbe} />}
      </div>
      {farbe && xs && farbeOffen && (
        // XS: die Farbreihe liegt über der kleinen Kachel (zwei Reihen passen genau), ein Tipp wählt und schließt
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <FarbWahl
            label={meta.label}
            farbe={tile.farbe}
            onFarbe={(f) => {
              onFarbe(f);
              setFarbeOffen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Liegt der Tipp auf etwas mit eigenem Ziel (Knopf, Link, Feld, Fenster)? */
function eigenesZiel(target: EventTarget | null, frame: Element): boolean {
  const el = target instanceof Element ? target.closest("a, button, input, textarea, select, label, [role=button], [role=checkbox], [role=dialog], [data-kein-ziel]") : null;
  return Boolean(el && frame.contains(el)) || !(target instanceof Node && frame.contains(target));
}
