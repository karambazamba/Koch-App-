// Mitschrift beim Zuhören (rein, getestet in tests/begleitung/mitschrift.test.ts):
// Die Spracherkennung meldet Ergebnisse je Position (fertig oder vorläufig).
// Damit nichts verloren geht:
// - Beginnt der Browser die Ergebnisliste neu (Position 0 mit anderem Text,
//   Safari bei langem Sprechen), wird das Bisherige gesichert statt
//   überschrieben.
// - Startet die Erkennung nach einer Pause neu, wandern fertige UND
//   vorläufige Teile in die Sicherung.
// - Am Ende zählt immer alles: fertige Teile plus der letzte unfertige.
// - Nie doppelt: iOS liefert Unfertiges kumuliert (samt dem schon Fertigen),
//   Neustarts wiederholen den Anfang. `zusammen` legt nur den neuen Rest an,
//   wenn der neue Teil mit dem ganzen vorigen Abschnitt (oder mit dessen Ende,
//   ab 2 Wörtern) beginnt – echte Wiederholungen („Milch, Milch und Eier“)
//   bleiben.

export type Ergebnis = { isFinal: boolean; text: string };
export type Mitschrift = { gesichert: string[]; finals: string[]; pending: string };

const norm = (s: string) => s.trim().replace(/\s+/g, " ");
const lower = (s: string) => norm(s).toLowerCase();

export const neueMitschrift = (): Mitschrift => ({ gesichert: [], finals: [], pending: "" });

const words = (s: string) => norm(s).split(" ").filter(Boolean);
/** Wort zum Vergleichen: ohne Groß/Klein und Satzzeichen */
const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const same = (a: string[], b: string[]) => a.length === b.length && a.every((w, i) => w === b[i]);

/**
 * Zwei Teile ohne Doppeltes zusammenfügen: Beginnt `neu` mit dem ganzen
 * `alt`, zählt `neu`; ist `neu` nur der Anfang von `alt`, zählt `alt`;
 * beginnt `neu` mit dem Ende von `alt` (mindestens 2 Wörter), kommt nur der
 * Rest dazu. Sonst einfach hintereinander.
 */
export function zusammen(alt: string, neu: string): string {
  const a = words(alt);
  const b = words(neu);
  if (!a.length || !b.length) return [...a, ...b].join(" ");
  const ka = a.map(key);
  const kb = b.map(key);
  if (kb.length >= ka.length && same(kb.slice(0, ka.length), ka)) return b.join(" ");
  if (ka.length > kb.length && same(ka.slice(0, kb.length), kb)) return a.join(" ");
  for (let k = Math.min(ka.length, kb.length) - 1; k >= 2; k--) if (same(ka.slice(-k), kb.slice(0, k))) return [...a, ...b.slice(k)].join(" ");
  return [...a, ...b].join(" ");
}

/**
 * Fertige Abschnitte zu einem Text zusammensetzen. Manche Geräte (Android
 * Chrome) liefern fertige Abschnitte kumuliert ("Milch", "Milch und Eier") –
 * dann zählt nur der längere (`zusammen`).
 */
export function joinFinals(finals: string[]): string {
  return finals.reduce((text, f) => zusammen(text, f ?? ""), "");
}

/** Neuer Text an Position 0 setzt den alten nicht fort? (Liste neu begonnen) */
const neuBegonnen = (alt: string, neu: string) => {
  const a = lower(alt);
  const n = lower(neu);
  return Boolean(a) && Boolean(n) && !n.startsWith(a) && !a.startsWith(n);
};

/** Ein Ergebnis-Ereignis der Erkennung einarbeiten */
export function mitErgebnis(m: Mitschrift, resultIndex: number, results: Ergebnis[]): Mitschrift {
  let { gesichert, finals } = m;
  const first = results[0];
  // Liste neu begonnen: an Position 0 steht nicht mehr der fertige Text von vorher
  if (resultIndex === 0 && first && finals[0] !== undefined && neuBegonnen(finals[0], first.text)) {
    gesichert = [...gesichert, joinFinals(finals)];
    finals = [];
  }
  finals = [...finals];
  let pending = "";
  for (let i = resultIndex; i < results.length; i++) {
    const r = results[i];
    if (r.isFinal) finals[i] = r.text;
    else pending += r.text;
  }
  return { gesichert, finals, pending: norm(pending) };
}

/** Die Erkennung startet nach einer Pause neu: alles Bisherige (auch Unfertiges) sichern */
export function mitNeustart(m: Mitschrift): Mitschrift {
  const bisher = zusammen(joinFinals(m.finals.filter((f) => f !== undefined)), m.pending);
  return { gesichert: bisher ? [...m.gesichert, bisher] : m.gesichert, finals: [], pending: "" };
}

/** Text der Mitschrift – `mitUnfertig`: auch der letzte, noch nicht fertige Teil */
export function mitschriftText(m: Mitschrift, mitUnfertig = true): string {
  const fertig = joinFinals([...m.gesichert, ...m.finals.filter((f) => f !== undefined)]);
  return mitUnfertig ? zusammen(fertig, m.pending) : fertig;
}

/** Wurde in dieser Mitschrift schon etwas gesagt? */
export const etwasGesagt = (m: Mitschrift) => mitschriftText(m).length > 0;

/**
 * Text einer neuen Aufnahme ohne den eben schon abgeschickten Text davor
 * (manche Browser liefern ihn in der nächsten Sitzung erneut mit: "alt neu").
 * Nur, wenn der vorige Text gerade eben abgeschickt wurde und aus mehr als
 * einem Wort besteht – „Okay“ oder „Ja“ allein werden nie abgeschnitten.
 */
export function withoutPrevious(text: string, previous: string, seitMs = 0): string {
  const t = norm(text);
  const p = norm(previous);
  if (!p || p.split(" ").length < 2 || seitMs > FRISCH_MS) return t;
  if (t.length > p.length && t.toLowerCase().startsWith(`${p.toLowerCase()} `)) return t.slice(p.length).trim();
  return t;
}

/** So lange gilt der eben abgeschickte Text als „gerade eben“ */
const FRISCH_MS = 8000;
/**
 * Abschicken nach so viel Stille nach dem letzten erkannten Wort (Auftrag
 * „Mia schneller“: 1,2 s statt 2,5 s). Spricht man nach einer Denkpause
 * innerhalb von `NACHKLAPP_MS` weiter, hängt die Fortsetzung an (`nachklapp.ts`).
 */
export const STILLE_MS = 1200;
/** Ab dann zeigt Mia, dass sie gleich abschickt (Ring läuft ab, 0,8 s) */
export const WARTEN_AB_MS = 400;
/** Längstens so lange am Stück zuhören (Bühne) */
export const BUEHNE_MAX_MS = 2 * 60_000;
/** Hat bis dahin niemand etwas gesagt, hört Mia leise wieder auf */
export const NICHTS_MS = 8000;
