// „Kalender mitbringen“: Wer den Kalender öffnet und noch nichts verbunden
// hat, sieht oben eine ruhige Karte „Termine schon woanders? Hol sie rein.“
// (Apple · Google · Outlook · Später). „Später“ = nach 14 Tagen noch EINMAL,
// danach nie wieder (immer erreichbar unter Einstellungen → Kalender und per
// Mia). Dazu: Link aus der Zwischenablage erkennen, Schritte je Anbieter,
// Erfolgs-Satz. Rein bis auf den kleinen Speicher `wasgibts.kalenderangebot`.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { berlinTime } from "@/lib/core/now";
import type { CalendarEntry } from "@/lib/kalender/model";

export type Anbieter = "apple" | "google" | "outlook";

export const ANBIETER: { id: Anbieter; name: string }[] = [
  { id: "apple", name: "Apple" },
  { id: "google", name: "Google" },
  { id: "outlook", name: "Outlook" },
];

export type AngebotState = { version: 1; later: string[]; done: boolean };

const EMPTY: AngebotState = { version: 1, later: [], done: false };
const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

export function migrateAngebot(raw: unknown): AngebotState | null {
  if (!raw || typeof raw !== "object" || (raw as AngebotState).version !== 1) return null;
  const r = raw as Partial<AngebotState>;
  return { version: 1, later: Array.isArray(r.later) ? r.later.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-2) : [], done: r.done === true };
}

/** Karte zeigen? „gross“ bei leerem Kalender, „klein“, wenn schon eigene Termine da sind */
export function angebotFuer(state: AngebotState, opts: { today: string; ownTermine: number; abos: number }): "gross" | "klein" | null {
  if (state.done || opts.abos > 0 || state.later.length >= 2) return null;
  if (state.later.length === 1 && days(state.later[0], opts.today) < 14) return null;
  return opts.ownTermine > 0 ? "klein" : "gross";
}

export const laterAngebot = (s: AngebotState, today: string): AngebotState => ({ ...s, later: [...s.later, today].slice(-2) });

/**
 * Ein Kalender-Link in einem Text (Zwischenablage, eingefügt): webcal://,
 * oder https mit .ics/iCal/Kalender-Anbieter. Sonst null.
 */
