// Bausteine: Es gibt nur noch EIN Design. Zusätzliche Funktionen sind
// Bausteine, die man in den Einstellungen ("Bausteine – Was <Name> noch kann")
// oder per Gespräch an- und ausschaltet; eingeschaltet fügen sie sich in das
// neue Design ein (Abschnitte auf der Essen-Seite, Kachel auf "Heute",
// Jetzt-Karte). Daten bleiben immer erhalten – aus heißt nur ausgeblendet.
//
// Der frühere Schalter "Alte Funktionen anzeigen (Test)" und der Alt-Modus
// (/?legacy=1) sind weg.

import type { RetiredKey, StorageKey } from "@/lib/core/storage";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { createLocalStore, readRaw } from "@/lib/core/localStore";
import { loadHomeTiles, saveHomeTiles } from "@/lib/core/homeLayout";

const FEATURES = {
  wochenplan: "Wochenplan-Oberfläche (/wochenplan, Wochen-Check, Vorlagen)",
  vorrat: "Im Haus (/vorrat) und Im-Haus-Hinweise",
  rezepte: "Rezepte (/kochbuch), Kochen Schritt für Schritt",
  backen: "Backstube mit Timern (eingebaute Backrezepte, Zusammen backen)",
  ideen: "Ideen-Seite (\"Was gibt’s heute?\") – kommt mit dem Baustein Spontan-Ideen",
  spontan: "Spontan kochen – Ideen aus dem, was da ist",
  tipps: "Tipps, Twists, Gesundheits-Tipps",
  wochenendIdeen: "Wochenend-Ideen",
  kochstil: "Kochstil & Vorlieben (Plan/spontan, Das mögt ihr, Nie wieder …)",
  modi: "Wie oft sich die Assistentin meldet, Pause",
  regiontipps: "Tipps aus der Region (Veranstaltungen in der Nähe) – nur sichtbar, wenn eine Quelle läuft",
  kalender: "Kalender übernehmen: Termine aus Apple- oder Google-Kalender (Datei oder Kalender-Link)",
  mails: "Mails weiterleiten: aus weitergeleiteten Mails werden Vorschläge (nur mit Konto)",
  sport: "Sport (/sport, Kachel, Wochenziel)",
  notizen: "Notizen (/notizen, Kachel, Schnellnotiz)",
  pinnwand: "Pinnwand (/pinnwand, Kachel): Zettel und Sprachnachrichten für alle im Haushalt",
  spendentopf: "Spendentopf (/spendentopf, Kachel, Beitrags-Frage)",
  wundertuete: "Mias Wundertüte (Kachel): Witze, Plattdeutsch und Angeberwissen",
  durchatmen: "Durchatmen: 12 kurze Übungen (Atmen, Augen, Körper, Ankommen, Fokus) mit Anleitung, leises Angebot in der Jetzt-Karte",
} as const;

export type Feature = keyof typeof FEATURES;

/** Bausteine, die man selbst schalten kann – mit Satz und wo sie erscheinen */
export type Baustein = { feature: Feature; name: string; text: string; where: string; icon: string };

