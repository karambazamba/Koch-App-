"use client";

// "+ Kachel hinzufügen" im Bearbeiten-Modus: alle Kacheln im 2er-Raster –
// aktive weiß mit grünem ✓ (Tippen = entfernen, mit "Gelöscht · Rückgängig"),
// inaktive grau mit "+" (Tippen = hinzufügen, still, landet an ihrem Platz in
// der Standard-Reihenfolge, in Standard-Größe). Beim Schließen scrollt die
// Seite zur zuletzt hinzugefügten Kachel, sie leuchtet kurz auf. Neue Kacheln
// mit "NEU", Post als "bald".

import { Box, CalendarClock, CheckCircle2, CloudSun, Dumbbell, ListChecks, Timer, Mail, NotebookPen, Pin, Plus, Refrigerator, ShoppingCart, Sunrise, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { TILE_PLUS_DOT } from "@/components/ui/styles";
import { HOME_TILES, applyHomeChange, saveHomeTiles, tileMeta, useHomeTiles, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { showDeleted } from "@/lib/core/toast";
import { featureOn, setFeature } from "@/lib/core/features";
import { pushUndo } from "@/lib/core/undo";
import { buzz } from "./actions";

const TILE_ICONS: Record<HomeTileId, LucideIcon> = {
  pinnwand: Pin,
  termine: CalendarClock,
  aufgaben: ListChecks,
  wetter: CloudSun,
  essen: UtensilsCrossed,
  einkauf: ShoppingCart,
  timer: Timer,
  sport: Dumbbell,
  notizen: NotebookPen,
  vorrat: Refrigerator,
  morgen: Sunrise,
  post: Mail,
};

/** Kachel hinzufügen (still) bzw. entfernen (mit Rückgängig) */
function setTile(all: HomeTile[], id: HomeTileId, show: boolean) {
  const meta = tileMeta(id);
  // Baustein-Kachel (Vorrat): beim Hinzufügen den Baustein einschalten
  const switched = show && meta.feature && !featureOn(meta.feature) ? setFeature(meta.feature, true) : false;
  saveHomeTiles(applyHomeChange(all, { tile: id, action: show ? "zeigen" : "ausblenden" }));
  const undo = pushUndo(`${meta.label} ${show ? "hinzufügen" : "entfernen"}`, () => {
    saveHomeTiles(all);
    if (switched && meta.feature) setFeature(meta.feature, false);
  });
  if (show) buzz();
  else showDeleted(undo, `${meta.label} entfernt`);
}

/** Sichtbar auf der Startseite (Bausteine nur, wenn sie an sind) */
const isActive = (t: HomeTile) => t.visible && !tileMeta(t.id).soon && (!tileMeta(t.id).feature || featureOn(tileMeta(t.id).feature!));

/** `onClosed(id)`: beim Schließen die zuletzt hinzugefügte Kachel (die Seite scrollt hin, sie leuchtet auf) */
export function TilePicker({ onClose, onClosed }: { onClose: () => void; onClosed?: (lastAdded: HomeTileId) => void }) {
  const all = useHomeTiles();
  const added = useRef<HomeTileId | null>(null);
  if (!all) return null;
  const close = () => {
    onClose();
    if (added.current) onClosed?.(added.current);
  };
  return (
    <Sheet title="Kachel hinzufügen" onClose={close} above>
      <ul className="grid grid-cols-2 gap-2 pb-3" aria-label="Kacheln">
        {HOME_TILES.filter((meta) => !meta.soon).map((meta) => {
          const tile = all.find((t) => t.id === meta.id);
          const active = Boolean(tile && isActive(tile));
          const Icon = TILE_ICONS[meta.id] ?? Box;
          return (
            <li key={meta.id}>
              <button
                type="button"
                aria-pressed={active}
                aria-label={`${meta.label}${active ? " – entfernen" : " – hinzufügen"}`}
                onClick={() => (setTile(all, meta.id, !active), (added.current = active ? (added.current === meta.id ? null : added.current) : meta.id))}
                className={`relative flex h-full w-full flex-col items-start gap-1 rounded-card border p-3 text-left transition active:scale-[0.98] ${active ? "border-line bg-surface shadow-card" : "border-transparent bg-segment"}`}
              >
                <Icon className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  {meta.label}
                  {meta.fresh && !active && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-on-accent">Neu</span>}
                </span>
                <span className="text-xs leading-snug text-muted">{meta.hint}</span>
                <span className="absolute right-2 top-2">
                  {active ? (
                    <CheckCircle2 className="h-5 w-5 text-good" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <span className={TILE_PLUS_DOT}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
