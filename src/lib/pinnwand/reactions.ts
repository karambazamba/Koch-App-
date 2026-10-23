// Reaktionen wie bei WhatsApp (Tafel 70): eine pro Person (Person → Emoji),
// tauschen möglich, nochmal tippen nimmt sie weg. Angezeigt klein unter der
// Nachricht als Emojis + Namen („❤️ 👍 Lisa, Felix“) – keine Zahlen.
// Reaktionen sind Inhalt, darum sind Emojis hier erlaubt. Rein.

export const REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type Reactions = Record<string, Reaction>;

const isReaction = (v: unknown): v is Reaction => REACTIONS.includes(v as Reaction);

/** Gespeicherte Reaktionen lesen – auch das alte Format { "👍": ["Lisa"] } (v2) */
export function readReactions(raw: unknown): Reactions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Reactions = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isReaction(key) && Array.isArray(value)) {
      for (const who of value) if (typeof who === "string" && who.trim()) out[who] = key;
    } else if (isReaction(value) && key.trim()) out[key] = value;
  }
  return out;
}

/** Reaktion setzen, tauschen oder (gleiche nochmal) entfernen */
export function applyReaction(reactions: Reactions, me: string, reaction: Reaction): Reactions {
  const next = { ...reactions };
  if (next[me] === reaction) delete next[me];
  else next[me] = reaction;
  return next;
}

/** „❤️ 👍 Lisa, Felix“ – Emojis in der Reihenfolge des ersten Auftretens, dann die Namen */
export function reactionLine(reactions: Reactions): string {
  const people = Object.keys(reactions);
  if (!people.length) return "";
  const emojis = [...new Set(people.map((p) => reactions[p]))];
  return `${emojis.join(" ")} ${people.join(", ")}`;
}
