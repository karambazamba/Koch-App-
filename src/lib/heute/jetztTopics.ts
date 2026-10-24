// Jetzt-Karte (oben auf "Heute", Tafel 60): zeigt nur, was Mia weiß und die
// Kacheln NICHT zeigen – mit höchstens einem Knopf zum Erledigen. Kein
// Wetterbericht, keine Wiederholung, keine Zähler. Rein und lokal (ohne KI):
// jedes mögliche Thema bekommt Punkte aus Dringlichkeit und Handlung,
// Interesse (oft angetippt = mehr, weggewischt/erledigt = weniger) wird
// langsam gelernt. Höchstens drei Themen zum Wischen; nichts Passendes =
// „Alles ruhig. Ich sag Bescheid.“ Die Kachel-Anordnung bleibt unberührt.

import type { HomeTileId } from "@/lib/core/homeLayout";

export type JetztKind =
  | "erinnerung"
  | "timer"
  | "kochen"
  | "pause"
  | "vorbereiten"
  | "packliste"
  | "gleich"
  | "pinnwand"
  | "einkauf"
  | "kochstart"
  | "absprache"
  | "geburtstag"
  | "ausblick"
  | "wochencheck"
  | "wetter"
  | "aufgabe"
  | "ideen"
  | "freizeit"
  | "tipp"
  | "region"
  | "spendentopf"
  | "familie"
  | "morgen"
  | "ueberschneidung"
  | "packen"
  | "beispiel"
  | "ruhig";

/** Wohin Antippen führt: eine Seite oder etwas, das die Startseite selbst öffnet */
type JetztTarget = { href: string } | { action: "essen" | "ideen" | "timer" | "pinnwand" | "pause" | "wochencheck" };

/** Der eine Knopf rechts: „Erledigt“ hakt ab (Thema geht für heute weg), sonst wie Antippen */
type JetztButton = "Erledigt" | "Öffnen" | "Antworten" | "Liste" | "Kochen" | "Packliste";

export type JetztTopic = {
  id: string;
  kind: JetztKind;
  /** Zeile 1 (fett) – was (höchstens 32 Zeichen) */
  title: string;
  /** Zeile 2 – warum / was dazu */
  detail: string;
  score: number;
  target: JetztTarget | null;
  button: JetztButton | null;
};

export type JetztTermin = {
  key: string;
  title: string;
  time: string;
  date: string;
  place?: string;
  /** Notiz zum Termin („Versichertenkarte einpacken“) – nur damit gibt es „Vorbereiten“ */
  note?: string;
  work?: boolean;
  /** Draußen (Fußball, Spielplatz, Laufen …) – nur dann zählt Wetter */
  outdoor?: boolean;
};

