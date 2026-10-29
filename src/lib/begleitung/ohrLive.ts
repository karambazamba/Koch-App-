// Mias Ohr live: eine Zuhör-Runde über ElevenLabs Realtime (ohne React, alles
// von außen hereingereicht – getestet in tests/begleitung/ohrLive.test.ts).
// Ablauf: Einmal-Schlüssel holen und Mikrofon an (gleichzeitig), Ton wird
// gepuffert, bis der Websocket steht – das erste Wort geht nie verloren. Seit
// A-056 läuft das Mikrofon schon beim Antippen (`ohrPuffer.ts`, Vorlauf): die
// Runde bekommt dann zuerst den ganzen Anfang, danach live.
// Vorläufiger Text kommt live auf die Bühne; das Satzende erkennt ElevenLabs
// (VAD, 1,2 s Stille) und der fertige Satz geht sofort an Mia. Antippen
// schließt den Satz von Hand ab. Ring nach 0,6 s ohne neue Wörter; höchstens
// 20 s ohne neue Wörter, dann abgeschickt; nichts gesagt → nach 8 s leise aus.
// Klappt Schlüssel oder Verbindung nicht, meldet die Runde „verbindung“ und
// `useSpeechInput` hört über den Browser weiter. Der Ton wird nur gestreamt,
// nie gespeichert; ins Protokoll kommen nur Technik-Zahlen.

import { BUEHNE_MAX_MS, NICHTS_MS } from "@/lib/begleitung/mitschrift";
import {
  LIVE_COMMIT_WARTEN_MS,
  LIVE_OHNE_WORTE_MS,
  LIVE_RATE,
  LIVE_RING_MS,
  LIVE_STUECK,
  LIVE_VERBINDEN_MS,
  Umrechner,
  liesNachricht,
  liveAdresse,
  tonNachricht,
} from "@/lib/begleitung/echtzeitProtokoll";
import { Ringpuffer, verbinden, zeitenZeile } from "@/lib/begleitung/ohrPuffer";

/** Das Nötigste eines Websockets (im Test nachgestellt) */
export type LiveSocket = {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number) => void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
};

export type LiveMikro = {
  stoppen: () => void;
  /** Läuft die Ton-Verarbeitung? (false = vom Browser angehalten, kein Mikro-Problem) */
  laeuft?: () => boolean;
};

export type LiveDeps = {
  /** Einmal-Schlüssel vom eigenen Server (null = geht nicht) */
  token: () => Promise<{ token: string; modell: string } | null>;
  /** Mikrofon an; `ton` bekommt Werte (−1…1) und deren Abtastrate. Wirft mit dem Fehlernamen. */
  mikro: (ton: (werte: Float32Array, rate: number) => void) => Promise<LiveMikro>;
  socket: (url: string) => LiveSocket;
  log: (text: string) => void;
  uhr: () => number;
  /** Wann getippt wurde (Uhr wie `uhr`; Standard: Beginn der Runde) – fürs Mikro-Protokoll */
  tippenAm?: number;
  /** Wann der erste Ton kam (Vorlauf) – sonst misst die Runde selbst */
  mikroAm?: () => number | null;
};

type LiveEnde = "satz" | "tippen" | "ohneWorte" | "lang" | "abbruch" | "nichts";

export type LiveRueck = {
  /** Live-Text: alles bisher (fertig + vorläufig) und der vorläufige Teil */
  text: (ganz: string, vorlaeufig: string) => void;
  /** Ring „Gleich schick ich’s ab“ */
  wartet: (an: boolean) => void;
  /** Runde vorbei: der ganze Satz ("" = nichts gesagt), Grund und gestreamte Sekunden */
  fertig: (text: string, info: { ende: LiveEnde; sekunden: number }) => void;
  /** Ging nicht: „verbindung“ (→ Browser) oder „mikro“ mit dem Fehlernamen */
  fehler: (art: "verbindung" | "mikro", name: string) => void;
};

export type LiveRunde = { stoppen: () => void; abbrechen: () => void };

