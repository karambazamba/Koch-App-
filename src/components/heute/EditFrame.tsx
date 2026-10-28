"use client";

// Rahmen einer Kachel auf der Startseite (`HomeBoard`): normal nur die
// Pastell-Farbe (data-tone, gewählte Farbe data-farbe), im Bearbeiten-Modus
// "–", S · M · L und darunter die Farbwahl (Tafel 108).
// Ganze Kachel = Seite: ein Tipp auf freie Fläche öffnet `href` (Zeilen,
// Knöpfe und Links in der Kachel behalten ihr eigenes Ziel).

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Minus } from "lucide-react";
import { tileMeta, type HomeTile, type TileSize } from "@/lib/core/homeLayout";
import { farbWaehlbar, type KachelFarbe } from "@/lib/heute/kachelFarben";
import { FarbWahl } from "@/components/heute/FarbWahl";

/** Im Bearbeiten-Modus: "–" oben links, darunter S · M · L und die Farbwahl, Inhalt nicht antippbar */
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
  return (
    <div data-tone={tile.id} data-farbe={tile.farbe} className="relative min-w-0">
      <div inert className="pointer-events-none min-h-14 select-none pl-3">
        {children ?? <div className="flex h-16 items-center rounded-card border border-line bg-surface px-4 text-sm font-bold text-muted">{meta.label}</div>}
      </div>
      <button type="button" onClick={onRemove} aria-label={`${meta.label} entfernen`} className="absolute -left-3 -top-3 z-10 flex h-11 w-11 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card">
          <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />
        </span>
      </button>
      <div className="flex flex-col items-end gap-1.5 pt-1.5 pl-3 empty:hidden">
        {meta.sizes.length > 1 && (
          <div className="z-10 flex overflow-hidden rounded-full border border-line bg-surface text-xs font-bold shadow" role="radiogroup" aria-label={`Größe ${meta.label}`}>
            {meta.sizes.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={tile.size === s}
                aria-label={`${meta.label} ${s === "S" ? "klein" : s === "M" ? "mittel" : "groß"}`}
                onClick={() => onResize(s)}
                className={`hit flex h-8 w-9 items-center justify-center ${tile.size === s ? "bg-accent text-on-accent" : "text-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {farbWaehlbar(tile.id) && <FarbWahl label={meta.label} farbe={tile.farbe} onFarbe={onFarbe} />}
      </div>
    </div>
  );
}

/** Liegt der Tipp auf etwas mit eigenem Ziel (Knopf, Link, Feld, Fenster)? */
function eigenesZiel(target: EventTarget | null, frame: Element): boolean {
  const el = target instanceof Element ? target.closest("a, button, input, textarea, select, label, [role=button], [role=checkbox], [role=dialog], [data-kein-ziel]") : null;
  return Boolean(el && frame.contains(el)) || !(target instanceof Node && frame.contains(target));
}
