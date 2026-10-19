// Kennenlernen mit KI: Claude wandelt eine freie Antwort in feste Strukturen
// (Namen, Angaben zu einer Person, Allergien/Abneigungen). Läuft nur auf dem
// Server. Das Ergebnis wird geprüft; was fehlt oder unsicher ist, fragt das
// Gespräch danach kurz nach. Ohne KI liefert ./recognize.ts dieselben Typen.

import type Anthropic from "@anthropic-ai/sdk";
import { extractDietItems, extractNames, extractPersonInfo, type DietItem, type NameHint, type PersonInfo } from "./recognize";
import type { Recognized } from "./engine";

export type RecognizeKind = "names" | "person" | "diet";

export type RecognizeRequest = { kind: RecognizeKind; text: string; names: string[]; person?: string };

export type CreateJson = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

export const RECOGNIZE_LIMITS = { textChars: 600, names: 20 };

const str = { type: "string" };
const nullable = (t: object) => ({ anyOf: [t, { type: "null" }] });

const SCHEMAS: Record<RecognizeKind, object> = {
  names: {
    type: "object",
    properties: {
      names: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: str,
            role: nullable({ type: "string", enum: ["erwachsen", "kind"] }),
            age: nullable({ type: "integer" }),
          },
          required: ["name", "role", "age"],
          additionalProperties: false,
        },
      },
    },
    required: ["names"],
    additionalProperties: false,
  },
  person: {
    type: "object",
    properties: {
      role: nullable({ type: "string", enum: ["erwachsen", "kind"] }),
      age: nullable({ type: "integer" }),
      ageGroup: nullable({ type: "string", enum: ["kleinkind", "kitakind", "schulkind"] }),
      lunch: nullable({ type: "string", enum: ["zuhause", "auswaerts", "manchmal"] }),
      allergies: { type: "array", items: str },
      dislikes: { type: "array", items: str },
    },
    required: ["role", "age", "ageGroup", "lunch", "allergies", "dislikes"],
    additionalProperties: false,
  },
  diet: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            person: nullable(str),
            kind: { type: "string", enum: ["Allergie", "mag nicht"] },
            term: str,
          },
          required: ["person", "kind", "term"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

const SYSTEM = `Du hilfst einer Familien-Koch-App beim Kennenlernen. Du bekommst eine gesprochene oder getippte Antwort auf Deutsch und gibst nur die verlangten Angaben als JSON zurück.
Regeln:
- Nur übernehmen, was wirklich gesagt wurde. Unsicheres oder nicht Gesagtes = null bzw. leere Liste. Nichts erfinden.
- Namen: nur Vornamen, Schreibweise wie gehört, großgeschrieben. "Ich" ist kein Name; wenn jemand "ich bin Lisa" sagt, ist Lisa gemeint. Verwandtschaftswörter (Mama, Oma, Sohn) sind keine Namen, geben aber die Rolle: Sohn/Tochter/Kinder = kind, Mama/Papa/Oma/Mann/Frau = erwachsen. Den Namen der Küchenhilfe nicht als Person aufnehmen.
- Altersgruppe bei Kindern: kleinkind = zu Hause/Krippe/unter 3, kitakind = Kita/Kindergarten, schulkind = Schule. Aus dem Alter ableiten, wenn nichts anderes gesagt wurde (unter 3 kleinkind, 3–5 kitakind, ab 6 schulkind).
- Mittagessen werktags: zuhause, auswaerts (Kantine, Arbeit, Schule, Kita) oder manchmal.
- Lebensmittel kurz und großgeschrieben in der Mehrzahl bzw. Grundform ("Pilze", "Nüsse", "Fisch", "Laktose").
- Allergie/Unverträglichkeit = Allergie; "mag nicht", "isst nicht", "hasst" = mag nicht.`;

function prompt(req: RecognizeRequest): string {
  const known = req.names.length ? `Bekannte Personen: ${req.names.join(", ")}.` : "";
  switch (req.kind) {
    case "names":
      return `Frage: "Wer isst bei euch mit?" ${known}\nAntwort: ${req.text}\nGib alle neu genannten Personen zurück.`;
    case "person":
      return `Frage: "Erzähl mir kurz was über ${req.person ?? "die Person"}." ${known}\nAntwort: ${req.text}\nGib die Angaben zu dieser einen Person zurück.`;
    case "diet":
      return `Frage: "Gibt's sonst noch Allergien oder Sachen, die jemand gar nicht mag?" ${known}\nAntwort: ${req.text}\nOrdne jeden Eintrag einer bekannten Person zu (Name genau wie in der Liste); gilt er für alle oder ist unklar, person = null.`;
  }
}

/** Anfrage prüfen und kürzen */
export function parseRecognizeRequest(body: unknown): RecognizeRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Partial<RecognizeRequest>;
  if (b.kind !== "names" && b.kind !== "person" && b.kind !== "diet") return null;
  if (typeof b.text !== "string" || !b.text.trim()) return null;
  const names = (Array.isArray(b.names) ? b.names : [])
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.slice(0, 40))
    .slice(0, RECOGNIZE_LIMITS.names);
  return {
    kind: b.kind,
    text: b.text.slice(0, RECOGNIZE_LIMITS.textChars),
    names,
    person: typeof b.person === "string" ? b.person.slice(0, 40) : undefined,
  };
}

