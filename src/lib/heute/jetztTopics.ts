// Jetzt-Karte (A-054, Tafel 60): oben auf „Heute“ steht nur, was man HEUTE
// braucht und die Kacheln nicht schon zeigen. EIN Thema, höchstens zwei zum
// Wischen. Keine Füll- oder Stimmungssätze, kein „Alles ruhig“: Passt nichts,
// ist die Karte ganz weg (kein Platzhalter).
//
// Die Auswahl ist EINE feste Rangliste (`JETZT_RANG`, kleiner = wichtiger):
//   0 Beispiel-Tag (erklärt sich, nur dort)
//   5 Erinnerung (selbst gewünscht)
//  10 Gleich: Termin in < 60 Min mit Weg/Vorbereitung („Gleich 10:00 Zahnarzt.“ · „Losgehen um 9:45.“)
//  20 Wetter mit Folge („Ab 15 Uhr Regen.“ · „Schirm für Bastelkreis.“; abends: morgen früh)
//  30 Essen mit Folge („Pad Thai heute Abend.“ + Knopf „Auf die Liste: Eier“; abends: Vorlauf)
//  40 Geburtstag/Jahrestag heute oder morgen (aus dem Kalender)
//  45 Neu vom Haushalt, nur mit Konto („Lisa ist gleich bei REWE“, höchstens eine am Tag)
//  50 Timer läuft / Kochmodus läuft / Pause
//  55 Wochenende planen (nur freitags 12–20 Uhr, `wochenende.ts`)
//  60 Abends ab 18 Uhr: „Morgen · Fr: 8:00 Laufen“ · „2 Termine.“
//  70 Leise: „Kurz durchatmen?“ (A-051, höchstens 2× am Tag, nie nachts)
//  80+ Selbst eingeschaltete Bausteine (Mails, Tipps …) – wer sie nutzt, behält sie
// Ein neues Thema = eine Art mit Rang + ein Baustein in `kandidaten` (so kam
// „Kurz durchatmen?“ mit niedrigem Rang dazu). Weiter gilt: nachts (22–6)
// nur Erinnerung, Timer, Kochen, Pause und ab 22 Uhr „Morgen“; im Feierabend
// mit Ruhe und am Wochenende nichts zu Arbeit; nie Temperatur. Texte werden
// nie mit „…“ gekürzt – die Karte bricht um. Rein und lokal (ohne KI).

import type { HomeTileId } from "@/lib/core/homeLayout";
import type { Anlass } from "@/lib/kalender/anlass";
import { birthdayName, eigenerJahrestag } from "@/lib/kalender/anlass";
import { weekdayIndex } from "@/lib/kalender/model";
import { zutatenKurz } from "@/lib/heute/essenKachel";
import { wochenendThema, type WochenendChip, type WochenendDaten } from "@/lib/heute/wochenende";
import { durchatmenThema } from "@/lib/durchatmen/angebot";

export type JetztKind =
  | "beispiel"
  | "erinnerung"
  | "gleich"
  | "wetter"
  | "essen"
  | "vorlauf"
  | "geburtstag"
  | "jahrestag"
  | "familie"
  | "timer"
  | "kochen"
  | "pause"
  | "wochenende"
  | "morgen"
  | "durchatmen"
  | "mail"
  | "region"
  | "spendentopf"
  | "freizeit"
  | "tipp";

/** Die Rangliste: kleiner = steht weiter vorn (gleicher Rang: das Dringendere zuerst) */
export const JETZT_RANG: Record<JetztKind, number> = {
  beispiel: 0,
  erinnerung: 5,
  gleich: 10,
  wetter: 20,
  essen: 30,
  vorlauf: 31,
  geburtstag: 40,
  jahrestag: 40,
  familie: 45,
  timer: 50,
  kochen: 50,
  pause: 52,
  wochenende: 55,
  morgen: 60,
  durchatmen: 70,
  mail: 80,
  region: 82,
  spendentopf: 84,
  freizeit: 86,
  tipp: 88,
};

