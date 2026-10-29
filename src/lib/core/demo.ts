// Beispiel-Tag beim ersten Start: Beispiele je Haushalt auf der Startseite
// (Tafel 119: Termine, Aufgaben, Pinnwand, Einkauf, Essen mit Beispielgericht,
// Notizen, Sport, Im Haus; Wundertüte mit fester Karte), damit nichts leer aussieht. Die
// Beispiele liegen NICHT in den echten Speichern – nur die Startseite zeigt
// sie, nie Sicherung, Kalender, Push oder KI. Uhrzeiten werden beim Öffnen
// aus einem Tagesplan passend zum Wochentag gebaut (`demoDay`: Werktag,
// Samstag, Sonntag/Feiertag, je mehrere Varianten; vorbei = weg, gerade dran
// = „läuft“, ab 20 Uhr morgen; Tafel 150). Eine
// Kachel verliert ihre Beispiele beim ersten eigenen Eintrag, alle nach 3
// Tagen oder mit "Jetzt leeren".

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays, todayIso } from "@/lib/core/now";
import { weekdayIndex, type CalendarEntry } from "@/lib/kalender/model";
import { istFeiertag } from "@/lib/core/feiertage";
import type { Haushalt } from "@/lib/core/haushalt";
import type { Room } from "@/lib/core/entries";

export type DemoTile = "termine" | "aufgaben" | "pinnwand" | "einkauf" | "essen" | "notizen" | "sport" | "vorrat" | "wundertuete";
const TILES: DemoTile[] = ["termine", "aufgaben", "pinnwand", "einkauf", "essen", "notizen", "sport", "vorrat", "wundertuete"];
const DAYS = 3;

export type DemoState = {
  version: 1;
  since: string;
  cleared: DemoTile[];
  /** Abgehakt angezeigt (App kennenlernen ✓) */
  done: string[];
  /** Abgehakt und weich verschwunden */
  gone: string[];
  /** Schon gefragt: "Alle Beispiele entfernen?" */
  asked: boolean;
  /** Graue Erklärsätze unter den Kacheln ausgeblendet („Hinweise aus“, Tafel 150) – optional, alte Stände gültig */
  hinweiseAus?: boolean;
};

const store = createLocalStore("wasgibts.beispiel", (raw: unknown): DemoState | null => {
  if (!raw || typeof raw !== "object" || (raw as DemoState).version !== 1) return null;
  const d = raw as DemoState;
  if (typeof d.since !== "string") return null;
  return {
    version: 1,
    since: d.since,
    cleared: Array.isArray(d.cleared) ? d.cleared.filter((t): t is DemoTile => TILES.includes(t)) : [],
    done: Array.isArray(d.done) ? d.done.filter((x) => typeof x === "string") : [],
    gone: Array.isArray(d.gone) ? d.gone.filter((x) => typeof x === "string") : [],
    asked: d.asked === true,
    ...(d.hinweiseAus === true ? { hinweiseAus: true } : {}),
  };
});

/** Beim allerersten Start (nach "Los geht's") */
export function startDemo() {
  store.save({ version: 1, since: todayIso(), cleared: [], done: [], gone: [], asked: false });
}

/** Nur Begleitung des Beispiel-Tags: bleibt sie allein übrig, ist der Beispiel-Tag vorbei (A-022) */
const NUR_MIT: DemoTile[] = ["wundertuete"];

/** Welche Kacheln gerade Beispiele zeigen (leer = keine) */
export function demoTiles(state: DemoState | null, today: string): DemoTile[] {
  if (!state || today >= addDays(state.since, DAYS)) return [];
  const tiles = TILES.filter((t) => !state.cleared.includes(t));
  return tiles.every((t) => NUR_MIT.includes(t)) ? [] : tiles;
}

/** Eine Kachel hat jetzt Eigenes → ihre Beispiele verschwinden für immer */
export function clearDemoTile(tile: DemoTile) {
  const s = store.load();
  if (s && !s.cleared.includes(tile)) store.save({ ...s, cleared: [...s.cleared, tile] });
}

