// „Ich bin Felix, wir sind Lisa und drei Kinder“: wer zum Haushalt gehört –
// als Vorschlag (Op `set_household`) mit „Übernehmen“. Ohne KI über Regeln
// (`parseHouseholdIntro`), mit KI über das Werkzeug `haushalt_vorstellen`.
// `applyHouseholdIntro` setzt Name, Personen und Haushaltstyp: `persons[0]`
// bleibt „ich“, schon eingetragene Personen bleiben (auch wenn sie im Satz
// fehlen), nur leere Platzhalter werden ersetzt oder fallen weg.

import { createPerson, type HouseholdProfile, type Person, type PersonRole } from "@/lib/einstellungen/profileModel";
import { deriveHouseholdType, type HouseholdType } from "@/lib/einstellungen/profileHousehold";

const SHORT_TYPE: Record<HouseholdType, string> = { familie: "Familie", paar: "Paar", single: "allein", wg: "WG" };

export type HouseholdIntro = {
  /** Mein Name (persons[0]) */
  me: string | null;
  /** Weitere Erwachsene mit Namen */
  adults: string[];
  /** Kinder mit Namen */
  kids: string[];
  /** Kinder ohne Namen („drei Kinder“, abzüglich der genannten) */
  moreKids: number;
  /** „Ich wohne allein“ */
  single: boolean;
};