/** Wohin Antippen führt: eine Seite oder etwas, das die Startseite selbst öffnet */
type JetztTarget = { href: string } | { action: "essen" | "timer" | "pause" | "durchatmen" };

/** Knopf in Zeile 2 (statt Hinweis): „Auf die Liste: Eier“ setzt genau diese Sachen auf die Einkaufsliste */
type JetztAktion = { art: "liste"; label: string; namen: string[]; gericht: string };

export type JetztTopic = {
  id: string;
  kind: JetztKind;
  /** Zeile 1 (fett) – was */
  title: string;
  /** Zeile 2 – Hinweis (leer = nur Zeile 1 bzw. der Knopf) */
  detail: string;
  /** Platz in der Rangliste (`JETZT_RANG` + Feinheit) */
  rang: number;
  target: JetztTarget | null;
  aktion?: JetztAktion;
  /** Wochenende planen: Vorschläge aus den eigenen Daten */
  chips?: WochenendChip[];
};

export type JetztTermin = {
  key: string;
  title: string;
  time: string;
  date: string;
  place?: string;
  /** Notiz zum Termin („Versichertenkarte einpacken“) – wird zur Vorbereitung */
  note?: string;
  work?: boolean;
  /** Draußen (Fußball, Spielplatz, Laufen …): bei Regen „lieber drinnen?“ statt Schirm */
  outdoor?: boolean;
  /** Geburtstag bzw. Jahrestag/Hochzeitstag (Stichwort oder Etikett) */
  anlass?: Anlass;
};

export type JetztInput = {
  minutes: number;
  today: string;
  /** Feierabend mit Ruhe oder Wochenende: nichts zu Arbeit */
  calm: boolean;
  /** Allein im Haushalt: „dein“ statt „euer“ */
  solo?: boolean;
  /** Kinder mit Weg zu Kita bzw. Schule (für „Jacken für die Kita raus.“) */
  kidsWay?: "Kita" | "Schule" | null;
  /** Termine heute, die noch kommen (mit Uhrzeit) */
  upcoming: JetztTermin[];
  /** „Morgen · Mi“ und die Einträge von morgen */
  tomorrow: { label: string; date: string; items: JetztTermin[] };
  /** Stunden heute mit Regen (ehrliche Regel `isRainy`) */
  rainHours?: number[];
  /** Sturm zur Zeit eines Draußen-Plans (`stormForPlan`): „Stürmisch ab 14 Uhr“ · „Trampolin sichern?“ */
  storm?: { key: string; head: string; detail: string } | null;
  /** Regen morgen früh (7–9 Uhr) */
  tomorrowRain?: boolean;
  /** Gericht von heute (solange nicht gegessen); `liste` = was die Karte auf die Einkaufsliste anbietet (nur mit „Im Haus“, ohne was schon draufsteht) */
  dish: { name: string; clock: string | null; minutes: number | null; ready: boolean; missing: string[]; unsure?: string[]; liste?: string[]; demo?: boolean } | null;
  /** Gericht von morgen, das heute schon einen Handgriff braucht (`essen/vorlauf.ts`) */
  tomorrowDish?: { name: string; prep: string } | null;
  birthdays: { title: string; date: string; when: "heute" | "morgen" }[];
  /** Jahrestag bzw. Hochzeitstag heute (ganztägiger Termin mit Stichwort oder Etikett) */
  jahrestagHeute?: { key: string; title: string } | null;
  /** Heute geplantes Training mit Packliste */
  sport: { key: string; title: string; time: string; pack: string[] } | null;
  timer: { name: string; left: string } | null;
  cookingStep: string | null;
  reminder: { key: string; text: string } | null;
  pause: string | null;
  /** Leise Neuigkeit aus dem Haushalt („Lisa ist gleich bei REWE“ – höchstens eine am Tag, `konten/wer.ts`) */
  family?: { id: string; title: string; detail: string; href: string } | null;
  /** Freitag: Daten fürs Wochenende (Wetter, Essen, Einkauf, Termine) */
  wochenende?: WochenendDaten | null;
  /** Leises Angebot „Kurz durchatmen?“ (A-051, `durchatmen/angebot.ts`: höchstens 2× am Tag, nie nachts) – sonst null */
  durchatmen?: { anlass: string; detail: string } | null;
  /** Selbst eingeschaltete Bausteine */
  leisure?: { text: string; href: string } | null;
  tip?: string | null;
  region?: { id: string; title: string; detail: string } | null;
  mail?: { id: string; title: string; detail: string } | null;
  potInvite?: { title: string; detail: string } | null;
  /** Beispiel-Tag: ein Thema, das ihn kurz erklärt */
  demo: boolean;
  /** Beispiel-Tag je Haushalt (Tafel 119): das Thema des Tages („Heute ist Laternelaufen.“) – steht vorn */
  demoThema?: { title: string; detail: string } | null;
  /** Sichtbare Kacheln – was sie zeigen, wiederholt die Karte nicht */
  tiles: HomeTileId[];
  /** Heute erledigte bzw. mit „Später“ weggelegte Themen */
  hidden: string[];
};

