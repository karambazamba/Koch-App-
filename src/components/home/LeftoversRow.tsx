"use client";

import { Carrot } from "lucide-react";
import { ListRow } from "@/components/ui/ListRow";
import { openHelper } from "@/lib/assistant/open";
import { formatPantryItem, usePantry } from "@/lib/pantry";

/** Kachel "Was ist noch da?": öffnet den Küchenhelfer im Reste-Modus */
export function LeftoversRow() {
  const pantry = usePantry();
  const subtitle =
    pantry && pantry.length > 0
      ? `Noch da: ${pantry.slice(0, 3).map(formatPantryItem).join(", ")}${pantry.length > 3 ? " …" : ""}`
      : "Sag, was übrig ist – wir zaubern was draus";
  return <ListRow onClick={() => openHelper("reste")} title="Was ist noch da?" subtitle={subtitle} icon={Carrot} />;
}
