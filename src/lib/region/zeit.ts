// „Was los?“: Datum und Uhrzeit aus Text lesen – unabhängig vom HTML der
// Quelle (reine Funktionen, eigene Tests). Formate: „Do, 29.10.2026“,
// „29. Oktober 2026“, „29.10.“, „29.10.2026 bis 15.11.2026“, „10:00 Uhr“,
// „10.00 – 12:00 Uhr“, „10:00 bis 12:00“, „ab 19 Uhr“, „ganztags“, „ganztägig“.

export type Zeitangabe = { beginn: string | null; ende: string | null; ganztags: boolean };
export type Zeitraum = { datum: string; bis_datum: string | null };

const MONATE = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const pad = (n: number) => String(n).padStart(2, "0");

function iso(tag: number, monat: number, jahr: number): string | null {
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  if (d.getUTCMonth() !== monat - 1) return null;
  return `${jahr}-${pad(monat)}-${pad(tag)}`;
}

const jahrVon = (j: string | undefined, standard: number) => (!j ? standard : j.length === 2 ? 2000 + Number(j) : Number(j));

/** Alle Daten im Text, in Reihenfolge („29.10.2026“, „29. Oktober“, „29.10.“) */
export function findeDaten(text: string, standardJahr: number): string[] {
  const out: { at: number; iso: string }[] = [];
  for (const m of text.matchAll(/(?<!\d)(\d{1,2})\.\s?(\d{1,2})\.(\d{4}|\d{2}(?!\d))?/g)) {
    const d = iso(Number(m[1]), Number(m[2]), jahrVon(m[3], standardJahr));
    if (d) out.push({ at: m.index ?? 0, iso: d });
  }
  for (const m of text.matchAll(new RegExp(`(?<!\\d)(\\d{1,2})\\.?\\s+(${MONATE.join("|")})(?:\\s+(\\d{4}))?`, "gi"))) {
    const d = iso(Number(m[1]), MONATE.indexOf(m[2].toLowerCase()) + 1, jahrVon(m[3], standardJahr));
    if (d) out.push({ at: m.index ?? 0, iso: d });
  }
  return out.sort((a, b) => a.at - b.at).map((x) => x.iso);
}

/** Datum bzw. Zeitraum („bis“, „–“) aus Text; null = kein Datum */
export function parseZeitraum(text: string, standardJahr: number): Zeitraum | null {
  const daten = findeDaten(text, standardJahr);
  if (!daten.length) return null;
  const [datum] = daten;
  const letztes = daten[daten.length - 1];
  const spanne = daten.length > 1 && /(bis|–|-)/i.test(text) && letztes > datum;
  return { datum, bis_datum: spanne ? letztes : null };
}

/** Uhrzeit(en) aus Text; ohne Uhrzeit (oder „ganztags“/„ganztägig“) = ganztags */
export function parseZeit(text: string): Zeitangabe {
  const t = text.replace(/(?<!\d)\d{1,2}\.\s?\d{1,2}\.(\d{2,4})?/g, " ");
  if (/ganztägig|ganztags|ganzer tag|den ganzen tag/i.test(t)) return { beginn: null, ende: null, ganztags: true };
  const zeiten: string[] = [];
  for (const m of t.matchAll(/(?<![\d:.])(\d{1,2})(?:[:.](\d{2}))?(?:\s*(uhr|h)(?![a-zäöüß]))?/gi)) {
    const h = Number(m[1]);
    const min = m[2] === undefined ? 0 : Number(m[2]);
    // Eine nackte Zahl ohne „:“ und ohne „Uhr“ ist keine Uhrzeit (z. B. „Markt 19“)
    if (m[2] === undefined && !m[3]) continue;
    if (h > 23 || min > 59) continue;
    zeiten.push(`${pad(h)}:${pad(min)}`);
  }
  if (!zeiten.length) return { beginn: null, ende: null, ganztags: true };
  const [beginn, zweite] = zeiten;
  const ende = zweite && zweite > beginn && /(–|-|bis)/i.test(t) ? zweite : null;
  return { beginn, ende, ganztags: false };
}

/** Datum + Uhrzeit zusammen (Text einer Listen- oder Detailzeile) */
export function parseTermin(datumText: string, zeitText: string | null, standardJahr: number): (Zeitraum & Zeitangabe) | null {
  const raum = parseZeitraum(datumText, standardJahr);
  if (!raum) return null;
  return { ...raum, ...parseZeit(zeitText ?? datumText) };
}