/** "Jetzt leeren": alle Beispiele weg */
export function clearDemo() {
  const s = store.load();
  if (s) store.save({ ...s, cleared: [...TILES] });
}

/** Beispiel-Aufgabe abhaken / doch nicht (nur auf der Startseite) */
export function toggleDemoDone(key: string) {
  const s = store.load();
  if (!s) return;
  store.save({ ...s, done: s.done.includes(key) ? s.done.filter((k) => k !== key) : [...s.done, key] });
}

/** Beispiel abgehakt: verschwindet (wie echte Einträge); gibt das Zurücknehmen zurück */
export function hideDemoItem(key: string): () => void {
  const s = store.load();
  if (!s) return () => {};
  store.save({ ...s, gone: [...new Set([...s.gone, key])] });
  return () => {
    const now = store.load();
    if (now) store.save({ ...now, gone: now.gone.filter((k) => k !== key) });
  };
}

/** „Hinweise aus“: die grauen Erklärsätze verschwinden (die Beispiele bleiben) */
export function hinweiseAusblenden() {
  const s = store.load();
  if (s && !s.hinweiseAus) store.save({ ...s, hinweiseAus: true });
}

/** Nach dem ersten eigenen Termin/der ersten eigenen Aufgabe: gefragt (ja oder nein) */
export function markDemoAsked() {
  const s = store.load();
  if (s && !s.asked) store.save({ ...s, asked: true });
}

/** Frage "Alle Beispiele entfernen?" zeigen: Termine oder Aufgaben haben Eigenes, andere Beispiele sind noch da */
export const askRemoveAll = (state: DemoState | null, tiles: DemoTile[]) =>
  Boolean(state && !state.asked && (state.cleared.includes("termine") || state.cleared.includes("aufgaben")) && tiles.length > 0);

export const clearDemoStore = () => store.clear();

export function useDemo(): DemoState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}

const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const entry = (id: string, typ: "termin" | "aufgabe", data: Record<string, unknown>, raum: Room = "familie"): CalendarEntry =>
  ({ id: `beispiel:${id}`, typ, raum, besitzer: "lokal", erstellt: `2000-01-01T00:0${id.slice(-1)}:00.000Z`, geaendert: "2000-01-01T00:00:00.000Z", data: { reminder: "aus", repeat: null, ...data } }) as CalendarEntry;

/** Art des Beispiel-Tags: Werktag, Samstag oder Sonntag (Feiertage wie Sonntag) */
export type DemoArt = "werktag" | "samstag" | "sonntag";

export function demoArt(date: string): DemoArt {
  const w = weekdayIndex(date);
  if (w === 6 || istFeiertag(date)) return "sonntag";
  return w === 5 ? "samstag" : "werktag";
}

/** Ein Beispiel-Termin: 1–3 Wörter, alltäglich (Tafel 150); `tipp` = zweite Zeile der Jetzt-Karte */
type DemoTermin = { id: string; title: string; at: number; tipp: string };
const h = (std: number, min = 0) => std * 60 + min;
const t = (id: string, title: string, at: number, tipp: string): DemoTermin => ({ id, title, at, tipp });

/**
 * Beispiel-Tage einer Familie (Tafel 150): je Art mehrere Varianten, damit es
 * nicht jeden Tag gleich aussieht (`variante`). Mo–Fr Kita, Schwimmen,
 * Elternabend; Sa/So Familie, Ausflug, Laternenumzug – nie Kita oder
 * Elternabend am Wochenende. Über den Tag verteilt, damit zu jeder Uhrzeit
 * noch etwas kommt.
 */
