// Spracherkennung des Browsers (Web Speech API, Deutsch) ohne React – der
// Hook `useSpeechInput` verdrahtet nur noch die Anzeige. So lässt sich das
// Selbstheilen testen (tests/begleitung/spracherkennung.test.ts):
// - Jede Erkennung wird nur EINMAL benutzt; alte immer ohne Rückrufe und mit
//   abort() weg (`detach`).
// - Wachhund: Nach start() muss in 1,5 s onstart/onaudiostart (oder ein
//   Ergebnis) kommen. Sonst hart abbrechen, Mikro frei, EINMAL still mit neuer
//   Erkennung neu starten; klappt auch das nicht: „Hat grad nicht geklappt.
//   Nochmal?“ und der Knopf ist wieder bereit (iPhone hängt nach ein paar
//   Runden, ohne dass start() wirft).
// - Kommt nach „Fertig“ kein onend, wird nach 2 s selbst abgeschlossen;
//   hängt eine Aufnahme länger als erlaubt (Bühne 2 Min., lang 5 Min.), wird
//   sie beendet und abgeschickt, was da ist.
// - Notausgang: Antippen bei hängendem Zustand setzt alles zurück und hört
//   neu zu – die App muss nie neu gestartet werden.
// Die Mitschrift (`mitschrift.ts`) sorgt dafür, dass nichts verloren geht.

import { claimMic, classifyMicError, micPlatform, micSettleWait, releaseMic, reportMicBlocked } from "@/lib/core/mic";
import { miaSprichtGerade, stopSpeaking } from "@/lib/begleitung/speech";
import { micLog } from "@/lib/core/micLog";
import { BUEHNE_MAX_MS, NICHTS_MS, STILLE_MS, WARTEN_AB_MS, etwasGesagt, mitErgebnis, mitNeustart, mitschriftText, neueMitschrift, withoutPrevious, type Mitschrift } from "@/lib/begleitung/mitschrift";

type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
/** Minimal-Typ der Web Speech API (nicht in allen TS-Libs enthalten) */
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
export type RecognitionClass = new () => Recognition;

/** So lange darf es nach start() still bleiben, bevor der Wachhund eingreift */
export const WACHE_MS = 1500;
/** Nach „Fertig“: so lange auf onend warten, dann selbst abschließen */
export const ENDE_MS = 2000;
/** Langes Zuhören (Wochencheck) */
const LONG_MS = 5 * 60_000;
/** Ohne Bühne/lang: höchstens so lange am Stück */
const KURZ_MAX_MS = 60_000;
/** Puffer über der erlaubten Zeit, bevor eine hängende Aufnahme beendet wird */
const HAENGT_PUFFER_MS = 5000;
export const NOCHMAL = "Hat grad nicht geklappt. Nochmal?";
/** Mikro liefert keinen Ton (Bildschirmaufnahme, Telefonat): nach EINEM stillen Neustart ruhig aufhören */
export const BELEGT = "Mikro ist gerade belegt. Lieber schreiben?";
/** Endet eine Sitzung schneller als das ohne Ton, war das Mikro nicht wirklich da */
export const LEER_MS = 1500;
export const NICHT_GEKLAPPT = "Spracheingabe hat nicht geklappt. Schreib’s einfach.";

