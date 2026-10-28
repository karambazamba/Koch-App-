// Mias Ohr live (ElevenLabs Realtime Speech to Text, Client-Streaming) – das
// Protokoll an EINER Stelle (rein, getestet in tests/begleitung/ohrLive.test.ts):
// Adresse des Websockets, was die App schickt (Ton-Stücke als PCM 16 kHz,
// Base64; „commit“ beim Antippen), was zurückkommt (bereit, vorläufiger Text,
// fertiger Satz, Fehler) und die Umrechnung des Mikrofons auf 16 kHz.
// Ändert der Anbieter etwas, wird nur diese Datei angepasst.
//
// Annahmen (Doku elevenlabs.io → Speech to Text → Realtime, Stand Okt. 2026):
// - wss://api.elevenlabs.io/v1/speech-to-text/realtime mit `model_id`,
//   `token` (Einmal-Schlüssel `realtime_scribe`), `language_code`,
//   `audio_format=pcm_16000`, `commit_strategy=vad`,
//   `vad_silence_threshold_secs`, `vad_threshold`.
// - Senden: { message_type: "input_audio_chunk", audio_base_64, commit, sample_rate }.
// - Empfangen: `session_started`, `partial_transcript` { text },
//   `committed_transcript` { text } (auch `…_with_timestamps`), Fehler als
//   eigene Typen (`error`, `auth_error`, `quota_exceeded` …).

const LIVE_HOST = "wss://api.elevenlabs.io";
const LIVE_PFAD = "/v1/speech-to-text/realtime";
/** Ton an den Anbieter: 16 kHz, 16 Bit, mono */
export const LIVE_RATE = 16_000;
/** Satzende von ElevenLabs (VAD): so viel Stille (passt zu `STILLE_MS` = 1,2 s) */
const LIVE_STILLE_S = 1.2;
/** Wie sicher Sprache sein muss (0,1–0,9; höher = Café/Küche zählen weniger als Sprache) */
const LIVE_VAD_SCHWELLE = 0.5;
/** Ring „Gleich schick ich’s ab“: so lange ohne neue Wörter */
export const LIVE_RING_MS = 600;
/** Höchstens so lange ohne neue Wörter, dann wird abgeschickt (Geräusch hält den Satz nie offen) */
export const LIVE_OHNE_WORTE_MS = 20_000;
/** Nach dem Antippen so lange auf den fertigen Satz warten, sonst zählt der vorläufige */
export const LIVE_COMMIT_WARTEN_MS = 1500;
/** So lange darf Schlüssel + Verbinden dauern, dann hört Mia über den Browser */
export const LIVE_VERBINDEN_MS = 3000;
/** Ton-Stücke etwa so lang schicken (100 ms = 1600 Werte) */
export const LIVE_STUECK = LIVE_RATE / 10;

/** Adresse des Websockets (der Einmal-Schlüssel steht in der Adresse, nie im Log) */
export function liveAdresse(token: string, modell: string, host = LIVE_HOST): string {
  const q = new URLSearchParams({
    model_id: modell,
    token,
    language_code: "de",
    audio_format: "pcm_16000",
    commit_strategy: "vad",
    vad_silence_threshold_secs: String(LIVE_STILLE_S),
    vad_threshold: String(LIVE_VAD_SCHWELLE),
  });
  return `${host}${LIVE_PFAD}?${q.toString()}`;
}

/** Bytes → Base64 (in Stücken, damit lange Puffer den Stapel nicht sprengen) */
export function zuBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Ein Ton-Stück (PCM 16 Bit, little endian) – `commit`: Satz jetzt abschließen (Antippen) */
export function tonNachricht(pcm: Int16Array, commit = false): string {
  const bytes = new Uint8Array(pcm.length * 2);
  const v = new DataView(bytes.buffer);
  for (let i = 0; i < pcm.length; i++) v.setInt16(i * 2, pcm[i], true);
  return JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: zuBase64(bytes), commit, sample_rate: LIVE_RATE });
}

export type LiveEreignis =
  | { art: "bereit" }
  | { art: "teil"; text: string }
  | { art: "satz"; text: string }
  | { art: "fehler"; grund: string }
  | { art: "egal" };

const sauber = (t: unknown) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim().slice(0, 2000) : "");
const FEHLER = /error|exceeded|limit|throttl|quota|terms|overflow|exhausted|invalid|unauthori[sz]ed/i;

/** Eine Nachricht vom Anbieter einordnen (unbekanntes zählt nicht) */
export function liesNachricht(raw: unknown): LiveEreignis {
  let m: { message_type?: unknown; text?: unknown; error?: unknown };
  try {
    m = typeof raw === "string" ? (JSON.parse(raw) as typeof m) : {};
  } catch {
    return { art: "egal" };
  }
  const typ = typeof m?.message_type === "string" ? m.message_type : "";
  if (typ === "session_started") return { art: "bereit" };
  if (typ === "partial_transcript") return { art: "teil", text: sauber(m.text) };
  if (typ === "committed_transcript" || typ === "committed_transcript_with_timestamps") return { art: "satz", text: sauber(m.text) };
  // Der Grund ist nur der Typ (Technik), nie ein Inhalt
  if (FEHLER.test(typ) || (m && m.error !== undefined)) return { art: "fehler", grund: typ.slice(0, 40) || "fehler" };
  return { art: "egal" };
}

/**
 * Mikrofon (meist 44,1 oder 48 kHz, Werte −1…1) → 16 kHz, 16 Bit. Lineare
 * Zwischenwerte, die Lage zwischen zwei Stücken wird mitgeführt (kein Knacken).
 */
export class Umrechner {
  private pos = 0;
  private letzter = 0;
  constructor(private readonly rate: number) {}

  push(werte: Float32Array): Int16Array {
    const schritt = this.rate / LIVE_RATE;
    const out: number[] = [];
    // `pos` ist die Lage im aktuellen Stück (−1 = letzter Wert des vorigen)
    while (this.pos < werte.length - 1) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const a = i < 0 ? this.letzter : werte[i];
      const b = werte[i + 1];
      out.push(a + (b - a) * f);
      this.pos += schritt;
    }
    this.pos -= werte.length;
    if (werte.length) this.letzter = werte[werte.length - 1];
    const pcm = new Int16Array(out.length);
    for (let k = 0; k < out.length; k++) {
      const s = Math.max(-1, Math.min(1, out[k]));
      pcm[k] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return pcm;
  }
}