const DEMO_DAYS: Record<DemoArt, DemoTermin[][]> = {
  werktag: [
    [t("w1", "Kita", h(8), "Brotdose schon gepackt?"), t("w2", "Schwimmen", h(15), "Badesachen schon eingepackt?"), t("w3", "Zahnarzt", h(16, 30), "Karte liegt im Flur."), t("w4", "Elternabend", h(19, 30), "Ich hab die Fragen notiert.")],
    [t("w5", "Kita", h(8), "Matschhose für draußen?"), t("w6", "Kinderarzt", h(10, 30), "Impfpass liegt bereit."), t("w7", "Fußball", h(16), "Fußballschuhe im Auto?"), t("w8", "Laternen basteln", h(18), "Kleber und Papier sind da.")],
    [t("w9", "Kita", h(7, 45), "Brotdose schon gepackt?"), t("w10", "Turnen", h(14, 30), "Turnbeutel hängt an der Tür."), t("w11", "Bücherei", h(17), "Die Bücher liegen am Bett."), t("w12", "Chorprobe", h(19), "Noten liegen auf dem Klavier.")],
  ],
  samstag: [
    [t("s1", "Wochenmarkt", h(10), "Korb steht an der Tür."), t("s2", "Ausflug", h(13), "Trinkflaschen füllen?"), t("s3", "Laternenumzug", h(17), "Jacken an!"), t("s4", "Oma und Opa", h(18, 30), "Kuchen steht bereit.")],
    [t("s5", "Brötchen holen", h(9), "Beutel hängt an der Tür."), t("s6", "Fußballspiel", h(11, 30), "Trikot ist gewaschen."), t("s7", "Kindergeburtstag", h(15), "Geschenk ist eingepackt."), t("s8", "Grillen", h(18), "Kohle steht im Schuppen.")],
    [t("s9", "Flohmarkt", h(10), "Kleingeld eingesteckt?"), t("s10", "Spielplatz", h(14), "Sandspielzeug mitnehmen?"), t("s11", "Laternenumzug", h(17), "Jacken an!"), t("s12", "Pizzaabend", h(19), "Teig ruht schon.")],
  ],
  sonntag: [
    [t("o1", "Familienfrühstück", h(9, 30), "Brötchen sind im Ofen."), t("o2", "Spaziergang", h(11), "Mützen auf!"), t("o3", "Oma und Opa", h(15), "Blumen stehen bereit."), t("o4", "Pizza backen", h(18), "Teig ruht schon.")],
    [t("o5", "Brunch", h(10, 30), "Saft steht kalt."), t("o6", "Ausflug", h(13), "Trinkflaschen füllen?"), t("o7", "Kuchen backen", h(16), "Butter ist weich."), t("o8", "Spieleabend", h(19), "Die Spiele liegen bereit.")],
    [t("o9", "Frühstück", h(9, 30), "Kaffee läuft."), t("o10", "Tierpark", h(11), "Regenjacken mitnehmen?"), t("o11", "Kaffee bei Oma", h(15, 30), "Blumen stehen bereit."), t("o12", "Laternenumzug", h(18), "Jacken an!")],
  ],
};

