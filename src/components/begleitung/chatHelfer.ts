"use client";

// Kleine Helfer des Chats (aus HelperPanel ausgelagert): Rezept-Link lesen.
// „Was ist da?“ und „Einsprechen“ ohne KI: `useModusChat`.

import type { Dispatch, SetStateAction } from "react";
import { fetchRezeptLink } from "@/lib/essen/rezeptLink/abrufen";
import type { ChatState } from "@/components/begleitung/chatTypes";

const SCHAU = "Moment, ich schau rein …";

/** Rezept-Link: kurz „schau rein“, dann die Karte (oder ein freundlicher Satz) */
export function showRezeptLink(setChat: Dispatch<SetStateAction<ChatState>>, url: string, said: string) {
  setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: SCHAU, local: true }] }));
  void fetchRezeptLink(url).then((r) =>
    setChat((c) => {
      const turns = [...c.turns];
      const at = turns.map((x) => x.text).lastIndexOf(SCHAU);
      const reply = "rezept" in r ? { role: "assistant" as const, text: "Hab’s gelesen. Das brauchst du dafür:", local: true, rezept: r.rezept } : { role: "assistant" as const, text: r.error, local: true };
      if (at >= 0) turns[at] = reply;
      else turns.push(reply);
      return { ...c, turns };
    }),
  );
}

