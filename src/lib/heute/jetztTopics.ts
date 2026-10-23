// Jetzt-Karte (oben auf "Heute"): EIN Thema für den Moment, bis zu drei zum
// Weiterwischen. Rein und lokal (ohne KI): jedes mögliche Thema bekommt
// Punkte aus Dringlichkeit (Zeit bis zum Ereignis, heute dran), Handlung (ein
// konkreter Tipp schlägt reine Info) und Interesse (oft angetippt = mehr
// Gewicht, weggewischt/ausgeblendet = weniger – langsam gelernt). Die
// Kachel-Anordnung bleibt davon unberührt.

import type { HomeTileId } from "@/lib/core/homeLayout";

export type JetztKind =
  | "erinnerung"
  | "timer"
  | "kochen"
  | "pause"
  | "termin"
  | "pinnwand"
  | "wetter"
  | "start"
  | "essen"
  | "ideen"
  | "wochencheck"
  | "dringend"
  | "geburtstag"
  | "sport"
  | "einkauf"
  | "morgen"
  | "geschafft"
  | "freizeit"
  | "tipp"
  | "region"
  | "beispiel"
  | "ruhig";

/** Wohin Antippen führt: eine Seite oder etwas, das die Startseite selbst öffnet */
type JetztTarget = { href: string } | { action: "essen" | "ideen" | "timer" | "pinnwand" | "pause" | "wochencheck" };

export type JetztTopic = {
  id: string;
  kind: JetztKind;
  /** Zeile 1 (fett) – das Wichtigste */
  title: string;
  /** Zeile 2 – Detail oder Tipp */
  detail: string;
  score: number;
  target: JetztTarget | null;
};


export type JetztTermin = { key: string; title: string; time: string; place?: string; work?: boolean; date: string };

export type JetztInput = {
  minutes: number;
  today: string;
  /** Feierabend oder Wochenende: nur sanfte Themen */
  calm: boolean;
  /** Termine heute, die noch kommen (mit Uhrzeit, sortiert) */
  upcoming: JetztTermin[];
  /** "Morgen · Mi" und das, was morgen ansteht (Termine mit Uhrzeit zuerst) */
  tomorrow: { label: string; date: string; items: { title: string; time?: string }[]; weather?: string | null };
  urgent: { key: string; title: string; work?: boolean }[];
  dueToday: { key: string; title: string; work?: boolean }[];
  /** Heute gab es etwas (Termine/Erledigtes) und nichts ist mehr übrig */
  allDone: boolean;
  pin: { id: string; author: string; text: string; when: string } | null;
  /** EIN Wetter-Tipp für heute ("☂️ Ab 15 Uhr Regen – Schirm für …") und das Wetter kurz */
  weatherTip: string | null;
  weatherNow: { temp: number; text: string; range?: string } | null;
  /** Gericht von heute (solange nicht gegessen) */
  dish: { name: string; clock: string | null; minutes: number | null; ready: boolean; missing: string[]; demo?: boolean } | null;
  /** Kein Gericht, aber eins wäre dran (Ideen anbieten) */
  dinnerFree: boolean;
  birthdays: { title: string; date: string; when: "heute" | "morgen" }[];
  /** Heute geplantes Training (ohne Zähler) */
  sport: { today: string } | null;
  /** Laden mit den meisten offenen Sachen (mindestens 2) */
  shop: { shop: string; names: string[] } | null;
  timer: { name: string; left: string } | null;
  cookingStep: string | null;
  reminder: { key: string; text: string } | null;
  pause: string | null;
  leisure: { text: string; href: string } | null;
  tip: string | null;
  /** Tipp aus der Region fürs Wochenende (Fr 12 Uhr bis So Mittag, höchstens einmal) */
  region: { id: string; title: string; detail: string } | null;
  /** „Kurzer Wochencheck?“ für diese Woche (Montag bzw. Sonntag ab 17 Uhr, nicht in Ruhe/Pause) – sonst null */
  weekCheck: string | null;
  /** Beispiel-Tag: ein Thema, das ihn kurz erklärt */
  demo: boolean;
  /** Kacheln ganz oben – was sie zeigen, wiederholt die Karte nicht (außer mit Tipp) */
  firstTiles: HomeTileId[];
  /** Kacheln, die schon „Morgen“ zeigen (Termine/Morgen-Kachel bzw. Wetter von morgen) – dann
   *  entfällt das reine Morgen- bzw. Wetter-Thema (keine Doppelung, Tafel 51) */
  tomorrowTiles?: HomeTileId[];
  /** Interesse je Art (lokal gezählt), ausgeblendete Themen von heute */
  weights: Partial<Record<JetztKind, number>>;
  hidden: string[];
};

