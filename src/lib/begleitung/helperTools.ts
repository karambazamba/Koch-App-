// Die Begleitung selbst anpassen: Name und Art (Assistentin/Assistent – damit
// auch die Stimme). "Ich nenn dich ab jetzt Frieda", "Sei lieber Theo",
// "Nimm eine männliche Stimme". Liefert nur einen Vorschlag (Op `set_helper`)
// mit "Übernehmen". Die Farbe ist seit v0.64 fest (Mia und App-Icon immer
// orange) – „Mach dich lila“ ändert nichts mehr.

import { HELPER_NAME_MAX, STANDARD_HELPERS, type HelperArt, type HelperSettings } from "@/lib/einstellungen/profile";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { nextId, propose } from "@/lib/begleitung/tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type HelperPatch = Partial<Pick<HelperSettings, "name" | "art">>;

/** Eingabe des Werkzeugs (oder der Regeln ohne KI) → Änderung; Mia/Theo bringen ihre Art mit, solange nichts anderes gesagt ist */
function helperPatch(input: { name?: string; art?: string; stimme?: string }, current: HelperSettings): HelperPatch | null {
  const patch: HelperPatch = {};
  const name = str(input.name).replace(/^["„“']+|["„“'.!]+$/g, "").slice(0, HELPER_NAME_MAX);
  const art: HelperArt | undefined = input.art === "assistentin" || input.art === "assistent" ? input.art : input.stimme === "weiblich" ? "assistentin" : input.stimme === "maennlich" ? "assistent" : undefined;
  if (name && name !== current.name) {
    patch.name = name;
    const standard = STANDARD_HELPERS.find((h) => h.name.toLowerCase() === name.toLowerCase());
    if (standard) {
      patch.name = standard.name;
      if (!art) patch.art = standard.art;
    }
  }
  if (art && art !== current.art) patch.art = art;
  if (patch.art === current.art) delete patch.art;
  return Object.keys(patch).length ? patch : null;
}

/** Antwort im (neuen) Namen: "Gern – ab jetzt bin ich Frieda. 😊" */
export function helperReply(patch: HelperPatch): string {
  if (patch.name) return `Gern – ab jetzt bin ich ${patch.name}. 😊`;
  return patch.art === "assistent" ? "Gern – ab jetzt bin ich dein Assistent, mit männlicher Stimme. 😊" : "Gern – ab jetzt bin ich deine Assistentin, mit weiblicher Stimme. 😊";
}

export const HELPER_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "assistent_anpassen",
      description:
        "Dich selbst anpassen: neuer Name ('Ich nenn dich ab jetzt Frieda', 'Sei lieber Theo') oder Art/Stimme ('Nimm eine männliche Stimme' → art assistent). Nur angeben, was sich ändern soll. Deine Farbe ist fest orange (wie das App-Icon) – Farbwünsche freundlich ablehnen; die eigene Farbe im Kalender gibt es unter Einstellungen → Aussehen. Antworte danach schon im neuen Namen, z. B. 'Gern – ab jetzt bin ich Frieda. 😊'",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Neuer Name (bis 20 Zeichen)" },
          art: { type: "string", enum: ["assistentin", "assistent"], description: "Assistentin (weibliche Stimme) oder Assistent (männliche Stimme)" },
        },
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw as Input | null) ?? {};
      const patch = helperPatch({ name: str(input.name), art: str(input.art) }, ctx.data.profile.helper);
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
  const text = parts.join(", ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} – ändern kannst du das in den Einstellungen unter „Deine Begleitung“.`;
}

/**
 * Ohne KI (und im Testmodus): "Ich nenn dich ab jetzt Frieda", "Sei lieber
 * Theo", "Nimm eine männliche Stimme" → Änderung.
 */
export function parseHelperCommand(text: string, current: HelperSettings): HelperPatch | null {
  const input = parseHelperInput(text);
  return input ? helperPatch(input, current) : null;
}

/** Erkannte Wünsche als Werkzeug-Eingabe (auch für den Testmodus) */
export function parseHelperInput(text: string): { name?: string; art?: string } | null {
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
