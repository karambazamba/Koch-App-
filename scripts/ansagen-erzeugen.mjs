// npm run ansagen – Mias feste Ansagen fürs Durchatmen (A-051) EINMAL vorab
// erzeugen: Texte aus content/durchatmen/ansagen.json, Stimme MIA_VOICE_ID
// über ElevenLabs (weich: stability hoch, speed ca. 0,85), Dateien nach
// public/audio/durchatmen/<id>.mp3 plus Liste index.json. Danach spielt die
// App sie ab (der Service-Worker merkt sie sich, offline, keine Kosten pro
// Übung). Ohne Dateien spricht die Stimme des Handys.
//
// Schlüssel nur aus der Umgebung (ELEVENLABS_API_KEY, liegt in Vercel) – nie
// ins Repo, nie ausgeben. Fehlt er, bricht das Skript freundlich ab.
// Es gehen nur die festen Sätze an ElevenLabs, nie Daten von Nutzern.
//
//   ELEVENLABS_API_KEY=… MIA_VOICE_ID=… npm run ansagen          alle neu
//   … npm run ansagen -- --fehlende                              nur fehlende
//   npm run ansagen -- --liste                                   nur zeigen, was erzeugt würde

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = join(ROOT, "public/audio/durchatmen");
const { saetze } = JSON.parse(readFileSync(join(ROOT, "content/durchatmen/ansagen.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const ids = Object.keys(saetze);

if (args.has("--liste")) {
  for (const id of ids) console.log(`${id}.mp3  „${saetze[id]}“`);
  console.log(`${ids.length} Ansagen.`);
  process.exit(0);
}

const schluessel = process.env.ELEVENLABS_API_KEY?.trim();
const stimme = process.env.MIA_VOICE_ID?.trim();
if (!schluessel || !stimme) {
  console.log("Ohne ELEVENLABS_API_KEY und MIA_VOICE_ID geht das nicht – beide liegen in Vercel.");
  console.log("Nichts erzeugt. Die App spricht so lange mit der Stimme des Handys, das ist in Ordnung.");
  process.exit(0);
}

const MODELL = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";
const EINSTELLUNG = { stability: 0.8, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.85 };

mkdirSync(ZIEL, { recursive: true });
const liste = { version: 1, stimme: `${stimme.slice(0, 6)}:${MODELL}`, dateien: {} };
let neu = 0;
for (const id of ids) {
  const datei = `${id}.mp3`;
  const pfad = join(ZIEL, datei);
  if (args.has("--fehlende") && existsSync(pfad)) {
    liste.dateien[id] = datei;
    continue;
  }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(stimme)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": schluessel, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: saetze[id], model_id: MODELL, language_code: "de", voice_settings: EINSTELLUNG }),
  }).catch(() => null);
  if (!r?.ok) {
    // Nur der Status, nie Schlüssel oder Antwort-Text
    console.log(`✗ ${id}: Anbieter-Fehler ${r?.status ?? "Netz"} – übersprungen`);
    continue;
  }
  writeFileSync(pfad, Buffer.from(await r.arrayBuffer()));
  liste.dateien[id] = datei;
  neu++;
  console.log(`✓ ${datei}`);
}
writeFileSync(join(ZIEL, "index.json"), `${JSON.stringify(liste, null, 2)}\n`);
console.log(`${neu} neu, ${Object.keys(liste.dateien).length} von ${ids.length} da. Danach CACHE_VERSION in public/sw.js erhöhen.`);