/** Kommt nach dem Mikrofon so lange kein Ton, ist es belegt (Mikro-Wachhund) */
export const LIVE_WACHE_MS = 1500;

const OFFEN = 1;

export function ohrLiveStarten(rueck: LiveRueck, d: LiveDeps): LiveRunde {
  let vorbei = false;
  let bereit = false;
  let ws: LiveSocket | null = null;
  let mikro: LiveMikro | null = null;
  let umrechner: Umrechner | null = null;
  let tonDa = false;
  // Vor der Verbindung höchstens ~10 s puffern (Ringpuffer: der Anfang fällt erst danach raus)
  let puffer = new Ringpuffer<Int16Array>(LIVE_RATE * 10);
  let gesendet = 0;
  let fertigTeile = "";
  let teil = "";
  let wartet = false;
  let tippen = false;
  const beginn = d.uhr();
  const tippenAm = d.tippenAm ?? beginn;
  let eigenesMikroAm: number | null = null;
  let verbundenAm: number | null = null;
  let zeitenGemeldet = false;
  const timer = new Map<string, ReturnType<typeof setTimeout>>();

  const stell = (name: string, ms: number, fn: () => void) => {
    const alt = timer.get(name);
    if (alt) clearTimeout(alt);
    timer.set(
      name,
      setTimeout(() => {
        timer.delete(name);
        if (!vorbei) fn();
      }, ms),
    );
  };
  const ganz = () => [fertigTeile, teil].filter(Boolean).join(" ").trim();

  const aufraeumen = () => {
    vorbei = true;
    timer.forEach(clearTimeout);
    timer.clear();
    mikro?.stoppen();
    mikro = null;
    const s = ws;
    ws = null;
    if (s) {
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try {
        s.close(1000);
      } catch {
        // schon zu
      }
    }
    puffer = new Ringpuffer<Int16Array>(0);
  };

  /** Tippen → Mikro an → Verbindung → erstes Wort, einmal je Runde ins Protokoll */
  const zeitenMelden = (wort: number | null) => {
    if (zeitenGemeldet) return;
    zeitenGemeldet = true;
    const mikroAm = d.mikroAm?.() ?? eigenesMikroAm;
    d.log(zeitenZeile({ mikro: mikroAm === null ? null : mikroAm - tippenAm, verbunden: verbundenAm === null ? null : verbundenAm - tippenAm, erstesWort: wort === null ? null : wort - tippenAm }));
  };

  const fertig = (ende: LiveEnde, text = ganz()) => {
    if (vorbei) return;
    zeitenMelden(null);
    aufraeumen();
    if (wartet) rueck.wartet(false);
    const sekunden = Math.round((gesendet / LIVE_RATE) * 10) / 10;
    d.log(`Ohr live: ${ende}, ${sekunden} s gestreamt, ${Math.round(d.uhr() - beginn)} ms`);
    rueck.fertig(text, { ende, sekunden });
  };

  const fehler = (art: "verbindung" | "mikro", name: string) => {
    if (vorbei) return;
    aufraeumen();
    if (wartet) rueck.wartet(false);
    d.log(`Ohr live: ${art === "mikro" ? `Mikrofon ${name}` : `keine Verbindung (${name})`}`);
    rueck.fehler(art, name);
  };

  const ring = (an: boolean) => {
    if (an === wartet) return;
    wartet = an;
    rueck.wartet(an);
  };

  const senden = (pcm: Int16Array, commit = false) => {
    if (!ws || ws.readyState !== OFFEN) return false;
    try {
      ws.send(tonNachricht(pcm, commit));
      gesendet += pcm.length;
      return true;
    } catch {
      return false;
    }
  };

  /** Gepufferten Ton in ~100-ms-Stücken losschicken */
  const abschicken = (alles = false) => {
    if (!bereit || (!alles && puffer.laenge < LIVE_STUECK)) return;
    if (!puffer.laenge) return;
    senden(verbinden(puffer.entnehmen()));
  };

  const neueWoerter = () => {
    ring(false);
    stell("ring", LIVE_RING_MS, () => ganz() && ring(true));
    stell("ohneWorte", LIVE_OHNE_WORTE_MS, () => {
      d.log("Ohr live: 20 s ohne neue Wörter, abgeschickt");
      stoppen();
    });
  };

  const nachricht = (raw: unknown) => {
    const e = liesNachricht(raw);
    if (e.art === "bereit") {
      if (bereit) return;
      bereit = true;
      verbundenAm = d.uhr();
      d.log(`Ohr live: verbunden nach ${Math.round(verbundenAm - beginn)} ms`);
      abschicken(true);
    } else if (e.art === "teil") {
      if (e.text === teil) return;
      teil = e.text;
      if (teil) {
        zeitenMelden(d.uhr());
        neueWoerter();
      }
      rueck.text(ganz(), teil);
    } else if (e.art === "satz") {
      if (e.text) {
        fertigTeile = [fertigTeile, e.text].filter(Boolean).join(" ");
        teil = "";
        // Satzende von ElevenLabs (VAD) bzw. nach dem Antippen: sofort an Mia
        fertig(tippen ? "tippen" : "satz");
      } else if (tippen) fertig("tippen");
      // leerer Satz ohne Antippen (Geräusch): einfach weiter zuhören
    } else if (e.art === "fehler") {
      if (ganz()) fertig("abbruch");
      else fehler("verbindung", e.grund);
    }
  };

  function stoppen() {
    if (vorbei) return;
    if (!bereit || !ws) return fertig("tippen");
    tippen = true;
    abschicken(true);
    if (!senden(new Int16Array(0), true)) return fertig("tippen");
    stell("commit", LIVE_COMMIT_WARTEN_MS, () => fertig("tippen"));
  }

  // Mikrofon und Schlüssel gleichzeitig – der Ton wartet im Puffer
  stell("verbinden", LIVE_VERBINDEN_MS, () => !bereit && fehler("verbindung", "zeit"));
  stell("nichts", NICHTS_MS, () => !ganz() && fertig("nichts", ""));
  stell("lang", BUEHNE_MAX_MS, () => {
    d.log("Ohr live: 2 Minuten am Stück, abgeschickt");
    stoppen();
  });

  d.mikro((werte, rate) => {
    if (vorbei) return;
    if (!tonDa) eigenesMikroAm = d.uhr();
    tonDa = true;
    umrechner ??= new Umrechner(rate);
    const pcm = umrechner.push(werte);
    if (!pcm.length) return;
    puffer.push(pcm);
    abschicken();
  })
    .then((m) => {
      if (vorbei) return m.stoppen();
      mikro = m;
      stell("wache", LIVE_WACHE_MS, () => {
        if (tonDa) return;
        // Angehaltene Ton-Verarbeitung ist kein belegtes Mikro: dann lieber über den Browser
        if (m.laeuft?.() === false) fehler("verbindung", "ton");
        else fehler("mikro", "belegt");
      });
    })
    .catch((e: unknown) => fehler("mikro", e instanceof Error ? e.name : "Error"));

  d.token()
    .then((t) => {
      if (vorbei) return;
      if (!t) return fehler("verbindung", "schluessel");
      let s: LiveSocket;
      try {
        s = d.socket(liveAdresse(t.token, t.modell));
      } catch {
        return fehler("verbindung", "socket");
      }
      ws = s;
      s.onmessage = (e) => !vorbei && nachricht(e.data);
      s.onerror = () => {
        if (vorbei) return;
        if (ganz()) fertig("abbruch");
        else fehler("verbindung", "socket");
      };
      s.onclose = () => {
        if (vorbei) return;
        if (tippen || ganz()) fertig(tippen ? "tippen" : "abbruch");
        else fehler("verbindung", "zu");
      };
    })
    .catch(() => fehler("verbindung", "schluessel"));

  return {
    stoppen,
    abbrechen: () => {
      if (vorbei) return;
      aufraeumen();
    },
  };
}