const NUMBERS: Record<string, number> = { ein: 1, eine: 1, einem: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6 };
const NUM = "(\\d|ein|eine|einem|einen|zwei|drei|vier|fünf|sechs)";
const NAME = "[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?";
/** Großgeschrieben, aber kein Name */
const NOT_NAMES = new Set(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag", "Mama", "Papa", "Ich", "Wir", "Kinder", "Kind", "Single", "Hier", "Zuhause", "Familie"]);
const KID_WORDS = /^(?:kinder|kind|kids|zwillinge|sohn|tochter|söhne|töchter)$/i;

const num = (w: string) => (/^\d$/.test(w) ? Number(w) : (NUMBERS[w.toLowerCase()] ?? 0));
const isName = (w: string) => new RegExp(`^${NAME}$`).test(w) && !NOT_NAMES.has(w);
const uniq = (list: string[]) => list.filter((x, i) => list.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);

/** Teil nach „wir sind …“ in Erwachsene, Kinder und Kinderzahl zerlegen */
function parseGroup(segment: string, into: HouseholdIntro) {
  let kidMode = false;
  const tokens = segment
    .replace(/[()]/g, ",")
    .split(/\s*,\s*|\s+und\s+|\s+sowie\s+|\s+mit\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const raw of tokens) {
    const token = raw.replace(/^(?:noch|unsere[nrms]?|unser|meine[nrms]?|mein|die|der)\s+/i, "").replace(/[.!?:;]+$/, "");
    if (/^(ich|mir|mich)$/i.test(token)) continue;
    // „drei Kinder“, „zwei Kinder: Mathis“, „ein Kind namens Ella“
    const counted = token.match(new RegExp(`^${NUM}\\s+(?:kleine\\s+|große\\s+)?(kinder|kind|kids|söhne|töchter|sohn|tochter)(?:\\s*[:\\-–]?\\s*(?:namens\\s+)?(${NAME}))?$`, "i"));
    if (counted) {
      into.moreKids += num(counted[1]);
      kidMode = true;
      if (counted[3] && isName(counted[3])) addKid(counted[3], into);
      continue;
    }
    // „Kinder Mathis“, „Sohn Jonne“, „Tochter Ella“
    const labelled = token.match(new RegExp(`^(kinder|kind|sohn|tochter)\\s*[:\\-–]?\\s*(?:namens\\s+)?(${NAME})$`, "i"));
    if (labelled && isName(labelled[2])) {
      addKid(labelled[2], into);
      kidMode = /^kinder$/i.test(labelled[1]) || kidMode;
      continue;
    }
    if (KID_WORDS.test(token)) {
      kidMode = true;
      continue;
    }
    // „Frau Lisa“, „Mann Tom“, „Lisa“
    const adult = token.match(new RegExp(`^(?:(?:frau|mann|partnerin|partner|freundin|freund|mitbewohnerin|mitbewohner)\\s+)?(${NAME})$`, "i"));
    if (adult && isName(adult[1])) {
      if (kidMode) addKid(adult[1], into);
      else into.adults.push(adult[1]);
    }
  }
}

function addKid(name: string, into: HouseholdIntro) {
  into.kids.push(name);
  // Genannte Kinder zählen zu „drei Kinder“, nicht dazu
  into.moreKids = Math.max(0, into.moreKids - 1);
}

/** Ohne KI: Vorstellung des Haushalts erkennen; null = kein solcher Satz */
export function parseHouseholdIntro(text: string): HouseholdIntro | null {
  const t = text.trim().replace(/\s+/g, " ");
  const into: HouseholdIntro = { me: null, adults: [], kids: [], moreKids: 0, single: false };
  const me = t.match(new RegExp(`(?:^|[\\s,.!])(?:[Ii]ch bin|[Ii]ch heiße|[Mm]ein Name ist|[Hh]ier ist)\\s+(?:der |die )?(${NAME})(?=\\s*(?:[,.!;]|$|\\s+und\\s|\\s+wir\\s|\\s+mit\\s|\\s+–\\s))`));
  if (me && isName(me[1])) into.me = me[1];
  into.single = /(?<![a-zäöüß])((?:ich )?(?:wohne|lebe) (?:ganz )?allein(?:e)?|ich bin single)(?![a-zäöüß])/i.test(t);
  const group = t.match(/(?<![a-zäöüß])wir sind\s+(?!zu\s)(.+?)(?:[.!?]|$)/i);
  if (group) parseGroup(group[1], into);
  // „mit meiner Frau Lisa und unseren zwei Kindern“
  const withPart = t.match(/(?<![a-zäöüß])(?:wohne|lebe|bin)\s+(?:hier\s+)?mit\s+(.+?)(?:[.!?]|$)/i);
  if (withPart) parseGroup(withPart[1].replace(/\bkindern\b/gi, "Kinder"), into);
  into.adults = uniq(into.adults).filter((n) => n.toLowerCase() !== into.me?.toLowerCase());
  into.kids = uniq(into.kids);
  if (into.single) {
    into.adults = [];
    into.kids = [];
    into.moreKids = 0;
  }
  const household = into.adults.length + into.kids.length + into.moreKids > 0 || into.single;
  // „Ich bin Entdecker“: „Ich bin X“ allein ist kein Name – nur mit Haushalt oder „Ich heiße …“
  const named = new RegExp(`(?:[Ii]ch heiße|[Mm]ein Name ist)\\s+${into.me ?? "-"}`).test(t);
  if (!household && !named) return null;
  return into;
}

/** Sagt der Satz etwas darüber, wer dazugehört (nicht nur meinen Namen)? */
const describesHousehold = (i: HouseholdIntro) => i.single || i.adults.length + i.kids.length + i.moreKids > 0;

/** Vorstellung ins Profil übernehmen (neues Profil, das alte bleibt) */
export function applyHouseholdIntro(profile: HouseholdProfile, intro: HouseholdIntro): HouseholdProfile {
  const [first, ...others] = profile.persons.length ? profile.persons : [createPerson("erwachsen")];
  const me: Person = intro.me ? { ...first, name: intro.me } : first;
  if (!describesHousehold(intro)) return { ...profile, persons: [me, ...others] };
  const used = new Set<string>();
  const take = (role: PersonRole, name: string | null): Person => {
    const byName = name ? others.find((p) => !used.has(p.id) && p.name.trim().toLowerCase() === name.toLowerCase()) : undefined;
    const placeholder = others.find((p) => !used.has(p.id) && p.role === role && !p.name.trim());
    const person = byName ?? placeholder;
    if (person) {
      used.add(person.id);
      return { ...person, role: byName ? person.role : role, name: name ?? person.name };
    }
    return { ...createPerson(role), name: name ?? "" };
  };
  const adults = intro.adults.map((n) => take("erwachsen", n));
  const kids = [...intro.kids.map((n) => take("kind", n)), ...Array.from({ length: intro.moreKids }, () => take("kind", null))];
  // Schon eingetragene Personen bleiben, auch wenn der Satz sie nicht nennt
  const kept = others.filter((p) => !used.has(p.id) && p.name.trim());
  const persons = [me, ...adults, ...kept.filter((p) => p.role === "erwachsen"), ...kids, ...kept.filter((p) => p.role === "kind")];
  const kidCount = persons.filter((p) => p.role === "kind").length;
  const adultCount = persons.length - kidCount;
  return { ...profile, persons, adults: adultCount, kids: kidCount, householdType: deriveHouseholdType(adultCount, kidCount) };
}

/** Kurz für die Vorschau: „Felix · Lisa · 3 Kinder · Familie“ */
export function householdIntroSummary(intro: HouseholdIntro, profile: HouseholdProfile): string {
  const after = applyHouseholdIntro(profile, intro);
  const kidsNamed = intro.kids;
  const kidsTotal = kidsNamed.length + intro.moreKids;
  const parts = [
    intro.me ?? "",
    ...intro.adults,
    kidsNamed.length ? kidsNamed.join(", ") + (intro.moreKids ? ` + ${intro.moreKids}` : "") : intro.moreKids ? `${kidsTotal} ${kidsTotal === 1 ? "Kind" : "Kinder"}` : "",
    describesHousehold(intro) ? SHORT_TYPE[after.householdType] : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Eingabe des KI-Werkzeugs → Vorstellung (Namen gekürzt, Zahlen begrenzt) */
export function householdIntroFrom(input: { ich?: unknown; erwachsene?: unknown; kinder?: unknown; weitere_kinder?: unknown; allein?: unknown }): HouseholdIntro | null {
  const name = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[^\p{L}\- ]/gu, "").slice(0, 30) : "");
  const names = (v: unknown) => (Array.isArray(v) ? uniq(v.map(name).filter(Boolean)).slice(0, 8) : []);
  const more = typeof input.weitere_kinder === "number" ? Math.max(0, Math.min(8, Math.round(input.weitere_kinder))) : 0;
  const intro: HouseholdIntro = { me: name(input.ich) || null, adults: names(input.erwachsene), kids: names(input.kinder), moreKids: more, single: input.allein === true };
  if (intro.single) Object.assign(intro, { adults: [], kids: [], moreKids: 0 });
  return intro.me || describesHousehold(intro) ? intro : null;
}

/** Antwort ohne KI: „Schön, dich kennenzulernen, Felix! So trage ich euch ein – passt das?“ */
export function householdIntroReply(intro: HouseholdIntro): string {
  const hello = intro.me ? `Schön, dich kennenzulernen, ${intro.me}!` : "Schön, euch kennenzulernen!";
  if (!describesHousehold(intro)) return `${hello} Soll ich mir deinen Namen merken?`;
  return `${hello} So trage ich ${intro.single ? "dich" : "euch"} ein – passt das?`;
}
