// Die Begleitung selbst anpassen: Name, Art (Assistentin/Assistent – damit
// auch die Stimme) und Icon-Farbe. "Ich nenn dich ab jetzt Frieda", "Sei
// lieber Theo", "Nimm eine männliche Stimme", "Mach dich lila". Liefert nur
// einen Vorschlag (Op `set_helper`) mit "Übernehmen".

import { AVATAR_COLORS, HELPER_NAME_MAX, STANDARD_HELPERS, type AvatarColor, type HelperArt, type HelperSettings } from "../einstellungen/profile";
import { iconChangeHint } from "../core/homescreen";
import type { LotteTool } from "./registry";
import { nextId, propose } from "./tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const COLOR_IDS = AVATAR_COLORS.map((c) => c.id);

export type HelperPatch = Partial<Pick<HelperSettings, "name" | "art" | "farbe">>;

/** Eingabe des Werkzeugs (oder der Regeln ohne KI) → Änderung; Mia/Theo bringen ihre Art und Farbe mit, solange nichts anderes gesagt ist */
function helperPatch(input: { name?: string; art?: string; stimme?: string; farbe?: string }, current: HelperSettings): HelperPatch | null {
  const patch: HelperPatch = {};
  const name = str(input.name).replace(/^["„“']+|["„“'.!]+$/g, "").slice(0, HELPER_NAME_MAX);
  const art: HelperArt | undefined = input.art === "assistentin" || input.art === "assistent" ? input.art : input.stimme === "weiblich" ? "assistentin" : input.stimme === "maennlich" ? "assistent" : undefined;
  const farbe = COLOR_IDS.includes(input.farbe as AvatarColor) ? (input.farbe as AvatarColor) : undefined;
  if (name && name !== current.name) {
    patch.name = name;
    const standard = STANDARD_HELPERS.find((h) => h.name.toLowerCase() === name.toLowerCase());
    if (standard) {
      patch.name = standard.name;
      if (!art) patch.art = standard.art;
      if (!farbe) patch.farbe = standard.farbe;
    }
  }
  if (art && art !== current.art) patch.art = art;
  if (farbe && farbe !== current.farbe) patch.farbe = farbe;
  if (patch.art === current.art) delete patch.art;
  if (patch.farbe === current.farbe) delete patch.farbe;
  return Object.keys(patch).length ? patch : null;
}

/** Antwort im (neuen) Namen: "Gern – ab jetzt bin ich Frieda. 😊" */
export function helperReply(patch: HelperPatch): string {
  const color = patch.farbe ? AVATAR_COLORS.find((c) => c.id === patch.farbe)?.label : null;
  if (patch.name) return `Gern – ab jetzt bin ich ${patch.name}. 😊`;
  if (patch.art) return patch.art === "assistent" ? "Gern – ab jetzt bin ich dein Assistent, mit männlicher Stimme. 😊" : "Gern – ab jetzt bin ich deine Assistentin, mit weiblicher Stimme. 😊";
  return `Gern – ab jetzt in ${color}. 😊`;
}

export const HELPER_TOOLS: LotteTool[] = [
  {
    area: "alltag",
    definition: {
      name: "assistent_anpassen",
      description:
        "Dich selbst anpassen: neuer Name ('Ich nenn dich ab jetzt Frieda', 'Sei lieber Theo'), Art/Stimme ('Nimm eine männliche Stimme' → art assistent) oder Icon-Farbe ('Mach dich lila'). Nur angeben, was sich ändern soll. Antworte danach schon im neuen Namen, z. B. 'Gern – ab jetzt bin ich Frieda. 😊'",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Neuer Name (bis 20 Zeichen)" },
          art: { type: "string", enum: ["assistentin", "assistent"], description: "Assistentin (weibliche Stimme) oder Assistent (männliche Stimme)" },
          farbe: { type: "string", enum: COLOR_IDS, description: "Icon-Farbe" },
        },
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw as Input | null) ?? {};
      const patch = helperPatch({ name: str(input.name), art: str(input.art), farbe: str(input.farbe) }, ctx.data.profile.helper);
      if (!patch) return { content: "Das ist schon so eingestellt – nichts zu ändern." };
      propose(ctx, { id: nextId(ctx), type: "set_helper", helper: patch });
      return { content: `Vorgemerkt (mit "Übernehmen"): ${helperReply(patch)}` };
    },
  },
];