export const BAUSTEINE: Baustein[] = [
  { feature: "wochenplan", name: "Wochenplan", text: "Gerichte für die ganze Woche planen – mit Vorgaben und Vorlagen.", where: "Der Wochenplan steht jetzt rechts unter Essen.", icon: "calendar" },
  { feature: "vorrat", name: "Im Haus", text: "Füllt sich von selbst: Gekauftes kommt rein, Gekochtes geht raus.", where: "„Im Haus“ steht jetzt unter Essen.", icon: "fridge" },
  { feature: "rezepte", name: "Rezepte", text: "Eure eigenen Rezepte sammeln und Schritt für Schritt kochen.", where: "Eure Rezepte stehen jetzt rechts unter Essen.", icon: "book" },
  { feature: "backen", name: "Backen mit Timern", text: "20 Familien-Backrezepte, zusammen backen mit Timer und Kinder-Schritten.", where: "Backen steht jetzt rechts unter Essen.", icon: "cake" },
  { feature: "spontan", name: "Spontan-Ideen", text: "Ideen aus dem, was gerade da ist – ohne Planen.", where: "Spontan kochen steht jetzt rechts unter Essen.", icon: "carrot" },
  { feature: "tipps", name: "Tipps", text: "Ab und zu ein kleiner Küchen-Tipp – oben auf Heute.", where: "Tipps kommen ab jetzt ab und zu oben auf Heute.", icon: "bulb" },
  { feature: "wochenendIdeen", name: "Wochenend-Ideen", text: "Freitags bis sonntags eine Idee fürs Wochenende – oben auf Heute.", where: "Wochenend-Ideen kommen ab jetzt freitags bis sonntags oben auf Heute.", icon: "sun" },
  { feature: "kalender", name: "Kalender übernehmen", text: "Termine aus Apple- oder Google-Kalender holen – einmal per Datei.", where: "„Kalender übernehmen“ steht jetzt in den Einstellungen – und unten im Eintragen-Fenster.", icon: "calendarPlus" },
  { feature: "mails", name: "Mails weiterleiten", text: "Mails von Kita, Schule oder Verein weiterleiten – ich mache Vorschläge daraus.", where: "„Mails weiterleiten“ steht jetzt in den Einstellungen.", icon: "mail" },
  { feature: "kochstil", name: "Kochstil & Vorlieben", text: "Plan oder spontan, Das mögt ihr, Nie wieder, Lieblingsgerichte.", where: "Kochstil & Vorlieben stehen jetzt in den Einstellungen.", icon: "chef" },
  { feature: "sport", name: "Sport", text: "Trainings und ein Wochenziel – gezählt werden nur Wochen.", where: "Die Sport-Kachel steht jetzt auf der Startseite.", icon: "dumbbell" },
  { feature: "notizen", name: "Notizen", text: "Notizen und Listen festhalten.", where: "Notizen stehen jetzt als Kachel auf der Startseite.", icon: "note" },
  { feature: "pinnwand", name: "Pinnwand", text: "Zettel und Sprachnachrichten für alle, wie am Kühlschrank.", where: "Die Pinnwand steht jetzt als Kachel auf der Startseite.", icon: "pin" },
  { feature: "spendentopf", name: "Spendentopf", text: "Jeder Euro geht in eure Region.", where: "Der Spendentopf steht jetzt auf der Startseite.", icon: "coins" },
  { feature: "durchatmen", name: "Durchatmen", text: "Kurz raus, wieder bei dir: Atmen, Augen, Körper, Ankommen, Fokus. Ganz ohne Muss.", where: "Durchatmen findest du unter Einstellungen → Durchatmen.", icon: "wind" },
  { feature: "wundertuete", name: "Wundertüte", text: "Jeden Tag was Neues: Witze, Plattdeutsch und Angeberwissen.", where: "Die Wundertüte steht jetzt auf der Startseite.", icon: "gift" },
];

/**
 * Launch „Mia 1.0“: diese Bausteine sind ausgeblendet. Sie erscheinen nicht in
 * „Mehr Funktionen“ oder „＋ Kachel“, Mia schaltet sie nicht frei. Wer einen
 * schon nutzt, behält ihn (`launchUebernahme`). Daten bleiben immer.
 */
export const LAUNCH_AUS: Feature[] = ["regiontipps", "mails", "spendentopf"];

/** Darf der Baustein gezeigt bzw. angeboten werden? (nicht für 1.0 ausgeblendet oder schon an) */
export const launchSichtbar = (feature: Feature, on: Feature[]) => !LAUNCH_AUS.includes(feature) || on.includes(feature);

/**
 * Tipps aus der Region: eigener Baustein, nur in „Mehr Funktionen“ zu sehen,
 * wenn auf dem Server eine Quelle läuft (TIPS_SOURCE ≠ off) – deshalb nicht in
 * BAUSTEINE (die Lotte immer kennt).
 */
export const TIPS_BAUSTEIN: Baustein = {
  feature: "regiontipps",
  name: "Tipps aus der Region",
  text: "Veranstaltungen in eurer Nähe – aus dem Tourismus-Kalender Schleswig-Holstein.",
  where: "Die Tipps stehen jetzt als Kachel auf Heute und im Kalender.",
  icon: "map",
};

export const bausteinOf = (feature: Feature) => BAUSTEINE.find((b) => b.feature === feature);

/** Dauerhaft eingeschaltet – hier freischalten, was immer gebraucht wird */
const ENABLED: Partial<Record<Feature, true>> = {};

/**
 * v7: Durchatmen (A-051) ist für alle an – beim Update einmal eingeschaltet
 * (von Felix gewollte Ausnahme vom Launch-Stopp, danach selbst abschaltbar).
 * v6: Pinnwand ist ein Baustein (Kühlschranktür) – wer sie hatte, behält sie
 * (beim Update einmal an); neue Nutzer allein starten ohne (`startFresh`).
 * v5: „Im Haus“ gehört zu 1.0 – `imHaus` = beim Update einmal eingeschaltet
 * (die Kachel bleibt dabei aus, `launchUebernahme`). v4: Notizen gehören zu
 * 1.0 – beim Update einmal eingeschaltet (danach selbst abschaltbar). v3:
 * eingeschaltete Bausteine + `launch` (Übernahme für 1.0 erledigt). v2 ohne
 * `launch`, v1 hatte `legacy` und `unlocked`.
 */
