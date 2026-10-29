// Mias Routinen (Tafel 81/82, Punkt 2) – rein, Zeit und Einträge von außen:
// - Überschneidungen (auch knappe Fahrtzeit) zweier Termine mit Personen →
//   eine Frage mit genau 2 Knöpfen („Ich fahre“ / „Lisa fragen“), kein Rot.
// - Abends (17–20 Uhr), wenn morgen früh etwas mit Notiz ansteht: „Morgen
//   früh: Kita-Ausflug.“ → „Soll ich’s auf die Packliste setzen?“ („Ja,
//   bitte“ / „Hab ich schon“).
// Jede Frage nur einmal (beantwortet = weg). Die Fragen stehen in „Dein Tag“;
// die Jetzt-Karte zeigt seit A-054 nur noch ihre feste Rangliste.

export type RoutineTermin = { key: string; title: string; time: string | null; end: string | null; who: string[]; note?: string; work?: boolean };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** „15“ bzw. „15:30“ */
const short = (t: string) => (t.endsWith(":00") ? String(Number(t.slice(0, 2))) : t.replace(/^0/, ""));
const clip = (s: string, n = 32) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export type Ueberschneidung = { key: string; first: RoutineTermin; second: RoutineTermin; title: string; detail: string };

/** Überschneidungen: zwei Termine mit Personen, die sich überlappen oder < `travel` Min auseinander liegen */
export function ueberschneidungen(termine: RoutineTermin[], travel = 15): Ueberschneidung[] {
  const timed = termine.filter((t) => t.time && t.who.length && !t.work).sort((a, b) => a.time!.localeCompare(b.time!));
  const out: Ueberschneidung[] = [];
  for (let i = 0; i + 1 < timed.length; i++) {
    const a = timed[i];
    const b = timed[i + 1];
    const aEnd = a.end ? toMin(a.end) : toMin(a.time!) + 60;
    if (toMin(b.time!) - aEnd >= travel) continue;
    out.push({ key: `ueber:${a.key}+${b.key}`, first: a, second: b, title: clip(`${a.title} und ${b.title}`), detail: `${short(a.time!)} und ${short(b.time!)} Uhr. Das wird knapp. Wer fährt?` });
  }
  return out;
}

export type PackFrage = { key: string; termin: RoutineTermin; title: string; detail: string; items: string };

/** Abends vor 20 Uhr: morgen früh (bis 12 Uhr) etwas mit Notiz → Packliste anbieten */
export function packFrage(morgen: RoutineTermin[], minutes: number): PackFrage | null {
  if (minutes < 17 * 60 || minutes >= 20 * 60) return null;
  const t = morgen.filter((x) => x.note?.trim() && (!x.time || toMin(x.time) < 12 * 60)).sort((a, b) => (a.time ?? "00").localeCompare(b.time ?? "00"))[0];
  if (!t) return null;
  const items = t.note!.trim().replace(/[.!]+$/, "");
  return { key: `pack:${t.key}`, termin: t, title: clip(`Morgen früh: ${t.title}.`), detail: `${items}. Soll ich’s auf die Packliste setzen?`, items };
}