export type JetztInput = {
  minutes: number;
  today: string;
  /** Feierabend oder Wochenende: nur sanfte Themen */
  calm: boolean;
  /** Termine heute, die noch kommen (mit Uhrzeit, sortiert) */
  upcoming: JetztTermin[];
  /** "Morgen · Mi" und die Termine von morgen (mit Uhrzeit zuerst) */
  tomorrow: { label: string; date: string; items: JetztTermin[] };
  urgent: { key: string; title: string; work?: boolean }[];
  dueToday: { key: string; title: string; work?: boolean }[];
  pin: { id: string; author: string; text: string; when: string } | null;
  /** Regen/Sturm/Glätte zur Zeit eines Draußen-Termins oder -Trainings heute (sonst null) */
  planWeather: { key: string; title: string; time: string; word: string } | null;
  /** Gericht von heute (solange nicht gegessen) */
  dish: { name: string; clock: string | null; minutes: number | null; ready: boolean; missing: string[]; unsure?: string[]; demo?: boolean } | null;
  birthdays: { title: string; date: string; when: "heute" | "morgen" }[];
  /** Heute geplantes Training mit Packliste */
  sport: { key: string; title: string; time: string; pack: string[] } | null;
  /** Laden mit den meisten Sachen auf der Liste (mindestens 2) */
  shop: { shop: string; names: string[] } | null;
  timer: { name: string; left: string } | null;
  cookingStep: string | null;
  reminder: { key: string; text: string } | null;
  pause: string | null;
  /** Kein Gericht, aber eins wäre dran (Ideen – nur ohne Essen-Kachel) */
  dinnerFree: boolean;
  /** Selbst eingeschaltete Bausteine: Freizeit-Idee, kleiner Tipp, Tipp aus der Region */
  leisure: { text: string; href: string } | null;
  tip: string | null;
  region: { id: string; title: string; detail: string } | null;
  /** Mias Routinen (src/lib/mia/routinen.ts): Morgen-Info, Überschneidung, Packliste – schon ohne Beantwortetes */
  routinen?: { morgen: { title: string; detail: string } | null; ueber: { key: string; title: string; detail: string } | null; pack: { key: string; title: string; detail: string } | null };
  /** Leise Neuigkeit aus dem Haushalt („Milch steht auf der Liste“ – höchstens eine am Tag) */
  family?: { id: string; title: string; detail: string; href: string } | null;
  /** Spendentopf gestartet + vorgemerkt: einmal sanft fragen */
  potInvite?: { title: string; detail: string } | null;
  /** Kinder im Haushalt (für die Absprache bei Abendterminen) */
  kids: boolean;
  /** „Kurzer Wochencheck?“ für diese Woche (Montag bzw. Sonntag ab 17 Uhr, nicht in Ruhe/Pause) – sonst null */
  weekCheck: string | null;
  /** Beispiel-Tag: ein Thema, das ihn kurz erklärt */
  demo: boolean;
  /** Sichtbare Kacheln – was sie zeigen, wiederholt die Karte nicht */
  tiles: HomeTileId[];
  /** Kacheln, die schon „Morgen“ zeigen (Termine bzw. Morgen-Kachel) */
  tomorrowTiles?: HomeTileId[];
  /** Interesse je Art (lokal gezählt), heute erledigte/ausgeblendete Themen */
  weights: Partial<Record<JetztKind, number>>;
  hidden: string[];
};

type Candidate = JetztTopic & { gentle?: boolean; night?: boolean };

/** Zeile 1 höchstens so lang */
export const TITLE_MAX = 32;
export const QUIET_TEXT = "Alles ruhig. Ich sag Bescheid.";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (t: string) => t.replace(/^0(\d)/, "$1");
const fromMin = (m: number) => `${Math.floor(m / 60)}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;
/** Kürzen auf `max` Zeichen – möglichst an einem Wortende */
const short = (s: string, max = TITLE_MAX) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max - 12 ? cut.slice(0, space) : cut).replace(/[\s–,·-]+$/, "")}…`;
};
/** Notiz als Frage („Versichertenkarte einpacken“ → „Versichertenkarte einpacken?“) */
const ask = (note: string) => (/[?!.]$/.test(note.trim()) ? note.trim() : `${note.trim()}?`);
/** Steht jemand für die Kinder in der Notiz? („Oma bleibt bei den Kindern“) */
const careNoted = (note?: string) => Boolean(note && /bleibt|babysitter|betreu|passt auf/i.test(note));

/** Draußen? (Sportart draußen oder typische Draußen-Wörter) – nur dann zählt Regen */
export function isOutdoor(title: string, place = "", sportOutdoor = false): boolean {
  if (sportOutdoor) return true;
  return /fu(ß|ss)ball|training|spielplatz|park\b|garten|wander|ausflug|drau(ß|ss)en|zoo|grill|turnier|laufen|joggen|radtour|fahrrad|spaziergang|flohmarkt|wochenmarkt|schwimmbad|freibad|see\b|strand/i.test(`${title} ${place}`);
}