const cleanTerm = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 40) : "");
const terms = (v: unknown) => (Array.isArray(v) ? v.map(cleanTerm).filter(Boolean).slice(0, 10) : []);
const age = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 110 ? v : undefined);

/** KI-Antwort prüfen: nur gültige Werte übernehmen */
export function validateRecognized(req: RecognizeRequest, raw: unknown): Recognized {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (req.kind === "names") {
    const names: NameHint[] = [];
    for (const n of Array.isArray(o.names) ? o.names : []) {
      const name = cleanTerm((n as { name?: unknown })?.name).replace(/[^A-Za-zÄÖÜäöüßéèàçñ' -]/g, "").trim();
      if (!name || names.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
      const role = (n as { role?: unknown }).role;
      names.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: role === "erwachsen" || role === "kind" ? role : undefined,
        age: age((n as { age?: unknown }).age),
      });
    }
    return { names: names.slice(0, RECOGNIZE_LIMITS.names) };
  }
  if (req.kind === "person") {
    const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
    const person: PersonInfo = {
      role: pick(o.role, ["erwachsen", "kind"] as const),
      age: age(o.age),
      ageGroup: pick(o.ageGroup, ["kleinkind", "kitakind", "schulkind"] as const),
      lunch: pick(o.lunch, ["zuhause", "auswaerts", "manchmal"] as const),
      allergies: terms(o.allergies),
      dislikes: terms(o.dislikes),
    };
    // Altersgruppe ohne Rolle → Kind
    if (!person.role && person.ageGroup) person.role = "kind";
    return { person };
  }
  const diet: DietItem[] = [];
  for (const item of Array.isArray(o.items) ? o.items : []) {
    const i = item as Partial<DietItem>;
    const term = cleanTerm(i.term);
    if (!term || (i.kind !== "Allergie" && i.kind !== "mag nicht")) continue;
    const person = req.names.find((n) => n.toLowerCase() === String(i.person ?? "").toLowerCase()) ?? null;
    diet.push({ person, kind: i.kind, term });
  }
  return { diet };
}

/** Regel-Erkennung (ohne KI bzw. im Mock) */
export function ruleRecognize(req: RecognizeRequest): Recognized {
  if (req.kind === "names") return { names: extractNames(req.text) };
  if (req.kind === "person") return { person: extractPersonInfo(req.text) };
  return { diet: extractDietItems(req.text, req.names) };
}

/** Mit Claude erkennen (strukturierte Ausgabe nach festem Schema) */
export async function aiRecognize(req: RecognizeRequest, create: CreateJson, model: string): Promise<Recognized> {
  const message = await create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt(req) }],
    output_config: { format: { type: "json_schema", schema: SCHEMAS[req.kind] as Record<string, unknown> } },
  });
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return ruleRecognize(req);
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return validateRecognized(req, JSON.parse(text));
  } catch {
    return ruleRecognize(req);
  }
}
