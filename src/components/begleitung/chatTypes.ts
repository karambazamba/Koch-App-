// Typen des Chats mit der Begleitung (Verlauf, Vorschlag, Spontan-Modus)

import type { ParsedLeftover } from "@/lib/essen/leftovers/parser";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { ChatTurn } from "@/lib/begleitung/protocol";
import type { MarketAnswer } from "@/lib/essen/market";
import type { Recipe } from "@/lib/essen/cookbook";
import type { SpontanFilter } from "@/lib/essen/spontan";
import type { MarketTarget } from "@/components/begleitung/MarketBoard";
import type { MailDraft } from "@/lib/begleitung/mail";
import type { TipView } from "@/lib/tipps/model";
import type { CookCard, CookWish } from "@/lib/essen/kochtipp/pick";

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
  cook?: { card: CookCard; persons: number };
};

export type Proposal = { ops: ChangeOp[]; selected: Set<string> };
/** `spontan`: Spontan kochen ("mit dem, was da ist") mit gewählten Filtern; null = aus */
/** `kochtipp`: selbst geöffneter Kochtipp (Kochmütze) – bisherige Wünsche und schon Gezeigtes */
export type ChatState = { turns: ChatTurnView[]; proposal: Proposal | null; spontan: SpontanFilter[] | null; kochtipp?: { wish: CookWish; exclude: string[] } | null };

/** Neue Ideen-Antwort (Text und Ideen rechnet das Panel live) */
export function spontanStartTurn(filters: SpontanFilter[] = [], exclude: string[] = [], extra: string[] = []): ChatTurnView {
  return { role: "assistant", local: true, spontan: true, text: "", ideaFilters: filters, exclude, extra };
}
