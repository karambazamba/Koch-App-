// Täglich abgelaufene Sprachnachrichten wegräumen (Vercel Cron, Etappe 3c):
// alle Ton-Dateien im Bucket „memos“, die älter als 25 Std. sind. Nur mit
// CRON_SECRET (Vercel setzt den Header selbst) und dem geheimen Schlüssel aus
// Vercel – beides nur hier auf dem Server, nie im Browser, nie im Log. Ohne
// CRON_SECRET räumt die App beim Öffnen auf (sync/runner.ts).

import { expiredMemoFiles, type MemoFile } from "@/lib/konten/memoShare";
import { now } from "@/lib/core/now";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 60;

type Listed = { name: string; id: string | null; created_at?: string | null };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "nein" }, { status: 401 });
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ removed: 0, eingerichtet: false });
  const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const list = async (prefix: string): Promise<Listed[]> => {
    const res = await fetch(`${pub.url}/storage/v1/object/list/memos`, { method: "POST", headers, body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
    return res.ok ? ((await res.json()) as Listed[]) : [];
  };
  try {
    // Erste Ebene = Haushalte (Ordner haben keine id), darin die Dateien
    const folders = (await list("")).filter((f) => !f.id).map((f) => f.name);
    const files: MemoFile[] = [];
    for (const folder of folders.slice(0, 500)) {
      for (const f of await list(folder)) if (f.id) files.push({ name: `${folder}/${f.name}`, createdAt: f.created_at ?? "" });
    }
    const old = expiredMemoFiles(files, now().getTime());
    for (let i = 0; i < old.length; i += 100) {
      await fetch(`${pub.url}/storage/v1/object/memos`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: old.slice(i, i + 100) }) });
    }
    return Response.json({ removed: old.length });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
