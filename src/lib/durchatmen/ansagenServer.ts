// Nur Server: Mias feste Ansagen fürs Durchatmen EINMAL erzeugen (A-051,
// Wunsch von Felix): Texte aus content/durchatmen/ansagen.json → ElevenLabs
// (MIA_VOICE_ID, weich: stability hoch, speed ca. 0,85) → Supabase Storage,
// öffentlicher Bucket „durchatmen-ansagen“, Dateiname mit Inhalts-Hash
// (`<id>-<hash>.mp3`), dazu `manifest.json`. Erzeugt wird nur, was fehlt oder
// sich geändert hat – spätere Läufe kosten nichts. Es gehen nur die festen
// Sätze an ElevenLabs, nie Daten von Nutzern. Schlüssel nur aus der Umgebung,
// nie ins Log (nur Zahlen und Status).

import { createHash } from "node:crypto";
import { ANSAGEN, liesAudioListe, type AudioListe } from "@/lib/durchatmen/ansagen";

export const BUCKET = "durchatmen-ansagen";
export const MANIFEST = "manifest.json";
const ANBIETER = "https://api.elevenlabs.io";
/** Weich und ruhig (Tafel 139) */
export const STIMME_EINSTELLUNG = { stability: 0.8, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.85 } as const;

type Abruf = (url: string, init?: RequestInit) => Promise<Response>;

export type AnsagenUmgebung = {
  elevenKey: string | null;
  voice: string | null;
  modell: string;
  supabaseUrl: string | null;
  supabaseKey: string | null;
};

/** Umgebung (Server): Stimme aus `env`, Supabase gibt die Route (geheimer Schlüssel nur in serverEnv/API) */
export function ansagenUmgebung(env: Record<string, string | undefined>, supabase: { url: string | null; key: string | null }): AnsagenUmgebung {
  const t = (v?: string) => v?.trim() || null;
  return {
    elevenKey: t(env.ELEVENLABS_API_KEY),
    voice: t(env.MIA_VOICE_ID),
    modell: t(env.ELEVENLABS_ANSAGE_MODEL) ?? "eleven_multilingual_v2",
    supabaseUrl: supabase.url && /^https:\/\//.test(supabase.url) ? supabase.url.replace(/\/+$/, "") : null,
    supabaseKey: supabase.key,
  };
}

/** Dateiname mit Inhalts-Hash: ändert sich Text, Stimme, Modell oder Einstellung, entsteht eine neue Datei */
export function ansageDatei(id: string, text: string, voice: string, modell: string): string {
  const hash = createHash("sha256").update(JSON.stringify([text, voice, modell, STIMME_EINSTELLUNG])).digest("hex").slice(0, 10);
  return `${id}-${hash}.mp3`;
}

/** Kennung der Stimme fürs Manifest (nicht geheim, ohne ganze ID) */
const stimmeKennung = (voice: string, modell: string) => `${voice.slice(0, 6)}:${modell}`;

export type ErzeugenErgebnis = { status: "aus" } | { status: "ok"; neu: number; schon: number; fehler: number };

/**
 * Alle Ansagen abgleichen und fehlende erzeugen. `abruf` = fetch (im Test
 * nachgestellt). Ohne Schlüssel bzw. Supabase: „aus“, nichts passiert.
 */
export async function ansagenErzeugen(u: AnsagenUmgebung, abruf: Abruf = fetch): Promise<ErzeugenErgebnis> {
  if (!u.elevenKey || !u.voice || !u.supabaseUrl || !u.supabaseKey) return { status: "aus" };
  const storage = `${u.supabaseUrl}/storage/v1/object`;
  const auth = { apikey: u.supabaseKey, authorization: `Bearer ${u.supabaseKey}` };
  // Bisheriges Manifest (öffentlich lesbar); fehlt es, wird alles erzeugt
  const alt: AudioListe | null = await abruf(`${storage}/public/${BUCKET}/${MANIFEST}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then(liesAudioListe)
    .catch(() => null);
  const dateien: Record<string, string> = {};
  let neu = 0;
  let schon = 0;
  let fehler = 0;
  for (const [id, text] of Object.entries(ANSAGEN)) {
    const datei = ansageDatei(id, text, u.voice, u.modell);
    if (alt?.dateien[id] === datei) {
      dateien[id] = datei;
      schon++;
      continue;
    }
    try {
      const ton = await abruf(`${ANBIETER}/v1/text-to-speech/${encodeURIComponent(u.voice)}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": u.elevenKey, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: u.modell, language_code: "de", voice_settings: STIMME_EINSTELLUNG }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!ton.ok) throw new Error(`ElevenLabs ${ton.status}`);
      const hoch = await abruf(`${storage}/${BUCKET}/${datei}`, {
        method: "POST",
        headers: { ...auth, "content-type": "audio/mpeg", "x-upsert": "true", "cache-control": "31536000" },
        body: await ton.arrayBuffer(),
      });
      if (!hoch.ok) throw new Error(`Storage ${hoch.status}`);
      dateien[id] = datei;
      neu++;
    } catch {
      fehler++;
      // Alte Datei behalten, solange die neue nicht da ist
      if (alt?.dateien[id]) dateien[id] = alt.dateien[id];
    }
  }
  const manifest: AudioListe = { version: 1, stimme: stimmeKennung(u.voice, u.modell), dateien };
  const m = await abruf(`${storage}/${BUCKET}/${MANIFEST}`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json", "x-upsert": "true", "cache-control": "60" },
    body: JSON.stringify(manifest),
  }).catch(() => null);
  if (!m?.ok) fehler++;
  return { status: "ok", neu, schon, fehler };
}
