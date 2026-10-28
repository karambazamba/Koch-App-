// Nur Server: Mias Stimme (Text → Ton) und Ohr (Ton → Text) über ElevenLabs.
// Der Schlüssel (ELEVENLABS_API_KEY) und die Stimme (MIA_VOICE_ID) kommen aus
// Vercel und verlassen den Server nie. Es gelten derselbe Zugangscode und
// dieselben Grenzen wie für die KI (`guard.ts`). Aufnahmen werden nur
// weitergereicht – nie gespeichert, nie protokolliert; ins Log kommen nur
// Fehlerart und Status. Ohne Schlüssel antworten die Routen mit „aus“ und die
// App spricht und hört wie bisher über den Browser.

import { createHash } from "node:crypto";
import { aiSetup, checkAccess, clientIp } from "@/lib/begleitung/guard";
import type { AssistantErrorCode } from "@/lib/begleitung/protocol";
import { allowDaily, allowRequest } from "@/lib/begleitung/rateLimit";
import { FESTE_SAETZE, GERAET_HEADER, STIMME_GRENZEN, ZEICHEN_HEADER, type StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";
import { vorlesText } from "@/lib/begleitung/vorlesText";

type Abruf = typeof fetch;

const ANBIETER = "https://api.elevenlabs.io";
/** Schnelles Modell für kurze Antworten; Erkennung mit Scribe – beides per Variable änderbar */
const sprachModell = () => process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_flash_v2_5";
const hoerModell = () => process.env.ELEVENLABS_STT_MODEL?.trim() || "scribe_v1";
/** Live-Zuhören (Realtime); „aus“ schaltet es ab, dann wie bisher Browser bzw. Aufnahme */
const liveModell = () => process.env.ELEVENLABS_LIVE_MODEL?.trim() || "scribe_v2_realtime";
const schluessel = () => process.env.ELEVENLABS_API_KEY?.trim() ?? "";

/** Was eingerichtet ist. Testmodus (`STIMME_MOCK=1`) nie in Produktion. */
export function stimmeSetup() {
  const ai = aiSetup();
  const mock = process.env.STIMME_MOCK === "1" && process.env.VERCEL_ENV !== "production";
  const voice = process.env.MIA_VOICE_ID?.trim() ?? "";
  // Echt nur zusammen mit der echten KI: gleicher Zugangscode, gleiche Grenzen
  const echt = Boolean(schluessel()) && ai.configured && !ai.mock;
  return {
    mock,
    sprechen: mock || (echt && Boolean(voice)),
    hoeren: mock || echt,
    // Live nie im Testmodus: der Durchklick stellt den Websocket selbst nach
    live: echt && liveModell() !== "aus",
    voice,
  };
}

/** Für den KI-Status der App (`GET /api/lotte`) */
export function stimmeStatus(): StimmeStatus {
  const s = stimmeSetup();
  const v = s.mock ? "mock" : createHash("sha256").update(`${s.voice}|${sprachModell()}`).digest("hex").slice(0, 10);
  return { sprechen: s.sprechen, hoeren: s.hoeren, live: s.live, v };
}

const fail = (code: AssistantErrorCode, status: number) => Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });

/** Zugangscode, Gerät, Grenzen pro Minute/Stunde und Tag (wie die KI); null = in Ordnung */
function pruefen(request: Request, art: "stimme" | "hoeren", geraet: unknown, mock: boolean): Response | null {
  const denied = checkAccess(request);
  if (denied) return fail(denied, denied === "limit" ? 429 : 401);
  if (typeof geraet !== "string" || !/^[\w-]{6,64}$/.test(geraet)) return fail("fehler", 400);
  if (mock) return null;
  const ip = clientIp(request);
  // Vorlesen kommt in Sätzen (mehrere Stücke je Antwort) – daher etwas mehr Luft
  if (!allowRequest(`${art}:${geraet}`, 3) || !allowRequest(`${art}-ip:${ip}`, 6)) return fail("limit", 429);
  if (!allowDaily(`${art}:gerät:${geraet}`, 3) || !allowDaily(`${art}:ip:${ip}`, 9)) return fail("limit", 429);
  return null;
}

/** Text beim Anbieter in Ton verwandeln (MP3, gestreamt) */
function erzeugen(text: string, voice: string, abruf: Abruf): Promise<Response> {
  return abruf(`${ANBIETER}/v1/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=mp3_44100_64`, {
    method: "POST",
    headers: {
      "xi-api-key": schluessel(),
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: sprachModell(),
      language_code: "de",
    }),
    signal: AbortSignal.timeout(15_000),
  });
}

/** Testmodus: 0,2 s Stille als WAV (kostet nichts, klingt nach nichts) */
function stille(): ArrayBuffer {
  const rate = 8000;
  const samples = rate / 5;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return buf;
}

const ton = (body: BodyInit | null, typ: string, cache: string, zeichen: number) =>
  new Response(body, {
    headers: {
      "Content-Type": typ,
      "Cache-Control": cache,
      [ZEICHEN_HEADER]: String(zeichen),
    },
  });

/** Feste Sätze je Stimme: einmal erzeugt, danach aus dem Speicher dieser Server-Instanz */
const festeToene = new Map<string, ArrayBuffer>();

/**
 * GET ?satz=<Nummer>: ein fester Satz (ohne Zugangscode – es gibt nur diese
 * wenigen, und Netz und Gerät speichern sie zwischen).
 */