type Candidate = JetztTopic & { tile?: HomeTileId; tip?: boolean; gentle?: boolean; night?: boolean };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (t: string) => t.replace(/^0(\d)/, "$1");
const fromMin = (m: number) => `${Math.floor(m / 60)}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;
const short = (s: string, max = 30) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
/** Emoji ans Ende ("☂️ Ab 15 Uhr Regen" → "Ab 15 Uhr Regen ☂️") */
const emojiLast = (s: string) => {
  const m = s.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
  return m ? `${m[2]} ${m[1]}` : s;
};
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
const NIGHT_KINDS: JetztKind[] = ["erinnerung", "timer", "kochen", "pause", "morgen", "geburtstag", "beispiel", "ruhig"];

/** Die Themen für jetzt – höchstens drei, das Wichtigste zuerst (nie leer) */
export function jetztTopics(x: JetztInput): JetztTopic[] {
  const c: Candidate[] = [];
  const add = (t: Candidate) => c.push(t);
  const night = x.minutes >= 22 * 60 || x.minutes < 6 * 60;
  const morning = x.minutes >= 5 * 60 && x.minutes < 11 * 60;
  const dayHref = `/tag?datum=${x.today}`;

  if (x.reminder) add({ id: `erinnerung:${x.reminder.key}`, kind: "erinnerung", title: x.reminder.text, detail: "Erinnerung · ✕ = gesehen", score: 100, target: { href: dayHref }, gentle: true });
  if (x.timer) add({ id: `timer:${x.today}`, kind: "timer", title: `${x.timer.name}: ${x.timer.left}`, detail: "Timer läuft", score: 96, target: { action: "timer" }, tile: "timer", tip: true, gentle: true });
  if (x.cookingStep) add({ id: `kochen:${x.today}`, kind: "kochen", title: `Jetzt: ${short(x.cookingStep, 40)}`, detail: "Schritt für Schritt kochen", score: 92, target: { action: "essen" }, tip: true, gentle: true });
  if (x.pause) add({ id: `pause:${x.today}`, kind: "pause", title: `Pause ${x.pause} – genießt die Zeit ☀️`, detail: "Antippen: Pause beenden", score: 94, target: { action: "pause" }, gentle: true });

  // Termine: gleich (≤ 60 Min) mit Ort/Wetter, sonst der nächste
  const soon = x.upcoming.find((t) => toMin(t.time) - x.minutes <= 60 && toMin(t.time) >= x.minutes - 5);
  if (soon) {
    const inMin = Math.max(0, toMin(soon.time) - x.minutes);
    const rain = x.weatherTip && /Schirm für/.test(x.weatherTip) && x.weatherTip.includes(soon.title.slice(0, 12));
    add({
      id: `termin:${soon.key}`,
      kind: "termin",
      title: `${inMin <= 1 ? "Jetzt" : `In ${inMin} Min`}: ${short(soon.title)}`,
      detail: rain ? "Regen – Schirm mit ☂️" : soon.place ? `${clock(soon.time)} · ${short(soon.place, 28)}` : `um ${clock(soon.time)}`,
      score: 70 + (60 - inMin) / 2,
      target: { href: dayHref },
      tile: "termine",
      tip: Boolean(rain || soon.place),
      gentle: !soon.work,
    });
  }
  const next = x.upcoming.find((t) => t !== soon && toMin(t.time) > x.minutes);
  if (next && !morning) add({ id: `termin:${next.key}`, kind: "termin", title: `${clock(next.time)} ${short(next.title)}`, detail: "Als Nächstes heute", score: 28, target: { href: dayHref }, tile: "termine", gentle: !next.work });

  if (x.pin) add({ id: `pin:${x.pin.id}`, kind: "pinnwand", title: short(`${x.pin.author}: ${x.pin.text}`, 44), detail: `Neu auf der Pinnwand · ${x.pin.when}`, score: 72, target: { action: "pinnwand" }, tile: "pinnwand", gentle: true });

  const tomorrowShown = x.tomorrowTiles ?? [];
  if (x.weatherTip && (/Schirm für/.test(x.weatherTip) || !tomorrowShown.includes("wetter"))) {
    const withTermin = /Schirm für/.test(x.weatherTip);
    const rainy = /Regen|glatt|Sturm/.test(x.weatherTip);
    add({
      id: `wetter:${x.today}`,
      kind: "wetter",
      title: emojiLast(x.weatherTip),
      detail: x.weatherNow ? `Jetzt ${x.weatherNow.temp}° · ${x.weatherNow.text}` : "Wetter ansehen",
      score: (withTermin ? 74 : rainy ? 55 : 38) + (morning ? 8 : 0),
      target: { href: "/wetter" },
      tile: "wetter",
      tip: true,
      gentle: true,
    });
  }
  // Morgens ohne Besonderes: Wetter kurz + erster Termin
  if (morning && (x.weatherNow || x.upcoming.length)) {
    const first = x.upcoming[0];
    const parts = [x.weatherNow ? `${x.weatherNow.temp}°` : "", first ? `${clock(first.time)} ${short(first.title, 24)}` : x.weatherNow?.text ?? ""].filter(Boolean);
    add({ id: `start:${x.today}`, kind: "start", title: parts.join(" · "), detail: x.weatherNow?.range ? `Heute ${x.weatherNow.range}` : "Guten Start in den Tag", score: 34, target: first ? { href: dayHref } : { href: "/wetter" }, gentle: true });
  }

  // Essen: ab 15 Uhr das Gericht mit Startzeit (Essenszeit − Kochdauer) oder Ideen
  /** Score des Essens (für „zuerst einkaufen, dann kochen“) und ob sein Kochstart noch > 30 Min weg ist */
  let dishScore: number | null = null;
  let dishLater = false;
  if (x.minutes >= 15 * 60 && x.dish && !night) {
    const meal = x.dish.clock ? toMin(x.dish.clock) : null;
    const start = meal !== null ? meal - (x.dish.minutes ?? 30) : null;
    if (meal === null || x.minutes < meal + 30) {
      const near = start !== null ? start - x.minutes : 999;
      dishScore = near <= 30 ? 80 : 52;
      dishLater = start !== null && near > 30;
      add({
        id: `essen:${x.today}`,
        kind: "essen",
        title: `${short(x.dish.name, 26)} – ${x.dish.ready ? "alles im Haus" : `auf die Liste: ${x.dish.missing.slice(0, 2).join(", ")}`}`,
        detail: start !== null ? (near <= 0 ? `Jetzt anfangen · Essen ${clock(x.dish.clock!)}` : `Start ${fromMin(start)} · Essen ${clock(x.dish.clock!)}`) : "Rezept ansehen",
        score: dishScore,
        target: { action: "essen" },
        tile: "essen",
        tip: start !== null,
        gentle: true,
      });
    }
  } else if (x.minutes >= 15 * 60 && x.minutes < 20 * 60 && x.dinnerFree) {
    add({ id: `ideen:${x.today}`, kind: "ideen", title: "Noch nichts zum Essen – 3 Ideen", detail: "Mit dem, was da ist", score: 56, target: { action: "ideen" }, tile: "essen", tip: true, gentle: true });
  }

  for (const t of x.urgent.slice(0, 1)) add({ id: `dringend:${t.key}`, kind: "dringend", title: `Heute wichtig: ${short(t.title)}`, detail: "Aufgaben ansehen", score: 64, target: { href: "/aufgaben" }, tile: "aufgaben", gentle: false });
  for (const t of x.dueToday.filter((d) => !x.urgent.some((u) => u.key === d.key)).slice(0, 1))
    add({ id: `frist:${t.key}`, kind: "dringend", title: `Heute dran: ${short(t.title)}`, detail: "Aufgaben ansehen", score: 60, target: { href: "/aufgaben" }, tile: "aufgaben", gentle: false });

  for (const b of x.birthdays.slice(0, 1)) {
    const name = birthdayName(b.title);
    const when = b.when === "heute" ? "Heute" : "Morgen";
    add({ id: `geburtstag:${b.date}:${b.title}`, kind: "geburtstag", title: name ? `${when} hat ${name} Geburtstag 🎂` : `${when}: ${short(b.title)} 🎂`, detail: b.when === "heute" ? "Vielleicht kurz anrufen?" : "Noch Zeit für eine Kleinigkeit", score: b.when === "heute" ? 82 : 58, target: { href: `/tag?datum=${b.date}` }, gentle: true, night: true });
  }

  if (x.sport && !night) add({ id: `sport:${x.today}`, kind: "sport", title: x.sport.today, detail: "Packliste und Wetter ansehen", score: 44, target: { href: "/sport" }, tile: "sport", gentle: true });

  // Nachmittags: auf dem Heimweg beim Laden vorbei? Was zuerst zu tun ist, steht zuerst: Ist der
  // Kochstart noch > 30 Min weg, kommt der Einkauf vor das Essen – mit dessen Zutaten fürs Essen.
  const forDish = dishLater && x.dish && !x.dish.ready ? x.dish.missing.filter((m) => !x.shop?.names.some((n) => n.toLowerCase() === m.toLowerCase())) : [];
  const shopCount = (x.shop?.names.length ?? 0) + forDish.length;
  if (x.shop && shopCount >= 2 && x.minutes >= 15 * 60 && x.minutes < 19 * 60 + 30)
    add({ id: `einkauf:${x.today}:${x.shop.shop}`, kind: "einkauf", title: `Auf dem Heimweg? ${shopCount} Sachen bei ${x.shop.shop}`, detail: short(`${x.shop.names.join(", ")}${forDish.length ? ` + ${forDish.join(", ")} fürs Essen` : ""}`, 52), score: dishLater && dishScore !== null ? dishScore + 4 : 40, target: { href: x.demo ? "/einkaufsliste" : `/einkaufsliste/laden?name=${encodeURIComponent(x.shop.shop)}` }, tile: "einkauf", tip: true, gentle: true });

  if (x.minutes >= 19 * 60 || x.minutes < 6 * 60) {
    const items = x.tomorrow.items.slice(0, 2).map((i) => (i.time ? `${clock(i.time)} ${short(i.title, 18)}` : short(i.title, 22)));
    if ((items.length || x.tomorrow.weather) && !tomorrowShown.length)
      add({ id: `morgen:${x.tomorrow.date}`, kind: "morgen", title: `${x.tomorrow.label}: ${items.length ? items.join(" · ") : "frei"}`, detail: x.tomorrow.weather ?? "Den Tag ansehen", score: night ? 60 : 46, target: { href: `/tag?datum=${x.tomorrow.date}` }, gentle: true });
  }

  if (x.allDone && !night) add({ id: `geschafft:${x.today}`, kind: "geschafft", title: "Alles geschafft für heute 🎉", detail: x.minutes >= 17 * 60 ? "Schönen Feierabend" : "Gönn dir was Schönes", score: 26, target: null, gentle: true });
  if (x.leisure && x.calm) add({ id: `freizeit:${x.today}`, kind: "freizeit", title: `Freizeit-Idee: ${short(x.leisure.text)}`, detail: "Aus deiner Freizeit-Liste", score: 27, target: { href: x.leisure.href }, gentle: true });
  if (x.region && !night) add({ id: `region:${x.region.id}`, kind: "region", title: short(`Tipp: ${x.region.title}`, 44), detail: x.region.detail, score: 38, target: { href: `/tipps?tipp=${encodeURIComponent(x.region.id)}` }, tile: "tipps", gentle: true });
  if (x.tip) add({ id: `tipp:${x.today}`, kind: "tipp", title: short(x.tip, 44), detail: "Kleiner Tipp", score: 18, target: null, gentle: true });
  if (x.weekCheck && !night) add({ id: `wochencheck:${x.weekCheck}`, kind: "wochencheck", title: "Kurzer Wochencheck?", detail: "Sag einfach alles, ich sortiere.", score: 50, target: { action: "wochencheck" }, gentle: true });
  if (x.demo) add({ id: "beispiel", kind: "beispiel", title: "Das ist ein Beispiel-Tag", detail: "Probier alles aus – tippen, abhaken, verschieben", score: 24, target: null, gentle: true, night: true });

  const ranked = c
    .filter((t) => !x.hidden.includes(t.id))
    .filter((t) => !x.calm || t.gentle)
    .filter((t) => !night || NIGHT_KINDS.includes(t.kind) || t.night)
    .map((t) => {
      // Was die Kachel direkt darunter schon zeigt, nur mit Tipp ganz oben
      const repeat = t.tile && x.firstTiles.includes(t.tile) && !t.tip ? 0.5 : 1;
      const w = Math.max(-6, Math.min(6, x.weights[t.kind] ?? 0));
      return { ...t, score: Math.round(t.score * repeat * (1 + w * 0.05) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX)
    .map(({ id, kind, title, detail, score, target }) => ({ id, kind, title, detail, score, target }));
  if (ranked.length) return ranked;
  return [{ id: `ruhig:${x.today}`, kind: "ruhig", title: night || x.minutes >= 20 * 60 ? "Heute ist es ruhig 🌙" : "Heute ist es ruhig ☀️", detail: x.weatherNow ? `Jetzt ${x.weatherNow.temp}° · ${x.weatherNow.text}` : "Ich sag Bescheid, wenn was ansteht", score: 1, target: null }];
}
