// Vorlesen per Gespräch (ohne KI): "Lies mir vor", "Nicht mehr vorlesen",
// "Sprich langsamer/schneller". Gilt für dieses Gerät (`speech.ts`).

import type { SpeechRate, SpeechSettings } from "./speech";

const SLOWER: Record<SpeechRate, SpeechRate> = { schnell: "normal", normal: "langsam", langsam: "langsam" };
const FASTER: Record<SpeechRate, SpeechRate> = { langsam: "normal", normal: "schnell", schnell: "schnell" };

export function readingChange(text: string, current: SpeechSettings): { changes: Partial<SpeechSettings>; reply: string } | null {
  const t = text.trim().toLowerCase();
  if (/\b(nicht mehr|nichts mehr|kein|keine)\s+(vor)?les|\bhör auf (vor)?zu ?lesen|\bvorlesen (aus|ausschalten|stoppen)\b|\bnicht vorlesen\b|\bsei (still|leise)\b/.test(t)) {
    return { changes: { mode: "aus" }, reply: "Alles klar, ich lese nichts mehr vor ✓ Der Lautsprecher an meinen Nachrichten geht trotzdem." };
  }
  if (/\b(lies|les) (mir |uns )?(bitte )?(alles |die antworten |immer )?vor\b|\bvorlesen (an|einschalten)\b|\bimmer vorlesen\b/.test(t)) {
    return { changes: { mode: "an" }, reply: "Mach ich ✓ Ab jetzt lese ich meine Antworten vor." };
  }
  if (/\b(sprich|red|rede|lies)\w* (etwas |ein bisschen |bitte )*langsamer\b/.test(t)) {
    return { changes: { rate: SLOWER[current.rate] }, reply: "Okay, ich spreche langsamer ✓" };
  }
  if (/\b(sprich|red|rede|lies)\w* (etwas |ein bisschen |bitte )*schneller\b/.test(t)) {
    return { changes: { rate: FASTER[current.rate] }, reply: "Okay, ich spreche schneller ✓" };
  }
  return null;
}