export async function festenSatzSprechen(request: Request, abruf: Abruf = fetch): Promise<Response> {
  const s = stimmeSetup();
  if (!s.sprechen) return fail("aus", 503);
  const satz = new URL(request.url).searchParams.get("satz") ?? "";
  const nr = /^\d{1,2}$/.test(satz) ? Number(satz) : -1;
  if (nr < 0 || nr >= FESTE_SAETZE.length) return fail("fehler", 400);
  const lange = "public, max-age=2592000, s-maxage=2592000, immutable";
  if (s.mock) return ton(stille(), "audio/wav", lange, 0);
  const key = `${stimmeStatus().v}:${nr}`;
  let mp3 = festeToene.get(key);
  if (!mp3) {
    const r = await erzeugen(vorlesText(FESTE_SAETZE[nr]), s.voice, abruf).catch(() => null);
    if (!r?.ok) return anbieterFehler(r);
    mp3 = await r.arrayBuffer();
    festeToene.set(key, mp3);
  }
  return ton(mp3, "audio/mpeg", lange, 0);
}

/** POST { text, geraet }: Mias Antwort vorlesen (bereinigt, gekürzt), Ton gestreamt */
export async function textSprechen(request: Request, abruf: Abruf = fetch): Promise<Response> {
  const s = stimmeSetup();
  if (!s.sprechen) return fail("aus", 503);
  const raw = await request.text();
  if (raw.length > 8000) return fail("fehler", 413);
  let body: { text?: unknown; geraet?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return fail("fehler", 400);
  }
  const denied = pruefen(request, "stimme", body.geraet, s.mock);
  if (denied) return denied;
  const text = typeof body.text === "string" ? vorlesText(body.text).slice(0, STIMME_GRENZEN.zeichen) : "";
  if (!text) return fail("fehler", 400);
  if (s.mock) return ton(stille(), "audio/wav", "no-store", text.length);
  const r = await erzeugen(text, s.voice, abruf).catch(() => null);
  if (!r?.ok || !r.body) return anbieterFehler(r);
  return ton(r.body, "audio/mpeg", "no-store", text.length);
}

/**
 * POST (Körper = Aufnahme, Kopf: Gerät, Dauer): Sprache in Text. Die Aufnahme
 * geht nur an den Anbieter und ist danach weg.
 */
export async function aufnahmeHoeren(request: Request, abruf: Abruf = fetch): Promise<Response> {
  const s = stimmeSetup();
  if (!s.hoeren) return fail("aus", 503);
  const denied = pruefen(request, "hoeren", request.headers.get(GERAET_HEADER), s.mock);
  if (denied) return denied;
  const typ = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^audio\/[\w.+-]+$/.test(typ)) return fail("fehler", 415);
  if (Number(request.headers.get("content-length") ?? 0) > STIMME_GRENZEN.audioBytes) return fail("fehler", 413);
  const audio = await request.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > STIMME_GRENZEN.audioBytes) return fail("fehler", audio.byteLength ? 413 : 400);
  const dauer = Math.min(STIMME_GRENZEN.aufnahmeMs, Math.max(0, Number(request.headers.get("x-mia-dauer")) || 0));
  const sekunden = Math.max(1, Math.round(dauer / 1000));
  if (s.mock) return Response.json({ text: "Was steht heute an?", sekunden }, { headers: { "Cache-Control": "no-store" } });

  const form = new FormData();
  form.append("model_id", hoerModell());
  form.append("language_code", "de");
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([audio], { type: typ }), typ.includes("mp4") ? "aufnahme.mp4" : "aufnahme.webm");
  const r = await abruf(`${ANBIETER}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": schluessel() },
    body: form,
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!r?.ok) return anbieterFehler(r);
  const antwort = (await r.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof antwort.text === "string" ? antwort.text.replace(/\s+/g, " ").trim().slice(0, 2000) : "";
  return Response.json({ text, sekunden }, { headers: { "Cache-Control": "no-store" } });
}

/** So lange gilt ein Einmal-Schlüssel beim Anbieter (Richtwert; verbraucht wird er beim Verbinden) */
const TOKEN_GILT_MS = 15 * 60_000;

/**
 * POST { geraet }: Einmal-Schlüssel fürs Live-Zuhören (Typ `realtime_scribe`).
 * Der echte Schlüssel bleibt hier; die App verbindet sich mit dem kurzlebigen
 * Schlüssel direkt mit dem Anbieter und streamt den Ton – gespeichert wird er
 * nirgends. Gleicher Zugangscode und gleiche Grenzen wie das Ohr.
 */
export async function ohrTokenHolen(request: Request, abruf: Abruf = fetch): Promise<Response> {
  const s = stimmeSetup();
  if (!s.live) return fail("aus", 503);
  const raw = await request.text();
  if (raw.length > 500) return fail("fehler", 413);
  let body: { geraet?: unknown };
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return fail("fehler", 400);
  }
  const denied = pruefen(request, "hoeren", body.geraet, false);
  if (denied) return denied;
  const r = await abruf(`${ANBIETER}/v1/single-use-token/realtime_scribe`, {
    method: "POST",
    headers: { "xi-api-key": schluessel() },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!r?.ok) return anbieterFehler(r);
  const antwort = (await r.json().catch(() => ({}))) as { token?: unknown };
  if (typeof antwort.token !== "string" || !antwort.token) return anbieterFehler(null);
  return Response.json({ token: antwort.token, modell: liveModell(), giltMs: TOKEN_GILT_MS }, { headers: { "Cache-Control": "no-store" } });
}

/** Anbieter-Fehler: ins Log nur der Status, nie Inhalte */
function anbieterFehler(r: Response | null): Response {
  console.error("Stimme: Anbieter-Fehler", r?.status ?? "ohne Antwort");
  return fail(r?.status === 429 ? "limit" : "fehler", r?.status === 429 ? 429 : 502);
}
