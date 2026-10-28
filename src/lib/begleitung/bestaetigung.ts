// Kurze Bestätigung aus dem Ergebnis kleiner, sicherer Aktionen (rein): „Is
// drauf.“, „Do 16 Uhr Zahnarzt, steht drin.“, „Läuft.“ – für die Eine-Runde-
// Antwort der Engine (keine zweite Modell-Runde nur für den Text) und für den
// Sofort-Weg ohne KI. Gleicher Ton wie die Beispiele im Prompt (1–3 Wörter,
// höchstens ein halber Satz), läuft danach noch durch `tidyMiaText`.

import type { ChangeOp } from "@/lib/begleitung/ops";
import { addDays } from "@/lib/core/now";

/** Werkzeuge, nach denen keine zweite Runde nötig ist (wenn sie sauber eine Änderung vormerken) */
export const EINE_RUNDE_WERKZEUGE = new Set(["einkaufsliste_hinzufuegen", "termin_anlegen", "aufgabe_anlegen", "notiz_anlegen", "liste_eintrag_hinzufuegen", "timer_stellen", "pinnwand_schreiben"]);

/** Diese Änderungen bestätigt die App selbst */
const KURZ = new Set<ChangeOp["type"]>(["add_shopping", "upsert_entry", "upsert_note", "add_timer", "add_pin"]);

const WOCHENTAG = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });

/** „Heute“, „Morgen“, „Do“ (diese Woche) oder „29.10.“ */
function tagWort(iso: string, today: string): string {
  if (iso === today) return "Heute";
  if (iso === addDays(today, 1)) return "Morgen";
  if (iso > today && iso <= addDays(today, 6)) return WOCHENTAG.format(new Date(`${iso}T12:00:00Z`)).replace(".", "");
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

/** „16 Uhr“, „16:30“ */
const uhr = (hhmm: string) => (hhmm.endsWith(":00") ? `${Number(hhmm.slice(0, 2))} Uhr` : hhmm.replace(/^0/, ""));

/** Lässt sich das in einem Satz bestätigen? (nur kleine, neue Dinge, nichts davon Vorschlag) */
export function kurzBestaetigbar(ops: ChangeOp[]): boolean {
  return ops.length > 0 && ops.every((op) => KURZ.has(op.type) && (op.type !== "add_shopping" || !op.vorschlag) && (op.type !== "upsert_entry" || op.isNew) && (op.type !== "upsert_note" || op.isNew || Boolean(op.change)));
}

/** Kurze Bestätigung; mehrere Arten auf einmal = „Erledigt.“ (die App zeigt die Übersicht) */
export function kurzeBestaetigung(ops: ChangeOp[], today: string): string {
  const arten = new Set(ops.map((op) => op.type));
  if (arten.size > 1) return "Erledigt.";
  const op = ops[0];
  if (!op) return "Erledigt.";
  switch (op.type) {
    case "add_shopping":
      return ops.length > 1 ? "Steht alles drauf." : "Is drauf.";
    case "add_timer":
      return "Läuft.";
    case "add_pin":
      return "Hängt an der Pinnwand.";
    case "upsert_note":
      return op.isNew ? "Notiert." : "Steht drin.";
    case "upsert_entry": {
      if (ops.length > 1) return "Steht alles drin.";
      const e = op.entry;
      if (e.typ === "termin" && e.data.start) return `${tagWort(e.data.date, today)} ${uhr(e.data.start)} ${e.data.title}, steht drin.`;
      if (e.typ === "aufgabe" && e.data.reminder !== "aus") return "Mach ich.";
      return "Steht drin.";
    }
    default:
      return "Erledigt.";
  }
}
