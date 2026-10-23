// Die Begleitung heißt fest Mia (seit v0.67, „App heißt Mia“). Wünsche wie
// „Ich nenn dich ab jetzt Frieda“, „Sei lieber Theo“ oder „Nimm eine
// männliche Stimme“ ändern nichts mehr – Mia antwortet freundlich „Ich bleib
// lieber Mia 😊“ (mit KI über den Prompt, ohne KI über settingsChat und den
// Testmodus). Eine andere Stimme gibt es in den Einstellungen unter „Mia“.

/** Antwort auf „Ich nenn dich …“ @public */
export const STAY_MIA = "Ich bleib lieber Mia 😊";

/** Antwort auf einen Umbenennen- oder Stimmen-Wunsch – null, wenn es keiner ist */
export function stayMiaReply(text: string): string | null {
  const input = parseHelperInput(text);
  if (!input) return null;
  return input.name ? STAY_MIA : `${STAY_MIA} Eine andere Stimme kannst du in den Einstellungen unter „Mia“ wählen.`;
}

/** Erkannte Wünsche: neuer Name und/oder andere Art (Stimme) */
function parseHelperInput(text: string): { name?: string; art?: string } | null {
  const t = text.trim();
  const lower = t.toLowerCase();
  const input: { name?: string; art?: string } = {};
  // Name: großgeschrieben, damit "Sei leise" o. ä. nichts umbenennt
  const named =
    t.match(/\b(?:[Ii]ch\s+nenn\w*\s+dich|[Nn]enn\s+dich|[Dd]u\s+heißt|[Dd]ein\s+Name\s+ist|[Hh]eiß\s+(?:doch\s+)?lieber)\s+(?:(?:ab\s+jetzt|ab\s+sofort|jetzt|lieber|doch|einfach|ab\s+heute)\s+)*["„]?([A-ZÄÖÜ][a-zäöüß]+(?:[- ][A-ZÄÖÜ][a-zäöüß]+)?)/) ??
    t.match(/^(?:[Ss]ei|[Ww]erd)\s+(?:(?:doch|lieber|ab\s+jetzt|jetzt|bitte)\s+)+["„]?([A-ZÄÖÜ][a-zäöüß]+)["“]?[.!]?$/);
  if (named) input.name = named[1];
  if (/\b(männlich\w*|maennlich\w*)\s+stimme|\bstimme\b.*\bmänn|\bmännerstimme|\bsei\s+(lieber\s+)?ein\s+assistent\b(?!in)/.test(lower)) input.art = "assistent";
  else if (/\b(weiblich\w*)\s+stimme|\bstimme\b.*\bweib|\bfrauenstimme|\bsei\s+(lieber\s+)?eine\s+assistentin\b/.test(lower)) input.art = "assistentin";
  return input.name || input.art ? input : null;
}