const STOP_WORDS = /[\s,.]*(?:fertig|das\s+war[’']?s)[\s.!]*$/i;
/** Langes Zuhören: „… fertig“ am Ende = Schluss (das Wort selbst gehört nicht zum Text) */
export const stripStopWord = (text: string) => (STOP_WORDS.test(text) ? { text: text.replace(STOP_WORDS, "").trim(), stop: true } : { text, stop: false });

/**
 * Text der letzten Aufnahme und wann er abgeschickt wurde – geräteweit, nicht
 * je Eingabefeld: Der Browser kann ihn auch in einem neu geöffneten Feld
 * erneut mitliefern (nur „gerade eben“ und nur bei mehr als einem Wort).
 */
let previousText = "";
let previousAt = 0;
export const remember = (text: string) => {
  if (!text) return;
  previousText = text;
  previousAt = Date.now();
};

/** Was die Erkennung an die Anzeige meldet */
export type Anzeige = {
  listening: (on: boolean) => void;
  interim: (text: string) => void;
  error: (text: string) => void;
  wartet: (on: boolean) => void;
  transcript: (text: string) => void;
  end: (text: string) => void;
};

export class Spracherkennung {
  private rec: Recognition | null = null;
  private session = 0;
  private aufnahme = 0;
  private text = "";
  private heard = false;
  private bestaetigt = false;
  private gestartetAm = 0;
  /** Neustarts nach Sitzungen ohne Ton (kurz, ohne onaudiostart/Ergebnis) – höchstens einer still */
  private leereNeustarts = 0;
  private fertigAm = 0;
  private finishFn: () => void = () => {};
  private timers: ReturnType<typeof setTimeout>[] = [];
  private wache: ReturnType<typeof setTimeout> | null = null;
  private ende: ReturnType<typeof setTimeout> | null = null;
  private frist: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly o: {
      micId: string;
      long?: boolean;
      buehne?: boolean;
      klasse: () => RecognitionClass | null;
      anzeige: () => Anzeige;
      /** iPhone ohne Diktieren/Spracherkennung: true = jemand anderes hört zu (Mias eigene Aufnahme), keine Hilfe zeigen */
      beiErkennungAus?: () => boolean;
    },
  ) {}

  /** Läuft gerade eine Erkennung? */
  get aktiv() {
    return this.rec !== null;
  }

  /** Text der laufenden Aufnahme bisher */
  get bisher() {
    return this.text;
  }

  /** Hängt sie? (kein Start bestätigt bzw. „Fertig“ ohne Ende) */
  haengt(at = Date.now()) {
    if (!this.rec) return false;
    if (!this.bestaetigt && at - this.gestartetAm > WACHE_MS) return true;
    return this.fertigAm > 0 && at - this.fertigAm > WACHE_MS;
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private clearWache() {
    if (this.wache) clearTimeout(this.wache);
    if (this.ende) clearTimeout(this.ende);
    this.wache = null;
    this.ende = null;
  }

  private clearFrist() {
    if (this.frist) clearTimeout(this.frist);
    this.frist = null;
  }

  /** Laufende Erkennung beenden, ohne dass noch etwas von ihr ankommt */
  detach() {
    this.clearWache();
    this.fertigAm = 0;
    const old = this.rec;
    this.rec = null;
    this.session++;
    releaseMic(this.o.micId);
    this.o.anzeige().listening(false);
    if (!old) return;
    old.onresult = null;
    old.onerror = null;
    old.onend = null;
    old.onstart = null;
    old.onaudiostart = null;
    try {
      if (old.abort) old.abort();
      else old.stop();
    } catch {
      // schon beendet
    }
  }

  /** Zuhören beginnen (bzw. nach Stille weiterhören: `fortsetzung`) */
  begin(fortsetzung: Mitschrift | null = null, startedAt = Date.now(), neustarts = 0, versuch = 0) {
    const ui = this.o.anzeige();
    const Klasse = this.o.klasse();
    if (!Klasse) return;
    const { long = false, buehne = false } = this.o;
    const weiter = fortsetzung !== null;
    if (!weiter && versuch === 0) {
      this.clearTimers();
      this.clearFrist();
      this.aufnahme++;
      this.heard = false;
      this.leereNeustarts = 0;
    }
    const aufnahme = this.aufnahme;
    this.detach();
    const session = this.session;
    let m: Mitschrift = fortsetzung ?? neueMitschrift();
    let stoppedByUser = false;
    let finished = false;
    /** Kam in dieser Sitzung Ton an? (onaudiostart oder ein Ergebnis) */
    let tonDa = false;
    if (weiter && etwasGesagt(m)) this.heard = true;
    const sinceSent = Date.now() - previousAt;
    let text = mitschriftText(m);
    this.text = text;
    ui.error("");
    if (!weiter) {
      ui.interim("");
      ui.wartet(false);
    }
    const aktuell = () => session === this.session;
    const gleicheAufnahme = () => aufnahme === this.aufnahme;

    const recognition = new Klasse();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    this.bestaetigt = false;
    this.gestartetAm = Date.now();

    /** Alles fertig: Mikro frei, Anzeige ruhig, ganzen Text abschicken */
    const abschliessen = () => {
      if (!aktuell()) return;
      this.clearTimers();
      this.clearFrist();
      this.clearWache();
      this.fertigAm = 0;
      this.session++;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognition.onaudiostart = null;
      if (this.rec === recognition) this.rec = null;
      releaseMic(this.o.micId);
      ui.listening(false);
      ui.interim("");
      ui.wartet(false);
      const all = mitschriftText(m);
      let final = weiter || long ? all : withoutPrevious(all, previousText, sinceSent);
      if (long || buehne) final = stripStopWord(final).text;
      if (buehne) micLog(`Zuhören: fertig nach ${neustarts} Neustart(s)`);
      remember(final);
      ui.end(final);
    };

    /** Jetzt Schluss: Erkennung beenden, onend schickt ab – kommt es nicht, selbst abschließen */
    const finish = () => {
      if (finished) return;
      finished = true;
      stoppedByUser = true;
      this.clearTimers();
      this.fertigAm = Date.now();
      this.ende = setTimeout(() => {
        if (!aktuell()) return;
        micLog("Zuhören: kein Ende gemeldet, selbst beendet");
        try {
          recognition.abort?.();
        } catch {
          // schon beendet
        }
        abschliessen();
      }, ENDE_MS);
      try {
        recognition.stop();
      } catch {
        // schon beendet
      }
    };
    this.finishFn = finish;

    /** Erstes Lebenszeichen: der Wachhund kann gehen */
    const lebt = () => {
      if (!aktuell() || this.bestaetigt) return;
      this.bestaetigt = true;
      if (this.wache) clearTimeout(this.wache);
      this.wache = null;
    };

    /** Bühne: Stille-Uhr neu stellen (nach jedem erkannten Wort) */
    const stilleNeu = () => {
      if (!buehne) return;
      this.clearTimers();
      ui.wartet(false);
      this.timers.push(setTimeout(() => gleicheAufnahme() && ui.wartet(true), WARTEN_AB_MS));
      this.timers.push(setTimeout(() => gleicheAufnahme() && this.finishFn(), STILLE_MS));
    };

    recognition.onstart = lebt;
    recognition.onaudiostart = () => {
      tonDa = true;
      lebt();
    };
    recognition.onresult = (e) => {
      if (!aktuell()) return;
      lebt();
      tonDa = true;
      const results = Array.from({ length: e.results.length }, (_, i) => ({ isFinal: e.results[i].isFinal, text: e.results[i][0]?.transcript ?? "" }));
      m = mitErgebnis(m, e.resultIndex, results);
      const said = mitschriftText(m);
      if (said) this.heard = true;
      // Neue Sitzung, die mit dem eben Abgeschickten beginnt: das nicht doppelt
      text = weiter || long ? said : withoutPrevious(said, previousText, sinceSent);
      if (long || buehne) {
        const s = stripStopWord(text);
        text = s.text;
        if (s.stop) finish();
      }
      this.text = text;
      ui.interim(m.pending);
      ui.transcript(text);
      if (said) stilleNeu();
    };
    recognition.onerror = (e) => {
      if (!aktuell()) return;
      lebt();
      const block = classifyMicError(e.error, micPlatform(typeof navigator === "undefined" ? "" : navigator.userAgent));
      if (block) {
        // Sofort zurück: kein hängender Stopp-Knopf, Mikro-Check statt Kleingedrucktem
        this.clearTimers();
        this.clearFrist();
        this.detach();
        ui.interim("");
        ui.wartet(false);
        if (block === "erkennung_aus" && this.o.beiErkennungAus?.()) return micLog("Zuhören: Spracherkennung aus, eigene Aufnahme");
        reportMicBlocked(block);
        return;
      }
      // Kein Fehler, wenn selbst beendet ("aborted") oder schon etwas erkannt wurde
      if (e.error === "aborted" || stoppedByUser || this.heard || buehne) return;
      ui.error(e.error === "no-speech" ? "Hab nichts gehört. Nochmal?" : NICHT_GEKLAPPT);
    };
    recognition.onend = () => {
      if (!aktuell()) return;
      lebt();
      const elapsed = Date.now() - startedAt;
      // Fehler (Video 28.10.): Mikro belegt → Sitzung endet sofort ohne Ton → Neustart-Schleife
      // (Mikro an/aus, iOS „Audioaufnahme beenden?“). Höchstens EIN stiller Neustart ohne Ton.
      const leer = !stoppedByUser && !tonDa && Date.now() - this.gestartetAm < LEER_MS;
      if (leer && ++this.leereNeustarts > 1) {
        micLog("Zuhören: Mikro belegt, kein Ton, aufgehört");
        this.clearTimers();
        this.clearFrist();
        this.detach();
        ui.interim("");
        ui.wartet(false);
        ui.error(BELEGT);
        return;
      }
      if (leer) micLog("Zuhören: kein Ton, einmal neu");
      else if (tonDa) this.leereNeustarts = 0;
      // Stille beendet nicht: still weiter zuhören und anhängen (lang: 5 Min., Bühne: 2 Min.)
      if (!stoppedByUser && ((long && elapsed < LONG_MS) || (buehne && elapsed < BUEHNE_MAX_MS))) {
        micLog(`Zuhören: Neustart ${neustarts + 1}`);
        this.begin(mitNeustart(m), startedAt, neustarts + 1);
        return;
      }
      abschliessen();
    };
    this.rec = recognition;
    // Mikro übernehmen: z. B. eine laufende Pinnwand-Aufnahme endet vorher sauber
    claimMic(this.o.micId, () => {
      this.clearTimers();
      this.clearFrist();
      this.detach();
      ui.interim("");
      ui.wartet(false);
    });
    // Bühne: niemand sagt etwas → leise wieder aufhören
    if (buehne && !weiter && versuch === 0) this.timers.push(setTimeout(() => gleicheAufnahme() && !this.heard && this.finishFn(), NICHTS_MS));
    // Hängt die ganze Aufnahme länger als erlaubt: beenden und abschicken, was da ist
    if (!this.frist) {
      const max = (long ? LONG_MS : buehne ? BUEHNE_MAX_MS : KURZ_MAX_MS) + HAENGT_PUFFER_MS;
      this.frist = setTimeout(() => {
        this.frist = null;
        if (!gleicheAufnahme() || !this.rec) return;
        micLog("Zuhören: zu lange ohne Ende, beendet");
        this.finishFn();
      }, Math.max(0, startedAt + max - Date.now()));
    }
    // Wachhund: kein Lebenszeichen → einmal mit neuer Erkennung, dann aufgeben
    this.wache = setTimeout(() => {
      this.wache = null;
      if (!aktuell() || this.bestaetigt) return;
      micLog(`Wachhund: kein Start nach ${WACHE_MS / 1000} s${versuch === 0 ? ", neu" : ", aufgegeben"}`);
      if (versuch === 0) return this.begin(fortsetzung, startedAt, neustarts, 1);
      this.clearTimers();
      this.clearFrist();
      this.detach();
      ui.interim("");
      ui.wartet(false);
      ui.error(NOCHMAL);
    }, WACHE_MS);
    try {
      recognition.start();
      ui.listening(true);
      micLog(versuch ? "Zuhören: zweiter Start" : weiter ? "Zuhören: weiter" : "Zuhören: Start");
    } catch {
      micLog("Zuhören: start() abgelehnt");
      this.clearWache();
      this.rec = null;
      releaseMic(this.o.micId);
      ui.listening(false);
      ui.error(NICHT_GEKLAPPT);
    }
  }

  /**
   * Antippen während des Zuhörens = fertig (onEnd schickt ab). Hängt die
   * Erkennung, ist es der Notausgang: alles zurücksetzen und neu zuhören.
   * Liefert true, wenn neu gestartet wurde.
   */
  stop(): boolean {
    if (!this.rec) return false;
    if (this.haengt()) {
      micLog("Notausgang: zurückgesetzt, hört neu zu");
      this.cancel();
      this.begin();
      return true;
    }
    this.finishFn();
    return false;
  }

  /** Aufnahme abbrechen – nichts wird abgeschickt, alles ist leer */
  cancel() {
    this.clearTimers();
    this.clearFrist();
    this.detach();
    const ui = this.o.anzeige();
    ui.interim("");
    ui.wartet(false);
  }

  /**
   * Beim Absenden IMMER zuerst aufrufen: Aufnahme verwerfen (keine Rückrufe
   * mehr) und den bisher erkannten Text als "schon abgeschickt" merken.
   */
  reset() {
    remember(this.text);
    this.text = "";
    this.cancel();
    this.o.anzeige().error("");
  }
}

/** Nach Mias Stimme so lange warten, bis das iPhone den Ton freigibt */
export const STIMME_PAUSE_MS = 250;

/**
 * Vor jedem Zuhören: spricht Mia noch, verstummt sie und wir warten kurz (das
 * iPhone gibt Ton und Mikro erst dann frei); gerade abgegebenes Mikro ebenso.
 * Liefert eine Abbruch-Funktion (z. B. zweiter Tipp, Bühne zu).
 */
export function vorDemZuhoeren(go: () => void, d: { spricht: () => boolean; still: () => void; settle: () => number } = { spricht: miaSprichtGerade, still: stopSpeaking, settle: micSettleWait }): () => void {
  let wait = d.settle();
  if (d.spricht()) {
    d.still();
    micLog("Stimme abgebrochen fürs Zuhören");
    wait = Math.max(wait, STIMME_PAUSE_MS);
  }
  if (wait <= 0) {
    go();
    return () => {};
  }
  const t = setTimeout(go, wait);
  return () => clearTimeout(t);
}

/** Nur für Tests: gemerkten letzten Text vergessen @public */
export function forgetPreviousForTests() {
  previousText = "";
  previousAt = 0;
}
