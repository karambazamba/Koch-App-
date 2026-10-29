// Mias Ohr verliert kein Wort (A-056, rein – getestet in
// tests/begleitung/hoertSofort.test.ts): Beim Antippen läuft das Mikrofon
// SOFORT an und alles landet in einem Ringpuffer (die letzten 8 s), noch
// bevor Schlüssel, Verbindung oder Weg feststehen. Wer zuhört (live, eigene
// Aufnahme), „nimmt“ den Vorlauf: erst kommt der ganze Puffer der Reihe nach,
// dann geht es live weiter. Der Puffer läuft immer mit – scheitert live, kann
// die eigene Aufnahme ihn übernehmen, ohne dass der Anfang fehlt. Der Ton
// bleibt nur im Arbeitsspeicher und wird nie abgelegt. Ins Mikro-Protokoll
// kommen nur Zeiten: Tippen → Mikro an → Verbindung → erstes Wort.

import type { LiveMikro } from "@/lib/begleitung/ohrLive";

/** So viel Ton hält der Ringpuffer (mindestens 5 s laut Auftrag) */
export const PUFFER_MS = 8000;
/** Ein Vorlauf, den niemand nimmt (Bühne hört doch nicht zu), geht nach so langer Zeit leise aus */
export const VORLAUF_LIEGEN_MS = 5000;
/** Ab diesem Effektivwert klingt der Puffer nach Sprache (wie `lauschen.ts`) */
const LAUT_AB = 0.02;

/** Ringpuffer aus Stücken: hält höchstens `max` Werte, das Älteste fällt zuerst raus */
export class Ringpuffer<T extends { length: number }> {
  private stuecke: T[] = [];
  private werte = 0;
  /** So viele Werte sind schon herausgefallen (für das Protokoll: 0 = nichts verloren) */
  verworfen = 0;
  constructor(private max: number) {}

  push(s: T) {
    if (!s.length) return;
    this.stuecke.push(s);
    this.werte += s.length;
    while (this.werte > this.max && this.stuecke.length > 1) {
      const alt = this.stuecke.shift()!;
      this.werte -= alt.length;
      this.verworfen += alt.length;
    }
  }

  get laenge() {
    return this.werte;
  }

  /** Alles der Reihe nach (bleibt drin) */
  alle(): readonly T[] {
    return this.stuecke;
  }

  /** Alles der Reihe nach herausnehmen */
  entnehmen(): T[] {
    const s = this.stuecke;
    this.stuecke = [];
    this.werte = 0;
    return s;
  }

  /** Grenze ändern (z. B. sobald die Abtastrate bekannt ist) */
  grenze(max: number) {
    this.max = max;
  }
}

/** Int16-Stücke aneinanderhängen */
export function verbinden(stuecke: readonly Int16Array[]): Int16Array {
  const n = stuecke.reduce((s, p) => s + p.length, 0);
  const out = new Int16Array(n);
  let o = 0;
  for (const p of stuecke) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** PCM 16 Bit mono → WAV (für die eigene Aufnahme an `/api/hoeren`, scribe_v1 versteht das) */
export function pcmZuWav(pcm: Int16Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length * 2);
  const v = new DataView(out.buffer);
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i], true);
  return out;
}

/** Zeiten einer Runde (ms seit Tippen; null = kam nicht) */
export type OhrZeiten = { mikro: number | null; verbunden: number | null; erstesWort: number | null };

/** „Ohr: Tippen→Mikro 120 ms · →Verbindung 450 ms · →erstes Wort 900 ms“ (nur Zahlen, nie Inhalt) */
export function zeitenZeile(z: OhrZeiten, weg = "live"): string {
  const ms = (x: number | null) => (x === null ? "–" : `${Math.max(0, Math.round(x))} ms`);
  return `Ohr (${weg}): Tippen→Mikro ${ms(z.mikro)} · →Verbindung ${ms(z.verbunden)} · →erstes Wort ${ms(z.erstesWort)}`;
}

type Ton = (werte: Float32Array, rate: number) => void;