/** Mia für alle: Beispiel-Tage für allein und zu zweit (Familie = DEMO_DAYS) */
const DEMO_DAYS_FOR: Record<Exclude<Haushalt, "familie">, Record<DemoArt, DemoTermin[][]>> = {
  allein: {
    werktag: [
      [t("a1", "Laufen", h(7, 30), "Laufschuhe stehen bereit."), t("a2", "Meeting", h(10), "Notizen liegen oben."), t("a3", "Zahnarzt", h(16), "Karte liegt im Flur."), t("a4", "Yoga", h(18, 30), "Matte ist eingepackt.")],
      [t("a5", "Schwimmen", h(7), "Badesachen schon eingepackt?"), t("a6", "Mittag mit Jana", h(12, 30), "Tisch ist bestellt."), t("a7", "Friseur", h(17), "Bild liegt auf dem Handy."), t("a8", "Kochkurs", h(19), "Schürze ist gewaschen.")],
    ],
    samstag: [[t("a9", "Brunch", h(10, 30), "Brötchen holen?"), t("a10", "Freunde treffen", h(15), "Treffpunkt ist am Markt."), t("a11", "Kino", h(20), "Karten sind auf dem Handy.")]],
    sonntag: [[t("a12", "Ausschlafen", h(9, 30), "Kaffee läuft."), t("a13", "Spaziergang", h(13), "Mütze auf!"), t("a14", "Kino", h(19, 30), "Karten sind auf dem Handy.")]],
  },
  paar: {
    werktag: [
      [t("p1", "Zahnarzt", h(9, 30), "Karte liegt im Flur."), t("p2", "Wocheneinkauf", h(18), "Liste ist fertig."), t("p3", "Kino zu zweit", h(20, 15), "Karten sind auf dem Handy.")],
      [t("p4", "Laufen", h(7, 30), "Laufschuhe stehen bereit."), t("p5", "Paket abholen", h(17), "Abholschein liegt im Flur."), t("p6", "Essen gehen", h(19, 30), "Tisch ist bestellt.")],
    ],
    samstag: [[t("p7", "Frühstück", h(9, 30), "Brötchen holen?"), t("p8", "Ostsee", h(11), "Jacken einpacken?"), t("p9", "Essen gehen", h(19), "Tisch ist bestellt.")]],
    sonntag: [[t("p10", "Langes Frühstück", h(10), "Kaffee läuft."), t("p11", "Spaziergang", h(14), "Mützen auf!"), t("p12", "Tatort", h(20, 15), "Chips liegen bereit.")]],
  },
};

/** Welche Variante heute dran ist (je Tag eine andere, auf jedem Gerät gleich) */
const variante = <T,>(liste: T[], date: string): T => liste[Math.floor(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000) % liste.length];

/** Beispiel-Termine eines Tages je Haushaltsart */
export function demoDay(date: string, haushalt: Haushalt = "familie"): DemoTermin[] {
  const art = demoArt(date);
  return variante(haushalt === "familie" ? DEMO_DAYS[art] : DEMO_DAYS_FOR[haushalt][art], date);
}

/** Beispiel-Aufgaben (Tafel 150: alltäglich, 1–3 Wörter): werktags drei, am Wochenende zwei */
const DEMO_AUFGABEN: Record<Haushalt, Record<"werktag" | "frei", string[][]>> = {
  familie: {
    werktag: [["Kita-Geld überweisen", "Geschenk für Oma", "Brotdosen spülen"], ["Elternbrief unterschreiben", "Turnbeutel waschen", "Oma anrufen"]],
    frei: [["Fahrräder aufpumpen", "Blumen gießen"], ["Laternen reparieren", "Keller aufräumen"]],
  },
  paar: {
    werktag: [["Urlaub buchen", "Mama anrufen", "Pflanzen gießen"], ["Rechnung zahlen", "Geschenk für Tom", "Fenster putzen"]],
    frei: [["Fahrräder putzen", "Blumen gießen"]],
  },
  allein: {
    werktag: [["Steuererklärung", "Jana zurückrufen", "Pflanzen gießen"], ["Rechnung zahlen", "Wäsche waschen", "Mama anrufen"]],
    frei: [["Wohnung putzen", "Blumen gießen"]],
  },
};

/** Ab 20 Uhr zeigt der Beispiel-Tag den nächsten Tag (Tafel 150) */
const MORGEN_AB = h(20);
/** So lange nach Beginn gilt ein Beispiel-Termin als „läuft“ (wie die Termine-Kachel) */
const LAEUFT_MIN = 30;

/** Kommt heute noch etwas (laufende zählen mit)? Sonst bzw. ab 20 Uhr: morgen */
const zeigtMorgen = (today: string, minutes: number, haushalt: Haushalt) => minutes >= MORGEN_AB || !demoDay(today, haushalt).some((x) => x.at + LAEUFT_MIN > minutes);

