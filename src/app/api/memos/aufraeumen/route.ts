// Täglich verwaiste Dateien wegräumen (Vercel Cron): Ton der
// Sprachnachrichten (Bucket „memos“) und Bilder der Foto-Zettel (Bucket
// „fotos“), deren Eintrag von Hand gelöscht wurde (oder nie ankam) – nie nach
// Alter, denn an der Pinnwand verschwindet nichts ungefragt (Tafel 106; das
// Archiv behält seine Dateien). Nur mit CRON_SECRET (Vercel setzt den Header
// selbst) und dem geheimen Schlüssel aus Vercel – beides nur hier auf dem
// Server, nie im Browser, nie im Log.

import { orphanFiles, type MemoFile } from "@/lib/konten/memoShare";
import { now } from "@/lib/core/now";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 60;

type Listed = { name: string; id: string | null; created_at?: string | null };

const BUCKETS = ["memos", "fotos"] as const;
const UUID = /^[0-9a-f-]{36}$/;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "nein" }, { status: 401 });
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ removed: 0, eingerichtet: false });
  const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const list = async (bucket: string, prefix: string): Promise<Listed[]> => {
    const res = await fetch(`${pub.url}/storage/v1/object/list/${bucket}`, { method: "POST", headers, body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
    return res.ok ? ((await res.json()) as Listed[]) : [];
  };
  /** Noch vorhandene Einträge (auch im Archiv) eines Haushalts; null = gerade nicht lesbar (dann nichts löschen) */
  const liveIds = async (household: string): Promise<string[] | null> => {
    const res = await fetch(`${pub.url}/rest/v1/entries?select=id&typ=in.(memo,pinnwand)&geloescht=is.false&household_id=eq.${household}`, { headers });
    return res.ok ? ((await res.json()) as { id: string }[]).map((r) => r.id) : null;
  };
  try {
    let removed = 0;
    for (const bucket of BUCKETS) {
      // Erste Ebene = Haushalte (Ordner haben keine id), darin die Dateien
      const folders = (await list(bucket, "")).filter((f) => !f.id && UUID.test(f.name)).map((f) => f.name);
      for (const folder of folders.slice(0, 500)) {
        const files: MemoFile[] = [];
        for (const f of await list(bucket, folder)) if (f.id) files.push({ name: `${folder}/${f.name}`, createdAt: f.created_at ?? "" });
        if (!files.length) continue;
        const ids = await liveIds(folder);
        if (!ids) continue;
        const old = orphanFiles(files, ids, now().getTime());
        for (let i = 0; i < old.length; i += 100) {
          await fetch(`${pub.url}/storage/v1/object/${bucket}`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: old.slice(i, i + 100) }) });
        }
        removed += old.length;
      }
    }
    return Response.json({ removed });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