/** Höchstens so viele Themen zum Wischen */
export const JETZT_MAX = 2;
/** Fester Vorlauf für „Losgehen um …“ (es gibt keine Wegzeiten) – nur bei Terminen mit Ort */
export const LOSGEH_VORLAUF = 15;
/** Ab hier zeigt die Karte abends morgen */
const ABENDS_AB = 18 * 60;

type Candidate = Omit<JetztTopic, "rang"> & { fein?: number; /** auch nachts (22–6) erlaubt */ nacht?: boolean; /** Arbeit: im Feierabend mit Ruhe und am Wochenende nicht */ arbeit?: boolean };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (t: string) => t.slice(0, 5).replace(/^0(\d)/, "$1");
const fromMin = (m: number) => `${Math.floor(m / 60)}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;
/** „8:00“ → „8“, „7:30“ → „7:30“ */
const uhr = (m: number) => (m % 60 ? fromMin(m) : `${Math.floor(m / 60)}`);
/** Ohne Satzzeichen am Ende („Zahnarzt.“ → „Zahnarzt“) */
const bare = (s: string) => s.trim().replace(/[.!?:]+$/, "");
/** Notiz als Frage („Versichertenkarte einpacken“ → „Versichertenkarte einpacken?“) */
const ask = (note: string) => (/[?!.]$/.test(note.trim()) ? note.trim() : `${note.trim()}?`);

/** Draußen? (Sportart draußen oder typische Draußen-Wörter) */
export function isOutdoor(title: string, place = "", sportOutdoor = false): boolean {
  if (sportOutdoor) return true;
  return /fu(ß|ss)ball|training|spielplatz|park\b|garten|trampolin|w(ä|ae)sche|balkon|terrasse|wander|ausflug|drau(ß|ss)en|zoo|grill|turnier|laufen|joggen|radtour|fahrrad|spaziergang|flohmarkt|wochenmarkt|schwimmbad|freibad|see\b|strand/i.test(`${title} ${place}`);
}

// --- Die Bausteine der Rangliste (jeder für sich, rein) ------------------------------

/** 10 Gleich: der nächste Termin in weniger als 60 Min – mit Vorbereitung bzw. Losgehzeit */
function gleichThema(x: JetztInput): Candidate | null {
  const soon = x.upcoming
    .filter((t) => t.time && toMin(t.time) > x.minutes && toMin(t.time) - x.minutes < 60)
    .sort((a, b) => toMin(a.time) - toMin(b.time))[0];
  const sport = x.sport && toMin(x.sport.time) > x.minutes && toMin(x.sport.time) - x.minutes < 60 ? x.sport : null;
  const t = soon ?? (sport ? { key: sport.key, title: sport.title, time: sport.time, date: x.today } : null);
  if (!t) return null;
  const start = toMin(t.time);
  const pack = sport && sport.pack.length && sport.time === t.time ? sport.pack[0] : null;
  const losgehen = start - LOSGEH_VORLAUF;
  const detail = t.note ? ask(t.note) : t.place ? (losgehen > x.minutes ? `Losgehen um ${fromMin(losgehen)}.` : bare(t.place)) : pack ? ask(`${pack} einpacken`) : "";
  return { id: `gleich:${t.key}`, kind: "gleich", title: `Gleich ${clock(t.time)} ${bare(t.title)}.`, detail, fein: start - x.minutes, target: { href: `/tag?datum=${x.today}` }, arbeit: t.work };
}

/** 20 Wetter mit Folge: Regen zur Zeit eines Plans von heute (sonst Sturm); abends Regen morgen früh mit Plan */
function wetterThema(x: JetztInput, abends: boolean): Candidate | null {
  const rain = new Set(x.rainHours ?? []);
  const nowH = Math.floor(x.minutes / 60);
  const plans = [...x.upcoming.filter((t) => t.time && !t.work && toMin(t.time) > x.minutes), ...(x.sport && toMin(x.sport.time) > x.minutes ? [{ key: x.sport.key, title: x.sport.title, time: x.sport.time, outdoor: true }] : [])].sort((a, b) => toMin(a.time) - toMin(b.time));
  const wet = plans.find((p) => rain.has(Math.floor(toMin(p.time) / 60)));
  if (wet) {
    const h = Math.floor(toMin(wet.time) / 60);
    let ab = h;
    while (ab - 1 > nowH && rain.has(ab - 1)) ab--;
    const title = ab > nowH ? `Ab ${ab} Uhr Regen.` : `Regen um ${h} Uhr.`;
    return { id: `wetter:${wet.key}`, kind: "wetter", title, detail: wet.outdoor ? `${bare(wet.title)}: lieber drinnen?` : `Schirm für ${bare(wet.title)}.`, target: { href: `/tag?datum=${x.today}` } };
  }
  if (x.storm) return { id: `wetter:${x.storm.key}`, kind: "wetter", title: x.storm.head, detail: x.storm.detail, target: { href: `/tag?datum=${x.today}` } };
  if (!abends || !x.tomorrowRain) return null;
  // Abends: Regen morgen früh – nur mit Plan (Weg zu Kita/Schule werktags oder ein Termin vor 10 Uhr)
  const frueh = x.tomorrow.items.filter((i) => i.time && toMin(i.time) < 10 * 60).sort((a, b) => toMin(a.time) - toMin(b.time))[0];
  const werktag = weekdayIndex(x.tomorrow.date) < 5;
  if (!(x.kidsWay && werktag) && !frueh) return null;
  const detail = x.kidsWay && werktag ? `Jacken für die ${x.kidsWay} raus.` : `Schirm für ${bare(frueh!.title)} bereitlegen?`;
  return { id: `wetter:${x.tomorrow.date}`, kind: "wetter", title: "Morgen früh Regen.", detail, target: { href: `/tag?datum=${x.tomorrow.date}` } };
}

/** 30 Essen mit Folge: fürs Gericht von heute fehlt im Haus etwas → Knopf „Auf die Liste: Eier“ */
function essenThema(x: JetztInput): Candidate | null {
  const d = x.dish;
  const liste = d?.liste ?? [];
  if (!d || d.demo || !liste.length) return null;
  const meal = d.clock ? toMin(d.clock) : 19 * 60;
  // Bis zum Kochstart – danach ist es zum Einkaufen zu spät
  if (x.minutes >= meal - (d.minutes ?? 30)) return null;
  const title = !d.clock || meal >= 17 * 60 ? `${bare(d.name)} heute Abend.` : `${bare(d.name)} um ${clock(d.clock)}.`;
  return {
    id: `essen:${x.today}:${liste.join(",")}`,
    kind: "essen",
    title,
    detail: "",
    target: { action: "essen" },
    aktion: { art: "liste", label: `Auf die Liste: ${zutatenKurz(liste, 2)}`, namen: liste, gericht: d.name },
  };
}

/** 31 Abends: Gericht von morgen braucht heute schon einen Handgriff („Rindfleisch heute aus dem Gefrierfach.“) */
function vorlaufThema(x: JetztInput): Candidate | null {
  if (!x.tomorrowDish) return null;
  return { id: `vorlauf:${x.tomorrow.date}`, kind: "vorlauf", title: `Morgen gibt’s ${bare(x.tomorrowDish.name)}.`, detail: x.tomorrowDish.prep, target: { href: `/tag?datum=${x.tomorrow.date}` } };
}

/** 40 Besondere Tage heute oder morgen (Geburtstag, Jahrestag) – aus dem Kalender */
function festThemen(x: JetztInput, nachtMorgen: boolean): Candidate[] {
  const out: Candidate[] = [];
  for (const b of x.birthdays.slice(0, 1)) {
    const name = birthdayName(b.title);
    const heute = b.when === "heute";
    const title = name ? `${heute ? "Heute" : "Morgen"} hat ${name} Geburtstag.` : `${heute ? "Heute" : "Morgen"}: ${bare(b.title)}.`;
    out.push({ id: `geburtstag:${b.date}:${b.title}`, kind: "geburtstag", title, detail: heute ? "Vielleicht kurz anrufen?" : "Noch Zeit für eine Kleinigkeit.", fein: heute ? 0 : 1, target: { href: `/tag?datum=${b.date}` }, nacht: !heute && nachtMorgen });
  }
  const jahrestag = (title: string, wann: "Heute" | "Morgen") => {
    const eigen = eigenerJahrestag(title);
    return eigen ? `${wann} ist ${x.solo ? "dein" : "euer"} ${eigen}.` : `${wann}: ${bare(title)}.`;
  };
  if (x.jahrestagHeute) out.push({ id: `jahrestag:${x.jahrestagHeute.key}`, kind: "jahrestag", title: jahrestag(x.jahrestagHeute.title, "Heute"), detail: "Was Schönes geplant?", fein: 0, target: { href: `/tag?datum=${x.today}` } });
  const morgen = x.tomorrow.items.find((i) => i.anlass === "jahrestag");
  if (morgen) out.push({ id: `jahrestag:${morgen.key}`, kind: "jahrestag", title: jahrestag(morgen.title, "Morgen"), detail: "Was Schönes geplant?", fein: 1, target: { href: `/tag?datum=${x.tomorrow.date}` }, nacht: nachtMorgen });
  return out;
}

/** 60 Abends ab 18 Uhr: „Morgen · Fr: 8:00 Laufen“ · „2 Termine. Wecker auf 7?“ */
function morgenThema(x: JetztInput): Candidate | null {
  const timed = x.tomorrow.items.filter((i) => i.time && !i.anlass).sort((a, b) => toMin(a.time) - toMin(b.time));
  const first = timed[0];
  if (!first) return null;
  const m = toMin(first.time);
  const detail = [timed.length > 1 ? `${timed.length} Termine.` : "", m >= 5 * 60 && m < 9 * 60 ? `Wecker auf ${uhr(m - 60)}?` : ""].filter(Boolean).join(" ");
  return { id: `morgen:${first.key}`, kind: "morgen", title: `${x.tomorrow.label}: ${clock(first.time)} ${bare(first.title)}`, detail, target: { href: `/tag?datum=${x.tomorrow.date}` }, nacht: true, arbeit: timed.every((t) => t.work) };
}

/** Alle Kandidaten für jetzt (noch ungefiltert) */
function kandidaten(x: JetztInput): Candidate[] {
  const c: Candidate[] = [];
  const add = (t: Candidate | null) => t && c.push(t);
  const abends = x.minutes >= ABENDS_AB && x.minutes < 22 * 60;
  const spaet = x.minutes >= 22 * 60;
  const dayHref = `/tag?datum=${x.today}`;
  const shows = (tile: HomeTileId) => x.tiles.includes(tile);

  if (x.demo) add(x.demoThema ? { id: "beispiel", kind: "beispiel", ...x.demoThema, target: null, nacht: true } : { id: "beispiel", kind: "beispiel", title: "Das ist ein Beispiel-Tag.", detail: "Probier alles aus: tippen, abhaken, verschieben.", target: null, nacht: true });
  if (x.reminder) add({ id: `erinnerung:${x.reminder.key}`, kind: "erinnerung", title: x.reminder.text, detail: "Erinnerung", target: { href: dayHref }, nacht: true });
  add(gleichThema(x));
  add(wetterThema(x, abends));
  add(essenThema(x));
  if (abends) add(vorlaufThema(x));
  for (const t of festThemen(x, spaet)) add(t);
  if (x.family) add({ id: `familie:${x.family.id}`, kind: "familie", title: x.family.title, detail: x.family.detail, target: { href: x.family.href } });
  if (x.timer && !shows("timer")) add({ id: `timer:${x.today}`, kind: "timer", title: `${x.timer.name}: ${x.timer.left}`, detail: "Timer läuft", target: { action: "timer" }, nacht: true });
  if (x.cookingStep) add({ id: `kochen:${x.today}`, kind: "kochen", title: "Kochmodus läuft.", detail: x.dish ? bare(x.dish.name) : "", target: { action: "essen" }, nacht: true });
  if (x.pause) add({ id: `pause:${x.today}`, kind: "pause", title: `Pause ${x.pause}`, detail: "Antippen beendet sie.", target: { action: "pause" }, nacht: true });
  add(wochenendThema(x));
  if (x.minutes >= ABENDS_AB) add(morgenThema(x));
  // Durchatmen (A-051): leise, nie nachts (kein `nacht`), nach allem anderen Nützlichen
  if (x.durchatmen) {
    const { id, kind, title, detail, target } = durchatmenThema(x.durchatmen.anlass, x.today, x.durchatmen.detail);
    add({ id, kind, title, detail, target });
  }
  // Selbst eingeschaltete Bausteine – ganz hinten
  if (x.mail) add({ id: `mail:${x.mail.id}`, kind: "mail", title: x.mail.title, detail: x.mail.detail, target: { href: "/mails" } });
  if (x.region && !shows("tipps")) add({ id: `region:${x.region.id}`, kind: "region", title: x.region.title, detail: x.region.detail, target: { href: `/tipps?tipp=${encodeURIComponent(x.region.id)}` } });
  if (x.potInvite) add({ id: "spendentopf:live", kind: "spendentopf", title: x.potInvite.title, detail: x.potInvite.detail, target: { href: "/spendentopf" } });
  if (x.leisure && x.calm) add({ id: `freizeit:${x.today}`, kind: "freizeit", title: x.leisure.text, detail: "Aus deiner Freizeit-Liste", target: { href: x.leisure.href } });
  if (x.tip) add({ id: `tipp:${x.today}`, kind: "tipp", title: x.tip, detail: "Kleiner Tipp", target: null });
  return c;
}

/**
 * Die Rangliste für jetzt: alle erlaubten Themen, das Wichtigste zuerst
 * (ohne Weggelegtes, nachts nur Erlaubtes, in Ruhe nichts zu Arbeit). Leer =
 * nichts, was man heute braucht.
 */
export function jetztThemen(x: JetztInput): JetztTopic[] {
  const nacht = x.minutes >= 22 * 60 || x.minutes < 6 * 60;
  return kandidaten(x)
    .filter((t) => !x.hidden.includes(t.id))
    .filter((t) => !nacht || t.nacht)
    .filter((t) => !x.calm || !t.arbeit)
    .map(({ fein = 0, nacht: _n, arbeit: _a, ...t }) => ({ ...t, rang: JETZT_RANG[t.kind] + Math.min(0.99, Math.max(0, fein) / 1000) }))
    .sort((a, b) => a.rang - b.rang);
}

/**
 * Was die Karte zeigt: das erste Thema der Rangliste, höchstens zwei. Die
 * Wochenende-Karte (Chips + Knöpfe) steht nur allein – kommt Wichtigeres
 * vor ihr, wartet sie, bis das erledigt ist. Leer = Karte weg.
 */
export function jetztTopics(x: JetztInput): JetztTopic[] {
  const alle = jetztThemen(x);
  if (alle[0]?.kind === "wochenende") return [alle[0]];
  return alle.filter((t) => t.kind !== "wochenende").slice(0, JETZT_MAX);
}