export type Vorlauf = {
  /** Zeitpunkt des Tippens (Uhr des Vorlaufs) */
  readonly gestartetAm: number;
  /** Wann der erste Ton kam (null = noch keiner) */
  mikroAm: () => number | null;
  /**
   * Zuhören übernimmt: erst der ganze Puffer der Reihe nach an `ton`, dann
   * live. Erfüllt sich, sobald das Mikrofon läuft (wirft mit dessen Fehler).
   * `stoppen` der Antwort lässt nur los – das Mikro läuft weiter, bis der
   * Besitzer `stoppen` am Vorlauf ruft.
   */
  nehmen: (ton: Ton) => Promise<LiveMikro>;
  /** Nicht mehr weiterreichen, aber weiter puffern (z. B. live → eigene Aufnahme) */
  loslassen: () => void;
  /** Mikro aus, Puffer weg */
  stoppen: () => void;
  aktiv: () => boolean;
  /** Ist im Puffer etwas, das nach Sprache klingt? */
  lautGehoert: () => boolean;
  /** Sobald wirklich Ton kommt (sofort, wenn schon) – für Ring und „bereit“-Ton */
  beiBereit: (fn: () => void) => void;
  /** Läuft die Ton-Verarbeitung? (false = vom Browser angehalten) */
  laeuft: () => boolean | undefined;
  /** Werte, die aus dem Ringpuffer gefallen sind (0 = nichts verloren) */
  verworfen: () => number;
};

export type VorlaufDeps = {
  /** Mikrofon an (wie `LiveDeps.mikro`): Werte −1…1 und Abtastrate */
  mikro: (ton: Ton) => Promise<LiveMikro>;
  uhr: () => number;
  log?: (text: string) => void;
  /** Liegt der Vorlauf so lange ungenommen, geht er aus (Standard 5 s) */
  liegenMs?: number;
};

/** Mikrofon sofort an und puffern – im Antippen aufrufen */
export function vorlaufStarten(d: VorlaufDeps): Vorlauf {
  const gestartetAm = d.uhr();
  let mikroAm: number | null = null;
  let rate = 48_000;
  const puffer = new Ringpuffer<Float32Array>((rate * PUFFER_MS) / 1000);
  let abnehmer: Ton | null = null;
  let genommen = false;
  let vorbei = false;
  let laut = false;
  let mikro: LiveMikro | null = null;
  const bereitFns: (() => void)[] = [];

  const stoppen = () => {
    if (vorbei) return;
    vorbei = true;
    clearTimeout(liegen);
    abnehmer = null;
    puffer.entnehmen();
    mikro?.stoppen();
    mikro = null;
  };
  const liegen = setTimeout(() => {
    if (genommen || vorbei) return;
    d.log?.("Ohr: Vorlauf nicht gebraucht, aus");
    stoppen();
  }, d.liegenMs ?? VORLAUF_LIEGEN_MS);

  const an = d
    .mikro((werte, r) => {
      if (vorbei) return;
      if (mikroAm === null) {
        mikroAm = d.uhr();
        if (r !== rate) {
          rate = r;
          puffer.grenze((rate * PUFFER_MS) / 1000);
        }
        d.log?.(`Ohr: Mikro an nach ${Math.round(mikroAm - gestartetAm)} ms`);
        bereitFns.splice(0).forEach((fn) => fn());
      }
      if (!laut) {
        let s = 0;
        for (let i = 0; i < werte.length; i++) s += werte[i] * werte[i];
        laut = werte.length > 0 && Math.sqrt(s / werte.length) > LAUT_AB;
      }
      puffer.push(werte);
      abnehmer?.(werte, r);
    })
    .then((m) => {
      if (vorbei) {
        m.stoppen();
        return m;
      }
      mikro = m;
      return m;
    });
  // Ein Fehler kommt bei `nehmen` an; ungenommen nur leise aus
  an.catch(() => stoppen());

  return {
    gestartetAm,
    mikroAm: () => mikroAm,
    nehmen: (ton) => {
      genommen = true;
      clearTimeout(liegen);
      // Erst der Puffer (der Anfang!), dann live
      for (const s of puffer.alle()) ton(s, rate);
      abnehmer = ton;
      return an.then((m) => ({ stoppen: () => (abnehmer === ton ? (abnehmer = null) : undefined), laeuft: m.laeuft }));
    },
    loslassen: () => {
      abnehmer = null;
    },
    stoppen,
    aktiv: () => !vorbei,
    lautGehoert: () => laut,
    beiBereit: (fn) => {
      if (mikroAm !== null) fn();
      else bereitFns.push(fn);
    },
    laeuft: () => mikro?.laeuft?.(),
    verworfen: () => puffer.verworfen,
  };
}