export function kalenderLink(text: string): string | null {
  const m = text.match(/(webcals?|https?):\/\/[^\s"'<>]+/i);
  if (!m) return null;
  const url = m[0].replace(/[).,;]+$/, "");
  if (/^webcals?:/i.test(url)) return url;
  return /\.ics(\?|$)|ical|calendar\.google\.com|outlook\.(live|office|office365)\.com|icloud\.com|kalender\.test/i.test(url) ? url : null;
}

/** Wer etwas sagt wie „Hol meinen Google-Kalender rein“: welcher Anbieter? */
export function anbieterIn(text: string): Anbieter | null {
  const t = text.toLowerCase();
  if (/google|gmail/.test(t)) return "google";
  if (/outlook|microsoft|office/.test(t)) return "outlook";
  if (/apple|icloud|iphone|ipad|mac/.test(t)) return "apple";
  return null;
}

export type Schritt = { text: string; icon: "einstellungen" | "kalender" | "info" | "schalter" | "teilen" | "kopieren" | "computer" | "link" };

/** Ein Schritt pro Bildschirm (der letzte: Link einfügen) */
export const SCHRITTE: Record<Anbieter, Schritt[]> = {
  apple: [
    { icon: "kalender", text: "Öffne die Kalender-App und tippe unten auf „Kalender“." },
    { icon: "info", text: "Tippe auf das ⓘ neben deinem Kalender." },
    { icon: "schalter", text: "Schalte „Öffentlicher Kalender“ ein." },
    { icon: "teilen", text: "Tippe auf „Link teilen …“ → „Kopieren“ und komm zurück." },
  ],
  google: [
    { icon: "computer", text: "Das geht nur am Computer oder in der Web-Version: calendar.google.com öffnen." },
    { icon: "einstellungen", text: "Oben rechts aufs Zahnrad → „Einstellungen“, links deinen Kalender wählen." },
    { icon: "kopieren", text: "Unter „Kalender integrieren“ die „Privatadresse im iCal-Format“ kopieren." },
  ],
  outlook: [
    { icon: "computer", text: "outlook.com im Browser öffnen → Zahnrad → „Kalender“." },
    { icon: "teilen", text: "„Freigegebene Kalender“ → „Kalender veröffentlichen“, Kalender wählen." },
    { icon: "kopieren", text: "Den ICS-Link kopieren und hier einfügen." },
  ],
};

/** Kurz und ehrlich, was passiert */
export const HINWEIS_GEHEIM = "Der Link ist geheim. Wer ihn hat, kann die Termine sehen. Gib ihn nicht weiter.";
export const HINWEIS_RICHTUNG = "Termine von dort erscheinen bei mir. Was du hier einträgst, bleibt erst mal nur hier.";

/** Mail an sich selbst, um es am Computer zu machen */
export function mailAnMich(anbieter: Anbieter, app: string): string {
  const steps = SCHRITTE[anbieter].map((s, i) => `${i + 1}. ${s.text}`).join("\n");
  const subject = `${app}: Kalender verbinden`;
  const body = `${steps}\n\nDanach den Link in ${app} unter Einstellungen → Kalender einfügen.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Wie viele Termine in den nächsten 4 Wochen (für den Erfolgs-Satz) */
export function termineIn4Wochen(entries: CalendarEntry[], today: string): number {
  const end = new Date(Date.parse(`${today}T12:00:00Z`) + 28 * DAY).toISOString().slice(0, 10);
  return entries.filter((e) => e.typ === "termin" && e.data.date >= today && e.data.date < end).length;
}

/** „Steht drin. 23 Termine in den nächsten 4 Wochen.“ */
export const erfolgsSatz = (count: number) =>
  count === 0 ? "Steht drin. In den nächsten 4 Wochen ist dort gerade nichts." : `Steht drin. ${count} ${count === 1 ? "Termin" : "Termine"} in den nächsten 4 Wochen.`;

/** „zuletzt aktualisiert 10:12“ (heute) bzw. „… am 21.10.“ */
export function refreshedLabel(fetchedAt: string, today: string): string {
  const t = berlinTime(new Date(fetchedAt));
  return t.iso === today ? `zuletzt aktualisiert ${t.clock}` : `zuletzt aktualisiert am ${Number(t.iso.slice(8, 10))}.${Number(t.iso.slice(5, 7))}.`;
}

// --- Speicher ---------------------------------------------------------------

const store = createLocalStore("wasgibts.kalenderangebot", migrateAngebot);
const loadAngebot = () => store.load() ?? EMPTY;
export const changeAngebot = (change: (s: AngebotState) => AngebotState) => store.save(change(loadAngebot()));

export function useAngebot(): AngebotState | undefined {
  const s = useExternalStore(store.subscribe, store.load, () => undefined);
  return s === undefined ? undefined : (s ?? EMPTY);
}

// --- Öffnen von überall (Mia: „Hol meinen Google-Kalender rein“) ------------

const EVENT = "mia:kalender-mitbringen";
let pending: Anbieter | null = null;
let listening = 0;

/** Schritte für einen Anbieter öffnen (wartet, bis eine Seite zuhört) */
export function openMitbringen(anbieter: Anbieter) {
  if (!listening) {
    pending = anbieter;
    return;
  }
  window.dispatchEvent(new CustomEvent<Anbieter>(EVENT, { detail: anbieter }));
}

export function onOpenMitbringen(listener: (a: Anbieter) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<Anbieter>).detail);
  window.addEventListener(EVENT, handler);
  listening++;
  if (pending) {
    const a = pending;
    pending = null;
    listener(a);
  }
  return () => {
    window.removeEventListener(EVENT, handler);
    listening--;
  };
}