/**
 * Thema der Jetzt-Karte am Beispiel-Tag (Tafel 150): der nächste Termin, der
 * noch kommt („15 Uhr Schwimmen.“) mit einem vorbereitenden Satz darunter –
 * Zeile 1 ≤ 32 Zeichen, nie „vergiss nicht“. Ab 20 Uhr der erste von morgen.
 */
export function demoJetzt(today: string, minutes: number, haushalt: Haushalt = "familie"): { title: string; detail: string } | null {
  const morgen = zeigtMorgen(today, minutes, haushalt);
  const date = morgen ? addDays(today, 1) : today;
  const naechster = demoDay(date, haushalt).find((x) => morgen || x.at > minutes) ?? demoDay(date, haushalt).find((x) => x.at + LAEUFT_MIN > minutes);
  if (!naechster) return null;
  const uhr = naechster.at % 60 ? clock(naechster.at) : String(naechster.at / 60);
  const title = `${morgen ? "Morgen " : ""}${uhr} Uhr ${naechster.title}.`;
  // Zu lang für eine Zeile: die Uhrzeit wandert in die zweite
  if (title.length <= 32) return { title, detail: naechster.tipp };
  return { title: `${morgen ? "Morgen: " : ""}${naechster.title}.`, detail: `${uhr} Uhr. ${naechster.tipp}` };
}

/** Sport-Ring im Beispiel passend zum Wochentag (Mo 0 · Di/Mi 1 · Do/Fr 2 · Sa/So geschafft, Ziel 3) */
export function demoSportRing(date: string): { trainings: number; ziel: number } {
  const w = weekdayIndex(date);
  return { trainings: w === 0 ? 0 : w <= 2 ? 1 : w <= 4 ? 2 : 3, ziel: 3 };
}

/**
 * Beispiel-Termine und -Aufgaben, immer zur echten Uhrzeit gebaut (Tafel 150):
 * vorbei = weg, gerade dran bleibt 30 Min stehen („läuft“), ab 20 Uhr (oder
 * wenn heute nichts mehr kommt) der Plan von morgen („Morgen · Do“). Am
 * Wochenende und an Feiertagen sind die Aufgaben „diese Woche“, nie dringend.
 */
export function demoEntries(today: string, minutes: number, haushalt: Haushalt = "familie"): { date: string; tomorrow: boolean; entries: CalendarEntry[] } {
  const tomorrow = zeigtMorgen(today, minutes, haushalt);
  const date = tomorrow ? addDays(today, 1) : today;
  const termine = demoDay(date, haushalt)
    .filter((x) => tomorrow || x.at + LAEUFT_MIN > minutes)
    .map((x) => entry(x.id, "termin", { title: x.title, date, start: clock(x.at) }));
  const monday = addDays(date, -weekdayIndex(date));
  const frei = demoArt(date) !== "werktag";
  const wann = frei ? { week: monday } : { date };
  const titel = variante(DEMO_AUFGABEN[haushalt][frei ? "frei" : "werktag"], date);
  // Zu zweit ist die zweite Aufgabe „Ich“ (nur ich), sonst alle für die Familie
  const aufgaben = titel.map((x, i) => entry(`a${i + 1}`, "aufgabe", { title: x, ...wann }, haushalt === "paar" && i === 1 ? "ich" : "familie"));
  return { date, tomorrow, entries: [...termine, ...aufgaben] };
}

/** Beispiel-Einkauf nach Läden (Reihenfolge = Zeilen der Einkauf-Kachel) */
export const DEMO_SHOPS: { shop: string; names: string[] }[] = [
  { shop: "Edeka", names: ["Äpfel", "Eier", "Käse"] },
  { shop: "Rewe", names: ["Milch", "Brot", "Butter"] },
  { shop: "Lidl", names: ["Bananen", "Nudeln"] },
];

/** Beispiel „Noch ohne Laden“ auf der Seite „Einkauf“ (zwei Chips) */
export const DEMO_OHNE = ["Spinat", "Haferflocken"];
