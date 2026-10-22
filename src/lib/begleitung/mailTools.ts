// Mails (ohne Postfach): Lotte schreibt Entwürfe, die App zeigt sie als
// Karte mit "In Mail öffnen", "Kopieren", "Ändern". Gesendet wird nie
// automatisch. Dazu Antwort-Knöpfe ("Zusagen", "Absagen", "Nachfragen").

import type { BegleitungTool } from "@/lib/begleitung/registry";
import { sanitizeDraft } from "@/lib/begleitung/mail";
import type { ToolResult } from "@/lib/begleitung/tools";

type Input = Record<string, unknown>;
const fail = (content: string): ToolResult => ({ content, isError: true });

const mailDraftTool: BegleitungTool = {
  area: "post",
  definition: {
    name: "mail_entwurf",
    description:
      "Zeigt einen Mail-Entwurf als Karte (Betreff, Text, 'In Mail öffnen', 'Kopieren', 'Ändern'). Für Antworten auf eingefügte Mails und neue Mails ('Schreib dem Großhandel, dass …'). Gesendet wird nie – das macht die Person selbst. Bei Änderungswünschen ('Kürzer', 'Auf Du') den ganzen neuen Entwurf schicken.",
    input_schema: {
      type: "object",
      properties: {
        an: { type: "string", description: "E-Mail-Adresse, nur wenn genannt oder in der eingefügten Mail (z. B. aus 'Von:'); sonst leer" },
        empfaenger: { type: "string", description: "Wem, kurz (z. B. 'Kita', 'Bernd Krüger')" },
        betreff: { type: "string", description: "Betreff; bei Antworten 'Re: <alter Betreff>'" },
        text: { type: "string", description: "Ganzer Text mit Anrede, Absätzen (Leerzeile dazwischen) und Gruß aus dem Mail-Stil" },
        anrede: { type: "string", enum: ["du", "sie"] },
        kurzfassung: { type: "string", description: "Nur bei eingefügter Mail: worum es geht, ein Satz" },
      },
      required: ["betreff", "text", "anrede"],
      additionalProperties: false,
    },
  },
  run: (ctx, raw) => {
    const input = (raw ?? {}) as Input;
    const draft = sanitizeDraft({ to: input.an, recipient: input.empfaenger, subject: input.betreff, body: input.text, tone: input.anrede, summary: input.kurzfassung });
    if (!draft) return fail("text fehlt.");
    ctx.mail = draft;
    return {
      content:
        "Der Entwurf steht als Karte im Chat. Wiederhole den Mailtext NICHT. Antworte in einem kurzen Satz (bei eingefügter Mail beginnend mit 'Kurz gesagt: …'). Steht in der Mail ein Termin oder eine Frist, biete ihn zusätzlich mit termin_anlegen/aufgabe_anlegen an und frag 'Soll ich das eintragen?'.",
    };
  },
};

const chipsTool: BegleitungTool = {
  area: "post",
  definition: {
    name: "antwort_knoepfe",
    description:
      "Zeigt 2–3 kurze Antwort-Knöpfe unter deiner Nachricht, z. B. bei einer eingefügten Mail ohne Anweisung: 'Zusagen', 'Absagen', 'Nachfragen'. Ein Tipp schickt den Text als Nachricht der Person.",
    input_schema: {
      type: "object",
      properties: { optionen: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3, description: "Kurze Antworten (max. 3 Wörter)" } },
      required: ["optionen"],
      additionalProperties: false,
    },
  },
  run: (ctx, raw) => {
    const list = Array.isArray((raw as Input | null)?.optionen) ? ((raw as Input).optionen as unknown[]) : [];
    const chips = list.filter((o): o is string => typeof o === "string" && o.trim().length > 0).map((o) => o.trim().slice(0, 30)).slice(0, 3);
    if (chips.length < 2) return fail("2–3 optionen angeben.");
    ctx.chips = chips;
    return { content: "Knöpfe stehen unter deiner Antwort. Stell die Frage dazu in einem Satz." };
  },
};

export const MAIL_TOOLS: BegleitungTool[] = [mailDraftTool, chipsTool];
