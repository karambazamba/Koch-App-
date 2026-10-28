// Mias Ergebnis-Karten (A-037, Tafel 126 „Einfach erzählen. Mia sortiert.“):
// Nach jedem Satz, mit dem Mia etwas anlegt, steht pro Eintrag eine weiße
// Karte unter ihrer kurzen Antwort – links das Symbol in der Kachelfarbe des
// Bereichs, Mitte fett der Inhalt („Fr 16:00 Zahnarzt“), darunter klein Art ·
// Raum („Termin · Familie“, „Einkauf · für alle“), rechts die grüne Pille
// („Eingetragen“, „Steht drauf“, „Hängt dran“, „Notiert“). Große Dinge
// (Vorschau) zeigen dieselbe Karte mit „Übernehmen“. Hier nur das Reine:
// welche Karten, wie viele sichtbar, was nach „Übernehmen“ bleibt. Keine Zahlen.

import type { Room } from "@/lib/core/entries";
import type { HomeTileId } from "@/lib/core/homeLayout";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { CalendarEntry } from "@/lib/kalender/model";
import { leuchtSchluessel, type Leuchten } from "@/lib/heute/aufleuchten";

export type ErgebnisArt = "termin" | "aufgabe" | "einkauf" | "pinnwand" | "notiz" | "haus" | "essen" | "familie";

export type Ergebnis = {
  /** id der Änderung (bzw. des Eintrags) */
  id: string;
  art: ErgebnisArt;
  /** Kachel, deren Farbe das Symbol trägt */
  kachel: HomeTileId;
  /** Fett in der Mitte: „Fr 16:00 Zahnarzt“, „Milch“ */
  text: string;
  /** Klein darunter, vor dem Punkt: „Termin“, „Einkauf“ */
  artText: string;
  /** Termin/Aufgabe/Notiz: der Raum (Name je Haushalt), sonst null = „für alle“ bzw. `nachsatz` */
  raum: Room | null;
  /** Statt des Raums („für alle“, „Jonne“); null = nur die Art */
  nachsatz: string | null;
  /** Grüne Pille */
  pille: string;
  /** Antippen öffnet hier (Termin/Aufgabe: ihr Fenster über `eintragId`) */
  href: string | null;
  /** Termin/Aufgabe: Eintrag zum Öffnen und Raum ändern */
  eintragId: string | null;
  /** Aufleuchten in der Kachel (null = gar nicht, Schlüssel "" = Kachel als Ganzes) */
  leuchten: Leuchten | null;
};

const FUER_ALLE = "für alle";
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
/** „Mo 10:00 Zahnarzt“ – Tag aus dem Datum (nicht „jetzt“), ganztägig ohne Uhrzeit */
const terminText = (date: string, start: string | undefined, title: string) => [WD[new Date(`${date}T12:00:00Z`).getUTCDay()], start, title].filter(Boolean).join(" ");

function eintragKarte(id: string, entry: CalendarEntry): Ergebnis {
  const d = entry.data as { title: string; date?: string; start?: string };
  const termin = entry.typ === "termin" && Boolean(d.date);
  return {
    id,
    art: termin ? "termin" : "aufgabe",
    kachel: termin ? "termine" : "aufgaben",
    text: termin ? terminText(d.date!, d.start, d.title) : d.title,
    artText: termin ? "Termin" : "Aufgabe",
    raum: entry.raum,
    nachsatz: null,
    pille: "Eingetragen",
    href: termin ? `/tag?datum=${d.date}` : "/aufgaben",
    eintragId: entry.id,
    leuchten: { kachel: termin ? "termine" : "aufgaben", schluessel: leuchtSchluessel("eintrag", entry.id) },
  };
}

const karte = (op: ChangeOp, k: Omit<Ergebnis, "id" | "raum" | "eintragId"> & { raum?: Room | null }): Ergebnis => ({ id: op.id, eintragId: null, ...k, raum: k.raum ?? null });