/** Hinweis nach "Übernehmen": was neu ist und wo man es wieder ändert */
export function helperNote(patch: HelperPatch): string {
  const parts: string[] = [];
  if (patch.name) parts.push(`Ich heiße jetzt ${patch.name}`);
  if (patch.art) parts.push(patch.art === "assistent" ? "meine Stimme ist männlich" : "meine Stimme ist weiblich");
  if (patch.farbe) parts.push(`mein Gesicht ist ${AVATAR_COLORS.find((c) => c.id === patch.farbe)?.label.toLowerCase()}`);
  const text = parts.join(", ");
  const hint = patch.farbe ? iconChangeHint() : null;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} – ändern kannst du das in den Einstellungen unter „Deine Begleitung“.${hint ? ` ${hint}` : ""}`;
}

const COLOR_WORDS: [RegExp, AvatarColor][] = [
  [/\bnachtblau|dunkelblau|navy\b/, "nachtblau"],
  [/\bhimmelblau|hellblau|blau\b/, "himmelblau"],
  [/\blila|violett|lavendel\b/, "lila"],
  [/\bbeere\w*|weinrot|bordeaux\b/, "beere"],
  [/\brosa|pink\b/, "rosa"],
  [/\bkoralle\w*|rot\b/, "koralle"],
  [/\bsenf\w*|gelb|gold\w*\b/, "senf"],
  [/\b(wald)?grün\b/, "waldgruen"],
  [/\banthrazit|grau|schwarz\b/, "anthrazit"],
  [/\borange\b/, "orange"],
];

/**
 * Ohne KI (und im Testmodus): "Ich nenn dich ab jetzt Frieda", "Sei lieber
 * Theo", "Nimm eine männliche Stimme", "Mach dich lila" → Änderung.
 */
export function parseHelperCommand(text: string, current: HelperSettings): HelperPatch | null {
  const input = parseHelperInput(text);
  return input ? helperPatch(input, current) : null;
}

/** Erkannte Wünsche als Werkzeug-Eingabe (auch für den Testmodus) */
export function parseHelperInput(text: string): { name?: string; art?: string; farbe?: string } | null {
  const t = text.trim();
  const lower = t.toLowerCase();
  const input: { name?: string; art?: string; farbe?: string } = {};
  // Name: großgeschrieben, damit "Sei leise" o. ä. nichts umbenennt
  const named =
    t.match(/\b(?:[Ii]ch\s+nenn\w*\s+dich|[Nn]enn\s+dich|[Dd]u\s+heißt|[Dd]ein\s+Name\s+ist|[Hh]eiß\s+(?:doch\s+)?lieber)\s+(?:(?:ab\s+jetzt|ab\s+sofort|jetzt|lieber|doch|einfach|ab\s+heute)\s+)*["„]?([A-ZÄÖÜ][a-zäöüß]+(?:[- ][A-ZÄÖÜ][a-zäöüß]+)?)/) ??
    t.match(/^(?:[Ss]ei|[Ww]erd)\s+(?:(?:doch|lieber|ab\s+jetzt|jetzt|bitte)\s+)+["„]?([A-ZÄÖÜ][a-zäöüß]+)["“]?[.!]?$/);
  if (named) input.name = named[1];
  if (/\b(männlich\w*|maennlich\w*)\s+stimme|\bstimme\b.*\bmänn|\bmännerstimme|\bsei\s+(lieber\s+)?ein\s+assistent\b(?!in)/.test(lower)) input.art = "assistent";
  else if (/\b(weiblich\w*)\s+stimme|\bstimme\b.*\bweib|\bfrauenstimme|\bsei\s+(lieber\s+)?eine\s+assistentin\b/.test(lower)) input.art = "assistentin";
  if (/\bmach\s+dich\b|\bdeine?\s+(farbe|gesicht|icon)\b|\bfärb\w*\s+dich\b|\bsei\s+(lieber\s+)?(in\s+)?\w+\s*$/.test(lower) || (/\bfarbe\b/.test(lower) && /\b(dich|deine?)\b/.test(lower))) {
    const hit = COLOR_WORDS.find(([re]) => re.test(lower));
    if (hit) input.farbe = hit[1];
  }
  return input.name || input.art || input.farbe ? input : null;
}