type FeatureStore = { version: 7; on: Feature[]; launch: boolean; imHaus: boolean };

/**
 * Standard für neue Nutzer: Notizen, Pinnwand, Im Haus (Bereich unter Essen;
 * die Kachel nur über die Auswahl) und Mias Wundertüte (A-022, als S-Kachel –
 * von Felix gewollte Ausnahme vom Feature-Stopp) und Durchatmen (A-051, ebenso
 * gewollt; der Kreis auf der Startseite kommt mit A-050). Allein: Pinnwand aus
 * (`startFresh`). Bestehende Nutzer bekommen die Wundertüte nicht von
 * selbst (`launchSchnitt`): ihre Anordnung ändert sich nie von selbst.
 */
const DEFAULT_ON: Feature[] = ["notizen", "vorrat", "pinnwand", "wundertuete", "durchatmen"];
/** Nur für ganz neue Nutzer an (wer schon eine Startseite hat, schaltet selbst zu) */
const NUR_NEU: Feature[] = ["wundertuete"];
/** Beim Update auf v6 einmal dazu: wer die Pinnwand hatte, behält sie */
const PINNWAND_ON: Feature[] = ["pinnwand"];
/** Beim Update auf v4 einmal dazu (Im Haus kommt über `launchUebernahme`, damit die Kachel aus bleibt) */
const NOTIZEN_ON: Feature[] = ["notizen"];
/** Beim Update auf v7 einmal dazu: Durchatmen für alle (A-051) */
const DURCHATMEN_ON: Feature[] = ["durchatmen"];

const isFeature = (f: unknown): f is Feature => typeof f === "string" && f in FEATURES;

/** Was wurde schon genutzt? (für die Übernahme beim Abschalten des alten Test-Schalters) */
function usedFeatures(): Feature[] {
  const read = (key: StorageKey | RetiredKey): unknown => {
    try {
      return JSON.parse(readRaw(key) ?? "null");
    } catch {
      return null;
    }
  };
  const used: Feature[] = [];
  const plan = read("wasgibts.wochenplan") as { weeks?: Record<string, Record<string, { kind?: string }>> } | null;
  if (Object.values(plan?.weeks ?? {}).some((w) => Object.values(w ?? {}).some((e) => e?.kind === "recipe" || e?.kind === "text"))) used.push("wochenplan");
  const pantry = read("wasgibts.vorrat") as { items?: unknown[] } | null;
  if ((pantry?.items?.length ?? 0) > 0) used.push("vorrat");
  const book = read("wasgibts.kochbuch") as { recipes?: Record<string, { kind?: string }> } | null;
  const recipes = Object.values(book?.recipes ?? {});
  if (recipes.length) used.push("rezepte");
  if (recipes.some((r) => r?.kind === "backen")) used.push("backen");
  if (read("wasgibts.tippkarten")) used.push("tipps");
  if (read("wasgibts.ideen") || read("wasgibts.wuensche")) used.push("spontan");
  const profile = read("familienkueche.haushaltsprofil") as { likes?: Record<string, number>; neverAgain?: unknown[]; helperMode?: string } | null;
  if (Object.keys(profile?.likes ?? {}).length || (profile?.neverAgain?.length ?? 0) > 0) used.push("kochstil");
  if (profile?.helperMode && profile.helperMode !== "normal") used.push("modi");
  return used;
}

function migrate(raw: unknown): FeatureStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { version?: number; legacy?: unknown; unlocked?: unknown; on?: unknown };
  const list = (Array.isArray(d.on) ? d.on : []).filter(isFeature);
  const launch = (d as { launch?: unknown }).launch === true;
  const atem = (on: Feature[]) => [...new Set([...on, ...DURCHATMEN_ON])];
  const keep = (on: Feature[]) => atem([...on, ...PINNWAND_ON]);
  const imHaus = (d as { imHaus?: unknown }).imHaus === true;
  if (d.version === 7) return { version: 7, on: list, launch, imHaus };
  if (d.version === 6) return { version: 7, on: atem(list), launch, imHaus };
  if (d.version === 5) return { version: 7, on: keep(list), launch, imHaus };
  if (d.version === 4) return { version: 7, on: keep(list), launch, imHaus: false };
  if (d.version === 3 || d.version === 2) return { version: 7, on: keep([...list, ...NOTIZEN_ON]), launch: d.version === 3 && launch, imHaus: false };
  if (d.version !== 1) return null;
  // Alter Test-Schalter: wird zurückgesetzt; was genutzt wurde, wird als Baustein übernommen
  const unlocked = (Array.isArray(d.unlocked) ? d.unlocked : []).filter(isFeature);
  const used = d.legacy === true && typeof localStorage !== "undefined" ? usedFeatures() : [];
  return { version: 7, on: [...new Set([...unlocked, ...used, ...NOTIZEN_ON, ...PINNWAND_ON, ...DURCHATMEN_ON])], launch: false, imHaus: false };
}