/** Eine Änderung als Karte (null = keine Karte, z. B. Timer oder Wochenplan) */
function ergebnisVon(op: ChangeOp): Ergebnis | null {
  switch (op.type) {
    case "upsert_entry":
      return eintragKarte(op.id, op.entry);
    case "done_entry":
      return karte(op, { art: "aufgabe", kachel: "aufgaben", text: op.title, artText: "Aufgabe", nachsatz: null, pille: "Abgehakt", href: "/aufgaben", leuchten: null });
    case "add_shopping":
      return karte(op, { art: "einkauf", kachel: "einkauf", text: op.name, artText: "Einkauf", nachsatz: FUER_ALLE, pille: "Steht drauf", href: "/einkaufsliste", leuchten: { kachel: "einkauf", schluessel: leuchtSchluessel("einkauf", op.name) } });
    case "set_shop_rule":
      return karte(op, { art: "einkauf", kachel: "einkauf", text: op.shop ? `${op.name} immer bei ${op.shop}` : `${op.name} egal wo`, artText: "Einkauf", nachsatz: FUER_ALLE, pille: "Gemerkt", href: "/einkaufsliste", leuchten: null });
    case "add_pin":
      return karte(op, { art: "pinnwand", kachel: "pinnwand", text: op.text, artText: "Pinnwand", nachsatz: FUER_ALLE, pille: "Hängt dran", href: "/pinnwand", leuchten: { kachel: "pinnwand", schluessel: "" } });
    case "upsert_note":
      return karte(op, { art: "notiz", kachel: "notizen", text: op.note.data.title, artText: "Notiz", raum: op.note.raum, nachsatz: null, pille: "Notiert", href: `/notizen/bearbeiten?id=${op.note.id}`, leuchten: { kachel: "notizen", schluessel: leuchtSchluessel("notiz", op.note.id) } });
    case "add_pantry":
      return karte(op, { art: "haus", kachel: "vorrat", text: op.name, artText: "Im Haus", nachsatz: FUER_ALLE, pille: "Notiert", href: "/vorrat", leuchten: { kachel: "vorrat", schluessel: "" } });
    case "use_pantry":
      return karte(op, { art: "haus", kachel: "vorrat", text: `${op.name} ist alle`, artText: "Im Haus", nachsatz: FUER_ALLE, pille: "Notiert", href: "/vorrat", leuchten: { kachel: "vorrat", schluessel: "" } });
    case "add_wish":
      return karte(op, { art: "essen", kachel: "essen", text: op.dish, artText: "Wunsch", nachsatz: op.who || null, pille: "Notiert", href: "/?seite=essen", leuchten: null });
    case "set_dislike":
      return karte(op, { art: "familie", kachel: "essen", text: op.mag ? `${op.who} mag wieder ${op.term}` : `${op.who} mag kein ${op.term}`, artText: "Das mögt ihr", nachsatz: null, pille: "Gemerkt", href: "/profil/das-moegt-ihr", leuchten: null });
    default:
      return null;
  }
}

/** Karten in der Reihenfolge, in der Mia es gemacht hat; doppelte (zweimal „Milch“) nur einmal */
export function ergebnisse(ops: readonly ChangeOp[]): Ergebnis[] {
  const out: Ergebnis[] = [];
  for (const op of ops) {
    const e = ergebnisVon(op);
    if (e && !out.some((x) => x.art === e.art && x.text.toLowerCase() === e.text.toLowerCase())) out.push(e);
  }
  return out;
}

/** Ein Eintrag (Termin/Aufgabe) als Karte – z. B. aus den Regeln ohne KI */
export const ergebnisAusEintrag = (entry: CalendarEntry): Ergebnis => eintragKarte(entry.id, entry);

/** Höchstens so viele Karten, der Rest hinter „und N weitere ⌄“ */
export const ERGEBNIS_MAX = 4;

/** Sichtbare Karten und wie viele hinter „und N weitere“ stehen (aufgeklappt: alle) */
export function sichtbareErgebnisse<T>(karten: readonly T[], offen: boolean): { zeigen: T[]; weitere: number } {
  if (offen || karten.length <= ERGEBNIS_MAX) return { zeigen: [...karten], weitere: 0 };
  return { zeigen: karten.slice(0, ERGEBNIS_MAX), weitere: karten.length - ERGEBNIS_MAX };
}

export const weitereText = (n: number) => `und ${n} weitere`;

/** Klein unter dem Inhalt: „Termin · Familie“, „Einkauf · für alle“, „Das mögt ihr“ */
export const unterzeile = (e: Ergebnis, raumName: string | null) => [e.artText, e.raum ? raumName : e.nachsatz].filter(Boolean).join(" · ");

/** Wo die Karten aufleuchten sollen (nach Schließen der Bühne) */
export const leuchtZiele = (karten: readonly Ergebnis[]): Leuchten[] => karten.flatMap((k) => (k.leuchten ? [k.leuchten] : []));

/** Vorschau als Karten nur, wenn JEDE Änderung eine Karte hat und nichts geändert oder gelöscht wird */
const KARTEN_VORSCHAU = new Set<ChangeOp["type"]>(["add_shopping", "add_pin", "add_pantry"]);
export function vorschauAlsKarten(ops: readonly ChangeOp[]): boolean {
  return ops.length > 0 && ops.every((op) => KARTEN_VORSCHAU.has(op.type) || ((op.type === "upsert_entry" || op.type === "upsert_note") && op.isNew));
}

type Vorschlag = { ops: ChangeOp[]; selected: Set<string>; uebernommen?: string[] };

/**
 * Eine Karte der Vorschau übernommen: sie wird grün, der Rest bleibt zur
 * Wahl. Alles übernommen → `null` (die Karten wandern als fertige Karten in
 * den Verlauf).
 */
export function nachUebernehmen<P extends Vorschlag>(p: P, opId: string): P | null {
  const uebernommen = [...new Set([...(p.uebernommen ?? []), opId])];
  if (p.ops.every((op) => uebernommen.includes(op.id))) return null;
  return { ...p, uebernommen, selected: new Set([...p.selected].filter((id) => id !== opId)) };
}

/** Für den Verlauf an die KI: was erledigt wurde (sichtbar ist nur der kurze Satz) */
export const ergebnisSummary = (karten: readonly Ergebnis[]) => karten.map((k) => `${k.artText}: ${k.text}`).join("; ");