/** Wer Geburtstag hat ("Geburtstag Oma", "Omas Geburtstag") – oder null */
export function birthdayName(title: string): string | null {
  const clean = title.replace(/\p{Extended_Pictographic}/gu, "").trim();
  const before = clean.match(/^(.+?)\s+geburtstag\b/i);
  if (before) {
    const n = before[1].trim();
    // Genitiv: "Oma's"/"Omas" → Oma, "Klaus" bleibt Klaus
    if (/['’]s$/u.test(n)) return n.slice(0, -2);
    return /[aeioy]s$/i.test(n) ? n.slice(0, -1) : n;
  }
  const after = clean.match(/geburtstag(?:\s+von)?[\s:·-]+(.+)$/i);
  return after ? after[1].trim() || null : null;
}

const MAX = 3;
/** Nachts (22–6) nur Erinnerung, Timer, Kochen, Pause, Ausblick, Geburtstag */
const NIGHT_KINDS: JetztKind[] = ["erinnerung", "timer", "kochen", "pause", "ausblick", "geburtstag", "beispiel"];

/** Die Themen für jetzt – höchstens drei, das Wichtigste zuerst (nie leer) */
export function jetztTopics(x: JetztInput): JetztTopic[] {
  const c: Candidate[] = [];
  const add = (t: Candidate) => c.push(t);
  const night = x.minutes >= 22 * 60 || x.minutes < 6 * 60;
  const dayHref = `/tag?datum=${x.today}`;
  const shows = (tile: HomeTileId) => x.tiles.includes(tile);

  if (x.reminder) add({ id: `erinnerung:${x.reminder.key}`, kind: "erinnerung", title: x.reminder.text, detail: "Erinnerung", score: 100, target: { href: dayHref }, button: "Erledigt", gentle: true });
  if (x.timer && !shows("timer")) add({ id: `timer:${x.today}`, kind: "timer", title: `${x.timer.name}: ${x.timer.left}`, detail: "Timer läuft", score: 96, target: { action: "timer" }, button: "Öffnen", gentle: true });
  if (x.cookingStep) add({ id: `kochen:${x.today}`, kind: "kochen", title: `Jetzt: ${x.cookingStep}`, detail: "Schritt für Schritt kochen", score: 92, target: { action: "essen" }, button: "Kochen", gentle: true });
  if (x.pause) add({ id: `pause:${x.today}`, kind: "pause", title: `Pause ${x.pause}`, detail: "Genießt die Zeit", score: 94, target: { action: "pause" }, button: "Öffnen", gentle: true });

  // Gleich (≤ 15 Min): mit Zusatz aus der Notiz – ohne Zusatz nur, wenn die Termine-Kachel fehlt
  const soon = x.upcoming.find((t) => toMin(t.time) - x.minutes <= 15 && toMin(t.time) >= x.minutes);
  if (soon && (soon.note || soon.place || !shows("termine"))) {
    const inMin = Math.max(0, toMin(soon.time) - x.minutes);
    add({
      id: `gleich:${soon.key}`,
      kind: "gleich",
      title: `${inMin <= 1 ? "Jetzt" : `In ${inMin} Min`}: ${soon.title}`,
      detail: soon.note ?? (soon.place ? `${clock(soon.time)} · ${soon.place}` : `um ${clock(soon.time)}`),
      score: 88 - inMin,
      target: { href: dayHref },
      button: "Öffnen",
      gentle: !soon.work,
    });
  }

  // Vorbereiten: Termin heute (später) mit Notiz → „Versichertenkarte einpacken?“
  for (const t of x.upcoming.filter((u) => u !== soon && u.note && !careNoted(u.note) && toMin(u.time) - x.minutes > 15).slice(0, 1))
    add({ id: `vorbereiten:${t.key}`, kind: "vorbereiten", title: ask(t.note!), detail: `Heute ${clock(t.time)} · ${t.title}`, score: 66, target: { href: dayHref }, button: "Erledigt", gentle: !t.work });

  // Packliste fürs Training heute (bis zum Start)
  if (x.sport && x.sport.pack.length && toMin(x.sport.time) > x.minutes && !night)
    add({ id: `packliste:${x.sport.key}`, kind: "packliste", title: ask(`${x.sport.pack[0]} einpacken`), detail: `Heute ${clock(x.sport.time)} · ${x.sport.title}`, score: 62, target: { href: "/sport" }, button: "Erledigt", gentle: true });

  // Wetter NUR mit Planbezug: Regen/Sturm/Glätte zur Zeit eines Draußen-Termins
  if (x.planWeather && !night) {
    const h = Number(x.planWeather.time.slice(0, 2));
    add({ id: `wetter:${x.planWeather.key}`, kind: "wetter", title: `${x.planWeather.word} um ${h} Uhr`, detail: `${x.planWeather.title} – lieber drinnen?`, score: 74, target: { href: dayHref }, button: "Öffnen", gentle: true });
  }

  // Neu von der Familie
  if (x.pin) add({ id: `pin:${x.pin.id}`, kind: "pinnwand", title: `${x.pin.author}: ${x.pin.text}`, detail: `Neu auf der Pinnwand · ${x.pin.when}`, score: 72, target: { action: "pinnwand" }, button: "Antworten", gentle: true });

  // Kochstart: kurz vor dem Start (≤ 30 Min) bis zum Essen – sonst zeigt die Essen-Kachel das Gericht
  let dishLater = false;
  let dishScore = 0;
  if (x.dish && x.dish.clock && !night) {
    const meal = toMin(x.dish.clock);
    const start = meal - (x.dish.minutes ?? 30);
    const near = start - x.minutes;
    dishLater = near > 30;
    if (x.minutes < meal && (near <= 30 || !shows("essen"))) {
      dishScore = near <= 30 ? 84 : 52;
      add({
        id: `kochstart:${x.today}`,
        kind: "kochstart",
        title: near <= 0 ? `Jetzt kochen: ${x.dish.name}` : `${fromMin(start)} kochen: ${x.dish.name}`,
        detail: x.dish.ready ? `Essen um ${clock(x.dish.clock)} · ${x.dish.unsure?.length ? "vermutlich im Haus" : "alles im Haus"}` : `auf die Liste: ${x.dish.missing.slice(0, 2).join(", ")}`,
        score: dishScore,
        target: { action: "essen" },
        button: "Kochen",
        gentle: true,
      });
    }
  }

  // Heimweg-Einkauf (vor dem Kochen): ohne Zahl, nur der Laden und was fürs Essen fehlt
  const forDish = dishLater && x.dish && !x.dish.ready ? x.dish.missing.filter((m) => !x.shop?.names.some((n) => n.toLowerCase() === m.toLowerCase())) : [];
  if (x.shop && x.shop.names.length + forDish.length >= 2 && x.minutes >= 15 * 60 && x.minutes < 19 * 60 + 30)
    add({ id: `einkauf:${x.today}:${x.shop.shop}`, kind: "einkauf", title: `Auf dem Heimweg bei ${x.shop.shop}?`, detail: [...x.shop.names.slice(0, 3), ...forDish.map((m) => `${m} fürs Essen`)].join(", "), score: dishLater ? 86 : 58, target: { href: x.demo ? "/einkaufsliste" : `/einkaufsliste/laden?name=${encodeURIComponent(x.shop.shop)}` }, button: "Liste", gentle: true });

  // Absprache bei Abendterminen (ab 18 Uhr) mit Kindern im Haushalt
  if (x.kids && x.minutes >= 12 * 60 && !night)
    for (const t of x.upcoming.filter((u) => toMin(u.time) >= 18 * 60 && toMin(u.time) > x.minutes).slice(0, 1)) {
      const done = careNoted(t.note);
      add({ id: `absprache:${t.key}`, kind: "absprache", title: `${clock(t.time)} ${t.title}`, detail: done ? `${t.note!.trim()} ✓` : "Wer bleibt bei den Kindern?", score: done ? 45 : 64, target: { href: dayHref }, button: "Öffnen", gentle: true });
    }

  for (const b of x.birthdays.slice(0, 1)) {
    const name = birthdayName(b.title);
    const when = b.when === "heute" ? "Heute" : "Morgen";
    add({ id: `geburtstag:${b.date}:${b.title}`, kind: "geburtstag", title: name ? `${when} hat ${name} Geburtstag` : `${when}: ${b.title}`, detail: b.when === "heute" ? "Vielleicht kurz anrufen?" : "Noch Zeit für eine Kleinigkeit", score: b.when === "heute" ? 82 : 58, target: { href: `/tag?datum=${b.date}` }, button: "Erledigt", gentle: true, night: true });
  }

  // Ausblick abends (ab 19 Uhr): erster Termin morgen – mit Notiz als Packliste; ohne Notiz nur, wenn keine Kachel „Morgen“ zeigt
  if (x.minutes >= 19 * 60 || x.minutes < 6 * 60) {
    const first = x.tomorrow.items.find((i) => i.note) ?? x.tomorrow.items[0];
    if (first && (first.note || !(x.tomorrowTiles ?? []).length))
      add({ id: `ausblick:${first.key}`, kind: "ausblick", title: `${x.tomorrow.label}: ${first.time ? `${clock(first.time)} ` : ""}${first.title}`, detail: first.note ? ask(first.note) : "Den Tag ansehen", score: night ? 60 : 50, target: { href: `/tag?datum=${x.tomorrow.date}` }, button: first.note ? "Packliste" : "Öffnen", gentle: true });
  }

  // Aufgaben nur, wenn die Aufgaben-Kachel fehlt
  if (!shows("aufgaben"))
    for (const t of [...x.urgent, ...x.dueToday].slice(0, 1)) add({ id: `aufgabe:${t.key}`, kind: "aufgabe", title: t.title, detail: "Heute dran", score: 54, target: { href: "/aufgaben" }, button: "Öffnen", gentle: !t.work });

  if (!x.dish && x.dinnerFree && !shows("essen") && x.minutes >= 15 * 60 && x.minutes < 20 * 60) add({ id: `ideen:${x.today}`, kind: "ideen", title: "Ideen fürs Abendessen", detail: "Mit dem, was da ist", score: 56, target: { action: "ideen" }, button: "Öffnen", gentle: true });

  // Selbst eingeschaltete Bausteine – leise, wenn sonst wenig ansteht
  if (x.leisure && x.calm) add({ id: `freizeit:${x.today}`, kind: "freizeit", title: x.leisure.text, detail: "Aus deiner Freizeit-Liste", score: 27, target: { href: x.leisure.href }, button: "Öffnen", gentle: true });
  if (x.region && !shows("tipps") && !night) add({ id: `region:${x.region.id}`, kind: "region", title: x.region.title, detail: x.region.detail, score: 38, target: { href: `/tipps?tipp=${encodeURIComponent(x.region.id)}` }, button: "Öffnen", gentle: true });
  if (x.routinen?.ueber && !night) add({ id: x.routinen.ueber.key, kind: "ueberschneidung", title: short(x.routinen.ueber.title), detail: x.routinen.ueber.detail, score: 84, target: null, button: null, gentle: true });
  if (x.routinen?.pack && !night) add({ id: x.routinen.pack.key, kind: "packen", title: short(x.routinen.pack.title), detail: x.routinen.pack.detail, score: 70, target: null, button: null, gentle: true });
  if (x.routinen?.morgen && !night) add({ id: `morgen:${x.today}`, kind: "morgen", title: short(x.routinen.morgen.title), detail: x.routinen.morgen.detail, score: 62, target: null, button: null, gentle: true });
  if (x.family && !night) add({ id: `familie:${x.family.id}`, kind: "familie", title: short(x.family.title), detail: x.family.detail, score: 45, target: { href: x.family.href }, button: "Öffnen", gentle: true });
  if (x.potInvite && !night) add({ id: `spendentopf:live`, kind: "spendentopf", title: x.potInvite.title, detail: x.potInvite.detail, score: 40, target: { href: "/spendentopf" }, button: "Öffnen", gentle: true });
  if (x.tip) add({ id: `tipp:${x.today}`, kind: "tipp", title: x.tip, detail: "Kleiner Tipp", score: 18, target: null, button: null, gentle: true });

  if (x.weekCheck && !night) add({ id: `wochencheck:${x.weekCheck}`, kind: "wochencheck", title: "Kurzer Wochencheck?", detail: "Sag einfach alles, ich sortiere.", score: 50, target: { action: "wochencheck" }, button: "Öffnen", gentle: true });
  if (x.demo) add({ id: "beispiel", kind: "beispiel", title: "Das ist ein Beispiel-Tag", detail: "Probier alles aus: tippen, abhaken, verschieben", score: 24, target: null, button: null, gentle: true, night: true });

  const ranked = c
    .filter((t) => !x.hidden.includes(t.id))
    .filter((t) => !x.calm || t.gentle)
    .filter((t) => !night || NIGHT_KINDS.includes(t.kind) || t.night)
    .map((t) => {
      const w = Math.max(-6, Math.min(6, x.weights[t.kind] ?? 0));
      return { ...t, title: short(t.title), score: Math.round(t.score * (1 + w * 0.05) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX)
    .map(({ id, kind, title, detail, score, target, button }) => ({ id, kind, title, detail, score, target, button }));
  if (ranked.length) return ranked;
  return [{ id: `ruhig:${x.today}`, kind: "ruhig", title: QUIET_TEXT, detail: "", score: 1, target: null, button: null }];
}
