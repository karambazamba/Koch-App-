// Einkaufsliste: Mengen und Einheiten – Einheiten derselben Familie werden
// zusammengerechnet, Summen als Text ausgegeben und für kleine Haushalte auf
// übliche Größen aufgerundet.

type UnitFamily = { family: string; factor: number };

/** Einheiten derselben Familie werden zusammengerechnet (in g bzw. ml). */
export function unitFamily(unit: string): UnitFamily {
  switch (unit) {
    case "g":
      return { family: "g", factor: 1 };
    case "kg":
      return { family: "g", factor: 1000 };
    case "ml":
      return { family: "ml", factor: 1 };
    case "l":
      return { family: "ml", factor: 1000 };
    default:
      return { family: unit, factor: 1 };
  }
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/** Summe als Text: 1500 g → "1,5 kg", 3 Stück → "3 Stück" */
export function formatTotal(total: number, family: string): string {
  if (family === "g" && total >= 1000) return `${formatNumber(total / 1000)} kg`;
  if (family === "ml" && total >= 1000) return `${formatNumber(total / 1000)} l`;
  return `${formatNumber(total)} ${family}`.trim();
}

/**
 * Kleiner Haushalt: umgerechnete Mengen auf übliche Größen aufrunden
 * (g/ml auf 50 bzw. 10, Löffel auf halbe, sonst ganze Stück).
 */
export function roundSmall(total: number, family: string): number {
  if (family === "g" || family === "ml") return total >= 50 ? Math.ceil(total / 50) * 50 : Math.ceil(total / 10) * 10;
  if (/^(el|tl|prise|msp)/i.test(family)) return Math.ceil(total * 2) / 2;
  return Math.ceil(total - 1e-9);
}
