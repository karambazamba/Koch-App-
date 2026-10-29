// Nur Server: Mias feste Ansagen fürs Durchatmen EINMAL erzeugen (A-051,
// A-061): beim ersten Abruf einer fehlenden Ansage (`ansageSicherstellen`,
// Route /audio/durchatmen/<id>.mp3), nachts für alle fehlenden (Vercel Cron)
// oder per Knopf „Ansagen erzeugen“ (`ansagenErzeugen`). Texte aus content/durchatmen/ansagen.json → ElevenLabs
// (MIA_VOICE_ID, weich: stability hoch, speed ca. 0,85) → Supabase Storage,
// öffentlicher Bucket „durchatmen-ansagen“, Dateiname mit Inhalts-Hash
// (`<id>-<hash>.mp3`), dazu `manifest.json`. Erzeugt wird nur, was fehlt oder
// sich geändert hat – spätere Läufe kosten nichts. Es gehen nur die festen
// Sätze an ElevenLabs, nie Daten von Nutzern. Schlüssel nur aus der Umgebung,
// nie ins Log (nur Zahlen und Status).

import { createHash } from "node:crypto";
import { ANSAGEN, type AudioListe } from "@/lib/durchatmen/ansagen";

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

export type Sichergestellt = { status: "da" | "neu"; datei: string; ton?: ArrayBuffer } | { status: "aus" | "unbekannt" } | { status: "fehler"; ton?: ArrayBuffer };

/** Pro Datei höchstens ein Erzeugen gleichzeitig (diese Server-Instanz) */
const laufend = new Map<string, Promise<Sichergestellt>>();

const bereit = (u: AnsagenUmgebung): u is AnsagenUmgebung & { elevenKey: string; voice: string; supabaseUrl: string; supabaseKey: string } => Boolean(u.elevenKey && u.voice && u.supabaseUrl && u.supabaseKey);

/**
 * Eine Ansage sicherstellen: liegt sie im Bucket, ausliefern (`mitTon`) bzw.
 * nur melden; sonst EINMAL mit ElevenLabs erzeugen und ablegen. Nur IDs aus
 * content/durchatmen/ansagen.json – nie freier Text (sonst könnte jemand
 * beliebigen Text auf unsere Kosten sprechen lassen).
 */
export async function ansageSicherstellen(u: AnsagenUmgebung, id: string, o: { abruf?: Abruf; mitTon?: boolean } = {}): Promise<Sichergestellt> {
  const abruf = o.abruf ?? fetch;
  if (!Object.prototype.hasOwnProperty.call(ANSAGEN, id)) return { status: "unbekannt" };
  if (!bereit(u)) return { status: "aus" };
  const text = ANSAGEN[id];
  const datei = ansageDatei(id, text, u.voice, u.modell);
  const oeffentlich = `${u.supabaseUrl}/storage/v1/object/public/${BUCKET}/${datei}`;
  const vorhanden = await abruf(oeffentlich, { method: o.mitTon ? "GET" : "HEAD", cache: "no-store" }).catch(() => null);
  if (vorhanden?.ok) return { status: "da", datei, ...(o.mitTon ? { ton: await vorhanden.arrayBuffer() } : {}) };
  const schon = laufend.get(datei);
  if (schon) return schon;
  const arbeit = (async (): Promise<Sichergestellt> => {
    try {
      const ton = await abruf(`${ANBIETER}/v1/text-to-speech/${encodeURIComponent(u.voice)}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": u.elevenKey, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: u.modell, language_code: "de", voice_settings: STIMME_EINSTELLUNG }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!ton.ok) return { status: "fehler" };
      const bytes = await ton.arrayBuffer();
      const hoch = await abruf(`${u.supabaseUrl}/storage/v1/object/${BUCKET}/${datei}`, {
        method: "POST",
        headers: { apikey: u.supabaseKey, authorization: `Bearer ${u.supabaseKey}`, "content-type": "audio/mpeg", "x-upsert": "true", "cache-control": "31536000" },
        body: bytes,
      });
      // Ablegen klappt nicht: diesmal trotzdem ausliefern, beim nächsten Abruf neuer Versuch
      return hoch.ok ? { status: "neu", datei, ton: bytes } : { status: "fehler", ton: bytes };
    } catch {
      return { status: "fehler" };
    } finally {
      laufend.delete(datei);
    }
  })();
  laufend.set(datei, arbeit);
  return arbeit;
}

export type ErzeugenErgebnis = { status: "aus" } | { status: "ok"; neu: number; schon: number; fehler: number };

/** Alle Ansagen abgleichen und fehlende erzeugen (Cron, Knopf); schreibt das Manifest zur Übersicht */
export async function ansagenErzeugen(u: AnsagenUmgebung, abruf: Abruf = fetch): Promise<ErzeugenErgebnis> {
  if (!bereit(u)) return { status: "aus" };
  const dateien: Record<string, string> = {};
  let neu = 0;
  let schon = 0;
  let fehler = 0;
  for (const id of Object.keys(ANSAGEN)) {
    const r = await ansageSicherstellen(u, id, { abruf });
    if (r.status === "da") schon++;
    else if (r.status === "neu") neu++;
    else fehler++;
    if (r.status === "da" || r.status === "neu") dateien[id] = r.datei;
  }
  const manifest: AudioListe = { version: 1, stimme: stimmeKennung(u.voice, u.modell), dateien };
  const m = await abruf(`${u.supabaseUrl}/storage/v1/object/${BUCKET}/${MANIFEST}`, {
    method: "POST",
    headers: { apikey: u.supabaseKey, authorization: `Bearer ${u.supabaseKey}`, "content-type": "application/json", "x-upsert": "true", "cache-control": "60" },
    body: JSON.stringify(manifest),
  }).catch(() => null);
  if (!m?.ok) fehler++;
  return { status: "ok", neu, schon, fehler };
}

/** Für den Entwickler-Bereich: eingerichtet? wie viele schon da? (nur Zahlen) */
export async function ansagenStand(u: AnsagenUmgebung, abruf: Abruf = fetch): Promise<{ eingerichtet: boolean; da: number; gesamt: number }> {
  const ids = Object.keys(ANSAGEN);
  if (!bereit(u)) return { eingerichtet: false, da: 0, gesamt: ids.length };
  const da = await Promise.all(
    ids.map((id) =>
      abruf(`${u.supabaseUrl}/storage/v1/object/public/${BUCKET}/${ansageDatei(id, ANSAGEN[id], u.voice!, u.modell)}`, { method: "HEAD", cache: "no-store" })
        .then((r) => r.ok)
        .catch(() => false),
    ),
  );
  return { eingerichtet: true, da: da.filter(Boolean).length, gesamt: ids.length };
}