const store = createLocalStore("wasgibts.funktionen", migrate);

// --- Abfragen ------------------------------------------------------------------------

const onList = () => store.load()?.on ?? DEFAULT_ON;

const isOn = (feature: Feature, on: Feature[]) =>
  ENABLED[feature] === true || on.includes(feature) || (feature === "ideen" && on.includes("spontan"));

/** Ist eine Funktion an? (außerhalb von React) */
export function featureOn(feature: Feature): boolean {
  return isOn(feature, onList());
}

/** Baustein an- oder ausschalten; liefert true, wenn sich etwas geändert hat */
export function setFeature(feature: Feature, on: boolean): boolean {
  const list = onList();
  if (list.includes(feature) === on) return false;
  const s = store.load();
  store.save({ version: 7, on: on ? [...list, feature] : list.filter((f) => f !== feature), launch: s?.launch ?? false, imHaus: s?.imHaus ?? false });
  return true;
}

/**
 * Baustein einschalten, weil Lotte die Funktion genutzt hat ("Alles, was
 * Lotte anlegt, muss ich sehen können"). Liefert true, wenn er vorher aus war.
 */
export function unlockFeature(feature: Feature): boolean {
  // Für 1.0 ausgeblendet: Mia schaltet es nicht frei
  if (featureOn(feature) || LAUNCH_AUS.includes(feature)) return false;
  return setFeature(feature, true);
}

/** Eingeschaltete Bausteine (`undefined` = lädt) */
export function useBausteine(): Feature[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.on ?? DEFAULT_ON);
}

/** Ist eine Funktion an? (`undefined` = lädt) */
export function useFeature(feature: Feature): boolean | undefined {
  const on = useBausteine();
  if (ENABLED[feature]) return true;
  if (on === undefined) return undefined;
  return isOn(feature, on);
}

/**
 * Einmal beim Start nach dem Update auf 1.0: Wer Sport oder den Spendentopf
 * schon nutzt (Kachel sichtbar oder Daten da), behält sie als Baustein. Neue
 * Nutzer starten ohne – Notizen sind für alle an. Danach (eigener Schritt,
 * `imHaus`): „Im Haus“ für alle an; wer den Baustein bisher nicht hatte,
 * bekommt die Kachel nicht auf die Startseite (sie stand nur unsichtbar im
 * alten Standard). @public für Tests
 */
export function launchUebernahme(read: (key: StorageKey) => string | null = readRaw) {
  launchSchnitt(read);
  imHausUebernahme();
}

function imHausUebernahme() {
  const s = store.load();
  if (s?.imHaus) return;
  const on = s?.on ?? DEFAULT_ON;
  if (!on.includes("vorrat")) {
    // Erst die Kachel aus, dann der Baustein an – so blitzt sie nie auf
    const tiles = loadHomeTiles();
    if (tiles.some((t) => t.id === "vorrat" && t.visible)) saveHomeTiles(tiles.map((t) => (t.id === "vorrat" ? { ...t, visible: false } : t)));
  }
  store.save({ version: 7, on: [...new Set([...on, "vorrat" as Feature])], launch: s?.launch ?? false, imHaus: true });
}

function launchSchnitt(read: (key: StorageKey) => string | null) {
  const s = store.load();
  if (s?.launch) return;
  const json = (key: StorageKey): unknown => {
    try {
      return JSON.parse(read(key) ?? "null");
    } catch {
      return null;
    }
  };
  const home = json("wasgibts.startseite") as { tiles?: { id?: string; visible?: boolean }[] } | { id?: string; visible?: boolean }[] | null;
  const tiles = Array.isArray(home) ? home : (home?.tiles ?? []);
  const shown = (id: string) => tiles.some((t) => t?.id === id && t.visible !== false);
  const used: Feature[] = [];
  const sport = json("wasgibts.sport") as { trainings?: unknown[] } | null;
  if (shown("sport") || (sport?.trainings?.length ?? 0) > 0) used.push("sport");
  if (shown("spendentopf")) used.push("spendentopf");
  // Ohne gespeicherte Bausteine, aber mit eigener Startseite: bestehender Nutzer – die Wundertüte bleibt aus
  const on = s?.on ?? (home ? DEFAULT_ON.filter((f) => !NUR_NEU.includes(f)) : DEFAULT_ON);
  store.save({ version: 7, on: [...new Set([...on, ...used])], launch: true, imHaus: s?.imHaus ?? false });
}
