// Typen des Chats mit der Begleitung (Verlauf, Vorschlag, Spontan-Modus)

import type { ParsedLeftover } from "@/lib/essen/leftovers/parser";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { Room } from "@/lib/core/entries";
import type { ChatTurn } from "@/lib/begleitung/protocol";
import type { MarketAnswer } from "@/lib/essen/market";
import type { Recipe } from "@/lib/essen/cookbook";
import type { SpontanFilter } from "@/lib/essen/spontan";
import type { MarketTarget } from "@/components/begleitung/MarketBoard";
import type { MailDraft } from "@/lib/begleitung/mail";
import type { TipView } from "@/lib/tipps/model";
import type { CookCard } from "@/lib/essen/kochtipp/pick";
import type { IdeaTalk } from "@/lib/essen/kochtipp/idee";
import type { LinkRezept } from "@/lib/essen/rezeptLink/lesen";
import type { Ergebnis } from "@/lib/begleitung/ergebnis";

export type ChatTurnView = ChatTurn & {
  /** Fehlermeldung – wird nicht an die KI geschickt */
  error?: boolean;
  /** Nur in der App erzeugt ("Übernommen ✓") – wird nicht an die KI geschickt */
  local?: boolean;
  /** An die KI geschickt statt `text` (z. B. Reste + Basis ausführlich) */
  send?: string;
  /** Spontan kochen: erkannte bzw. schon notierte Zutaten als Chips */
  items?: string[];
  /** Spontan kochen: unbekannte Wörter ("Meintest du …?") */
  unsure?: ParsedLeftover[];
  /** Ideen-Antwort (Spontan kochen): rechnet live aus dem Bestand; nur die letzte ist offen, ältere eingeklappt */
  spontan?: boolean;
  /** Filter dieser Ideen-Antwort */
  ideaFilters?: SpontanFilter[];
  /** Schon gezeigte Ideen, die hier nicht wiederkommen ("Andere Ideen") */
  exclude?: string[];
  /** Eben genannte Zutaten ("Was mach ich mit Hack und Paprika?") – zählen mit, landen nicht im Vorrat */
  extra?: string[];
  /** Zurücknehmen einer gerade gemachten Änderung ("Mach das rückgängig") */
  undo?: () => void;
  /** Echtes Löschen: dann (und nur dann) steht "Rückgängig" als Knopf darunter */
  deleted?: boolean;
  /** Mia hat es sofort erledigt: „Rückgängig“ steht 10 Sekunden da */
  quick?: boolean;
  /** Eben eingetragener Termin bzw. eingetragene Aufgabe (Regeln ohne KI): als Ergebnis-Karte mit „Termin · Familie ⌄“ (A-034/A-037) */
  raum?: { id: string; title: string; raum: Room; typ: "termin" | "aufgabe" };
  /** Was Mia eben eingetragen hat: je Eintrag eine Ergebnis-Karte, darunter einmal „Rückgängig“ (A-037, Tafel 126) */
  ergebnisse?: Ergebnis[];
  /** Im Supermarkt: Ideen zum Produkt, darunter Liste und "Statt <Tag>" */
  market?: MarketAnswer & { target: MarketTarget | null };
  /** Backwunsch: passende Rezepte mit "Zusammen backen" */
  baking?: Recipe[];
  /** Antwort-Knöpfe unter der Nachricht (nur beim letzten Eintrag) */
  choices?: { label: string; onClick: () => void }[];
  /** Knöpfe der KI: ein Tipp schickt den Text als eigene Nachricht (nur beim letzten Eintrag) */
  chips?: string[];
  /** Mail-Entwurf als Karte ("In Mail öffnen", "Kopieren", "Ändern") */
  mail?: MailDraft;
  /** Tipps aus der Region als Karten (bis zu 3) */
  tips?: TipView[];
  /** Kochtipp: EIN Gericht als Karte (Personen änderbar) */
  /** Kochidee: drei Vorschläge (beim Öffnen) bzw. das Ergebnis zum Durchwischen */
  /** Rezept-Link: Karte mit Zutaten, „auf die Liste“, „In den Wochenplan“ */
  rezept?: LinkRezept;
  idea?: { kind: "start" | "ergebnis"; cards: CookCard[]; planned: string | null; keywords?: string[]; remembered?: string; persons?: number; /** „Oder worauf hast du Lust?“ – Vorschlags-Knöpfe */ suggest?: string[] };
};

/** `uebernommen`: in der Karten-Vorschau schon einzeln übernommen (grün „Eingetragen“) */
export type Proposal = { ops: ChangeOp[]; selected: Set<string>; uebernommen?: string[] };
/** `spontan`: Spontan kochen ("mit dem, was da ist") mit gewählten Filtern; null = aus */
/** `since`: ab dieser Nachricht läuft das aktuelle Gespräch (Mia-Ansicht zeigt nur das, „Verlauf“ alles) */
/** `kochtipp`: offene Kochidee – Erzähltes, schon Gezeigtes, heute geplantes Gericht; `fresh` = gerade geöffnet, Vorschläge folgen */
export type ChatState = { turns: ChatTurnView[]; proposal: Proposal | null; spontan: SpontanFilter[] | null; kochtipp?: { talk: IdeaTalk; exclude: string[]; planned: string | null; fresh?: boolean } | null; since?: number; /** Bereichs-Kopf auf der Bühne („KOCHIDEE“, „WOCHENCHECK“, „IM HAUS“) */ topic?: string; /** „Was ist da?“ (Tafel 102): Gesagtes wird in „Im Haus“ einsortiert – erst als „Hab ich so verstanden:“ */ imHaus?: boolean; /** „Einsprechen“ (Tafel 110): Aufgezähltes wird erst als „Hab ich:“ gezeigt, dann eingetragen */ einkauf?: boolean };

/** Neue Ideen-Antwort (Text und Ideen rechnet das Panel live) */
export function spontanStartTurn(filters: SpontanFilter[] = [], exclude: string[] = [], extra: string[] = []): ChatTurnView {
  return { role: "assistant", local: true, spontan: true, text: "", ideaFilters: filters, exclude, extra };
}
